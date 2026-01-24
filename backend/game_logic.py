import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

import models

GRID_SIZE = 30
GOLD_MINE_RATE = 10  # Gold per hour
INITIAL_GOLD = 100


def assign_planet(db: Session, user_id: int):
    """
    Assign a random planet to the user on the 30x30 grid.
    Ensures no overlap and no adjacent planets.
    """
    # specific constraint: "There should also be no planets next to each other."
    # We can check this by ensuring distance > 1

    # Simple retry strategy with max attempts
    max_attempts = 1000
    for _ in range(max_attempts):
        x = random.randint(0, GRID_SIZE - 1)
        y = random.randint(0, GRID_SIZE - 1)

        # Check for existing planet at (x, y) or neighbors
        # Neighbors: (x-1, y), (x+1, y), (x, y-1), (x, y+1)
        # And diagonals? "next to each other" usually implies 8-neighbors or 4-neighbors.
        # Let's be safe and exclude 8-neighbors (Moore neighborhood)

        # Optimized query: find any planet within x-1 to x+1 and y-1 to y+1
        existing = (
            db.query(models.Planet)
            .filter(
                models.Planet.x >= x - 1,
                models.Planet.x <= x + 1,
                models.Planet.y >= y - 1,
                models.Planet.y <= y + 1,
            )
            .first()
        )

        if not existing:
            # Safe to assign
            new_planet = models.Planet(
                owner_id=user_id, x=x, y=y, name=f"Planet {x}-{y}"
            )
            db.add(new_planet)
            db.commit()
            db.refresh(new_planet)

            # Create initial Gold Mine
            gold_mine = models.Building(
                planet_id=new_planet.id, name="gold_mine", level=1, is_constructing=0
            )
            db.add(gold_mine)
            db.commit()

            return new_planet

    return None  # Grid is likely full


# Base Stats
BUILDING_STATS = {
    "gold_mine": {"base_cost": 50, "base_time": 3600, "base_production": 10},  # 1 hour
    "space_ship_factory": {
        "base_cost": 100,
        "base_time": 7200,
        "base_production": 0,
    },  # 2 hours
    "university": {
        "base_cost": 150,
        "base_time": 10800,
        "base_production": 0,
    },  # 3 hours
}


def get_building_stats(name: str, level: int):
    """
    Calculate cost and build time for a specific building level.
    Cost scales exponentially: Base * (1.5 ^ (level - 1))
    Time scales linearly: Base * level
    """
    stats = BUILDING_STATS.get(name)
    if not stats:
        return None

    # Cost formula: Base * 1.5^(L-1)
    cost = int(stats["base_cost"] * (1.5 ** (level - 1)))

    # Time formula: Base * L
    duration = stats["base_time"] * level

    return {
        "cost": cost,
        "duration": duration,
        "production": stats["base_production"] * level
        if stats["base_production"]
        else 0,
    }


# Unit Stats
UNIT_STATS = {
    "pilot": {"cost": {"gold": 50}, "base_time": 600},  # 10 minutes
    "space_ship": {"cost": {"gold": 100, "pilot": 1}, "base_time": 1200},  # 20 minutes
}


def get_unit_stats(name: str, building_level: int = 1):
    """
    Calculate cost and recruit time for a unit.
    Time scales inversely with building level: Base / Level.
    """
    stats = UNIT_STATS.get(name)
    if not stats:
        return None

    # Speed up with level
    # Formula: Base / Level
    duration = int(stats["base_time"] / building_level)

    return {
        "cost": stats["cost"],
        "duration": duration,
        "base_time": stats["base_time"],
    }


def process_production(
    planet: models.Planet, buildings: list[models.Building], db: Session
):
    """
    Check if any buildings have finished producing units.
    """
    now = datetime.now(timezone.utc)
    dirty = False

    for b in buildings:
        if b.production_type and b.production_finish_time:
            finish_time = b.production_finish_time
            if finish_time.tzinfo is None:
                finish_time = finish_time.replace(tzinfo=timezone.utc)

            if finish_time <= now:
                # Production finished
                unit_type = b.production_type
                b.production_type = None
                b.production_finish_time = None

                # Add to units
                unit = (
                    db.query(models.Unit)
                    .filter(
                        models.Unit.planet_id == planet.id,
                        models.Unit.name == unit_type,
                    )
                    .first()
                )

                if not unit:
                    unit = models.Unit(planet_id=planet.id, name=unit_type, count=0)
                    db.add(unit)
                    # Need to flush to get ID if needed, but not needed here

                unit.count += 1
                dirty = True

    if dirty:
        db.commit()


