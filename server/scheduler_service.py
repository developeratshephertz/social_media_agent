"""
Background scheduler service for automated social media posting
Monitors scheduled posts and publishes them to Facebook at the scheduled time
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from database_service import db_service
from facebook_poster import post_to_facebook, verify_facebook_setup

logger = logging.getLogger(__name__)

class SchedulerService:
    """Background service for scheduling and publishing posts"""
    
    def __init__(self):
        self.is_running = False
        self.poll_interval = 60  # Check every 60 seconds
        self.task = None
    
    async def start(self):
        """Start the background scheduler"""
        if self.is_running:
            logger.info("Scheduler is already running")
            return
        
        self.is_running = True
        logger.info("Starting scheduler service...")
        
        self.task = asyncio.create_task(self._run_scheduler_loop())
    
    async def stop(self):
        """Stop the background scheduler"""
        if not self.is_running:
            return
        
        logger.info("Stopping scheduler service...")
        self.is_running = False
        
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
    
    async def _run_scheduler_loop(self):
        """Main scheduler loop"""
        logger.info("Scheduler loop started")
        
        while self.is_running:
            try:
                await self._process_scheduled_posts()
                await asyncio.sleep(self.poll_interval)
            except asyncio.CancelledError:
                logger.info("Scheduler loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                await asyncio.sleep(self.poll_interval)  # Continue after error
    
    async def _process_scheduled_posts(self):
        """Check for and process posts that are due for publishing"""
        try:
            # Get posts scheduled for now or earlier
            scheduled_posts = await db_service.get_posts_due_for_publishing()
            
            if not scheduled_posts:
                return
            
            logger.info(f"Found {len(scheduled_posts)} posts due for publishing")
            
            for post in scheduled_posts:
                await self._publish_post(post)
                
        except Exception as e:
            logger.error(f"Error processing scheduled posts: {e}")
    
    async def _publish_post(self, post: Dict[str, Any]):
        """Publish a scheduled post to Facebook"""
        post_id = post.get("id")
        platform = post.get("platform", "").lower()
        caption = post.get("caption", "")
        image_path = post.get("image_path")
        
        logger.info(f"Publishing scheduled post {post_id} to {platform}")
        logger.info(f"Caption: {caption[:100]}...")
        logger.info(f"Image path: {image_path}")
        
        try:
            if platform in ["facebook", "instagram"]:
                # Post to Facebook using the new adapter
                logger.info(f"Attempting to post to Facebook for post {post_id}")
                
                # Use the Facebook poster to publish
                result = post_to_facebook(caption=caption, image_path=image_path)
                
                if result["success"]:
                    # Mark post as published with Facebook post details
                    await self._mark_post_published(post_id, result)
                    logger.info(f"✅ Successfully published post {post_id} to Facebook!")
                    logger.info(f"Facebook Post ID: {result.get('post_id')}")
                    logger.info(f"Post URL: {result.get('url')}")
                else:
                    # Mark post as failed with error details
                    error_msg = result.get("error", "Unknown error")
                    await self._mark_post_failed(post_id, error_msg)
                    logger.error(f"❌ Failed to publish post {post_id}: {error_msg}")
            else:
                logger.warning(f"Unsupported platform: {platform}")
                await self._mark_post_failed(post_id, f"Unsupported platform: {platform}")
                
        except Exception as e:
            logger.error(f"Exception publishing post {post_id}: {e}")
            await self._mark_post_failed(post_id, str(e))
    
    def _get_image_url(self, image_path: Optional[str]) -> Optional[str]:
        """Convert image path to accessible URL"""
        if not image_path:
            return None
        
        # If it's already a full URL, return as-is
        if image_path.startswith(("http://", "https://")):
            return image_path
        
        # If it's a local path, convert to localhost URL
        if image_path.startswith("/public/"):
            return f"http://localhost:8000{image_path}"
        elif image_path.startswith("public/"):
            return f"http://localhost:8000/{image_path}"
        
        return image_path
    
    async def _mark_post_published(self, post_id: str, result: Dict[str, Any]):
        """Mark a post as successfully published to Facebook"""
        try:
            from database import db_manager
            import json
            
            published_at = datetime.now(timezone.utc)
            
            # Update post status to published
            update_query = """
                UPDATE posts 
                SET status = 'published', 
                    posted_at = :posted_at,
                    updated_at = NOW()
                WHERE id = :post_id
            """
            
            values = {
                "post_id": post_id,
                "posted_at": published_at
            }
            
            await db_manager.execute_query(update_query, values)
            
            # Store Facebook post details in engagement_metrics
            engagement_data = {
                "platform": result.get("platform", "facebook"),
                "facebook_post_id": result.get("post_id"),
                "post_url": result.get("url"),
                "published_at": result.get("posted_at", published_at.isoformat()),
                "status": "published"
            }
            
            # Escape single quotes in JSON for SQL
            json_str = json.dumps(engagement_data).replace("'", "''")
            
            metrics_query = f"""
                UPDATE posts 
                SET engagement_metrics = '{json_str}'::jsonb
                WHERE id = :post_id
            """
            
            await db_manager.execute_query(metrics_query, {"post_id": post_id})
            
            logger.info(f"Marked post {post_id} as published to Facebook")
            
        except Exception as e:
            logger.error(f"Error marking post {post_id} as published: {e}")
    
    async def _mark_post_failed(self, post_id: str, error_message: str):
        """Mark a post as failed to publish"""
        try:
            from database import db_manager
            import json
            
            # Simpler query without explicit casting
            update_query = """
                UPDATE posts 
                SET status = 'failed', 
                    updated_at = NOW()
                WHERE id = :post_id
            """
            
            values = {
                "post_id": post_id
            }
            
            await db_manager.execute_query(update_query, values)
            
            # Update engagement_metrics in a separate query to avoid parameter binding issues
            error_data = {
                "error": error_message,
                "failed_at": datetime.now(timezone.utc).isoformat(),
                "retry_count": 1  # Could be enhanced with retry logic
            }
            
            # Escape single quotes in JSON for SQL
            json_str = json.dumps(error_data).replace("'", "''")
            
            metrics_query = f"""
                UPDATE posts 
                SET engagement_metrics = '{json_str}'::jsonb
                WHERE id = :post_id
            """
            
            await db_manager.execute_query(metrics_query, {"post_id": post_id})
            
            logger.info(f"Marked post {post_id} as failed: {error_message}")
            
        except Exception as e:
            logger.error(f"Error marking post {post_id} as failed: {e}")
    
    async def schedule_post(self, post_id: str, scheduled_time: datetime, platform: str):
        """Schedule a specific post for publishing"""
        try:
            from database import db_manager
            
            update_query = """
                UPDATE posts 
                SET scheduled_at = :scheduled_at,
                    status = 'scheduled',
                    platform = :platform,
                    updated_at = NOW()
                WHERE id = :post_id
            """
            
            values = {
                "post_id": post_id,
                "scheduled_at": scheduled_time,
                "platform": platform
            }
            
            await db_manager.execute_query(update_query, values)
            logger.info(f"Scheduled post {post_id} for {scheduled_time} on {platform}")
            
        except Exception as e:
            logger.error(f"Error scheduling post {post_id}: {e}")
            raise
    
    async def cancel_scheduled_post(self, post_id: str):
        """Cancel a scheduled post"""
        try:
            from database import db_manager
            
            update_query = """
                UPDATE posts 
                SET scheduled_at = NULL,
                    status = 'draft',
                    updated_at = NOW()
                WHERE id = :post_id
            """
            
            values = {"post_id": post_id}
            await db_manager.execute_query(update_query, values)
            logger.info(f"Cancelled scheduled post {post_id}")
            
        except Exception as e:
            logger.error(f"Error cancelling scheduled post {post_id}: {e}")
            raise
    
    async def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status"""
        try:
            scheduled_count = await db_service.count_scheduled_posts()
            recent_posts = await db_service.get_recent_published_posts(limit=5)
            
            return {
                "is_running": self.is_running,
                "poll_interval": self.poll_interval,
                "scheduled_posts_count": scheduled_count,
                "recent_published": recent_posts,
                "last_check": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting scheduler status: {e}")
            return {
                "is_running": self.is_running,
                "error": str(e)
            }


# Global scheduler instance
scheduler_service = SchedulerService()


async def start_scheduler():
    """Start the global scheduler service"""
    await scheduler_service.start()


async def stop_scheduler():
    """Stop the global scheduler service"""
    await scheduler_service.stop()
