from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """User model for authentication"""
    __tablename__ = "users"


    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # Game Resources
    gold = Column(Integer, default=100, nullable=False)
    last_resource_update = Column(DateTime(timezone=True), server_default=func.now())
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Planet(Base):
    """Planet model for the game map"""
    __tablename__ = "planets"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, index=True, nullable=False)  # Foreign key to User
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    name = Column(String, default="Colony")

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Building(Base):
    """Building model for constructions on planets"""
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    planet_id = Column(Integer, index=True, nullable=False)  # Foreign key to Planet
    name = Column(String, nullable=False)  # gold_mine, space_ship_factory, university
    level = Column(Integer, default=1, nullable=False)
    
    # Construction status
    is_constructing = Column(Integer, default=0)  # 0: No, 1: Yes (Boolean stored as Int for SQLite compatibility if needed)
    finish_time = Column(DateTime(timezone=True), nullable=True)


class Unit(Base):
    """Unit model for fleets on planets"""
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    planet_id = Column(Integer, index=True, nullable=False)  # Foreign key to Planet
    name = Column(String, nullable=False)  # pilot, space_ship
    count = Column(Integer, default=0, nullable=False)

