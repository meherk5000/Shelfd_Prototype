# Shelfd

Shelfd is a comprehensive media tracking and discovery platform that allows users to track, review, and discuss books, movies, TV shows, and articles. The platform features personalized recommendations, social features like clubs, and shelves for organizing media content.

## Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Key Features](#key-features)
- [Setup Instructions](#setup-instructions)
- [Development](#development)
- [API Endpoints](#api-endpoints)
- [License](#license)

## Project Overview

Shelfd is a full-stack application that helps users track and organize their media consumption across multiple formats (books, movies, TV shows, articles). The platform includes social features like book/movie clubs, discussions, reviews, and personalized recommendations.

### Features

- Media tracking for books, movies, TV shows, and articles
- Personalized recommendations
- Custom shelves for organizing media
- Social features including clubs and discussions
- User reviews and ratings
- Activity feed
- Authentication system

## Technology Stack

### Frontend

- **Framework**: Next.js 15
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **Authentication**: Auth0
- **State Management**: React Context API
- **HTTP Client**: Axios

### Backend

- **Framework**: FastAPI (Python)
- **Database**: MongoDB with Beanie ODM
- **Authentication**: JWT-based auth
- **Media Data**: External APIs for books, movies, and TV shows
- **Recommendation System**: Custom-built recommendation engine

## Project Structure

The project is organized into two main directories:

```
/shelfd
  ├── frontend/      # Next.js frontend application
  └── backend/       # FastAPI backend application
```

## Frontend Architecture

The frontend is a Next.js application structured as follows:

```
/frontend
  ├── app/           # Next.js app router pages
  │   ├── (protected)/  # Protected routes requiring authentication
  │   ├── auth/      # Authentication related pages
  │   ├── books/     # Book-related pages
  │   ├── movies/    # Movie-related pages
  │   ├── tv/        # TV show-related pages
  │   ├── article/   # Article-related pages
  │   ├── search/    # Search functionality
  │   └── threads/   # Discussion threads
  │
  ├── components/    # Reusable React components
  │   ├── ui/        # Base UI components from shadcn
  │   ├── books/     # Book-specific components
  │   ├── movies/    # Movie-specific components
  │   ├── tv/        # TV-specific components
  │   ├── shelf/     # Shelf-related components
  │   ├── clubs/     # Club-related components
  │   ├── reviews/   # Review components
  │   ├── media/     # General media components
  │   └── profile-tabs/ # User profile components
  │
  ├── lib/           # Utility functions and hooks
  ├── services/      # API service functions
  └── public/        # Static assets
```

## Backend Architecture

The backend is a FastAPI application structured as follows:

```
/backend
  ├── app/           # Main application code
  │   ├── database/  # Database models and connection
  │   │   ├── client/  # MongoDB connection
  │   │   └── models/  # Database models
  │   │
  │   ├── routes/    # API route handlers
  │   └── services/  # Business logic services
  │
  ├── scripts/       # Utility scripts for data processing
  │   └── data/      # Data for recommendation system
  │
  ├── uploads/       # Storage for uploaded files
  └── main.py        # Application entry point
```

### Database Models

- **User**: User account information
- **ShelfModel**: Represents user shelves
- **ShelfItemModel**: Items within user shelves
- **Review**: User reviews of media
- **ReviewLike**: Likes on reviews
- **Club**: Media clubs for group reading/watching
- **ClubPost**: Posts within clubs
- **ClubThread**: Discussion threads
- **ClubMilestone**: Progress milestones within clubs
- **ClubMessage**: Messages in club discussions
- **Recommendation**: Personalized media recommendations

## Key Features

### Media Tracking

Users can track books, movies, TV shows, and articles they've consumed or plan to consume.

### Shelf System

Users can organize media into customized shelves such as:

- Currently reading/watching
- Want to read/watch
- Completed
- Custom shelves

### Social Features

- **Clubs**: Join or create clubs to read/watch media together
- **Discussions**: Participate in threaded discussions about media

### Recommendations

The system provides personalized recommendations based on:

- User preferences
- Past consumption
- Similar users' preferences

## Setup Instructions

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- MongoDB

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Environment Variables

Frontend (.env.local):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend (.env):

```
MONGODB_URL=your_mongodb_connection_string
MONGODB_NAME=shelfd
JWT_SECRET=your_jwt_secret
```

## Development

### Running in Development Mode

Frontend:

```bash
cd frontend
npm run dev
```

Backend:

```bash
cd backend
uvicorn main:app --reload
```

### Building for Production

Frontend:

```bash
cd frontend
npm run build
```

Backend:

```bash
cd backend
uvicorn main:app
```

## API Endpoints

The API is organized around the following resource groups:

### Authentication

- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: User login
- `GET /api/auth/me`: Get current user info

### Shelves

- `GET /api/shelves`: Get user shelves
- `POST /api/shelves`: Create new shelf
- `PUT /api/shelves/{id}`: Update shelf
- `DELETE /api/shelves/{id}`: Delete shelf
- `POST /api/shelves/{id}/items`: Add item to shelf
- `DELETE /api/shelves/{id}/items/{item_id}`: Remove item from shelf

### Media

- `GET /media/books/search`: Search for books
- `GET /media/movies/search`: Search for movies
- `GET /media/tv/search`: Search for TV shows

### Reviews

- `GET /api/reviews/{media_type}/{media_id}`: Get reviews for media
- `POST /api/reviews`: Create a review
- `PUT /api/reviews/{id}`: Update a review
- `DELETE /api/reviews/{id}`: Delete a review

### Clubs

- `GET /api/clubs`: Get all clubs
- `POST /api/clubs`: Create a club
- `GET /api/clubs/{id}`: Get club details
- `PUT /api/clubs/{id}`: Update club
- `DELETE /api/clubs/{id}`: Delete club

### Recommendations

- `GET /api/recommendations`: Get personalized recommendations

## License

This project is licensed under the MIT License.
