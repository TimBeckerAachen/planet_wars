from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

import auth
import auto_migrate
import game_logic
import models
import schemas
from config import settings
from database import engine, get_db

app = FastAPI(title="Planet Wars API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify local/staging/prod URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Create database tables on startup and run migrations"""
    models.Base.metadata.create_all(bind=engine)
    # Run auto-migrations for schema updates
    auto_migrate.run_auto_migrations()


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/")
def read_root():
    return {"message": "Hello from Planet Wars API!"}


# Authentication Endpoints


import game_logic

# ... imports ...


@app.post(
    "/auth/signup",
    response_model=schemas.AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup(user_data: schemas.UserSignupRequest, db: Session = Depends(get_db)):
    """
    Register a new user and assign a planet.
    """
    # Check if username already exists
    existing_user = (
        db.query(models.User).filter(models.User.username == user_data.username).first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # Check if email already exists
    existing_email = (
        db.query(models.User).filter(models.User.email == user_data.email).first()
    )
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Create new user
    hashed_password = auth.hash_password(user_data.password)
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        gold=100,  # explicit default
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Assign Planet
    planet = game_logic.assign_planet(db, new_user.id)
    if not planet:
        # Rollback user creation if grid is full
        db.delete(new_user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Server is full, cannot assign a planet.",
        )

    # Generate JWT token
    access_token = auth.create_access_token(
        data={"user_id": new_user.id, "username": new_user.username}
    )

    return schemas.AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.model_validate(new_user),
    )


# ... login ...


@app.get("/game/state", response_model=schemas.GameStateResponse)
def get_game_state(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current game state: user resources, planet, buildings, units.
    Triggers resource update.
    """
    # 1. Fetch Planet
    planet = (
        db.query(models.Planet)
        .filter(models.Planet.owner_id == current_user.id)
        .first()
    )
    if not planet:
        # Legacy user or assignment failed previously. Try to assign now.
        planet = game_logic.assign_planet(db, current_user.id)
        if not planet:
            raise HTTPException(status_code=503, detail="Planet grid is full")

    # 2. Fetch Buildings
    buildings = (
        db.query(models.Building).filter(models.Building.planet_id == planet.id).all()
    )

    # 3. Fetch Units
    units = db.query(models.Unit).filter(models.Unit.planet_id == planet.id).all()

    # 4. Update Resources
    game_logic.calculate_resources(current_user, buildings, db)
    db.refresh(current_user)  # get updated gold

    # 5. Check Construction status (TODO: move to game_logic if complex)
    now = datetime.now(timezone.utc)
    dirty = False
    for b in buildings:
        if b.is_constructing and b.finish_time:
            # Handle naive datetime from SQLite/Tests
            finish_time = b.finish_time
            if finish_time.tzinfo is None:
                finish_time = finish_time.replace(tzinfo=timezone.utc)

            if finish_time <= now:
                b.is_constructing = 0
                b.finish_time = None
                b.level += 1  # Upgrade finished!
                dirty = True
                # Log completion or similar?

    if dirty:
        db.commit()

    # 5a. Check Unit Production status
    game_logic.process_production(planet, buildings, db)
    # Refresh everything after updates
    db.commit()  # ensure all committed
    db.refresh(planet)
    buildings = (
        db.query(models.Building).filter(models.Building.planet_id == planet.id).all()
    )
    units = db.query(models.Unit).filter(models.Unit.planet_id == planet.id).all()

    # 6. Generate Construction Options
    construction_options = []
    TYPES = ["gold_mine", "space_ship_factory", "university"]

    for t in TYPES:
        # Find existing building
        existing = next((b for b in buildings if b.name == t), None)

        if existing:
            # Upgrade Option (Level + 1)
            # If already constructing, maybe shown as disabled or "in progress" in UI?
            # API just returns stats for next level
            next_level = existing.level + 1
            type_str = "upgrade"
        else:
            # Build Option (Level 1)
            next_level = 1
            type_str = "build"

        stats = game_logic.get_building_stats(t, next_level)
        if stats:
            construction_options.append(
                schemas.ConstructionOption(
                    name=t,
                    type=type_str,
                    cost=stats["cost"],
                    duration=stats["duration"],  # seconds
                    production=stats.get("production", 0),
                    level=next_level,
                )
            )

    return schemas.GameStateResponse(
        user=schemas.UserResponse.model_validate(current_user),
        planet=schemas.PlanetResponse.model_validate(planet),
        buildings=[schemas.BuildingResponse.model_validate(b) for b in buildings],
        units=[schemas.UnitResponse.model_validate(u) for u in units],
        construction_options=construction_options,
    )


@app.post("/game/build")
def build_building(
    building_name: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Start construction of a building.
    Costs 50 gold, takes 2 hours.
    """

    # Check gold (update first to be sure)
    planet = (
        db.query(models.Planet)
        .filter(models.Planet.owner_id == current_user.id)
        .first()
    )
    buildings = (
        db.query(models.Building).filter(models.Building.planet_id == planet.id).all()
    )
    game_logic.calculate_resources(current_user, buildings, db)
    db.refresh(current_user)

    target_building = None
    target_level = 1

    # 1. Determine Target Level & Building
    if building_name == "gold_mine":
        target_building = next((b for b in buildings if b.name == "gold_mine"), None)
        if not target_building:
            raise HTTPException(status_code=404, detail="Gold mine not found")
        target_level = target_building.level + 1
    else:
        existing = next((b for b in buildings if b.name == building_name), None)
        if existing:
            if existing.is_constructing:
                raise HTTPException(
                    status_code=400, detail="Building is already constructing"
                )
            target_building = existing
            target_level = existing.level + 1
        else:
            target_level = 1

    # 2. Get Stats for Target Level
    stats = game_logic.get_building_stats(building_name, target_level)
    if not stats:
        raise HTTPException(status_code=400, detail="Invalid building configuration")

    COST = stats["cost"]
    DURATION_SECONDS = stats["duration"]  # seconds

    # 3. Check Gold
    if current_user.gold < COST:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough gold. Need {COST}, have {current_user.gold}",
        )

    # 4. Deduct Gold and Set Timers
    current_user.gold -= COST
    finish_time = datetime.now(timezone.utc) + timedelta(seconds=DURATION_SECONDS)

    if target_building:
        target_building.is_constructing = 1
        target_building.finish_time = finish_time
        # We increase level AFTER construction in main logic loop (get_game_state), not here?
        # Actually in get_game_state we did: b.is_constructing=0, finish_time=None.
        # But we forgot incrementing level!
        # The prompt says "with higher level the cost... increases".
        # So we MUST increment level upon completion.
        # FIX: The completion logic in `get_game_state` must increment level.
        # Here we just mark start.
        # Re-using existing instance does not change level yet.
    else:
        # Create new
        # Initialize at Level 0 so that completion logic (level += 1) results in Level 1.
        new_b = models.Building(
            planet_id=planet.id,
            name=building_name,
            level=0,
            is_constructing=1,
            finish_time=finish_time,
        )
        db.add(new_b)

    db.commit()
    return {"status": "Construction started", "finish_time": finish_time}


@app.get("/game/map", response_model=schemas.MapStateResponse)
def get_map(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    planets = db.query(models.Planet).options(joinedload(models.Planet.owner)).all()
    return schemas.MapStateResponse(
        planets=[
            schemas.PlanetResponse(
                id=p.id,
                x=p.x,
                y=p.y,
                name=p.name,
                owner_id=p.owner_id,
                owner_username=p.owner.username if p.owner else None,
            )
            for p in planets
        ]
    )


@app.patch("/game/planet/rename", response_model=schemas.PlanetResponse)
def rename_planet(
    payload: schemas.PlanetRenameRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Rename the user's planet. Name must be unique.
    """
    planet = (
        db.query(models.Planet)
        .filter(models.Planet.owner_id == current_user.id)
        .first()
    )
    if not planet:
        raise HTTPException(status_code=404, detail="Planet not found")

    try:
        planet.name = payload.name
        db.commit()
        db.refresh(planet)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Planet name already taken")

    return schemas.PlanetResponse(
        id=planet.id,
        x=planet.x,
        y=planet.y,
        name=planet.name,
        owner_id=planet.owner_id,
        owner_username=current_user.username,
    )


@app.post("/auth/login", response_model=schemas.AuthResponse)
def login(credentials: schemas.UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user and return JWT token

    - **identifier**: Username or email
    - **password**: User password

    Returns JWT access token and user data
    """
    # Try to find user by username or email
    user = (
        db.query(models.User)
        .filter(
            (models.User.username == credentials.identifier)
            | (models.User.email == credentials.identifier)
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    # Verify password
    if not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    # Generate JWT token
    access_token = auth.create_access_token(
        data={"user_id": user.id, "username": user.username}
    )

    return schemas.AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.model_validate(user),
    )


@app.get("/auth/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    """
    Get current authenticated user information

    Requires valid JWT token in Authorization header
    """
    return schemas.UserResponse.model_validate(current_user)


@app.get("/game/building/{building_id}", response_model=schemas.BuildingDetailsResponse)
def get_building_details(
    building_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    planet = (
        db.query(models.Planet)
        .filter(models.Planet.owner_id == current_user.id)
        .first()
    )
    building = (
        db.query(models.Building)
        .filter(
            models.Building.id == building_id, models.Building.planet_id == planet.id
        )
        .first()
    )

    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    # Handle naive datetime
    if building.finish_time and building.finish_time.tzinfo is None:
        building.finish_time = building.finish_time.replace(tzinfo=timezone.utc)
    if (
        building.production_finish_time
        and building.production_finish_time.tzinfo is None
    ):
        building.production_finish_time = building.production_finish_time.replace(
            tzinfo=timezone.utc
        )

    # Calculate Upgrade Stats
    upgrade_stats = game_logic.get_building_stats(building.name, building.level + 1)

    response = schemas.BuildingDetailsResponse.model_validate(building)
    if upgrade_stats:
        response.upgrade_cost = upgrade_stats["cost"]
        response.upgrade_duration = upgrade_stats["duration"]

    # Calculate Production Options
    if building.name == "university":
        stats = game_logic.get_unit_stats("pilot", building.level)
        response.production_options = [
            schemas.ProductionOption(
                name="pilot",
                cost=stats["cost"],
                duration=stats["duration"],
                base_time=stats["base_time"],
            )
        ]
    elif building.name == "space_ship_factory":
        stats = game_logic.get_unit_stats("space_ship", building.level)
        response.production_options = [
            schemas.ProductionOption(
                name="space_ship",
                cost=stats["cost"],
                duration=stats["duration"],
                base_time=stats["base_time"],
            )
        ]

    return response


@app.post("/game/produce")
def produce_unit(
    building_id: int,
    unit_name: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    planet = (
        db.query(models.Planet)
        .filter(models.Planet.owner_id == current_user.id)
        .first()
    )
    building = (
        db.query(models.Building)
        .filter(
            models.Building.id == building_id, models.Building.planet_id == planet.id
        )
        .first()
    )

    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    if building.is_constructing:
        raise HTTPException(
            status_code=400, detail="Building is upgrading, cannot produce"
        )

    if building.production_type:
        raise HTTPException(status_code=400, detail="Building is already producing")

    # Get stats
    stats = game_logic.get_unit_stats(unit_name, building.level)
    if not stats:
        raise HTTPException(status_code=400, detail="Invalid unit type")

    cost = stats["cost"]

    # Check Gold
    if cost["gold"] > current_user.gold:
        raise HTTPException(status_code=400, detail="Not enough gold")

    # Check Special Resources (Pilot)
    if "pilot" in cost:
        pilots = (
            db.query(models.Unit)
            .filter(models.Unit.planet_id == planet.id, models.Unit.name == "pilot")
            .first()
        )
        if not pilots or pilots.count < cost["pilot"]:
            raise HTTPException(status_code=400, detail="Not enough pilots")
        # Deduct pilot
        pilots.count -= cost["pilot"]

    # Deduct Gold
    current_user.gold -= cost["gold"]

    # Start Production
    building.production_type = unit_name
    building.production_finish_time = datetime.now(timezone.utc) + timedelta(
        seconds=stats["duration"]
    )

    db.commit()
    return {
        "status": "Production started",
        "finish_time": building.production_finish_time,
    }


# Fleet Mission Endpoints


@app.post("/game/fleet/send", response_model=schemas.FleetMissionResponse)
def send_fleet(
    request: schemas.FleetSendRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send a fleet on a mission (attack or transport).

    - **target_planet_id**: ID of the destination planet
    - **mission_type**: 'attack' or 'transport'
    - **ship_count**: Number of spaceships to send
    - **gold_amount**: Amount of gold to transport (transport only, max 10 per ship)
    """
    # Get user's planet
    planet = (
        db.query(models.Planet)
        .filter(models.Planet.owner_id == current_user.id)
        .first()
    )
    if not planet:
        raise HTTPException(status_code=404, detail="You don't have a planet")

    # Get target planet
    target_planet = (
        db.query(models.Planet)
        .filter(models.Planet.id == request.target_planet_id)
        .first()
    )
    if not target_planet:
        raise HTTPException(status_code=404, detail="Target planet not found")

    if target_planet.id == planet.id:
        raise HTTPException(
            status_code=400, detail="Cannot send fleet to your own planet"
        )

    # Attack: must target another player's planet
    if request.mission_type == "attack":
        if target_planet.owner_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot attack your own planet")

    # Check available ships
    ships = (
        db.query(models.Unit)
        .filter(models.Unit.planet_id == planet.id, models.Unit.name == "space_ship")
        .first()
    )
    available_ships = ships.count if ships else 0

    if available_ships < request.ship_count:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough spaceships. Have {available_ships}, need {request.ship_count}",
        )

    # For transport: validate gold amount
    gold_carried = 0
    if request.mission_type == "transport":
        max_gold = request.ship_count * game_logic.SHIP_GOLD_CAPACITY
        if request.gold_amount > max_gold:
            raise HTTPException(
                status_code=400,
                detail=f"Ships can carry max {max_gold} gold ({game_logic.SHIP_GOLD_CAPACITY} per ship)",
            )
        if request.gold_amount > current_user.gold:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough gold. Have {current_user.gold}, want to send {request.gold_amount}",
            )
        gold_carried = request.gold_amount
        current_user.gold -= gold_carried

    # Deduct ships
    ships.count -= request.ship_count

    # Calculate travel time
    travel_time = game_logic.calculate_travel_time(planet, target_planet)
    arrival_time = datetime.now(timezone.utc) + timedelta(seconds=travel_time)

    # Create mission
    mission = models.FleetMission(
        owner_id=current_user.id,
        source_planet_id=planet.id,
        target_planet_id=target_planet.id,
        mission_type=request.mission_type,
        ship_count=request.ship_count,
        gold_carried=gold_carried,
        arrival_time=arrival_time,
        status="outbound",
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)

    return schemas.FleetMissionResponse(
        id=mission.id,
        source_planet_id=mission.source_planet_id,
        target_planet_id=mission.target_planet_id,
        source_planet_name=planet.name,
        target_planet_name=target_planet.name,
        mission_type=mission.mission_type,
        ship_count=mission.ship_count,
        gold_carried=mission.gold_carried,
        departure_time=mission.departure_time,
        arrival_time=mission.arrival_time,
        return_time=mission.return_time,
        status=mission.status,
        owner_id=mission.owner_id,
    )


@app.get("/game/fleet/missions", response_model=schemas.FleetMissionsListResponse)
def get_fleet_missions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all active fleet missions for the current user.
    Returns both outgoing (owned by user) and incoming (targeting user's planet).
    """
    # Process any completed missions first
    game_logic.process_fleet_missions(db)

    # Get user's planet
    planet = (
        db.query(models.Planet)
        .filter(models.Planet.owner_id == current_user.id)
        .first()
    )

    # Outgoing missions (owned by user, not completed)
    outgoing = (
        db.query(models.FleetMission)
        .filter(
            models.FleetMission.owner_id == current_user.id,
            models.FleetMission.status != "completed",
        )
        .all()
    )

    outgoing_responses = []
    for m in outgoing:
        source_planet = (
            db.query(models.Planet)
            .filter(models.Planet.id == m.source_planet_id)
            .first()
        )
        target_planet = (
            db.query(models.Planet)
            .filter(models.Planet.id == m.target_planet_id)
            .first()
        )
        outgoing_responses.append(
            schemas.FleetMissionResponse(
                id=m.id,
                source_planet_id=m.source_planet_id,
                target_planet_id=m.target_planet_id,
                source_planet_name=source_planet.name if source_planet else None,
                target_planet_name=target_planet.name if target_planet else None,
                mission_type=m.mission_type,
                ship_count=m.ship_count,
                gold_carried=m.gold_carried,
                departure_time=m.departure_time,
                arrival_time=m.arrival_time,
                return_time=m.return_time,
                status=m.status,
                owner_id=m.owner_id,
            )
        )

    # Incoming fleets (targeting user's planet, outbound status)
    incoming = []
    if planet:
        incoming_missions = (
            db.query(models.FleetMission)
            .filter(
                models.FleetMission.target_planet_id == planet.id,
                models.FleetMission.status == "outbound",
                models.FleetMission.owner_id != current_user.id,
            )
            .all()
        )
        for m in incoming_missions:
            source_planet = (
                db.query(models.Planet)
                .filter(models.Planet.id == m.source_planet_id)
                .first()
            )
            owner = db.query(models.User).filter(models.User.id == m.owner_id).first()
            incoming.append(
                schemas.IncomingFleetResponse(
                    id=m.id,
                    source_planet_name=source_planet.name
                    if source_planet
                    else "Unknown",
                    source_owner_username=owner.username if owner else "Unknown",
                    ship_count=m.ship_count,
                    mission_type=m.mission_type,
                    arrival_time=m.arrival_time,
                )
            )

    return schemas.FleetMissionsListResponse(
        outgoing=outgoing_responses, incoming=incoming
    )


# Message Endpoints


@app.get("/game/messages", response_model=schemas.MessageListResponse)
def get_messages(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all messages for the current user, ordered by most recent first.
    """
    messages = (
        db.query(models.Message)
        .filter(models.Message.user_id == current_user.id)
        .order_by(models.Message.created_at.desc())
        .all()
    )

    unread_count = sum(1 for m in messages if not m.is_read)

    return schemas.MessageListResponse(
        messages=[
            schemas.MessageResponse(
                id=m.id,
                subject=m.subject,
                body=m.body,
                is_read=bool(m.is_read),
                created_at=m.created_at,
            )
            for m in messages
        ],
        unread_count=unread_count,
    )


@app.patch("/game/messages/{message_id}/read")
def mark_message_read(
    message_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark a message as read.
    """
    message = (
        db.query(models.Message)
        .filter(
            models.Message.id == message_id,
            models.Message.user_id == current_user.id,
        )
        .first()
    )

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    message.is_read = 1
    db.commit()

    return {"status": "Message marked as read"}


@app.post("/game/messages/send", response_model=schemas.MessageResponse)
def send_message(
    request: schemas.SendMessageRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send a message to another player.
    """
    # Find recipient by username
    recipient = (
        db.query(models.User)
        .filter(models.User.username == request.recipient_username)
        .first()
    )

    if not recipient:
        raise HTTPException(status_code=404, detail="Player not found")

    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")

    # Create message for recipient
    message = models.Message(
        user_id=recipient.id,
        subject=request.subject,
        body=f"From: {current_user.username}\n\n{request.body}",
        is_read=0,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    return message
