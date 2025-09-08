from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import requests
import os
import base64
from datetime import datetime, timedelta
from dotenv import load_dotenv
import time
import hashlib
from PIL import Image, ImageDraw, ImageFont
import textwrap
from google_complete import router as google_router

# Database imports
from database import startup_db, shutdown_db, get_database
from database_service import db_service
from models import PostResponse as PostResponseModel, CalendarEventResponse
from calendar_service import CalendarService

# Scheduler imports
from scheduler_service import scheduler_service, start_scheduler, stop_scheduler

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Instagram Post Generator API",
    description="Generate Instagram posts with AI",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/public", StaticFiles(directory="public"), name="public")

# Include Google integration router
app.include_router(google_router)

# Add database startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    await startup_db()
    print("Database connection initialized")
    # Start the scheduler service
    await start_scheduler()
    print("Scheduler service started")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    await stop_scheduler()
    print("Scheduler service stopped")
    await shutdown_db()
    print("Database connection closed")

# API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
STABILITY_API_KEY = os.getenv("STABILITY_API_KEY")  # For image generation
CHATGPT_API_KEY = os.getenv("CHATGPT_API")  # For caption and image generation
NANO_BANANA_API_KEY = os.getenv("NANO_BANANA_API_KEY")  # For image generation


class PostRequest(BaseModel):
    description: str
    caption_provider: Optional[str] = "chatgpt"  # chatgpt, groq
    image_provider: Optional[str] = "stability"  # stability, chatgpt, nano_banana


class PostResponse(BaseModel):
    success: bool
    caption: Optional[str] = None
    image_path: Optional[str] = None
    error: Optional[str] = None


class BatchRequest(BaseModel):
    description: str
    days: int
    num_posts: int
    caption_provider: Optional[str] = "chatgpt"  # chatgpt, groq
    image_provider: Optional[str] = "stability"  # stability, chatgpt, nano_banana


class BatchItem(BaseModel):
    caption: Optional[str] = None
    image_path: Optional[str] = None
    scheduled_at: Optional[str] = None
    error: Optional[str] = None


class BatchResponse(BaseModel):
    success: bool
    items: List[BatchItem]
    error: Optional[str] = None
    batch_id: Optional[str] = None


def generate_caption_with_groq(description: str) -> str:
    """Generate Instagram caption using Groq API"""
    try:
        if not GROQ_API_KEY:
            raise Exception("Groq API key not found")

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        }

        data = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert Instagram caption writer. Create engaging, trendy captions with emojis and hashtags. Keep under 200 characters for better engagement.",
                },
                {
                    "role": "user",
                    "content": f"Write a catchy Instagram caption for: {description}. Include 3-5 relevant hashtags and emojis.",
                },
            ],
            "model": "llama3-8b-8192",
            "max_tokens": 150,
            "temperature": 0.7,
        }

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=15,
        )

        if response.status_code == 200:
            result = response.json()
            caption = result["choices"][0]["message"]["content"].strip()
            return caption
        else:
            raise Exception(f"Groq API error: {response.status_code}")

    except Exception as e:
        print(f"Caption generation error: {e}")
        # Fallback caption
        return (
            f"✨ Check out this amazing {description}! Perfect for your lifestyle! 🚀 "
            "#Amazing #MustHave #Trending #NewPost #Discover"
        )


def generate_caption_with_chatgpt(description: str) -> str:
    """Generate Instagram caption using ChatGPT API"""
    try:
        if not CHATGPT_API_KEY:
            raise Exception("ChatGPT API key not found")

        headers = {
            "Authorization": f"Bearer {CHATGPT_API_KEY}",
            "Content-Type": "application/json",
        }

        data = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert Instagram caption writer. Create engaging, trendy captions with emojis and hashtags. Keep under 200 characters for better engagement.",
                },
                {
                    "role": "user",
                    "content": f"Write a catchy Instagram caption for: {description}. Include 3-5 relevant hashtags and emojis.",
                },
            ],
            "max_tokens": 150,
            "temperature": 0.7,
        }

        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=15,
        )

        if response.status_code == 200:
            result = response.json()
            caption = result["choices"][0]["message"]["content"].strip()
            return caption
        else:
            raise Exception(f"ChatGPT API error: {response.status_code}")

    except Exception as e:
        print(f"ChatGPT caption generation error: {e}")
        # Fallback caption
        return (
            f"✨ Check out this amazing {description}! Perfect for your lifestyle! 🚀 "
            "#Amazing #MustHave #Trending #NewPost #Discover"
        )


def generate_caption(description: str, provider: str = "chatgpt") -> str:
    """Generate caption using specified provider"""
    if provider == "groq":
        return generate_caption_with_groq(description)
    elif provider == "chatgpt":
        return generate_caption_with_chatgpt(description)
    else:
        # Default to ChatGPT
        return generate_caption_with_chatgpt(description)


