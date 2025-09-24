"""
Reddit Service for Social Media Agent
Integrates Reddit posting functionality into the main social media agent
"""

import os
import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from reddit_adapter import RedditAPI

logger = logging.getLogger(__name__)

class RedditService:
    """Service class for Reddit operations in the social media agent"""
    
    def __init__(self):
        """Initialize Reddit service"""
        self.adapter = None
        self.schedule_file = "reddit_scheduled_posts.json"
        self._initialize_adapter()
    
    def _initialize_adapter(self):
        """Initialize the Reddit adapter"""
        try:
            self.adapter = RedditAPI()
            
            # Test connection with automatic token refresh
            connection = self.adapter.test_connection()
            if "error" in connection:
                logger.warning(f"Reddit connection failed: {connection['error']}")
                # Don't set adapter to None - let it try during actual posting
            else:
                logger.info("Reddit service initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize Reddit adapter: {e}")
            # Don't set adapter to None - let it try during actual posting
    
    def is_configured(self) -> bool:
        """Check if Reddit service is properly configured"""
        return self.adapter is not None
    
    def post_to_reddit(self, title: str, content: str, subreddit: str = "test", image_path: str = None) -> Dict[str, Any]:
        """
        Post content to Reddit
        
        Args:
            title: Post title (max 300 characters)
            content: Post content
            subreddit: Target subreddit (default: test)
            image_path: Path to image file to upload with post
            
        Returns:
            Dictionary with posting result
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "Reddit service not configured or connection failed"
            }
        
        try:
            # Validate inputs
            if not title or not title.strip():
                return {"success": False, "error": "Title cannot be empty"}
            
            if not content or not content.strip():
                return {"success": False, "error": "Content cannot be empty"}
            
            if len(title) > 300:
                return {"success": False, "error": f"Title too long ({len(title)}/300 characters)"}
            
            # Handle media upload if image provided
            media_url = None
            post_type = "self"
            
            if image_path:
                logger.info(f"Processing image path: {image_path}")
                if os.path.exists(image_path):
                    logger.info(f"Image file exists, uploading media: {image_path}")
                    media_url = self.adapter.upload_media(image_path)
                    if media_url:
                        # Determine post type based on file extension
                        file_extension = os.path.splitext(image_path)[1].lower()
                        if file_extension in ['.mp4', '.mov', '.avi', '.mkv']:
                            post_type = "video"
                        else:
                            post_type = "image"
                        logger.info(f"✅ Media uploaded successfully: {media_url} (type: {post_type})")
                    else:
                        logger.error(f"❌ Failed to upload media: {image_path}")
                        logger.error("This will result in a text-only post")
                else:
                    logger.warning(f"Image file not found: {image_path}")
            
            # Create the post
            result = self.adapter.create_post(
                subreddit=subreddit, 
                title=title, 
                content=content, 
                post_type=post_type,
                media_url=media_url
            )
            
            if "error" in result:
                return {
                    "success": False,
                    "error": f"Reddit API error: {result['error']}"
                }
            
            # Extract post details
            post_id = None
            post_url = None
            
            if "json" in result and "data" in result["json"]:
                data = result["json"]["data"]
                post_id = data.get("id")
                post_url = data.get("url")
            
            return {
                "success": True,
                "post_id": post_id,
                "platform": "reddit",
                "subreddit": subreddit,
                "url": post_url,
                "media_uploaded": media_url is not None,
                "media_url": media_url,
                "post_type": post_type,
                "posted_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error posting to Reddit: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def schedule_reddit_post(self, title: str, content: str, scheduled_time: str, 
                           subreddit: str = "test") -> Dict[str, Any]:
        """
        Schedule a Reddit post for later publishing
        
        Args:
            title: Post title
            content: Post content
            scheduled_time: ISO format datetime string
            subreddit: Target subreddit
            
        Returns:
            Dictionary with scheduling result
        """
        try:
            # Generate unique ID
            post_id = f"reddit_schedule_{int(datetime.now().timestamp())}"
            
            # Create scheduled post object
            scheduled_post = {
                "id": post_id,
                "subreddit": subreddit,
                "title": title,
                "content": content,
                "post_type": "self",
                "url": None,
                "scheduled_time": scheduled_time,
                "status": "scheduled",
                "created_at": datetime.now().isoformat(),
                "post_id": None,
                "published": False
            }
            
            # Load existing scheduled posts
            scheduled_posts = self._load_scheduled_posts()
            
            # Add new post
            scheduled_posts.append(scheduled_post)
            
            # Save back to file
            self._save_scheduled_posts(scheduled_posts)
            
            return {
                "success": True,
                "post_id": post_id,
                "scheduled_time": scheduled_time,
                "message": f"Reddit post scheduled for {scheduled_time}"
            }
            
        except Exception as e:
            logger.error(f"Error scheduling Reddit post: {e}")
            return {
                "success": False,
                "error": f"Failed to schedule post: {str(e)}"
            }
    
    def get_scheduled_posts(self) -> Dict[str, Any]:
        """Get all scheduled Reddit posts"""
        try:
            posts = self._load_scheduled_posts()
            return {
                "success": True,
                "posts": posts,
                "count": len(posts)
            }
        except Exception as e:
            logger.error(f"Error loading scheduled posts: {e}")
            return {
                "success": False,
                "error": f"Failed to load scheduled posts: {str(e)}"
            }
    
    def publish_scheduled_post(self, post_id: str) -> Dict[str, Any]:
        """
        Publish a scheduled Reddit post
        
        Args:
            post_id: ID of the scheduled post
            
        Returns:
            Dictionary with publishing result
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "Reddit service not configured"
            }
        
        try:
            # Load scheduled posts
            posts = self._load_scheduled_posts()
            
            # Find the post
            post = None
            for p in posts:
                if p.get("id") == post_id:
                    post = p
                    break
            
            if not post:
                return {
                    "success": False,
                    "error": f"Scheduled post {post_id} not found"
                }
            
            # Publish the post
            result = self.post_to_reddit(
                title=post["title"],
                content=post["content"],
                subreddit=post["subreddit"]
            )
            
            if result["success"]:
                # Update the scheduled post
                post["status"] = "published"
                post["published"] = True
                post["published_at"] = result["posted_at"]
                post["post_id"] = result["post_id"]
                post["post_url"] = result["url"]
                
                # Save updated posts
                self._save_scheduled_posts(posts)
                
                return {
                    "success": True,
                    "post_id": result["post_id"],
                    "url": result["url"],
                    "message": "Reddit post published successfully"
                }
            else:
                return result
                
        except Exception as e:
            logger.error(f"Error publishing scheduled Reddit post: {e}")
            return {
                "success": False,
                "error": f"Failed to publish post: {str(e)}"
            }
    
    def get_reddit_analytics(self, post_id: str) -> Dict[str, Any]:
        """
        Get analytics for a Reddit post
        
        Args:
            post_id: Reddit post ID
            
        Returns:
            Dictionary with analytics data
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "Reddit service not configured"
            }
        
        try:
            analytics = self.adapter.get_post_analytics(post_id)
            
            if "error" in analytics:
                return {
                    "success": False,
                    "error": f"Analytics error: {analytics['error']}"
                }
            
            return {
                "success": True,
                "analytics": analytics
            }
            
        except Exception as e:
            logger.error(f"Error getting Reddit analytics: {e}")
            return {
                "success": False,
                "error": f"Failed to get analytics: {str(e)}"
            }
    
    def _load_scheduled_posts(self) -> list:
        """Load scheduled posts from JSON file"""
        try:
            if not os.path.exists(self.schedule_file):
                return []
            
            with open(self.schedule_file, 'r') as f:
                data = json.load(f)
            
            return data.get("scheduled_posts", [])
            
        except Exception as e:
            logger.error(f"Error loading scheduled posts: {e}")
            return []
    
    def _save_scheduled_posts(self, posts: list):
        """Save scheduled posts to JSON file"""
        try:
            with open(self.schedule_file, 'w') as f:
                json.dump({"scheduled_posts": posts}, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving scheduled posts: {e}")
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get Reddit service status"""
        return {
            "configured": self.is_configured(),
            "adapter_available": self.adapter is not None,
            "schedule_file": self.schedule_file,
            "scheduled_posts_count": len(self._load_scheduled_posts())
        }


# Global Reddit service instance
reddit_service = RedditService()



