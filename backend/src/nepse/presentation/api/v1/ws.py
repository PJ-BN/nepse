"""WS /api/v1/ws/live: snapshot on connect, then the subscribed topics of `nepse:live:events`, unchanged."""
import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from nepse.infrastructure.cache.live_market import EVENTS_CHANNEL, live_snapshot
from nepse.infrastructure.cache.redis_client import redis

router = APIRouter()

TOPICS = {"quote", "index", "status", "whale", "depth"}


async def _read_subscriptions(ws: WebSocket, topics: set[str]) -> None:
    while True:
        try:
            msg = json.loads(await ws.receive_text())
        except json.JSONDecodeError:
            continue
        if isinstance(msg, dict) and isinstance(msg.get("subscribe"), list):
            topics.clear()
            topics.update(TOPICS.intersection(msg["subscribe"]))


async def _forward_events(ws: WebSocket, topics: set[str]) -> None:
    # ponytail: one Redis pub/sub connection per client; switch to a shared fan-out hub past a few hundred clients
    async with redis.pubsub() as pubsub:
        await pubsub.subscribe(EVENTS_CHANNEL)
        async for msg in pubsub.listen():
            if msg["type"] != "message":
                continue
            try:
                topic = json.loads(msg["data"]).get("topic")
            except (json.JSONDecodeError, AttributeError):
                continue
            if topic in topics:
                await ws.send_text(msg["data"])


@router.websocket("/api/v1/ws/live")
async def live(ws: WebSocket) -> None:
    await ws.accept()
    topics: set[str] = set()
    await ws.send_json({"topic": "snapshot", "data": await live_snapshot(redis)})
    tasks = [asyncio.create_task(_read_subscriptions(ws, topics)), asyncio.create_task(_forward_events(ws, topics))]
    try:
        done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for t in done:
            if (exc := t.exception()) and not isinstance(exc, WebSocketDisconnect):
                raise exc
    except WebSocketDisconnect:
        pass
    finally:
        for t in tasks:
            t.cancel()