def create_placeholder_image(description: str) -> Optional[str]:
    """Create a placeholder image with the description text when AI generation fails."""
    try:
        # Create a 1024x1024 image
        img = Image.new('RGB', (1024, 1024), color=(70, 130, 180))  # Steel blue background
        draw = ImageDraw.Draw(img)
        
        # Try to load a font, fallback to default
        try:
            # Try different font paths for different systems
            font_paths = [
                '/System/Library/Fonts/Arial.ttf',  # macOS
                '/System/Library/Fonts/Helvetica.ttc',  # macOS
                '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',  # Linux
                '/Windows/Fonts/arial.ttf',  # Windows
            ]
            font = None
            for path in font_paths:
                if os.path.exists(path):
                    font = ImageFont.truetype(path, 48)
                    break
            
            if font is None:
                font = ImageFont.load_default()
        except Exception:
            font = ImageFont.load_default()
        
        # Wrap text to fit in image
        text = f"🎨 {description}"
        margin = 80
        max_width = 1024 - 2 * margin
        
        # Wrap text
        wrapper = textwrap.TextWrapper(width=30)  # Approximate character width
        lines = wrapper.wrap(text)
        
        # If text is too long, truncate
        if len(lines) > 12:
            lines = lines[:11] + ["..."]
        
        # Calculate text position
        total_height = len(lines) * 60  # Approximate line height
        start_y = (1024 - total_height) // 2
        
        # Draw each line centered
        for i, line in enumerate(lines):
            # Get text bounding box for centering
            try:
                bbox = draw.textbbox((0, 0), line, font=font)
                text_width = bbox[2] - bbox[0]
            except AttributeError:
                # Fallback for older Pillow versions
                text_width = len(line) * 20  # Rough estimate
            
            x = (1024 - text_width) // 2
            y = start_y + i * 60
            
            # Draw text with shadow for better visibility
            draw.text((x + 2, y + 2), line, font=font, fill=(0, 0, 0, 128))  # Shadow
            draw.text((x, y), line, font=font, fill=(255, 255, 255))  # Main text
        
        # Add a watermark
        watermark = "Generated by Social Media Agent"
        try:
            small_font = ImageFont.truetype(font_paths[0] if font_paths and os.path.exists(font_paths[0]) else None, 24)
        except:
            small_font = ImageFont.load_default()
        
        try:
            bbox = draw.textbbox((0, 0), watermark, font=small_font)
            wm_width = bbox[2] - bbox[0]
        except AttributeError:
            wm_width = len(watermark) * 12
        
        wm_x = (1024 - wm_width) // 2
        wm_y = 980
        draw.text((wm_x + 1, wm_y + 1), watermark, font=small_font, fill=(0, 0, 0, 64))
        draw.text((wm_x, wm_y), watermark, font=small_font, fill=(255, 255, 255, 180))
        
        # Save the image
        filename = f"placeholder_{hashlib.md5(description.encode()).hexdigest()[:8]}_{int(datetime.now().timestamp())}.png"
        filepath = f"public/{filename}"
        os.makedirs("public", exist_ok=True)
        img.save(filepath, 'PNG')
        
        print(f"Created placeholder image: {filepath}")
        return f"/public/{filename}"
        
    except Exception as e:
        print(f"Error creating placeholder image: {e}")
        return None


