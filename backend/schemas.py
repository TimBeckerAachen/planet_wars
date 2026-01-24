from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, validator


class UserSignupRequest(BaseModel):
    """Schema for user registration request"""

    username: str = Field(
        ..., min_length=3, max_length=50, description="Unique username"
    )
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(
        ..., min_length=8, max_length=100, description="Password (min 8 characters)"
    )

    @validator("username")
    def username_alphanumeric(cls, v):
        """Ensure username is alphanumeric with underscores/hyphens allowed"""
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError(
                "Username must be alphanumeric (underscores and hyphens allowed)"
            )
        return v


class UserLoginRequest(BaseModel):
    """Schema for user login request"""

    identifier: str = Field(..., description="Username or email")
    password: str = Field(..., description="User password")


class UserResponse(BaseModel):
    """Schema for user data response (excludes password)"""

    id: int
    username: str
    email: str
    gold: int = 100
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PlanetResponse(BaseModel):
    id: int
    x: int
    y: int
    name: str
    owner_id: int
    owner_username: Optional[str] = None

    class Config:
        from_attributes = True


class PlanetRenameRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=50, description="New planet name")

    @validator("name")
    def name_alphanumeric(cls, v):
        if not v.replace(" ", "").replace("-", "").isalnum():
            raise ValueError(
                "Planet name must be alphanumeric (spaces and hyphens allowed)"
            )
        return v


class BuildingResponse(BaseModel):
    id: int
    name: str
    level: int
    is_constructing: bool
    finish_time: Optional[datetime] = None
    production_type: Optional[str] = None
    production_finish_time: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProductionOption(BaseModel):
    name: str  # unit name
    cost: dict[str, int]  # e.g. {"gold": 100, "pilot": 1}
    duration: int  # seconds
    base_time: int  # for reference


class BuildingDetailsResponse(BuildingResponse):
    """Deep details for single building view"""

    upgrade_cost: Optional[int] = None
    upgrade_duration: Optional[int] = None
    production_options: list[ProductionOption] = []
    current_production_speed_bonus: Optional[float] = None
    next_level_production_speed_bonus: Optional[float] = None


class UnitResponse(BaseModel):
    id: int
    name: str
    count: int

    class Config:
        from_attributes = True


class ConstructionOption(BaseModel):
    name: str
    type: str  # 'build' or 'upgrade'
    cost: int
    duration: int  # seconds
    production: int  # optional, if relevant
    level: int


class GameStateResponse(BaseModel):
    user: UserResponse
    planet: PlanetResponse
    buildings: list[BuildingResponse]
    units: list[UnitResponse]
    construction_options: list[ConstructionOption] = []


class MapStateResponse(BaseModel):
    planets: list[PlanetResponse]


class AuthResponse(BaseModel):
    """Schema for authentication response with JWT token"""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Schema for decoded JWT token payload"""

    user_id: int
    username: str


class AuthErrorResponse(BaseModel):
    """Schema for authentication error responses"""

    detail: str


# Fleet Mission Schemas


class FleetSendRequest(BaseModel):
    """Request to send a fleet on a mission"""

    target_planet_id: int = Field(..., description="ID of the target planet")
    mission_type: str = Field(..., description="'attack' or 'transport'")
    ship_count: int = Field(..., gt=0, description="Number of ships to send")
    gold_amount: int = Field(
        default=0, ge=0, description="Gold to transport (transport only)"
    )

    @validator("mission_type")
    def validate_mission_type(cls, v):
        if v not in ("attack", "transport"):
            raise ValueError("mission_type must be 'attack' or 'transport'")
        return v


class FleetMissionResponse(BaseModel):
    """Response for a fleet mission"""

    id: int
    source_planet_id: int
    target_planet_id: int
    source_planet_name: Optional[str] = None
    target_planet_name: Optional[str] = None
    mission_type: str
    ship_count: int
    gold_carried: int
    departure_time: datetime
    arrival_time: datetime
    return_time: Optional[datetime] = None
    status: str
    owner_id: int

    class Config:
        from_attributes = True


class IncomingFleetResponse(BaseModel):
    """Information about an incoming fleet"""

    id: int
    source_planet_name: str
    source_owner_username: str
    ship_count: int
    mission_type: str
    arrival_time: datetime


class FleetMissionsListResponse(BaseModel):
    """List of fleet missions"""

    outgoing: list[FleetMissionResponse] = []
    incoming: list[IncomingFleetResponse] = []


# Message Schemas


class MessageResponse(BaseModel):
    """Response for a single message"""

    id: int
    subject: str
    body: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    """List of messages"""

    messages: list[MessageResponse]
    unread_count: int


class SendMessageRequest(BaseModel):
    """Request to send a message to another player"""

    recipient_username: str
    subject: str
    body: str