def calculate_resources(
    user: models.User, buildings: list[models.Building], db: Session
):
    """
    Update user's gold based on time elapsed and gold mines.
    """
    now = datetime.now(timezone.utc)
    if not user.last_resource_update:
        user.last_resource_update = now
        db.commit()
        return

    # Handle naive datetime from SQLite/Tests
    last_update = user.last_resource_update
    if last_update.tzinfo is None:
        last_update = last_update.replace(tzinfo=timezone.utc)

    # Find gold mines
    gold_production_rate = 0
    for b in buildings:
        if b.name == "gold_mine" and not b.is_constructing:
            # Use shared stats for production rate
            stats = get_building_stats("gold_mine", b.level)
            if stats:
                gold_production_rate += stats["production"]

    time_diff = now - last_update
    hours_passed = time_diff.total_seconds() / 3600.0

    gold_produced = int(hours_passed * gold_production_rate)

    if gold_produced > 0:
        user.gold += gold_produced
        user.last_resource_update = now
        db.commit()
    elif hours_passed > 1.0:
        # Force update timestamp if it's been a long time even if 0 gold (unlikely)
        user.last_resource_update = now
        db.commit()


# Fleet Mission Constants
TRAVEL_SPEED = 10  # seconds per grid unit (Manhattan distance)
SHIP_STRENGTH = 10
SHIP_GOLD_CAPACITY = 10


def calculate_travel_time(
    source_planet: models.Planet, target_planet: models.Planet
) -> int:
    """Calculate travel time based on Manhattan distance."""
    distance = abs(source_planet.x - target_planet.x) + abs(
        source_planet.y - target_planet.y
    )
    return distance * TRAVEL_SPEED


def process_fleet_missions(db: Session):
    """
    Process all fleet missions that have arrived or returned.
    Call this from get_game_state to resolve missions.
    """
    now = datetime.now(timezone.utc)

    # 1. Process arrived outbound missions
    outbound_missions = (
        db.query(models.FleetMission)
        .filter(
            models.FleetMission.status == "outbound",
            models.FleetMission.arrival_time <= now,
        )
        .all()
    )

    for mission in outbound_missions:
        if mission.mission_type == "attack":
            _execute_attack(mission, db)
        else:  # transport
            _execute_transport(mission, db)

    # 2. Process returned missions
    returned_missions = (
        db.query(models.FleetMission)
        .filter(
            models.FleetMission.status == "returning",
            models.FleetMission.return_time <= now,
        )
        .all()
    )

    for mission in returned_missions:
        _complete_mission(mission, db)

    if outbound_missions or returned_missions:
        db.commit()


def _execute_attack(mission: models.FleetMission, db: Session):
    """Execute an attack mission when it arrives at the target."""
    target_planet = (
        db.query(models.Planet)
        .filter(models.Planet.id == mission.target_planet_id)
        .first()
    )

    if not target_planet:
        mission.status = "completed"
        return

    target_owner = (
        db.query(models.User).filter(models.User.id == target_planet.owner_id).first()
    )

    source_planet = mission.source_planet
    attacker = mission.owner

    # Calculate defender strength (ships at target planet)
    defender_ships = (
        db.query(models.Unit)
        .filter(
            models.Unit.planet_id == target_planet.id, models.Unit.name == "space_ship"
        )
        .first()
    )

    defender_ship_count = defender_ships.count if defender_ships else 0
    attacker_strength = mission.ship_count * SHIP_STRENGTH
    defender_strength = defender_ship_count * SHIP_STRENGTH

    # Combat resolution: attacker wins if strictly greater
    attacker_wins = attacker_strength > defender_strength

    if attacker_wins:
        # Steal gold (up to SHIP_GOLD_CAPACITY per ship, max available)
        max_steal = mission.ship_count * SHIP_GOLD_CAPACITY
        actual_steal = min(max_steal, target_owner.gold) if target_owner else 0

        if target_owner and actual_steal > 0:
            target_owner.gold -= actual_steal

        mission.gold_carried = actual_steal

        # Generate messages
        _create_message(
            db,
            attacker.id,
            f"Attack on {target_planet.name} - Victory!",
            f"Your fleet of {mission.ship_count} ships attacked {target_planet.name} "
            f"and defeated {defender_ship_count} defending ships. "
            f"You stole {actual_steal} gold and are returning home.",
        )

        if target_owner:
            _create_message(
                db,
                target_owner.id,
                f"Your planet {target_planet.name} was attacked!",
                f"An enemy fleet of {mission.ship_count} ships from {source_planet.name} "
                f"attacked your planet. Your {defender_ship_count} ships were defeated. "
                f"The enemy stole {actual_steal} gold.",
            )
    else:
        # Attack failed, no gold stolen
        mission.gold_carried = 0

        _create_message(
            db,
            attacker.id,
            f"Attack on {target_planet.name} - Defeat!",
            f"Your fleet of {mission.ship_count} ships attacked {target_planet.name} "
            f"but was repelled by {defender_ship_count} defending ships. "
            f"Your ships are returning empty-handed.",
        )

        if target_owner:
            _create_message(
                db,
                target_owner.id,
                f"Attack on {target_planet.name} repelled!",
                f"An enemy fleet of {mission.ship_count} ships from {source_planet.name} "
                f"attacked your planet. Your {defender_ship_count} ships successfully "
                f"defended the planet!",
            )

    # Calculate return time
    travel_time = calculate_travel_time(source_planet, target_planet)
    mission.return_time = datetime.now(timezone.utc) + timedelta(seconds=travel_time)
    mission.status = "returning"


