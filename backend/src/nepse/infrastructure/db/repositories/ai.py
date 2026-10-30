"""PostgreSQL / SQLAlchemy repository for AI evaluations and historical runs."""
from datetime import datetime, timezone
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.infrastructure.db.models_ai import AiEvaluationHistoryRow, AiEvaluationRow


class SqlAiRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_latest(self, feature: str, entity_key: str) -> dict | None:
        """Fetch the most recent saved evaluation for a given feature and entity."""
        stmt = sa.select(AiEvaluationRow).where(
            AiEvaluationRow.feature == feature.lower().strip(),
            AiEvaluationRow.entity_key == entity_key.upper().strip(),
        )
        res = await self.session.execute(stmt)
        row = res.scalar_one_or_none()
        if not row:
            return None

        data = dict(row.payload)
        # Ensure timestamp and metadata fields are populated in the response
        gen_iso = row.generated_at.isoformat()
        if "evaluated_at" not in data:
            data["evaluated_at"] = gen_iso
        if "analyzed_at" not in data:
            data["analyzed_at"] = gen_iso
        data["generated_at"] = gen_iso
        data["source"] = row.source
        data["db_updated_at"] = row.updated_at.isoformat()
        return data

    async def upsert_evaluation(
        self,
        feature: str,
        entity_key: str,
        payload: dict,
        source: str = "agy",
        generated_at: datetime | None = None,
    ) -> dict:
        """Upsert the active evaluation for an entity and record in history table."""
        feat = feature.lower().strip()
        key = entity_key.upper().strip()
        now_dt = generated_at or datetime.now(timezone.utc)

        # 1. Upsert into main ai_evaluations table
        insert_stmt = insert(AiEvaluationRow).values(
            feature=feat,
            entity_key=key,
            payload=payload,
            source=source,
            generated_at=now_dt,
        )
        upsert_stmt = insert_stmt.on_conflict_do_update(
            constraint="uq_ai_evaluations_feature_key",
            set_={
                "payload": insert_stmt.excluded.payload,
                "source": insert_stmt.excluded.source,
                "generated_at": insert_stmt.excluded.generated_at,
                "updated_at": sa.func.now(),
            },
        )
        await self.session.execute(upsert_stmt)

        # 2. Append to history log
        history_stmt = insert(AiEvaluationHistoryRow).values(
            feature=feat,
            entity_key=key,
            payload=payload,
            source=source,
            generated_at=now_dt,
        )
        await self.session.execute(history_stmt)
        await self.session.commit()

        return {
            "feature": feat,
            "entity_key": key,
            "source": source,
            "generated_at": now_dt.isoformat(),
            "status": "saved",
        }

    async def list_history(
        self,
        feature: str,
        entity_key: str,
        limit: int = 10,
    ) -> list[dict]:
        """Fetch past generation history for an entity."""
        stmt = (
            sa.select(AiEvaluationHistoryRow)
            .where(
                AiEvaluationHistoryRow.feature == feature.lower().strip(),
                AiEvaluationHistoryRow.entity_key == entity_key.upper().strip(),
            )
            .order_by(AiEvaluationHistoryRow.generated_at.desc())
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        rows = res.scalars().all()
        return [
            {
                "id": r.id,
                "feature": r.feature,
                "entity_key": r.entity_key,
                "payload": r.payload,
                "source": r.source,
                "generated_at": r.generated_at.isoformat(),
            }
            for r in rows
        ]