def generate_image_with_stability(description: str) -> Optional[str]:
    """Generate image using Stability AI API and store it in public/ with retries.
    Falls back to placeholder image if service is unavailable.

    Tuned prompts to stay faithful to the user description.
    """
    try:
        if not STABILITY_API_KEY:
            print("Stability API key not found, creating placeholder image...")
            return create_placeholder_image(description)

        # SDXL allowed dimensions include 1024x1024; stick to it to avoid 400s
        settings = [
            {"height": 1024, "width": 1024, "steps": 32, "cfg_scale": 8},
        ]

        # Try multiple Stability models in order of quality → accessibility
        model_endpoints = [
            "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        ]

        for model_url in model_endpoints:
            for attempt, s in enumerate(settings, start=1):
                headers = {
                    "Authorization": f"Bearer {STABILITY_API_KEY}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                }
                data = {
                    "text_prompts": [
                        {
                            "text": (
                                f"Ultra-detailed, photorealistic square photo of {description}. "
                                "Subject clearly visible and centered, professional lighting, shallow depth of field, high dynamic range, Instagram aesthetic."
                            ),
                            "weight": 1,
                        },
                        {
                            "text": "unrelated mountains, random landscape, balloons, generic scenery, text, watermark, logo, blurry, low quality, duplicate",
                            "weight": -1,
                        },
                    ],
                    "cfg_scale": s["cfg_scale"],
                    "height": s["height"],
                    "width": s["width"],
                    "samples": 1,
                    "steps": s["steps"],
                }

                response = requests.post(
                    model_url,
                    headers=headers,
                    json=data,
                    timeout=60,
                )

                if response.status_code == 200:
                    result = response.json()
                    if not result.get("artifacts"):
                        # Some responses might structure differently; continue
                        pass
                    else:
                        image_data = base64.b64decode(result["artifacts"][0]["base64"])
                        filename = (
                            f"generated_{hashlib.md5(description.encode()).hexdigest()[:8]}_"
                            f"{int(datetime.now().timestamp())}.png"
                        )
                        filepath = f"public/{filename}"
                        os.makedirs("public", exist_ok=True)
                        with open(filepath, "wb") as f:
                            f.write(image_data)
                        return f"/public/{filename}"

                else:
                    # Log useful error body for debugging
                    try:
                        print(
                            f"Stability API error {response.status_code} at {model_url}: {response.text[:500]}"
                        )
                    except Exception:
                        pass

                # Backoff on failures (e.g., 429)
                time.sleep(1 + attempt)

        # If all attempts fail, create placeholder image
        print("All Stability AI attempts failed, creating placeholder image...")
        return create_placeholder_image(description)
    except Exception as e:
        print(f"Image generation error: {e}")
        print("Creating placeholder image as fallback...")
        return create_placeholder_image(description)


def generate_image_with_chatgpt(description: str) -> Optional[str]:
    """Generate image using ChatGPT DALL-E API and store it in public/.
    Falls back to placeholder image if service is unavailable.
    """
    try:
        if not CHATGPT_API_KEY:
            print("ChatGPT API key not found, creating placeholder image...")
            return create_placeholder_image(description)

        headers = {
            "Authorization": f"Bearer {CHATGPT_API_KEY}",
            "Content-Type": "application/json",
        }

        data = {
            "model": "dall-e-2",  # or "dall-e-3" if available
            "prompt": f"Ultra-detailed, photorealistic square photo of {description}. Subject clearly visible and centered, professional lighting, shallow depth of field, high dynamic range, Instagram aesthetic.",
            "n": 1,
            "size": "1024x1024",
            "response_format": "b64_json"
        }

        response = requests.post(
            "https://api.openai.com/v1/images/generations",
            headers=headers,
            json=data,
            timeout=60,
        )

        if response.status_code == 200:
            result = response.json()
            if result.get("data") and len(result["data"]) > 0:
                image_data = base64.b64decode(result["data"][0]["b64_json"])
                filename = (
                    f"chatgpt_{hashlib.md5(description.encode()).hexdigest()[:8]}_"
                    f"{int(datetime.now().timestamp())}.png"
                )
                filepath = f"public/{filename}"
                os.makedirs("public", exist_ok=True)
                with open(filepath, "wb") as f:
                    f.write(image_data)
                return f"/public/{filename}"
            else:
                raise Exception("No image data in ChatGPT response")
        else:
            raise Exception(f"ChatGPT API error: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"ChatGPT image generation error: {e}")
        print("Creating placeholder image as fallback...")
        return create_placeholder_image(description)


def generate_image_with_nano_banana(description: str) -> Optional[str]:
    """Generate image using Nano Banana API and store it in public/.
    Falls back to placeholder image if service is unavailable.
    """
    try:
        if not NANO_BANANA_API_KEY:
            print("Nano Banana API key not found, creating placeholder image...")
            return create_placeholder_image(description)

        headers = {
            "Authorization": f"Bearer {NANO_BANANA_API_KEY}",
            "Content-Type": "application/json",
        }

        # Note: Adjust the API endpoint and payload format based on Nano Banana's actual API documentation
        data = {
            "prompt": f"Ultra-detailed, photorealistic square photo of {description}. Subject clearly visible and centered, professional lighting, shallow depth of field, high dynamic range, Instagram aesthetic.",
            "width": 1024,
            "height": 1024,
            "num_inference_steps": 32,
            "guidance_scale": 8.0,
            "output_format": "base64"
        }

        # Replace with actual Nano Banana API endpoint
        response = requests.post(
            "https://api.nanobanana.ai/v1/generate",  # Placeholder URL - replace with actual endpoint
            headers=headers,
            json=data,
            timeout=60,
        )

        if response.status_code == 200:
            result = response.json()
            # Adjust based on actual Nano Banana response format
            if result.get("image"):
                image_data = base64.b64decode(result["image"])
                filename = (
                    f"nanobanana_{hashlib.md5(description.encode()).hexdigest()[:8]}_"
                    f"{int(datetime.now().timestamp())}.png"
                )
                filepath = f"public/{filename}"
                os.makedirs("public", exist_ok=True)
                with open(filepath, "wb") as f:
                    f.write(image_data)
                return f"/public/{filename}"
            else:
                raise Exception("No image data in Nano Banana response")
        else:
            raise Exception(f"Nano Banana API error: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"Nano Banana image generation error: {e}")
        print("Creating placeholder image as fallback...")
        return create_placeholder_image(description)


def generate_image(description: str, provider: str = "stability") -> Optional[str]:
    """Generate image using specified provider"""
    if provider == "stability":
        return generate_image_with_stability(description)
    elif provider == "chatgpt":
        return generate_image_with_chatgpt(description)
    elif provider == "nano_banana":
        return generate_image_with_nano_banana(description)
    else:
        # Default to Stability
        return generate_image_with_stability(description)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Instagram Post Generator API v3.0",
        "status": "running",
        "endpoints": [
            "/",
            "/health",
            "/generate-post",
            "/generate-caption",
            "/generate-batch",
        ],
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "groq_configured": bool(GROQ_API_KEY),
            "chatgpt_configured": bool(CHATGPT_API_KEY),
            "stability_configured": bool(STABILITY_API_KEY),
            "nano_banana_configured": bool(NANO_BANANA_API_KEY),
        },
    }


@app.post("/generate-post", response_model=PostResponse)
async def generate_post(request: PostRequest):
    """Generate Instagram post with image and caption"""
    try:
        if not request.description or len(request.description.strip()) < 3:
            raise HTTPException(
                status_code=400,
                detail="Description must be at least 3 characters long",
            )

        description = request.description.strip()

        # Generate caption using selected provider
        caption = generate_caption(description, request.caption_provider)

        # Generate image using selected provider
        image_path = generate_image(description, request.image_provider)

        if not image_path:
            return PostResponse(
                success=False, error="Failed to generate image. Please try again."
            )

        # Save to database
        try:
            # Get default campaign ID
            default_campaign_id = await db_service.get_default_campaign_id()
            
            # Create post record
            post_id = await db_service.create_post(
                original_description=description,
                caption=caption,
                image_path=image_path,
                campaign_id=default_campaign_id,
                platform=None  # Platform will be set when user selects it
            )
            
            # Save image information
            if image_path:
                generation_method = request.image_provider or "stability"
                await db_service.save_image_info(
                    post_id=post_id,
                    file_path=image_path,
                    generation_method=generation_method,
                    generation_prompt=description
                )
            
            # Save caption information
            if caption:
                caption_method = request.caption_provider or "chatgpt"
                await db_service.save_caption_info(
                    post_id=post_id,
                    content=caption,
                    generation_method=caption_method,
                    generation_prompt=f"Write a catchy Instagram caption for: {description}. Include 3-5 relevant hashtags and emojis."
                )
                
            print(f"Post saved to database with ID: {post_id}")
            
        except Exception as db_error:
            print(f"Database save error: {db_error}")
            # Continue without failing the request
            
        return PostResponse(success=True, caption=caption, image_path=image_path)

    except HTTPException:
        raise
    except Exception as e:
        return PostResponse(success=False, error=f"Error generating post: {str(e)}")


@app.post("/generate-caption", response_model=PostResponse)
async def generate_caption_endpoint(request: PostRequest):
    """Generate only Instagram caption"""
    try:
        if not request.description or len(request.description.strip()) < 3:
            raise HTTPException(
                status_code=400,
                detail="Description must be at least 3 characters long",
            )

        description = request.description.strip()
        caption = generate_caption(description, request.caption_provider)

        return PostResponse(success=True, caption=caption)

    except HTTPException:
        raise
    except Exception as e:
        return PostResponse(success=False, error=f"Error generating caption: {str(e)}")


def _compute_schedule_dates(num_posts: int, days: int) -> List[str]:
    """Distribute posts across the given days; allow multiple posts per day.
    
    Posts start from the next hour after current time.
    Example: If created at 2:30 PM, first post at 3:00 PM.
    """
    if num_posts <= 0:
        return []
    if days <= 0:
        days = 1

    # Posts per day (ceil)
    per_day = (num_posts + days - 1) // days

    # Start from next hour after current time
    now = datetime.now()
    start_time = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)

    results: List[str] = []
    for i in range(num_posts):
        day_index = i // per_day
        slot_index = i % per_day

        schedule_time = start_time + timedelta(days=day_index)
        
        if per_day == 1:
            # Single post per day, maintain the start time for each day
            pass  # schedule_time is already set correctly
        else:
            # Multiple posts per day, spread them out
            hour_step = max(1, 12 // per_day)  # Spread over 12 hours
            schedule_time += timedelta(hours=slot_index * hour_step)
            
            # Don't schedule too late (before 10 PM)
            if schedule_time.hour > 22:
                schedule_time = schedule_time.replace(hour=22, minute=0)

        results.append(schedule_time.isoformat())
    return results


@app.post("/generate-batch", response_model=BatchResponse)
async def generate_batch(request: BatchRequest):
    """Generate multiple posts and return caption, image path, and scheduled time for each."""
    try:
        description = (request.description or "").strip()
        if len(description) < 3:
            raise HTTPException(
                status_code=400, detail="Description must be at least 3 characters long"
            )
        if request.days <= 0:
            raise HTTPException(status_code=400, detail="Days must be a positive integer")
        if request.num_posts <= 0:
            raise HTTPException(
                status_code=400, detail="num_posts must be a positive integer"
            )
        if request.num_posts > 20:
            raise HTTPException(
                status_code=400, detail="num_posts is too large; max 20 per batch"
            )

        # Create batch operation record
        batch_id = None
        try:
            batch_id = await db_service.create_batch_operation(
                description=description,
                num_posts=request.num_posts,
                days_duration=request.days,
                created_by="api_user"  # Could be enhanced with proper user management
            )
            print(f"Created batch operation with ID: {batch_id}")
        except Exception as db_error:
            print(f"Error creating batch operation: {db_error}")

        # Get default campaign ID
        default_campaign_id = None
        try:
            default_campaign_id = await db_service.get_default_campaign_id()
        except Exception as db_error:
            print(f"Error getting default campaign: {db_error}")

        items: List[BatchItem] = []
        posts_generated = 0
        posts_failed = 0
        error_messages = []

        for i in range(request.num_posts):
            try:
                caption = generate_caption(description, request.caption_provider)
                image_path = generate_image(description, request.image_provider)
                
                if not image_path:
                    error_msg = "Failed to generate image"
                    items.append(
                        BatchItem(error=error_msg, scheduled_at=None)
                    )
                    posts_failed += 1
                    error_messages.append(f"Post {i+1}: {error_msg}")
                    continue
                
                # Save to database as DRAFT (no scheduling)
                try:
                    # Create post record as draft
                    post_id = await db_service.create_post(
                        original_description=description,
                        caption=caption,
                        image_path=image_path,
                        scheduled_at=None,  # No scheduling - create as draft
                        campaign_id=default_campaign_id,
                        platform=None,  # Platform will be set when user selects it
                        status="draft",  # Explicitly set as draft
                        batch_id=batch_id
                    )
                    
                    # Save image information
                    image_generation_method = request.image_provider or "stability"
                    await db_service.save_image_info(
                        post_id=post_id,
                        file_path=image_path,
                        generation_method=image_generation_method,
                        generation_prompt=description
                    )
                    
                    # Save caption information
                    caption_generation_method = request.caption_provider or "chatgpt"
                    await db_service.save_caption_info(
                        post_id=post_id,
                        content=caption,
                        generation_method=caption_generation_method,
                        generation_prompt=f"Write a catchy Instagram caption for: {description}. Include 3-5 relevant hashtags and emojis."
                    )
                    
                    # Skip posting schedule - this is a draft post
                    # Scheduling will be done later when user clicks "Schedule" button
                    
                    posts_generated += 1
                    print(f"Batch post {i+1}/{request.num_posts} saved to database with ID: {post_id}")
                    
                except Exception as db_error:
                    print(f"Database save error for post {i+1}: {db_error}")
                    error_messages.append(f"Post {i+1}: Database save failed - {str(db_error)}")
                    # Continue without failing the request
                
                items.append(
                    BatchItem(
                        caption=caption, image_path=image_path, scheduled_at=None
                    )
                )
                
            except Exception as e:
                error_msg = str(e)
                items.append(BatchItem(error=error_msg, scheduled_at=None))
                posts_failed += 1
                error_messages.append(f"Post {i+1}: {error_msg}")

        # Update batch operation status
        if batch_id:
            try:
                status = "completed" if posts_failed == 0 else ("failed" if posts_generated == 0 else "completed")
                await db_service.update_batch_operation_progress(
                    batch_id=batch_id,
                    posts_generated=posts_generated,
                    posts_failed=posts_failed,
                    status=status,
                    error_messages=error_messages if error_messages else None
                )
                print(f"Updated batch operation {batch_id}: {posts_generated} generated, {posts_failed} failed")
            except Exception as db_error:
                print(f"Error updating batch operation: {db_error}")

        return BatchResponse(success=True, items=items, batch_id=batch_id)

    except HTTPException:
        raise
    except Exception as e:
        return BatchResponse(success=False, items=[], error=f"Error generating batch: {str(e)}")


# Database management endpoints
@app.post("/api/posts")
async def create_post(post_data: dict):
    """Create a new post in database"""
    try:
        # Get default campaign ID
        default_campaign_id = await db_service.get_default_campaign_id()
        
        # Create post record
        post_id = await db_service.create_post(
            original_description=post_data.get('original_description', ''),
            caption=post_data.get('caption', ''),
            image_path=post_data.get('image_path'),
            scheduled_at=post_data.get('scheduled_at'),
            campaign_id=default_campaign_id,
            platform=post_data.get('platform'),
            status=post_data.get('status', 'draft'),
            batch_id=post_data.get('batch_id')
        )
        
        return {"success": True, "post_id": post_id}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/posts")
async def get_recent_posts(limit: int = 10):
    """Get recent posts from database"""
    try:
        posts = await db_service.get_recent_posts(limit=limit)
        return {"success": True, "posts": posts}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.put("/api/posts/{post_id}")
async def update_post(post_id: str, update_data: dict):
    """Update a post in database"""
    try:
        # Update post in database
        query = "UPDATE posts SET"
        values = {"post_id": post_id}
        updates = []
        
        # Build dynamic update query
        if "caption" in update_data:
            updates.append("caption = :caption")
            values["caption"] = update_data["caption"]
            
        if "scheduled_at" in update_data:
            updates.append("scheduled_at = :scheduled_at")
            scheduled_at = update_data["scheduled_at"]
            if isinstance(scheduled_at, str):
                scheduled_at = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
            values["scheduled_at"] = scheduled_at
            
        if "status" in update_data:
            updates.append("status = :status")
            values["status"] = update_data["status"]
            
        if "original_description" in update_data:
            updates.append("original_description = :original_description")
            values["original_description"] = update_data["original_description"]
            
        if "platform" in update_data:
            updates.append("platform = :platform")
            values["platform"] = update_data["platform"]
            
        if not updates:
            return {"success": True, "message": "No updates provided"}
            
        # Add updated_at timestamp
        updates.append("updated_at = NOW()")
        
        query += " " + ", ".join(updates) + " WHERE id = :post_id"
        
        from database import db_manager
        await db_manager.execute_query(query, values)
        
        return {"success": True, "message": "Post updated successfully"}
    except Exception as e:
        print(f"Error updating post {post_id}: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/posts/{post_id}")
async def get_post_by_id(post_id: str):
    """Get a specific post by ID"""
    try:
        post = await db_service.get_post_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"success": True, "post": post}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/scheduled-posts")
async def get_scheduled_posts():
    """Get posts that are scheduled for posting"""
    try:
        posts = await db_service.get_scheduled_posts()
        return {"success": True, "scheduled_posts": posts}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/batch/{batch_id}/status")
async def get_batch_status(batch_id: str):
    """Get batch operation status"""
    try:
        batch_info = await db_service.get_batch_operation_status(batch_id)
        if not batch_info:
            raise HTTPException(status_code=404, detail="Batch operation not found")
        return {"success": True, "batch": batch_info}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/stats")
async def get_database_stats():
    """Get database statistics"""
    try:
        stats = await db_service.get_database_stats()
        return {"success": True, "stats": stats}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/database/info")
async def get_database_info():
    """Get database connection information"""
    try:
        from database import get_database_info
        info = get_database_info()
        return {"success": True, "database_info": info}
    except Exception as e:
        return {"success": False, "error": str(e)}


# Calendar Event API Endpoints
class CalendarEventRequest(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: str  # ISO format datetime
    end_time: Optional[str] = None  # ISO format datetime
    all_day: bool = False
    location: Optional[str] = None
    color: str = "#3174ad"
    reminder_minutes: int = 15
    post_id: Optional[str] = None


class CalendarEventUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    all_day: Optional[bool] = None
    location: Optional[str] = None
    color: Optional[str] = None
    reminder_minutes: Optional[int] = None
    status: Optional[str] = None


def get_calendar_service():
    """Get calendar service with sync database session"""
    from database import get_sync_db
    db = next(get_sync_db())
    try:
        return CalendarService(db)
    finally:
        db.close()


@app.get("/api/calendar/events")
async def get_calendar_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    post_id: Optional[str] = None
):
    """Get calendar events with optional filtering"""
    try:
        calendar_service = get_calendar_service()
        
        # Parse dates if provided
        parsed_start_date = None
        parsed_end_date = None
        
        if start_date:
            parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        events = calendar_service.get_events(
            start_date=parsed_start_date,
            end_date=parsed_end_date,
            status=status,
            post_id=post_id
        )
        
        return {"success": True, "events": [event.dict() for event in events]}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/calendar/events/{event_id}")
async def get_calendar_event(event_id: str):
    """Get a specific calendar event by ID"""
    try:
        calendar_service = get_calendar_service()
        event = calendar_service.get_event(event_id)
        
        if not event:
            raise HTTPException(status_code=404, detail="Calendar event not found")
            
        return {"success": True, "event": event.dict()}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/calendar/events")
async def create_calendar_event(request: CalendarEventRequest):
    """Create a new calendar event"""
    try:
        calendar_service = get_calendar_service()
        
        event_data = {
            "title": request.title,
            "description": request.description,
            "start_time": request.start_time,
            "end_time": request.end_time,
            "all_day": request.all_day,
            "location": request.location,
            "color": request.color,
            "reminder_minutes": request.reminder_minutes,
            "post_id": request.post_id
        }
        
        event = calendar_service.create_event(event_data)
        
        return {"success": True, "event": event.dict()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.put("/api/calendar/events/{event_id}")
async def update_calendar_event(event_id: str, request: CalendarEventUpdateRequest):
    """Update a calendar event"""
    try:
        calendar_service = get_calendar_service()
        
        # Build update data from non-None fields
        update_data = {}
        for field, value in request.dict().items():
            if value is not None:
                update_data[field] = value
        
        event = calendar_service.update_event(event_id, update_data)
        
        if not event:
            raise HTTPException(status_code=404, detail="Calendar event not found")
            
        return {"success": True, "event": event.dict()}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.delete("/api/calendar/events/{event_id}")
async def delete_calendar_event(event_id: str):
    """Delete a calendar event"""
    try:
        calendar_service = get_calendar_service()
        
        success = calendar_service.delete_event(event_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Calendar event not found")
            
        return {"success": True, "message": "Event deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/calendar/events/post/{post_id}")
async def get_events_for_post(post_id: str):
    """Get all calendar events for a specific post"""
    try:
        calendar_service = get_calendar_service()
        events = calendar_service.get_events_for_post(post_id)
        
        return {"success": True, "events": [event.dict() for event in events]}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/calendar/events/from-post/{post_id}")
async def create_event_from_post(post_id: str, additional_data: Optional[Dict[str, Any]] = None):
    """Create a calendar event from an existing post"""
    try:
        calendar_service = get_calendar_service()
        event = calendar_service.create_event_from_post(post_id, additional_data or {})
        
        return {"success": True, "event": event.dict()}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/calendar/events/upcoming")
async def get_upcoming_events(days_ahead: int = 30):
    """Get upcoming calendar events"""
    try:
        calendar_service = get_calendar_service()
        events = calendar_service.get_upcoming_events(days_ahead)
        
        return {"success": True, "events": [event.dict() for event in events]}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/calendar/sync-with-posts")
async def sync_calendar_with_posts():
    """Sync calendar events with scheduled posts"""
    try:
        calendar_service = get_calendar_service()
        stats = calendar_service.sync_with_posts()
        
        return {"success": True, "stats": stats}
    except Exception as e:
        return {"success": False, "error": str(e)}


# Facebook Analytics endpoints
from facebook_analytics_service import facebook_analytics

@app.get("/api/analytics/overview")
async def get_analytics_overview():
    """Get comprehensive analytics overview"""
    try:
        if not facebook_analytics.is_configured():
            # Return mock data if Facebook is not configured
            return {
                "success": True,
                "data": {
                    "totals": {
                        "followers": 1250,
                        "impressions": 45320,
                        "reach": 32100,
                        "engagement_rate": 4.2,
                        "best_post": "mock_post_001"
                    },
                    "metrics_available": False,
                    "configured": False
                },
                "message": "Using mock data - Facebook analytics not configured"
            }
        
        analytics_data = facebook_analytics.get_comprehensive_analytics()
        return {"success": True, "data": analytics_data}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/analytics/followers")
async def get_followers():
    """Get page followers count"""
    try:
        if not facebook_analytics.is_configured():
            return {"success": True, "followers": 1250, "configured": False}
        
        result = facebook_analytics.get_page_followers()
        return {"success": True, **result, "configured": True}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/analytics/demographics")
async def get_demographics():
    """Get audience demographics"""
    try:
        if not facebook_analytics.is_configured():
            return {
                "success": True,
                "by_country": {"US": 45, "UK": 20, "Canada": 15, "Australia": 12, "Other": 8},
                "by_age_gender": {
                    "M.18-24": 15, "F.18-24": 18,
                    "M.25-34": 22, "F.25-34": 25,
                    "M.35-44": 12, "F.35-44": 8
                },
                "configured": False
            }
        
        result = facebook_analytics.get_audience_demographics()
        return {"success": True, **result, "configured": True}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/analytics/posts")
async def get_posts_analytics(limit: int = 10):
    """Get analyzed posts with engagement metrics"""
    try:
        if not facebook_analytics.is_configured():
            # Return mock post data
            mock_posts = [
                {
                    "id": "mock_post_001",
                    "message": "Check out our latest product launch! 🚀",
                    "created_time": "2024-01-20T10:00:00Z",
                    "reach": 2500,
                    "impressions": 3200,
                    "engaged_users": 140,
                    "engagement_rate": 0.0437,
                    "reactions": {"like": 85, "love": 25, "wow": 15, "haha": 10, "care": 5}
                },
                {
                    "id": "mock_post_002",
                    "message": "Behind the scenes at our office! 📸",
                    "created_time": "2024-01-19T14:30:00Z",
                    "reach": 1800,
                    "impressions": 2100,
                    "engaged_users": 95,
                    "engagement_rate": 0.0452,
                    "reactions": {"like": 65, "love": 20, "wow": 8, "haha": 2}
                }
            ]
            return {"success": True, "posts": mock_posts[:limit], "configured": False}
        
        posts = facebook_analytics.analyze_posts(limit)
        return {"success": True, "posts": posts, "configured": True}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/analytics/posts/best")
async def get_best_post(limit: int = 10):
    """Get best performing post"""
    try:
        if not facebook_analytics.is_configured():
            return {
                "success": True,
                "post": {
                    "id": "mock_post_002",
                    "message": "Behind the scenes at our office! 📸",
                    "engagement_rate": 0.0452
                },
                "configured": False
            }
        
        best_post = facebook_analytics.get_best_performing_post(limit)
        return {"success": True, "post": best_post, "configured": True}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/analytics/posts/worst")
async def get_worst_post(limit: int = 10):
    """Get worst performing post"""
    try:
        if not facebook_analytics.is_configured():
            return {
                "success": True,
                "post": {
                    "id": "mock_post_001",
                    "message": "Check out our latest product launch! 🚀",
                    "engagement_rate": 0.0437
                },
                "configured": False
            }
        
        worst_post = facebook_analytics.get_worst_performing_post(limit)
        return {"success": True, "post": worst_post, "configured": True}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/analytics/metrics")
async def get_available_metrics():
    """Get available analytics metrics"""
    try:
        metrics = facebook_analytics.get_available_metrics()
        return {
            "success": True, 
            **metrics, 
            "configured": facebook_analytics.is_configured()
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/analytics/status")
async def get_analytics_status():
    """Get analytics service configuration status"""
    try:
        is_configured = facebook_analytics.is_configured()
        return {
            "success": True,
            "configured": is_configured,
            "page_id_present": bool(facebook_analytics.page_id),
            "access_token_present": bool(facebook_analytics.access_token),
            "service_ready": is_configured
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

# Facebook endpoints removed - stub responses for frontend compatibility
@app.post("/api/facebook/publish")
async def publish_to_facebook_stub(request: dict):
    """Stub endpoint - Facebook integration removed"""
    return {"success": False, "error": "Facebook integration has been disabled"}


@app.post("/api/facebook/schedule")
async def schedule_facebook_post_stub(request: dict):
    """Stub endpoint - Facebook integration removed"""
    return {"success": False, "error": "Facebook integration has been disabled"}


@app.delete("/api/facebook/schedule/{post_id}")
async def cancel_scheduled_facebook_post_stub(post_id: str):
    """Stub endpoint - Facebook integration removed"""
    return {"success": False, "error": "Facebook integration has been disabled"}


@app.get("/api/facebook/status")
async def get_facebook_service_status_stub():
    """Stub endpoint - Facebook integration removed"""
    return {
        "success": True,
        "facebook_configured": False,
        "instagram_configured": False,
        "service_status": {
            "access_token_present": False,
            "page_id_present": False,
            "instagram_id_present": False
        }
    }


@app.get("/api/facebook/page-info")
async def get_facebook_page_info_stub():
    """Stub endpoint - Facebook integration removed"""
    return {"success": False, "error": "Facebook integration has been disabled"}


@app.get("/api/facebook/post/{post_id}/insights")
async def get_facebook_post_insights_stub(post_id: str):
    """Stub endpoint - Facebook integration removed"""
    return {"success": False, "error": "Facebook integration has been disabled"}


@app.get("/api/scheduler/status")
async def get_scheduler_status():
    """Get current scheduler service status"""
    try:
        status = await scheduler_service.get_scheduler_status()
        return {"success": True, "status": status}
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/scheduler/start")
async def start_scheduler_service():
    """Manually start the scheduler service"""
    try:
        await scheduler_service.start()
        return {"success": True, "message": "Scheduler started"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/scheduler/stop")
async def stop_scheduler_service():
    """Manually stop the scheduler service"""
    try:
        await scheduler_service.stop()
        return {"success": True, "message": "Scheduler stopped"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn

    # Check required environment variables
    if not GROQ_API_KEY:
        print("Warning: GROQ_API_KEY not found. Groq caption generation will not work.")
    if not CHATGPT_API_KEY:
        print("Warning: CHATGPT_API not found. ChatGPT caption and image generation will not work.")
    if not STABILITY_API_KEY:
        print("Warning: STABILITY_API_KEY not found. Stability AI image generation will not work.")
    if not NANO_BANANA_API_KEY:
        print("Warning: NANO_BANANA_API_KEY not found. Nano Banana image generation will not work.")

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


