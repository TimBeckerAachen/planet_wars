from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import random
import models
from sqlalchemy import or_

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
        existing = db.query(models.Planet).filter(
            models.Planet.x >= x - 1,
            models.Planet.x <= x + 1,
            models.Planet.y >= y - 1,
            models.Planet.y <= y + 1
        ).first()
        
        if not existing:
            # Safe to assign
            new_planet = models.Planet(
                owner_id=user_id,
                x=x,
                y=y,
                name=f"Planet {x}-{y}"
            )
            db.add(new_planet)
            db.commit()
            db.refresh(new_planet)
            
            # Create initial Gold Mine
            gold_mine = models.Building(
                planet_id=new_planet.id,
                name="gold_mine",
                level=1,
                is_constructing=0
            )
            db.add(gold_mine)
            db.commit()
            
            return new_planet
            
    return None # Grid is likely full


# Base Stats
BUILDING_STATS = {
    "gold_mine": {"base_cost": 50, "base_time": 3600, "base_production": 10}, # 1 hour
    "space_ship_factory": {"base_cost": 100, "base_time": 7200, "base_production": 0}, # 2 hours
    "university": {"base_cost": 150, "base_time": 10800, "base_production": 0}, # 3 hours
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
        "production": stats["base_production"] * level if stats["base_production"] else 0
    }

# Unit Stats
UNIT_STATS = {
    "pilot": {"cost": {"gold": 50}, "base_time": 600}, # 10 minutes
    "space_ship": {"cost": {"gold": 100, "pilot": 1}, "base_time": 1200}, # 20 minutes
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
        "base_time": stats["base_time"]
    }

def process_production(planet: models.Planet, buildings: list[models.Building], db: Session):
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
                unit = db.query(models.Unit).filter(
                    models.Unit.planet_id == planet.id,
                    models.Unit.name == unit_type
                ).first()
                
                if not unit:
                     unit = models.Unit(planet_id=planet.id, name=unit_type, count=0)
                     db.add(unit)
                     # Need to flush to get ID if needed, but not needed here
                
                unit.count += 1
                dirty = True
                
    if dirty:
        db.commit()

def calculate_resources(user: models.User, buildings: list[models.Building], db: Session):
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