def _execute_transport(mission: models.FleetMission, db: Session):
    """Execute a transport mission when it arrives at the target."""
    target_planet = (
        db.query(models.Planet)
        .filter(models.Planet.id == mission.target_planet_id)
        .first()
    )

    source_planet = mission.source_planet
    owner = mission.owner

    if target_planet:
        # Get target planet owner
        target_owner = (
            db.query(models.User)
            .filter(models.User.id == target_planet.owner_id)
            .first()
        )

        if target_owner:
            # Deliver gold to target planet's owner
            target_owner.gold += mission.gold_carried

            if target_planet.owner_id == mission.owner_id:
                # Transport to own planet
                _create_message(
                    db,
                    owner.id,
                    f"Transport to {target_planet.name} complete",
                    f"Your fleet of {mission.ship_count} ships delivered {mission.gold_carried} "
                    f"gold to {target_planet.name}. Ships are returning to {source_planet.name}.",
                )
            else:
                # Transport to another player's planet (gift)
                _create_message(
                    db,
                    owner.id,
                    f"Transport to {target_planet.name} complete",
                    f"Your fleet of {mission.ship_count} ships delivered {mission.gold_carried} "
                    f"gold to {target_planet.name} (owned by {target_owner.username}). "
                    f"Ships are returning to {source_planet.name}.",
                )
                _create_message(
                    db,
                    target_owner.id,
                    f"Gold received at {target_planet.name}",
                    f"A fleet from {owner.username} delivered {mission.gold_carried} gold "
                    f"to your planet {target_planet.name}.",
                )
        else:
            # Fallback if target owner no longer exists
            _create_message(
                db,
                owner.id,
                f"Transport to {target_planet.name} failed",
                f"The target planet no longer has an owner. "
                f"Ships are returning with {mission.gold_carried} gold.",
            )
    else:
        _create_message(
            db,
            owner.id,
            "Transport failed",
            f"The target planet no longer exists. "
            f"Ships are returning with {mission.gold_carried} gold.",
        )

    # Calculate return time
    travel_time = calculate_travel_time(source_planet, target_planet)
    mission.return_time = datetime.now(timezone.utc) + timedelta(seconds=travel_time)
    mission.status = "returning"


def _complete_mission(mission: models.FleetMission, db: Session):
    """Complete a returning mission - return ships and gold to source planet."""
    source_planet = mission.source_planet
    owner = mission.owner

    # Return ships
    ships = (
        db.query(models.Unit)
        .filter(
            models.Unit.planet_id == source_planet.id, models.Unit.name == "space_ship"
        )
        .first()
    )

    if not ships:
        ships = models.Unit(planet_id=source_planet.id, name="space_ship", count=0)
        db.add(ships)

    ships.count += mission.ship_count

    # Return gold (if attack was successful)
    if mission.mission_type == "attack" and mission.gold_carried > 0:
        owner.gold += mission.gold_carried

        _create_message(
            db,
            owner.id,
            f"Fleet returned from {mission.target_planet.name}",
            f"Your {mission.ship_count} ships have returned with {mission.gold_carried} gold.",
        )

    mission.status = "completed"


def _create_message(db: Session, user_id: int, subject: str, body: str):
    """Create a message for a user."""
    message = models.Message(user_id=user_id, subject=subject, body=body)
    db.add(message)
