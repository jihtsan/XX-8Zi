from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.admin.router import router as admin_router

# Import domain models before creating metadata.
from app.catalog import models as _catalog_models  # noqa: F401
from app.catalog.router import router as catalog_router
from app.identity import models as _identity_models  # noqa: F401
from app.identity.router import router as identity_router
from app.merchant_settings import models as _merchant_models  # noqa: F401
from app.merchant_settings.amap_proxy import router as amap_proxy_router
from app.merchant_settings.router import router as merchant_settings_router
from app.ordering import models as _ordering_models  # noqa: F401
from app.ordering.router import router as ordering_router
from app.seed import seed_data
from app.shared.config import get_settings
from app.shared.database import create_schema
from app.shared.storage import media_root


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await create_schema()
    await seed_data()
    yield


app = FastAPI(
    title="玄序商城 API",
    version="0.1.0",
    description="水晶、佛珠与天然饰品商城一期 API。订单代表购买意向，不代表在线支付。",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog_router, prefix="/api/v1")
app.include_router(identity_router, prefix="/api/v1")
app.include_router(ordering_router, prefix="/api/v1")
app.include_router(merchant_settings_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(amap_proxy_router)
app.mount("/media", StaticFiles(directory=media_root()), name="media")


@app.get("/health")
async def health():
    return {"status": "ok", "database": "sqlite"}
