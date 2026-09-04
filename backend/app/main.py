import os
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import analytics, datasets, ml
from backend.app.config.settings import settings
from backend.app.utils.errors import (
    AppError,
    app_error_handler,
    generic_http_error_handler,
    unhandled_exception_handler,
    validation_error_handler,
)

app = FastAPI(
    title="DataLens AI Analytics Engine",
    description="Deterministic dataset ingestion, schema inference, and statistical profiling backend.",
    version="1.0.0",
    docs_url="/api/docs" if settings.ENV == "development" else None,
    redoc_url="/api/redoc" if settings.ENV == "development" else None,
)

# CORS Configuration
origins = settings.ALLOWED_ORIGINS
custom_origins = os.getenv("ALLOWED_ORIGINS")
if custom_origins:
    origins.extend([o.strip() for o in custom_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(HTTPException, generic_http_error_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Include Routers
app.include_router(datasets.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(ml.router, prefix=settings.API_V1_PREFIX)


@app.get("/api/health", tags=["health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "DataLens AI Backend",
        "phase": "Phase 3: Deterministic Analytics Engine",
        "storageDeferred": True,
    }
