"""
Database service functions for Social Media Agent
Provides CRUD operations and business logic for database models
"""
import os
import re
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from PIL import Image as PILImage
from database import db_manager, get_sync_db
from models import (
    Campaign, Post, Image, Caption, PostingSchedule, BatchOperation,
    PostResponse, CampaignResponse, ImageResponse, CaptionResponse,
    PostingScheduleResponse, BatchOperationResponse
)


class DatabaseService:
    """Service class for database operations"""
    
    @staticmethod
    async def create_post(
        original_description: str,
        caption: str = None,
        image_path: str = None,
        scheduled_at: datetime = None,
        campaign_id: str = None,
        platform: str = "instagram",
        status: str = None,
        batch_id: str = None
    ) -> str:
        """Create a new post and return its ID"""
        try:
            # Insert post
            query = """
                INSERT INTO posts (id, campaign_id, original_description, caption, 
                                 image_path, scheduled_at, platform, status, batch_id)
                VALUES (:id, :campaign_id, :description, :caption, :image_path, 
                       :scheduled_at, :platform, :status, :batch_id)
                RETURNING id
            """
            post_id = str(uuid.uuid4())
            values = {
                "id": post_id,
                "campaign_id": campaign_id,
                "description": original_description,
                "caption": caption,
                "image_path": image_path,
                "scheduled_at": scheduled_at,
                "platform": platform,
                "status": status or ("draft" if not scheduled_at else "scheduled"),
                "batch_id": batch_id
            }
            
            await db_manager.execute_query(query, values)
            return post_id
            
        except Exception as e:
            print(f"Error creating post: {e}")
            raise
    
    @staticmethod
    async def save_image_info(
        post_id: str,
        file_path: str,
        generation_method: str,
        generation_prompt: str = None,
        generation_settings: Dict[str, Any] = None
    ) -> str:
        """Save image information to database"""
        try:
            # Extract file info
            file_name = os.path.basename(file_path)
            file_size = None
            image_width = None
            image_height = None
            mime_type = None
            
            # Get file stats if file exists
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                try:
                    with PILImage.open(file_path) as img:
                        image_width, image_height = img.size
                        mime_type = f"image/{img.format.lower()}" if img.format else None
                except Exception as e:
                    print(f"Could not read image dimensions: {e}")
            
            # Insert image record
            query = """
                INSERT INTO images (id, post_id, file_path, file_name, file_size,
                                  image_width, image_height, mime_type, generation_method,
                                  generation_prompt, generation_settings)
                VALUES (:id, :post_id, :file_path, :file_name, :file_size,
                       :image_width, :image_height, :mime_type, :generation_method,
                       :generation_prompt, :generation_settings)
                RETURNING id
            """
            
            image_id = str(uuid.uuid4())
            values = {
                "id": image_id,
                "post_id": post_id,
                "file_path": file_path,
                "file_name": file_name,
                "file_size": file_size,
                "image_width": image_width,
                "image_height": image_height,
                "mime_type": mime_type,
                "generation_method": generation_method,
                "generation_prompt": generation_prompt,
                "generation_settings": generation_settings
            }
            
            await db_manager.execute_query(query, values)
            return image_id
            
        except Exception as e:
            print(f"Error saving image info: {e}")
            raise
    
    @staticmethod
    async def save_caption_info(
        post_id: str,
        content: str,
        generation_method: str = "groq",
        generation_prompt: str = None,
        language: str = "en"
    ) -> str:
        """Save caption information to database"""
        try:
            # Extract hashtags from caption
            hashtags = re.findall(r'#\w+', content)
            word_count = len(content.split())
            
            query = """
                INSERT INTO captions (id, post_id, content, generation_method,
                                    generation_prompt, language, hashtags, word_count)
                VALUES (:id, :post_id, :content, :generation_method,
                       :generation_prompt, :language, :hashtags, :word_count)
                RETURNING id
            """
            
            caption_id = str(uuid.uuid4())
            values = {
                "id": caption_id,
                "post_id": post_id,
                "content": content,
                "generation_method": generation_method,
                "generation_prompt": generation_prompt,
                "language": language,
                "hashtags": hashtags,
                "word_count": word_count
            }
            
            await db_manager.execute_query(query, values)
            return caption_id
            
        except Exception as e:
            print(f"Error saving caption info: {e}")
            raise
    
    @staticmethod
    async def save_posting_schedule(
        post_id: str,
        scheduled_at: datetime,
        time_zone: str = "UTC",
        priority: int = 1,
        auto_post: bool = False
    ) -> str:
        """Save posting schedule information"""
        try:
            query = """
                INSERT INTO posting_schedules (id, post_id, scheduled_at, time_zone,
                                             priority, auto_post, status)
                VALUES (:id, :post_id, :scheduled_at, :time_zone,
                       :priority, :auto_post, :status)
                RETURNING id
            """
            
            schedule_id = str(uuid.uuid4())
            values = {
                "id": schedule_id,
                "post_id": post_id,
                "scheduled_at": scheduled_at,
                "time_zone": time_zone,
                "priority": priority,
                "auto_post": auto_post,
                "status": "pending"
            }
            
            await db_manager.execute_query(query, values)
            return schedule_id
            
        except Exception as e:
            print(f"Error saving posting schedule: {e}")
            raise
    
    @staticmethod
    async def create_batch_operation(
        description: str,
        num_posts: int,
        days_duration: int,
        created_by: str = None
    ) -> str:
        """Create a new batch operation record"""
        try:
            query = """
                INSERT INTO batch_operations (id, description, num_posts, days_duration,
                                            status, created_by)
                VALUES (:id, :description, :num_posts, :days_duration,
                       :status, :created_by)
                RETURNING id
            """
            
            batch_id = str(uuid.uuid4())
            values = {
                "id": batch_id,
                "description": description,
                "num_posts": num_posts,
                "days_duration": days_duration,
                "status": "in_progress",
                "created_by": created_by
            }
            
            await db_manager.execute_query(query, values)
            return batch_id
            
        except Exception as e:
            print(f"Error creating batch operation: {e}")
            raise
    
    @staticmethod
    async def update_batch_operation_progress(
        batch_id: str,
        posts_generated: int = None,
        posts_failed: int = None,
        status: str = None,
        error_messages: List[str] = None
    ):
        """Update batch operation progress"""
        try:
            updates = []
            values = {"batch_id": batch_id}
            
            if posts_generated is not None:
                updates.append("posts_generated = :posts_generated")
                values["posts_generated"] = posts_generated
            
            if posts_failed is not None:
                updates.append("posts_failed = :posts_failed")
                values["posts_failed"] = posts_failed
            
            if status is not None:
                updates.append("status = :status")
                values["status"] = status
                
                if status in ["completed", "failed", "cancelled"]:
                    updates.append("completed_at = NOW()")
            
            if error_messages is not None:
                updates.append("error_messages = :error_messages")
                values["error_messages"] = error_messages
            
            if updates:
                query = f"""
                    UPDATE batch_operations 
                    SET {', '.join(updates)}
                    WHERE id = :batch_id
                """
                await db_manager.execute_query(query, values)
                
        except Exception as e:
            print(f"Error updating batch operation: {e}")
            raise
    
    @staticmethod
    async def get_post_by_id(post_id: str) -> Optional[Dict[str, Any]]:
        """Get a post by ID with all related data"""
        try:
            query = """
                SELECT p.*, c.name as campaign_name,
                       array_agg(DISTINCT jsonb_build_object(
                           'id', i.id,
                           'file_path', i.file_path,
                           'file_name', i.file_name,
                           'generation_method', i.generation_method
                       )) FILTER (WHERE i.id IS NOT NULL) as images,
                       array_agg(DISTINCT jsonb_build_object(
                           'id', cap.id,
                           'content', cap.content,
                           'generation_method', cap.generation_method,
                           'is_active', cap.is_active
                       )) FILTER (WHERE cap.id IS NOT NULL) as captions,
                       array_agg(DISTINCT jsonb_build_object(
                           'id', ps.id,
                           'scheduled_at', ps.scheduled_at,
                           'status', ps.status,
                           'priority', ps.priority
                       )) FILTER (WHERE ps.id IS NOT NULL) as schedules
                FROM posts p
                LEFT JOIN campaigns c ON p.campaign_id = c.id
                LEFT JOIN images i ON p.id = i.post_id
                LEFT JOIN captions cap ON p.id = cap.post_id
                LEFT JOIN posting_schedules ps ON p.id = ps.post_id
                WHERE p.id = :post_id
                GROUP BY p.id, c.name
            """
            
            result = await db_manager.fetch_one(query, {"post_id": post_id})
            return dict(result) if result else None
            
        except Exception as e:
            print(f"Error getting post: {e}")
            return None
    
    @staticmethod
    async def get_recent_posts(limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent posts with basic info"""
        try:
            query = """
                SELECT p.id, p.original_description, p.caption, p.image_path,
                       p.status, p.platform, p.scheduled_at, p.created_at, p.batch_id,
                       c.name as campaign_name
                FROM posts p
                LEFT JOIN campaigns c ON p.campaign_id = c.id
                ORDER BY p.created_at DESC
                LIMIT :limit
            """
            
            results = await db_manager.fetch_all(query, {"limit": limit})
            return [dict(row) for row in results]
            
        except Exception as e:
            print(f"Error getting recent posts: {e}")
            return []
    
    @staticmethod
    async def get_scheduled_posts() -> List[Dict[str, Any]]:
        """Get posts scheduled for posting"""
        try:
            query = """
                SELECT p.id, p.original_description, p.caption, p.image_path,
                       p.scheduled_at, p.platform,
                       ps.status as schedule_status, ps.priority
                FROM posts p
                JOIN posting_schedules ps ON p.id = ps.post_id
                WHERE ps.status = 'pending' 
                  AND ps.scheduled_at <= NOW() + INTERVAL '1 day'
                ORDER BY ps.scheduled_at ASC, ps.priority ASC
            """
            
            results = await db_manager.fetch_all(query)
            return [dict(row) for row in results]
            
        except Exception as e:
            print(f"Error getting scheduled posts: {e}")
            return []
    
    @staticmethod
    async def get_batch_operation_status(batch_id: str) -> Optional[Dict[str, Any]]:
        """Get batch operation status"""
        try:
            query = """
                SELECT * FROM batch_operations WHERE id = :batch_id
            """
            
            result = await db_manager.fetch_one(query, {"batch_id": batch_id})
            return dict(result) if result else None
            
        except Exception as e:
            print(f"Error getting batch operation: {e}")
            return None
    
    @staticmethod
    async def get_default_campaign_id() -> Optional[str]:
        """Get the default campaign ID"""
        try:
            query = """
                SELECT id FROM campaigns 
                WHERE name = 'Default Campaign' AND is_active = true
                LIMIT 1
            """
            
            result = await db_manager.fetch_one(query)
            return str(result['id']) if result else None
            
        except Exception as e:
            print(f"Error getting default campaign: {e}")
            return None
    
    @staticmethod
    async def get_database_stats() -> Dict[str, Any]:
        """Get database statistics"""
        try:
            queries = {
                "total_posts": "SELECT COUNT(*) as count FROM posts",
                "total_images": "SELECT COUNT(*) as count FROM images",
                "total_captions": "SELECT COUNT(*) as count FROM captions",
                "pending_schedules": "SELECT COUNT(*) as count FROM posting_schedules WHERE status = 'pending'",
                "active_batches": "SELECT COUNT(*) as count FROM batch_operations WHERE status = 'in_progress'"
            }
            
            stats = {}
            for key, query in queries.items():
                result = await db_manager.fetch_one(query)
                stats[key] = result['count'] if result else 0
            
            return stats
            
        except Exception as e:
            print(f"Error getting database stats: {e}")
            return {}


    @staticmethod
    async def get_posts_due_for_publishing() -> List[Dict[str, Any]]:
        """Get posts that are scheduled and due for publishing"""
        try:
            query = """
                SELECT id, platform, caption, image_path, scheduled_at, original_description
                FROM posts 
                WHERE status = 'scheduled' 
                  AND scheduled_at <= NOW() 
                ORDER BY scheduled_at ASC
            """
            
            results = await db_manager.fetch_all(query)
            return [dict(row) for row in results] if results else []
            
        except Exception as e:
            print(f"Error getting posts due for publishing: {e}")
            return []
    
    @staticmethod
    async def count_scheduled_posts() -> int:
        """Count posts that are currently scheduled"""
        try:
            query = "SELECT COUNT(*) as count FROM posts WHERE status = 'scheduled'"
            result = await db_manager.fetch_one(query)
            return result['count'] if result else 0
            
        except Exception as e:
            print(f"Error counting scheduled posts: {e}")
            return 0
    
    @staticmethod
    async def get_recent_published_posts(limit: int = 5) -> List[Dict[str, Any]]:
        """Get recently published posts"""
        try:
            query = """
                SELECT id, platform, caption, posted_at, engagement_metrics
                FROM posts 
                WHERE status = 'published' 
                ORDER BY posted_at DESC
                LIMIT :limit
            """
            
            results = await db_manager.fetch_all(query, {"limit": limit})
            return [dict(row) for row in results] if results else []
            
        except Exception as e:
            print(f"Error getting recent published posts: {e}")
            return []


# Global service instance
db_service = DatabaseService()
