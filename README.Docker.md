# Social Media Agent - Docker Deployment

This guide will help you run the Social Media Agent on any device using Docker.

## Prerequisites

- Docker and Docker Compose installed on your system
- At least 2GB of free disk space
- All required API keys for social media platforms

## Quick Start

### 1. Clone and Setup Environment

```bash
# Navigate to the project directory
cd "social media agent"

# Copy the environment template
cp .env.docker .env

# Edit the .env file with your API keys
nano .env  # or use any text editor
```

### 2. Configure API Keys

Edit the `.env` file and replace the placeholder values with your actual API keys:

- **OpenAI API Key**: Get from https://openai.com/api/
- **Facebook**: Get from Facebook Developer Console
- **Twitter/X**: Get from Twitter Developer Portal
- **Reddit**: Get from Reddit App Preferences
- **Google**: Get from Google Cloud Console

### 3. Launch the Application

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Check service status
docker-compose ps
```

### 4. Access the Application

- **Web Interface**: http://localhost:8000
- **API**: http://localhost:8000/docs (Swagger UI)
- **Database**: localhost:5432 (if needed)

## Docker Commands

### Basic Operations

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f [service_name]

# Update and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Data Management

```bash
# Backup database
docker-compose exec db pg_dump -U agent_user social_media_agent > backup.sql

# Restore database
docker-compose exec -T db psql -U agent_user social_media_agent < backup.sql

# Clean everything (CAUTION: This will delete all data)
docker-compose down -v
```

## Services

The Docker setup includes:

1. **App** (Port 8000): Main Social Media Agent application
2. **Database** (Port 5432): PostgreSQL database
3. **Redis** (Port 6379): Caching and task queue

## Volumes

- `postgres_data`: Database storage
- `redis_data`: Redis storage
- `./server/public`: File uploads and generated content

## Environment Variables

Key environment variables in `.env`:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | Yes |
| `FACEBOOK_ACCESS_TOKEN` | Facebook page access token | Yes |
| `TWITTER_API_KEY` | Twitter API credentials | Yes |
| `REDDIT_CLIENT_ID` | Reddit app credentials | Yes |
| `GOOGLE_CLIENT_ID` | Google services credentials | Yes |

## Troubleshooting

### Application Won't Start

1. Check logs: `docker-compose logs app`
2. Verify environment variables in `.env`
3. Ensure all required API keys are set
4. Check database connection: `docker-compose logs db`

### Database Issues

```bash
# Reset database
docker-compose down
docker volume rm social-media-agent_postgres_data
docker-compose up -d
```

### Port Conflicts

If ports 8000, 5432, or 6379 are already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "8080:8000"  # Change external port
```

### Memory Issues

Increase Docker memory allocation in Docker Desktop settings to at least 4GB.

## Production Deployment

For production deployment:

1. Change database passwords in `docker-compose.yml`
2. Set `DEBUG=false` in `.env`
3. Use a reverse proxy (nginx) for SSL/HTTPS
4. Set up proper backup schedules
5. Monitor logs and resource usage

## Security Notes

- Keep your `.env` file private (never commit to version control)
- Use strong database passwords in production
- Regularly update Docker images
- Consider using Docker secrets for sensitive data

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify all API keys are correct
3. Ensure Docker has sufficient resources
4. Check firewall settings for ports 8000, 5432, 6379

---

🐳 **Happy Dockering!** Your Social Media Agent is now ready to run anywhere Docker is installed.
