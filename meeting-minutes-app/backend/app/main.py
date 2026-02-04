from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes import router
from app.models.database import init_db
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="Meeting Minutes Generator API",
    description="API for transcribing audio and generating meeting minutes",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api/meetings", tags=["meetings"])


@app.get("/")
async def root():
    return {
        "message": "Meeting Minutes Generator API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_configured": bool(settings.openai_api_key),
        "anthropic_configured": bool(settings.anthropic_api_key),
    }
