import asyncio
from app.models.base import Base
from app.extension import engine
from app.models.user import User

async def init_models():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

asyncio.run(init_models())