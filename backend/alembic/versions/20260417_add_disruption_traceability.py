"""add_disruption_traceability

Revision ID: 20260417_add_disruption_traceability
Revises: 20260413_add_grap_vehicle_ban_to_platform_snapshots
Create Date: 2026-04-17
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260417_add_disruption_traceability"
down_revision = "20260413_add_grap_vehicle_ban_to_platform_snapshots"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "disruption_events",
        sa.Column("source", sa.String(length=30), nullable=False, server_default="scheduler"),
    )
    op.add_column(
        "disruption_events",
        sa.Column("processing_status", sa.String(length=20), nullable=False, server_default="triggered"),
    )

    op.create_table(
        "disruption_execution_steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("disruption_event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("step_key", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("meta_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["disruption_event_id"], ["disruption_events.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "disruption_rider_traces",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("disruption_event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rider_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("zone_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("processing_stage", sa.String(length=30), nullable=False),
        sa.Column("verification_result", sa.String(length=20), nullable=False),
        sa.Column("verification_reason", sa.String(length=120), nullable=True),
        sa.Column("fraud_score", sa.Integer(), nullable=True),
        sa.Column("expected_earnings", sa.Integer(), nullable=True),
        sa.Column("actual_earnings", sa.Integer(), nullable=True),
        sa.Column("income_loss", sa.Integer(), nullable=True),
        sa.Column("eligible_payout_amount", sa.Integer(), nullable=True),
        sa.Column("claim_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payout_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payout_status", sa.String(length=20), nullable=True),
        sa.Column("snapshot_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trace_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["claim_id"], ["claims.id"]),
        sa.ForeignKeyConstraint(["disruption_event_id"], ["disruption_events.id"]),
        sa.ForeignKeyConstraint(["payout_id"], ["payouts.id"]),
        sa.ForeignKeyConstraint(["rider_id"], ["riders.id"]),
        sa.ForeignKeyConstraint(["zone_id"], ["zones.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("disruption_rider_traces")
    op.drop_table("disruption_execution_steps")
    op.drop_column("disruption_events", "processing_status")
    op.drop_column("disruption_events", "source")
