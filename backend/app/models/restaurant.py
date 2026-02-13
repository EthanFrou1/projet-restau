from enum import Enum

from sqlalchemy import Enum as SQLEnum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.associations import user_restaurants


class RestaurantZone(str, Enum):
    NON_DEFINIE = "NON_DEFINIE"
    ZONE_EST = "ZONE_EST"
    ZONE_OUEST = "ZONE_OUEST"
    ZONE_SUD = "ZONE_SUD"
    ZONE_NORD = "ZONE_NORD"


class Restaurant(Base):
    __tablename__ = "restaurants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    zone: Mapped[RestaurantZone] = mapped_column(
        SQLEnum(RestaurantZone, name="restaurant_zone", native_enum=False),
        default=RestaurantZone.NON_DEFINIE,
        nullable=False,
    )

    users: Mapped[list["User"]] = relationship(
        secondary=user_restaurants,
        back_populates="restaurants",
    )
