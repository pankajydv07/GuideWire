"""
Dev 3: Trigger Service ORM Models
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, DECIMAL
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base


class DisruptionEvent(Base):
    __tablename__ = "disruption_events"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)
    zone_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("zones.id"), nullable=False)
    slot_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    slot_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    data_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WeatherData(Base):
    __tablename__ = "weather_data"

    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    zone_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    temperature: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    rainfall_mm: Mapped[float | None] = mapped_column(DECIMAL(6, 2), nullable=True)
    aqi: Mapped[int | None] = mapped_column(Integer, nullable=True)
    humidity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    wind_speed: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)


class PlatformSnapshot(Base):
    __tablename__ = "platform_snapshots"

    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    rider_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    zone_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    orders_per_hour: Mapped[int | None] = mapped_column(Integer, nullable=True)
    earnings_current_slot: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rider_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    store_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    platform_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
