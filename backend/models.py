from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
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
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    planets = relationship("Planet", back_populates="owner")


class Planet(Base):
    """Planet model for the game map"""

    __tablename__ = "planets"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    name = Column(String, default="Colony", unique=True, nullable=False)

    owner = relationship("User", back_populates="planets")

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Building(Base):
    """Building model for constructions on planets"""

    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    planet_id = Column(Integer, ForeignKey("planets.id"), index=True, nullable=False)
    name = Column(String, nullable=False)  # gold_mine, space_ship_factory, university
    level = Column(Integer, default=1, nullable=False)

    # Construction status
    is_constructing = Column(
        Integer, default=0
    )  # 0: No, 1: Yes (Boolean stored as Int for SQLite compatibility if needed)
    finish_time = Column(DateTime(timezone=True), nullable=True)

    # Unit Production status
    production_type = Column(String, nullable=True)  # e.g. "pilot", "space_ship"
    production_finish_time = Column(DateTime(timezone=True), nullable=True)


class Unit(Base):
    """Unit model for fleets on planets"""

    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    planet_id = Column(Integer, ForeignKey("planets.id"), index=True, nullable=False)
    name = Column(String, nullable=False)  # pilot, space_ship
    count = Column(Integer, default=0, nullable=False)


class FleetMission(Base):
    """Fleet missions (attack or transport)"""

    __tablename__ = "fleet_missions"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    source_planet_id = Column(Integer, ForeignKey("planets.id"), nullable=False)
    target_planet_id = Column(Integer, ForeignKey("planets.id"), nullable=False)
    mission_type = Column(String, nullable=False)  # "attack" or "transport"
    ship_count = Column(Integer, nullable=False)
    gold_carried = Column(Integer, default=0)  # for transport missions
    departure_time = Column(DateTime(timezone=True), server_default=func.now())
    arrival_time = Column(DateTime(timezone=True), nullable=False)
    return_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="outbound")  # outbound, returning, completed

    owner = relationship("User", foreign_keys=[owner_id])
    source_planet = relationship("Planet", foreign_keys=[source_planet_id])
    target_planet = relationship("Planet", foreign_keys=[target_planet_id])


class Message(Base):
    """Player messages for mission reports"""

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(String, nullable=False)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
