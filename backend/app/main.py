from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import auth, shelf, media  # Import your route modules

app = FastAPI()

# More explicit CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Explicitly list methods
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
    max_age=3600,
)

# Include your routers AFTER CORS middleware
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(shelf.router, prefix="/api/shelves", tags=["shelves"])
app.include_router(media.router, prefix="/api/media", tags=["media"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 