from sqlalchemy.orm import Session
from datetime import datetime, timedelta
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

def calculate_resources(user: models.User, buildings: list[models.Building], db: Session):
    """
    Update user's gold based on time elapsed and gold mines.
    """
    now = datetime.now()
    if not user.last_resource_update:
        user.last_resource_update = now
        db.commit()
        return

    # Find gold mines
    # Assuming rate depends on level. Prompt: "gold mine which produces 10 gold per hour"
    # Is it 10 * level? Or 10 flat? Let's assume 10 * level for progression.
    gold_production_rate = 0
    for b in buildings:
        if b.name == "gold_mine" and not b.is_constructing:
            gold_production_rate += 10 * b.level
    
    time_diff = now - user.last_resource_update
    hours_passed = time_diff.total_seconds() / 3600.0
    
    # If using integer gold, we accumulate float but store int? 
    # Or just floor it. For simplicity, just add floor(hours * rate).
    # NOTE: This simple approach loses fractional gold if called frequently.
    # Better: keep last_resource_update only when we actually add gold?
    # Or store gold as Float? DB says Integer.
    # Let's only update if at least 1 gold is produced to avoid fractional loss on frequent polls,
    # OR we can just accept the loss for this simple MVP.
    # Alternative: use a float for calculation but only display int.
    # Let's try to be precise:
    
    gold_produced = int(hours_passed * gold_production_rate)
    
    if gold_produced > 0:
        user.gold += gold_produced
        user.last_resource_update = now
        db.commit()
    elif hours_passed > 1.0: 
        # Force update timestamp if it's been a long time even if 0 gold (unlikely)
         user.last_resource_update = now
         db.commit()

