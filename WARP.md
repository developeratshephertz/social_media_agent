# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Development Commands

### Frontend Development (React + Vite)
```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

### Backend Development (FastAPI)
```bash
# Navigate to server directory
cd server

# Install Python dependencies
pip install -r requirements.txt

# Start development server (runs on http://localhost:8000)
python main.py

# Run a single test file
python -m pytest test_filename.py -v

# Run all tests
python -m pytest -v

# Start server with specific configuration
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Database Operations
```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Initialize database schema
# Execute server/database_schema.sql against your PostgreSQL instance

# View database info through API
curl http://localhost:8000/api/database/info

# Check database stats
curl http://localhost:8000/api/stats
```

### Full Stack Development
```bash
# Start all services with Docker
docker-compose up -d

# Start only the database
docker-compose up -d postgres

# Stop all services
docker-compose down

# Rebuild and start services
docker-compose up --build
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: FastAPI (Python) + SQLAlchemy
- **Database**: PostgreSQL 15
- **Deployment**: Docker + Docker Compose
- **AI Services**: Multiple providers (Groq, OpenAI, Stability AI, Google Gemini)

### Core System Architecture

#### 1. Multi-Platform Social Media Posting
The application supports posting to multiple platforms:
- **Facebook**: Uses Facebook Graph API with page-level access tokens
- **Twitter**: Integrates with Twitter API v2 for tweet posting
- **Reddit**: Posts to subreddits using Reddit API
- **Instagram**: Through Facebook's Instagram API

Platform adapters are located in `server/` directory:
- `facebook_manager.py` - Facebook API integration
- `twitter_adapter.py` - Twitter API wrapper  
- `reddit_adapter.py` - Reddit API client
- `social_media_routes.py` - Unified platform management API

#### 2. AI Content Generation Pipeline
The system generates both captions and images using multiple AI providers:

**Caption Generation**:
- Groq (llama-3.1-8b-instant) - Primary provider
- OpenAI GPT-3.5-turbo - Fallback option

**Image Generation**:
- Stability AI (SDXL) - Primary provider
- OpenAI DALL-E 2/3 - Alternative option
- Google Gemini 2.5 Flash - Experimental provider
- Placeholder generation - Fallback when AI services fail

#### 3. Database Schema Architecture
Core entities and their relationships:
- `campaigns` - Group related posts
- `posts` - Main content entity with multi-platform support
- `batch_operations` - Track bulk content generation
- `images` - Store image metadata and generation info
- `captions` - Version and track caption variations
- `posting_schedules` - Advanced scheduling with retry logic
- `calendar_events` - Calendar integration for campaign planning

Key design features:
- UUID primary keys for distributed system compatibility
- JSONB fields for flexible metadata storage
- Array fields for multi-platform targeting
- Comprehensive indexing for query performance

#### 4. Scheduling and Automation
The `SchedulerService` class (`server/scheduler_service.py`) provides:
- Background polling for scheduled posts (60-second intervals)
- Multi-platform publishing with individual platform status tracking
- Retry logic and error handling
- Calendar event synchronization
- Engagement metrics tracking

#### 5. Frontend State Management
The React frontend uses:
- React Router for navigation
- Zustand for state management (likely)
- TailwindCSS for styling with CSS custom properties
- Component-based architecture with error boundaries

Key pages:
- `Dashboard` - Main overview and quick actions
- `CreateCampaign` - Content generation interface  
- `MyCampaigns` - Campaign and post management
- `Analytics` - Performance metrics and insights
- `Settings` - Platform connections and configuration

### Environment Configuration

The application requires multiple API keys and credentials:

**AI Services** (set in `.env`):
- `GROQ_API_KEY` - For caption generation
- `CHATGPT_API` - OpenAI API key
- `STABILITY_API_KEY` - For image generation
- `NANO_BANANA_API_KEY` - Google Gemini key

**Social Platforms**:
- Facebook: `FACEBOOK_PAGE_ID`, `FACEBOOK_ACCESS_TOKEN`
- Twitter: `TWITTER_CONSUMER_KEY`, `TWITTER_CONSUMER_SECRET`, etc.
- Reddit: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, etc.

**Database**:
- PostgreSQL connection details in `docker-compose.yml`

### Key Development Patterns

1. **Error Handling**: Comprehensive fallback mechanisms for AI services and social platform APIs
2. **Async/Await**: Consistent async patterns throughout the FastAPI backend
3. **Type Safety**: Pydantic models for API request/response validation
4. **Database Access**: SQLAlchemy ORM with async database operations
5. **Service Layer**: Separation of concerns with dedicated service classes
6. **Batch Processing**: Support for generating multiple posts with scheduling distribution

### Testing Strategy
- FastAPI provides automatic API documentation at `/docs`
- Health check endpoint at `/health` for service monitoring
- Individual platform status endpoints for connectivity testing
- Database service includes stat collection for monitoring

### Deployment Notes
- The system is containerized with separate containers for app and database
- Frontend builds to static files served by FastAPI
- All file uploads/generated images stored in `public/` directory
- Supports hot-reloading in development mode
- PostgreSQL with persistent volume for data retention