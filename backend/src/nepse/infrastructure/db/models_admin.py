"""SQLAlchemy models and repository for admin settings, data sources, schedules, and AI configs."""
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    func,
    select,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from nepse.infrastructure.db.models import Base


class DataSourceRow(Base):
    __tablename__ = "data_sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rate_limit_delay_ms: Mapped[int] = mapped_column(Integer, default=500)
    timeout_sec: Mapped[int] = mapped_column(Integer, default=30)
    health_status: Mapped[str] = mapped_column(String(32), default="HEALTHY")
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_msg: Mapped[str | None] = mapped_column(Text, nullable=True)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ScheduledJobRow(Base):
    __tablename__ = "scheduled_jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cron_expr: Mapped[str] = mapped_column(String(64), nullable=False)
    schedule_time_npt: Mapped[str] = mapped_column(String(8), default="16:00", nullable=False)
    days_of_week: Mapped[str] = mapped_column(String(32), default="sun,mon,tue,wed,thu", nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_status: Mapped[str] = mapped_column(String(32), default="IDLE")
    last_duration_sec: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    parameters: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class JobExecutionLogRow(Base):
    __tablename__ = "job_execution_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    triggered_by: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)  # 'RUNNING', 'SUCCESS', 'FAILED'
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_sec: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Numeric(10, 6), default=0)
    summary: Mapped[dict] = mapped_column(JSONB, default=dict)
    error_details: Mapped[str | None] = mapped_column(Text, nullable=True)


class AiAgentConfigRow(Base):
    __tablename__ = "ai_agent_configs"

    agent_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    model_provider: Mapped[str] = mapped_column(String(64), default="openrouter", nullable=False)
    model_slug: Mapped[str] = mapped_column(String(128), default="deepseek/deepseek-chat", nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    temperature: Mapped[float] = mapped_column(Numeric(3, 2), default=0.1)
    max_tokens: Mapped[int] = mapped_column(Integer, default=2048)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    user_prompt_template: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SystemSettingRow(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SqlAdminRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # 1. System Settings
    async def get_setting(self, key: str, default: Any = None) -> Any:
        row = await self.session.scalar(select(SystemSettingRow).where(SystemSettingRow.key == key))
        return row.value if row else default

    async def set_setting(self, key: str, value: dict, description: str | None = None) -> None:
        row = await self.session.scalar(select(SystemSettingRow).where(SystemSettingRow.key == key))
        if row:
            row.value = value
            if description:
                row.description = description
        else:
            self.session.add(SystemSettingRow(key=key, value=value, description=description))
        await self.session.commit()

    async def get_all_settings(self) -> dict[str, Any]:
        rows = (await self.session.scalars(select(SystemSettingRow))).all()
        return {r.key: r.value for r in rows}

    # 2. Data Sources
    async def list_data_sources(self) -> list[DataSourceRow]:
        return list((await self.session.scalars(select(DataSourceRow).order_by(DataSourceRow.priority.asc()))).all())

    async def update_data_source(self, source_id: str, updates: dict[str, Any]) -> DataSourceRow | None:
        row = await self.session.scalar(select(DataSourceRow).where(DataSourceRow.id == source_id))
        if not row:
            return None
        for k, v in updates.items():
            if hasattr(row, k):
                setattr(row, k, v)
        await self.session.commit()
        return row

    async def record_data_source_result(self, source_id: str, success: bool, error_msg: str | None = None) -> None:
        row = await self.session.scalar(select(DataSourceRow).where(DataSourceRow.id == source_id))
        if row:
            now = datetime.now(timezone.utc)
            if success:
                row.last_success_at = now
                row.health_status = "HEALTHY"
                row.last_error_msg = None
            else:
                row.last_error_at = now
                row.health_status = "DEGRADED"
                row.last_error_msg = error_msg
            await self.session.commit()

    # 3. Scheduled Jobs
    async def list_scheduled_jobs(self) -> list[ScheduledJobRow]:
        return list((await self.session.scalars(select(ScheduledJobRow).order_by(ScheduledJobRow.schedule_time_npt.asc()))).all())

    async def get_scheduled_job(self, job_id: str) -> ScheduledJobRow | None:
        return await self.session.scalar(select(ScheduledJobRow).where(ScheduledJobRow.id == job_id))

    async def update_scheduled_job(self, job_id: str, updates: dict[str, Any]) -> ScheduledJobRow | None:
        row = await self.session.scalar(select(ScheduledJobRow).where(ScheduledJobRow.id == job_id))
        if not row:
            return None
        for k, v in updates.items():
            if hasattr(row, k):
                setattr(row, k, v)
        await self.session.commit()
        return row

    # 4. Job Execution Logs
    async def create_log(self, job_id: str, triggered_by: str) -> int:
        row = JobExecutionLogRow(
            job_id=job_id,
            triggered_by=triggered_by,
            status="RUNNING",
            started_at=datetime.now(timezone.utc),
        )
        self.session.add(row)
        await self.session.commit()
        return row.id

    async def finish_log(
        self,
        log_id: int,
        status: str,
        duration_sec: float,
        summary: dict,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        cost_usd: float = 0.0,
        error_details: str | None = None,
    ) -> None:
        row = await self.session.scalar(select(JobExecutionLogRow).where(JobExecutionLogRow.id == log_id))
        if row:
            row.status = status
            row.finished_at = datetime.now(timezone.utc)
            row.duration_sec = duration_sec
            row.summary = summary
            row.prompt_tokens = prompt_tokens
            row.completion_tokens = completion_tokens
            row.cost_usd = cost_usd
            row.error_details = error_details
            await self.session.commit()

    async def list_logs(self, limit: int = 30) -> list[JobExecutionLogRow]:
        stmt = select(JobExecutionLogRow).order_by(JobExecutionLogRow.started_at.desc()).limit(limit)
        return list((await self.session.scalars(stmt)).all())

    async def get_token_usage_stats(self) -> dict[str, Any]:
        """Aggregate token usage and cost metrics."""
        prompt_res = await self.session.scalar(select(func.sum(JobExecutionLogRow.prompt_tokens))) or 0
        comp_res = await self.session.scalar(select(func.sum(JobExecutionLogRow.completion_tokens))) or 0
        cost_res = await self.session.scalar(select(func.sum(JobExecutionLogRow.cost_usd))) or 0.0
        runs_res = await self.session.scalar(select(func.count(JobExecutionLogRow.id))) or 0

        return {
            "total_runs": runs_res,
            "total_prompt_tokens": int(prompt_res),
            "total_completion_tokens": int(comp_res),
            "total_tokens": int(prompt_res + comp_res),
            "total_cost_usd": float(cost_res),
        }

    # 5. AI Agent Configs
    async def list_agent_configs(self) -> list[AiAgentConfigRow]:
        return list((await self.session.scalars(select(AiAgentConfigRow))).all())

    async def get_agent_config(self, agent_id: str) -> AiAgentConfigRow | None:
        return await self.session.scalar(select(AiAgentConfigRow).where(AiAgentConfigRow.agent_id == agent_id))

    async def update_agent_config(self, agent_id: str, updates: dict[str, Any]) -> AiAgentConfigRow | None:
        row = await self.session.scalar(select(AiAgentConfigRow).where(AiAgentConfigRow.agent_id == agent_id))
        if not row:
            return None
        for k, v in updates.items():
            if hasattr(row, k):
                setattr(row, k, v)
        await self.session.commit()
        return row
