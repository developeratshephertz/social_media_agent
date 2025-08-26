# Social Media Agent API with PostgreSQL Integration

A comprehensive FastAPI server that generates Instagram posts with AI-powered captions and images, featuring full PostgreSQL integration for data persistence.

## Features

- **AI Caption Generation**: Uses Groq API (Llama-3) for engaging Instagram captions
- **AI Image Generation**: Integrates with Stability AI for high-quality images with fallback to placeholder generation
- **PostgreSQL Database**: Complete data persistence for posts, images, captions, and schedules
- **Batch Processing**: Generate multiple posts with intelligent scheduling
- **Campaign Management**: Organize posts into campaigns
- **Advanced Scheduling**: Support for posting schedules with time zones and priorities
- **Database Management**: Built-in endpoints for querying and managing stored data
- **Health Monitoring**: Comprehensive health checks for all services

## Prerequisites

- Python 3.8+
- PostgreSQL 12+
- Groq API key (for caption generation)
- Stability AI API key (for image generation)
- pip package manager

## Installation

1. **Clone the repository and navigate to server directory:**
   ```bash
   cd server
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## PostgreSQL Setup

### 1. Install PostgreSQL

**On macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database and User

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE social_media_agent;
CREATE USER smedia_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE social_media_agent TO smedia_user;
\q
```

### 3. Configure Environment

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# API Keys
GROQ_API_KEY=your_groq_api_key_here
STABILITY_API_KEY=your_stability_ai_api_key_here

# Database
DATABASE_URL=postgresql://smedia_user:your_secure_password@localhost:5432/social_media_agent
```

### 4. Get API Keys

1. **Groq API**: Visit [Groq Console](https://console.groq.com/keys)
2. **Stability AI**: Visit [Stability AI Platform](https://platform.stability.ai/account/keys)

## Running the Server

### Development Mode
```bash
python main.py
```

### Production Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The server will be available at `http://localhost:8000`

## API Endpoints

### Generation Endpoints

#### 1. Generate Single Post
**POST** `/generate-post`

Generates a complete Instagram post with AI-generated caption and image, automatically saved to database.

**Request Body:**
```json
{
  "description": "A beautiful sunset over the mountains"
}
```

**Response:**
```json
{
  "success": true,
  "caption": "🌅 Nature's masterpiece painted across the sky! This breathtaking sunset reminds us to pause and appreciate life's simple beauty. #Sunset #Mountains #Nature #Beautiful #Peaceful",
  "image_path": "/public/generated_abc12345_1703123456.png"
}
```

#### 2. Generate Caption Only
**POST** `/generate-caption`

Generates only an Instagram caption (without saving to database).

**Request Body:**
```json
{
  "description": "Morning coffee at a cozy cafe"
}
```

#### 3. Generate Batch Posts
**POST** `/generate-batch`

Generates multiple posts with intelligent scheduling, all saved to database.

**Request Body:**
```json
{
  "description": "Daily motivational quotes",
  "num_posts": 5,
  "days": 7
}
```

### Database Query Endpoints

#### 4. Get Recent Posts
**GET** `/api/posts?limit=10`

Retrieve recent posts from database with basic information.

#### 5. Get Post Details
**GET** `/api/posts/{post_id}`

Get complete details for a specific post including images, captions, and schedules.

#### 6. Get Scheduled Posts
**GET** `/api/scheduled-posts`

Retrieve posts scheduled for posting within the next 24 hours.

#### 7. Get Batch Status
**GET** `/api/batch/{batch_id}/status`

Check the status of a batch operation.

#### 8. Database Statistics
**GET** `/api/stats`

Get comprehensive database statistics.

#### 9. Database Info
**GET** `/api/database/info`

Get database connection information and health status.

### System Endpoints

#### 10. Health Check
**GET** `/health`

Comprehensive health check including database connectivity and AI service status.

#### 11. Root
**GET** `/`

API information and available endpoints.

## Input Validation

- **Date Format**: Must be `yyyy-mm-dd` (e.g., "2024-01-15")
- **Time Format**: Must be `HH:MM AM/PM` (e.g., "02:30 PM")
- **Product Description**: Required string

## Error Handling

The API returns structured error responses:

```json
{
  "success": false,
  "error": "Invalid date format. Use yyyy-mm-dd format."
}
```

## Frontend Integration

The API is configured with CORS to work with your React frontend:

```javascript
const response = await fetch('http://localhost:8000/generate-post', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    product_description: "Your product description",
    posting_date: "2024-01-15",
    posting_time: "02:30 PM"
  })
});

const result = await response.json();
```

## Adding Image Generation

To add actual image generation, you can integrate with:

1. **DALL-E API** (OpenAI)
2. **Midjourney API**
3. **Stable Diffusion API**
4. **Custom image generation service**

Example integration structure in the code:

```python
# In generate_post function, replace the placeholder with:
if image_generation_service == "dalle":
    image_base64 = await generate_image_with_dalle(image_prompt)
elif image_generation_service == "midjourney":
    image_base64 = await generate_image_with_midjourney(image_prompt)
```

## Development

### Project Structure
```
server/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── .env                # Environment variables (create this)
├── env_example.txt     # Environment variables template
└── README.md           # This file
```

### Adding New Features

1. **New Endpoints**: Add routes in `main.py`
2. **New Models**: Extend the Pydantic models
3. **New Services**: Create separate service modules
4. **Testing**: Add test files in a `tests/` directory

## Troubleshooting

### Common Issues

1. **API Key Error**: Ensure `GOOGLE_API_KEY` is set in `.env`
2. **Port Already in Use**: Change the port in `.env` or kill existing processes
3. **CORS Issues**: Verify the frontend URL is in `allow_origins`

### Logs

Check the console output for detailed error messages and API responses.

## License

This project is part of the Instagram Automation System.
