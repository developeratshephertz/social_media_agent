#!/usr/bin/env python3
"""
Clean Reddit Adapter - Essential functionality only
Handles reading posts and creating posts with OAuth2 authentication
"""

import os
import logging
import requests 
import base64
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv('.env')

# Configuration
CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
USER_AGENT = os.getenv("REDDIT_USER_AGENT", "linux:SchedulingAdapter:v1.0 (by /u/metabro07)")
ACCESS_TOKEN = os.getenv("REDDIT_ACCESS_TOKEN")
REFRESH_TOKEN = os.getenv("REDDIT_REFRESH_TOKEN")

# Reddit API base URL
REDDIT_API_BASE = "https://oauth.reddit.com"

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reddit-adapter")

class RedditAPI:
    """Clean Reddit API client with essential functionality only"""
    
    def __init__(self):
        self.access_token = ACCESS_TOKEN
        self.refresh_token = REFRESH_TOKEN
        self.user_agent = USER_AGENT
        
        if not self.access_token:
            logger.warning("No access token available")
        else:
            logger.info("Reddit API client initialized with access token")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for API requests"""
        return {
            "User-Agent": self.user_agent,
            "Authorization": f"Bearer {self.access_token}"
        }
    
    def _refresh_access_token(self) -> bool:
        """Refresh the access token using the refresh token"""
        if not self.refresh_token:
            logger.error("No refresh token available")
            return False
            
        try:
            # Prepare the request
            auth_header = base64.b64encode(f'{CLIENT_ID}:{CLIENT_SECRET}'.encode()).decode()
            
            headers = {
                'User-Agent': self.user_agent,
                'Authorization': f'Basic {auth_header}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            data = {
                'grant_type': 'refresh_token',
                'refresh_token': self.refresh_token
            }
            
            logger.info("Refreshing Reddit access token...")
            response = requests.post('https://www.reddit.com/api/v1/access_token', 
                                   headers=headers, data=data)
            
            if response.status_code == 200:
                tokens = response.json()
                self.access_token = tokens.get('access_token')
                
                # Update the environment variable for this session
                os.environ['REDDIT_ACCESS_TOKEN'] = self.access_token
                
                logger.info("✅ Reddit access token refreshed successfully")
                return True
            else:
                logger.error(f"❌ Failed to refresh token: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Exception during token refresh: {e}")
            return False
    
    def get_subreddit_posts(self, subreddit: str, sort: str = "hot", 
                           limit: int = 25, time_period: str = None) -> Dict[str, Any]:
        """
        Get posts from a subreddit
        
        Args:
            subreddit: Name of the subreddit
            sort: Sort method ('hot', 'new', 'top', 'rising', 'controversial')
            limit: Maximum number of posts (max 100)
            time_period: Time period for top/controversial ('hour', 'day', 'week', 'month', 'year', 'all')
        
        Returns:
            List of subreddit posts
        """
        if not self.access_token:
            return {"error": "No access token available"}
        
        endpoint = f"/r/{subreddit}/{sort}"
        
        params = {
            "limit": min(limit, 100),
            "raw_json": 1
        }
        
        if time_period and sort in ["top", "controversial"]:
            params["t"] = time_period
        
        try:
            response = requests.get(
                f"{REDDIT_API_BASE}{endpoint}",
                headers=self._get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {"error": f"HTTP {response.status_code}: {response.text}"}
                
        except Exception as e:
            return {"error": f"Request failed: {str(e)}"}
    
    def upload_media(self, media_path: str) -> Optional[str]:
        """
        Upload media to Reddit using alternative approach
        
        Since Reddit's direct media upload API requires special permissions,
        we'll use a workaround by uploading to a public URL first.
        
        Args:
            media_path: Path to media file
        
        Returns:
            Media URL if successful, None otherwise
        """
        if not self.access_token:
            logger.error("No access token available for media upload")
            return None
        
        try:
            # Get file info
            file_size = os.path.getsize(media_path)
            file_extension = os.path.splitext(media_path)[1].lower()
            filename = os.path.basename(media_path)
            
            logger.info(f"Processing media: {filename} ({file_size} bytes)")
            
            # Determine MIME type
            mime_type_map = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.mp4': 'video/mp4',
                '.mov': 'video/quicktime'
            }
            
            mime_type = mime_type_map.get(file_extension, 'image/jpeg')
            
            # Reddit API supports image uploads with proper OAuth authentication
            # The process involves: 1) Request upload URL, 2) Upload to CDN, 3) Submit post
            
            # Step 1: Request upload URL from Reddit's media asset API
            upload_request_data = {
                'filepath': filename,
                'mimetype': mime_type
            }
            
            logger.info(f"Requesting upload URL from Reddit API...")
            response = requests.post(
                "https://oauth.reddit.com/api/media/asset.json",
                headers=self._get_headers(),
                data=upload_request_data
            )
            
            logger.info(f"Media upload request response: {response.status_code}")
            if response.status_code != 200:
                logger.error(f"Failed to get upload URL: {response.status_code} - {response.text}")
                return None
            
            upload_data = response.json()
            logger.info(f"Upload response data: {upload_data}")
            
            if 'args' not in upload_data:
                logger.error(f"Invalid upload response: {upload_data}")
                return None
            
            upload_args = upload_data['args']
            upload_url = upload_args.get('action')
            
            if not upload_url:
                logger.error(f"No upload URL in response: {upload_data}")
                return None
            
            # Fix URL scheme if missing
            if upload_url.startswith('//'):
                upload_url = 'https:' + upload_url
            
            # Step 2: Upload the media file to Reddit's CDN
            logger.info(f"Uploading media to Reddit CDN: {upload_url}")
            
            # Prepare the form data for S3 upload
            form_data = {}
            for field in upload_args.get('fields', []):
                form_data[field['name']] = field['value']
            
            # Add the file to the form data
            with open(media_path, 'rb') as media_file:
                files = {'file': (filename, media_file, mime_type)}
                upload_response = requests.post(
                    upload_url,
                    data=form_data,
                    files=files
                )
            
            logger.info(f"CDN upload response: {upload_response.status_code}")
            if upload_response.status_code == 201:  # S3 returns 201 for successful uploads
                # S3 returns XML response, extract the key from the response
                response_text = upload_response.text
                logger.info(f"CDN upload result: {response_text}")
                
                # Extract the key from the XML response
                import re
                key_match = re.search(r'<Key>(.*?)</Key>', response_text)
                if key_match:
                    media_key = key_match.group(1)
                    # Construct the media URL using the asset_id from the original response
                    asset_id = upload_data['asset']['asset_id']
                    media_url = f"https://reddit-uploaded-media.s3-accelerate.amazonaws.com/{asset_id}"
                    logger.info(f"✅ Media uploaded successfully: {media_url}")
                    return media_url
                else:
                    logger.error(f"Could not extract key from S3 response: {response_text}")
                    return None
            else:
                logger.error(f"CDN upload failed: {upload_response.status_code} - {upload_response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Exception during media processing: {e}")
            return None

    def create_post(self, subreddit: str, title: str, content: str = None, 
                    post_type: str = "self", url: str = None, media_url: str = None) -> Dict[str, Any]:
        """
        Create a new post on Reddit
        
        Args:
            subreddit: Name of the subreddit
            title: Post title (up to 300 characters)
            content: Post content for self posts
            post_type: Type of post ('self', 'link', 'image')
            url: URL for link posts
            media_url: Media URL for image/video posts
        
        Returns:
            API response data
        """
        if not self.access_token:
            return {"error": "No access token available"}
        
        endpoint = "/api/submit"
        
        data = {
            "sr": subreddit,
            "title": title,
            "kind": post_type,
            "api_type": "json"
        }
        
        if post_type == "self" and content:
            data["text"] = content
        elif post_type == "link" and url:
            data["url"] = url
        elif post_type == "image" and media_url:
            data["url"] = media_url
            # For image posts, we can also include text as a caption
            if content:
                data["text"] = content
        elif post_type == "video" and media_url:
            data["url"] = media_url
            # For video posts, we can also include text as a caption
            if content:
                data["text"] = content
        
        logger.info(f"Creating post in r/{subreddit}: {title}")
        
        try:
            response = requests.post(
                f"{REDDIT_API_BASE}{endpoint}",
                headers=self._get_headers(),
                data=data
            )
            
            # If we get a 401/403, try to refresh the token and retry once
            if response.status_code in [401, 403]:
                logger.warning(f"Authentication failed ({response.status_code}), attempting token refresh...")
                if self._refresh_access_token():
                    # Retry the request with the new token
                    response = requests.post(
                        f"{REDDIT_API_BASE}{endpoint}",
                        headers=self._get_headers(),
                        data=data
                    )
                else:
                    return {"error": "Token refresh failed"}
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Post created successfully")
                return result
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                logger.error(f"Post creation failed: {error_msg}")
                return {"error": error_msg}
                
        except Exception as e:
            error_msg = f"Exception during post creation: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg}
    
    def test_connection(self) -> Dict[str, Any]:
        """Test the API connection and get user info"""
        if not self.access_token:
            return {"error": "No access token available"}
        
        try:
            response = requests.get(
                f"{REDDIT_API_BASE}/api/v1/me",
                headers=self._get_headers()
            )
            
            # If we get a 401/403, try to refresh the token and retry once
            if response.status_code in [401, 403]:
                logger.warning(f"Authentication failed ({response.status_code}), attempting token refresh...")
                if self._refresh_access_token():
                    # Retry the request with the new token
                    response = requests.get(
                        f"{REDDIT_API_BASE}/api/v1/me",
                        headers=self._get_headers()
                    )
                else:
                    return {"error": "Token refresh failed"}
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    "success": True,
                    "username": user_data.get("name"),
                    "karma": user_data.get("link_karma", 0) + user_data.get("comment_karma", 0)
                }
            else:
                return {"error": f"Authentication failed: {response.status_code}"}
                
        except Exception as e:
            return {"error": f"Connection test failed: {str(e)}"}
    
    def get_post_analytics(self, post_id: str) -> Dict[str, Any]:
        """
        Get analytics for a specific post
        
        Args:
            post_id: Reddit post ID (without t3_ prefix)
        
        Returns:
            Post analytics including score, comments, engagement, etc.
        """
        if not self.access_token:
            return {"error": "No access token available"}
        
        try:
            # Get post details
            response = requests.get(
                f"{REDDIT_API_BASE}/comments/{post_id}",
                headers=self._get_headers(),
                params={"limit": 1, "raw_json": 1}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    post_data = data[0]["data"]["children"][0]["data"]
                    
                    # Calculate engagement metrics
                    score = post_data.get("score", 0)
                    upvote_ratio = post_data.get("upvote_ratio", 0)
                    num_comments = post_data.get("num_comments", 0)
                    created_utc = post_data.get("created_utc", 0)
                    subreddit = post_data.get("subreddit", "")
                    title = post_data.get("title", "")
                    
                    # Calculate upvotes and downvotes from score and ratio
                    total_votes = abs(score) / (2 * upvote_ratio - 1) if upvote_ratio != 0.5 else abs(score) * 2
                    estimated_upvotes = max(0, int((score + total_votes) / 2))
                    estimated_downvotes = max(0, int(total_votes - estimated_upvotes))
                    
                    # Calculate engagement rate (score + comments)
                    engagement_score = score + num_comments
                    
                    # Calculate time since posting
                    post_time = datetime.fromtimestamp(created_utc)
                    time_since_post = datetime.now() - post_time
                    
                    analytics = {
                        "post_id": post_id,
                        "title": title,
                        "subreddit": f"r/{subreddit}",
                        "score": score,
                        "upvote_ratio": upvote_ratio,
                        "estimated_upvotes": estimated_upvotes,
                        "estimated_downvotes": estimated_downvotes,
                        "total_votes": int(total_votes) if total_votes > 0 else 0,
                        "num_comments": num_comments,
                        "engagement_score": engagement_score,
                        "created_at": post_time.isoformat(),
                        "time_since_post": str(time_since_post).split('.')[0],
                        "url": f"https://reddit.com{post_data.get('permalink', '')}",
                        "permalink": post_data.get("permalink", ""),
                        "full_text": post_data.get("selftext", ""),
                    }
                    
                    return analytics
                else:
                    return {"error": "No post data found"}
            else:
                return {"error": f"Failed to fetch post: {response.status_code}"}
                
        except Exception as e:
            return {"error": f"Analytics request failed: {str(e)}"}



