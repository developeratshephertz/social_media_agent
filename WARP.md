# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a full-stack **Social Media Agent** application that uses AI to generate, schedule, and publish content across multiple social media platforms. The system combines React frontend, FastAPI backend, and PostgreSQL database with integrated AI services for content generation.

## Architecture

### Frontend (React + Vite)
- **Framework**: React 19 with Vite for fast development and bundling
- **Styling**: Tailwind CSS with custom theming and Radix UI components
- **State Management**: Zustand for campaign and post management
- **Routing**: React Router for SPA navigation
- **Key Features**: Dashboard, campaign creation, scheduling calendar, analytics, settings

### Backend (FastAPI + Python)
- **Framework**: FastAPI with async/await support
- **Database**: PostgreSQL with SQLAlchemy ORM and Alembic migrations
- **AI Integration**: Multiple providers (Groq, OpenAI, Stability AI) for content generation
- **Social Media APIs**: Twitter, Reddit, Facebook/Instagram (disabled), Google services
- **Scheduling**: Background scheduler with APScheduler for automated posting
- **Multi-platform Support**: Unified posting interface for multiple social platforms

### Database Schema
- **Core Tables**: `posts`, `campaigns`, `calendar_events`, `batch_operations`
- **Detailed Tracking**: `images`, `captions`, `posting_schedules` with generation metadata
- **Multi-platform**: Array fields for platform targeting, JSON for engagement metrics

## Development Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start dev server (localhost:5173)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Backend Development
```bash
# Navigate to server directory
cd server

# Install Python dependencies
pip install -r requirements.txt

# Run FastAPI server (localhost:8000)
python main.py

# Run with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Database Operations
```bash
# Initialize database with schema
psql -U username -d social_media_agent -f database_schema.sql

# Run migrations (if using Alembic)
cd server && alembic upgrade head

# Reset database (Docker)
docker-compose down -v
docker-compose up -d
```

### Docker Operations
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Rebuild and restart
docker-compose down && docker-compose build --no-cache && docker-compose up -d

# Database backup
docker-compose exec db pg_dump -U agent_user social_media_agent > backup.sql
```

## Key Components

### AI Content Generation
- **Caption Generation**: Groq (primary) and OpenAI integrations with fallback templates
- **Image Generation**: Stability AI with placeholder fallback using PIL
- **Provider Switching**: Runtime selection between AI providers via API parameters

### Social Media Integrations
- **Reddit**: Full posting with image upload via `reddit_service.py` and `reddit_adapter.py`
- **Twitter**: Tweet posting with media via `twitter_service.py` and `twitter_adapter.py`
- **Facebook/Instagram**: Disabled but interface maintained via stub in `facebook_service.py`

### Scheduling System
- **Background Service**: `scheduler_service.py` with async task polling
- **Database Integration**: `posting_schedules` table with retry logic and error tracking
- **Multi-platform Publishing**: Unified scheduler handles all platform APIs

### Google Integration
- **OAuth Flow**: Complete Google OAuth implementation in `google_complete.py`
- **Calendar Sync**: Calendar events linked to posts via `calendar_service.py`
- **Drive Storage**: Campaign assets stored in Google Drive with direct URL generation

## Environment Configuration

### Required API Keys
```bash
# AI Services
GROQ_API_KEY=your_groq_api_key
CHATGPT_API=your_openai_api_key
STABILITY_API_KEY=your_stability_api_key

# Social Media
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/social_media_agent

# Google Services (requires Credentials.json file)
# Google Calendar, Drive integration
```

### File Structure
```
server/
├── Credentials.json      # Google OAuth credentials
├── token.json           # Google OAuth tokens (auto-generated)
├── .env                 # Environment variables
└── public/              # Static file uploads
```

## Testing Approach

### Single Post Testing
```bash
# Test caption generation
curl -X POST "http://localhost:8000/api/posts" \
  -H "Content-Type: application/json" \
  -d '{"description": "test content", "caption_provider": "groq"}'

# Test specific platform posting
curl -X POST "http://localhost:8000/api/posts" \
  -d '{"description": "test", "platforms": ["reddit"], "subreddit": "test"}'
```

### Integration Testing
- Database connection: Check `/health` endpoint
- Google services: Use `/google/status` endpoint
- Social media: Each service has `test_connection()` method

## Common Development Patterns

### Adding New Social Platform
1. Create `{platform}_adapter.py` for API interaction
2. Create `{platform}_service.py` for business logic
3. Add platform handling in `scheduler_service.py`
4. Update `platforms` enum in frontend components

### AI Provider Integration
1. Add provider function in `main.py` (e.g., `generate_caption_with_{provider}`)
2. Update `generate_caption()` dispatcher
3. Add provider option to frontend forms

### Database Model Changes
1. Update SQLAlchemy models in `models.py`
2. Create Alembic migration: `alembic revision --autogenerate -m "description"`
3. Update Pydantic response models
4. Run migration: `alembic upgrade head`

## Troubleshooting

### Common Issues
- **Port conflicts**: Frontend (5173), Backend (8000), DB (5432)
- **API rate limits**: All AI providers have fallback mechanisms
- **Token expiry**: Google tokens auto-refresh, social media tokens need manual renewal
- **Docker memory**: Increase to 4GB+ for stable image generation

### Debugging Commands
```bash
# Check service status
docker-compose ps

# View specific service logs
docker-compose logs -f app

# Database connection test
docker-compose exec db psql -U smedia_user social_media_agent

# Test AI services
curl localhost:8000/health
```

### File Path Handling
- **Frontend builds** to `dist/` → served as `/static/` by FastAPI
- **Image uploads** stored in `public/` → served as `/public/` by FastAPI
- **Docker volumes** mount `./server/public:/app/public` for persistence

## Performance Considerations

- **Image Processing**: Large images are automatically resized to prevent memory issues
- **Concurrent Posting**: Scheduler handles multiple platforms sequentially to avoid rate limits
- **Database Indexing**: Optimized indexes on `scheduled_at`, `status`, `platforms` fields
- **Caching**: Static files served directly by FastAPI with proper headers