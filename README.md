# Social Media Agent 🚀

A comprehensive AI-powered social media management platform that automates content creation, scheduling, and analytics for social media campaigns.

## 🌟 Features

- **AI Content Generation**: Generate engaging captions and images using Groq AI and Stability AI
- **Automated Scheduling**: Schedule posts across multiple social media platforms
- **Facebook Integration**: Post directly to Facebook pages with analytics tracking
- **Google Calendar Integration**: Sync your posting schedule with Google Calendar
- **Campaign Management**: Create, manage, and track social media campaigns
- **Real-time Analytics**: Monitor post performance and engagement metrics
- **Batch Processing**: Generate multiple posts at once for efficient content planning
- **Modern UI**: Responsive React-based dashboard with Tailwind CSS

## 🏗️ Architecture

### Frontend
- **React 19** with Vite for fast development
- **Tailwind CSS** for modern styling
- **Radix UI** components for accessible UI elements
- **React Router** for navigation
- **Zustand** for state management
- **React Big Calendar** for scheduling visualization

### Backend
- **FastAPI** Python web framework
- **SQLAlchemy** ORM with PostgreSQL/SQLite support
- **APScheduler** for background task scheduling
- **Pydantic** for data validation
- **Async/await** support for high performance

### AI Services
- **Groq API** for natural language generation
- **Stability AI** for image generation
- **OpenAI-compatible** endpoints

### Integrations
- **Facebook Graph API** for social media posting
- **Google Calendar API** for schedule management
- **Google Drive API** for file storage

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.8+ (for local development)

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/developeratshephertz/social_media_agent.git
cd social_media_agent
```

2. Create environment file:
```bash
cp server/.env.example server/.env
```

3. Configure your API keys in `server/.env`:
```env
# AI Services
GROQ_API_KEY=your_groq_api_key_here
STABILITY_API_KEY=your_stability_api_key_here

# Facebook Integration
PAGE_ID=your_facebook_page_id
ACCESS_TOKEN=your_facebook_access_token

# Google Services
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Database
DATABASE_URL=sqlite:///./data/social_media.db
```

### Running with Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Running Locally for Development

#### Backend Setup
```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Frontend Setup
```bash
npm install
npm run dev
```

## 📖 API Documentation

### Core Endpoints

#### Generate Single Post
```http
POST /generate-post
Content-Type: application/json

{
  "description": "A beautiful sunset at the beach"
}
```

#### Generate Batch Posts
```http
POST /generate-batch
Content-Type: application/json

{
  "description": "Travel content for Instagram",
  "days": 7,
  "num_posts": 10
}
```

#### Get Posts
```http
GET /posts?page=1&limit=10
```

#### Schedule Post
```http
POST /schedule-post
Content-Type: application/json

{
  "post_id": "123",
  "scheduled_at": "2024-01-01T10:00:00Z",
  "platform": "facebook"
}
```

### Calendar Integration
```http
GET /google/calendar/events
POST /google/calendar/create-event
PUT /google/calendar/update-event/{event_id}
DELETE /google/calendar/delete-event/{event_id}
```

Full API documentation is available at `/docs` when running the server.

## 🔧 Configuration

### Database Configuration
The application supports both SQLite (default) and PostgreSQL:

```env
# SQLite (Default)
DATABASE_URL=sqlite:///./data/social_media.db

# PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/social_media
```

### Social Media Platforms

#### Facebook Setup
1. Create a Facebook App in the Facebook Developer Console
2. Get your Page ID and Access Token
3. Add them to your `.env` file

#### Google Services Setup
1. Create a project in Google Cloud Console
2. Enable Calendar API and Drive API
3. Create OAuth 2.0 credentials
4. Add client ID and secret to `.env`

## 📊 Features Overview

### Dashboard
- Campaign overview and performance metrics
- Recent posts and engagement statistics
- Quick actions for creating new content

### Campaign Management
- Create and organize content campaigns
- Set posting schedules and target audiences
- Track campaign performance over time

### Content Generation
- AI-powered caption generation
- Automatic image creation with fallbacks
- Batch content creation for efficiency

### Analytics
- Post performance tracking
- Engagement metrics and insights
- Export data for reporting

### Scheduling
- Visual calendar interface
- Automated posting at optimal times
- Integration with Google Calendar

## 🛠️ Development

### Project Structure
```
social_media_agent/
├── src/                    # React frontend source
│   ├── components/         # Reusable UI components
│   ├── pages/             # Route components
│   ├── layout/            # Layout components
│   └── App.jsx            # Main app component
├── server/                # FastAPI backend
│   ├── models.py          # Database models
│   ├── database.py        # Database configuration
│   ├── main.py           # FastAPI application
│   ├── facebook_service.py # Facebook integration
│   ├── calendar_service.py # Google Calendar integration
│   └── scheduler_service.py # Background job scheduler
├── public/               # Static assets
├── docker-compose.yml    # Docker services configuration
└── package.json         # Frontend dependencies
```

### Available Scripts

#### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

#### Backend
```bash
uvicorn main:app --reload  # Start development server
python -m pytest          # Run tests (if tests exist)
```

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support, please open an issue on GitHub or contact the development team.

## 🔄 Changelog

### Version 3.0.0
- Added AI-powered content generation
- Implemented Facebook integration
- Added Google Calendar sync
- Modern React UI with Tailwind CSS
- Docker containerization
- Background job scheduling

## 🚧 Roadmap

- [ ] Instagram integration
- [ ] Twitter/X integration
- [ ] Advanced analytics dashboard
- [ ] Content templates library
- [ ] Multi-user support
- [ ] Mobile application
- [ ] Advanced AI models integration
- [ ] Social media listening features

---

Made with ❤️ by the Social Media Agent Team
