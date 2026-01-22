from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
import models, schemas, auth, game_logic
from database import engine, get_db
import auto_migrate
from config import settings

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

@app.post("/auth/signup", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: schemas.UserSignupRequest, db: Session = Depends(get_db)):
    """
    Register a new user and assign a planet.
    """
    # Check if username already exists
    existing_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = auth.hash_password(user_data.password)
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        gold=100 # explicit default
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
            detail="Server is full, cannot assign a planet."
        )

    # Generate JWT token
    access_token = auth.create_access_token(
        data={"user_id": new_user.id, "username": new_user.username}
    )
    
    return schemas.AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.model_validate(new_user)
    )

# ... login ...

@app.get("/game/state", response_model=schemas.GameStateResponse)
def get_game_state(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current game state: user resources, planet, buildings, units.
    Triggers resource update.
    """
    # 1. Fetch Planet
    planet = db.query(models.Planet).filter(models.Planet.owner_id == current_user.id).first()
    if not planet:
        # Legacy user or assignment failed previously. Try to assign now.
        planet = game_logic.assign_planet(db, current_user.id)
        if not planet:
             raise HTTPException(status_code=503, detail="Planet grid is full")

    # 2. Fetch Buildings
    buildings = db.query(models.Building).filter(models.Building.planet_id == planet.id).all()
    
    # 3. Fetch Units
    units = db.query(models.Unit).filter(models.Unit.planet_id == planet.id).all()

    # 4. Update Resources
    game_logic.calculate_resources(current_user, buildings, db)
    db.refresh(current_user) # get updated gold
    
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
                dirty = True
                # Log completion or similar?
            
    if dirty:
        db.commit()
        # Refresh buildings list to return clean state
        db.refresh(planet) # may not be enough for list
        buildings = db.query(models.Building).filter(models.Building.planet_id == planet.id).all()

    return schemas.GameStateResponse(
        user=schemas.UserResponse.model_validate(current_user),
        planet=schemas.PlanetResponse.model_validate(planet),
        buildings=[schemas.BuildingResponse.model_validate(b) for b in buildings],
        units=[schemas.UnitResponse.model_validate(u) for u in units]
    )


@app.post("/game/build")
def build_building(
    building_name: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start construction of a building.
    Costs 50 gold, takes 2 hours.
    """
    COST = 50
    TIME_HOURS = 2
    
    # Check gold (update first to be sure)
    planet = db.query(models.Planet).filter(models.Planet.owner_id == current_user.id).first()
    buildings = db.query(models.Building).filter(models.Building.planet_id == planet.id).all()
    game_logic.calculate_resources(current_user, buildings, db)
    db.refresh(current_user)
    
    if current_user.gold < COST:
         raise HTTPException(status_code=400, detail="Not enough gold")
         
    # Check valid building name
    if building_name not in ["space_ship_factory", "university", "gold_mine"]: # upgrading gold mine?
         raise HTTPException(status_code=400, detail="Invalid building type")

    # If upgrading existing (Gold Mine or others?), find it.
    # Prompt: "When they are finished they will be present in the list of buildings." 
    # Implies new instance for factory/university? 
    # "You can also upgrade the gold mine... which costs gold and time again."
    
    # Logic:
    # If gold_mine -> Upgrade existing
    # If factory/university -> Build new ONE if not exists? Or multiple?
    # "can build like space ship factory... present in list" implies list can grow.
    # But usually these are unique per planet. Let's assume unique for now for simplicity, or allow duplicates?
    # "if you click on the university..." implies ONE university.
    
    target_building = None
    if building_name == "gold_mine":
        # Find existing
        target_building = next((b for b in buildings if b.name == "gold_mine"), None)
        if not target_building:
             raise HTTPException(status_code=404, detail="Gold mine not found")
    else:
        # Check if already exists? "present in the list... click on the university" 
        # usually implies existence.
        # But "selection of building that the user can build... When finished present in list"
        # means they are NOT in the list initially.
        # So we create a NEW one.
        # Let's prevent duplicates for simplicity unless requested.
        existing = next((b for b in buildings if b.name == building_name), None)
        if existing and not existing.is_constructing:
             # Already built? Maybe allow multiple? Or say "Already built". 
             # Prompt doesn't forbid multiple, but standard game logic implies unique usually.
             # Let's allow simple creation.
             pass
    
    # Deduct Gold
    current_user.gold -= COST
    
    finish_time = datetime.now(timezone.utc) + timedelta(hours=TIME_HOURS)
    
    if target_building:
        # Limit one construction at a time per building?
        if target_building.is_constructing:
             raise HTTPException(status_code=400, detail="Building is already upgrading")
        target_building.is_constructing = 1
        target_building.finish_time = finish_time
        target_building.level += 1 # Pre-increment level or wait? Usually wait. 
        # But for simpler logic, I'll Increment level ONLY when finished.
        # So here just set flag.
        target_building.level -= 0 # No change yet
    else:
        # Create new
        new_b = models.Building(
            planet_id=planet.id,
            name=building_name,
            level=1,
            is_constructing=1,
            finish_time=finish_time
        )
        db.add(new_b)
        
    db.commit()
    return {"status": "Construction started", "finish_time": finish_time}


@app.get("/game/map", response_model=schemas.MapStateResponse)
def get_map(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    planets = db.query(models.Planet).all()
    return schemas.MapStateResponse(planets=[schemas.PlanetResponse.model_validate(p) for p in planets])



@app.post("/auth/login", response_model=schemas.AuthResponse)
def login(credentials: schemas.UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user and return JWT token
    
    - **identifier**: Username or email
    - **password**: User password
    
    Returns JWT access token and user data
    """
    # Try to find user by username or email
    user = db.query(models.User).filter(
        (models.User.username == credentials.identifier) | 
        (models.User.email == credentials.identifier)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Generate JWT token
    access_token = auth.create_access_token(
        data={"user_id": user.id, "username": user.username}
    )
    
    return schemas.AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=schemas.UserResponse.model_validate(user)
    )


@app.get("/auth/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    """
    Get current authenticated user information
    
    Requires valid JWT token in Authorization header
    """
    return schemas.UserResponse.model_validate(current_user)
