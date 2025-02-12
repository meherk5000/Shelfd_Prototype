from fastapi.middleware.cors import CORSMiddleware

# ... other imports ...

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://shelfd-prototype.vercel.app",  # Production frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ... rest of your code ... 