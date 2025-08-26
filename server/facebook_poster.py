"""
Fresh Facebook Posting Adapter for Scheduled Posts
Handles automatic posting of scheduled content to Facebook
"""

import os
import logging
import requests
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class FacebookPoster:
    """Clean implementation for posting scheduled content to Facebook"""
    
    def __init__(self):
        """Initialize with Facebook credentials from environment"""
        self.access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
        self.page_id = os.getenv("FACEBOOK_PAGE_ID")
        self.graph_api_base = "https://graph.facebook.com/v18.0"
        
        if not self.access_token:
            logger.warning("FACEBOOK_ACCESS_TOKEN not found in environment")
        if not self.page_id:
            logger.warning("FACEBOOK_PAGE_ID not found in environment")
    
    def is_configured(self) -> bool:
        """Check if Facebook credentials are properly configured"""
        return bool(self.access_token and self.page_id)
    
    def post_with_image(self, caption: str, image_path: str) -> Dict[str, Any]:
        """
        Post to Facebook with an image
        
        Args:
            caption: Text caption for the post
            image_path: Local path to the image file (e.g., /public/image.png)
            
        Returns:
            Dictionary with success status and post details
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "Facebook credentials not configured"
            }
        
        try:
            # Construct the full image path
            if image_path.startswith("/public/"):
                # Remove leading slash and construct actual file path
                actual_path = image_path[1:]  # Remove leading /
            elif image_path.startswith("public/"):
                actual_path = image_path
            else:
                actual_path = f"public/{image_path}"
            
            # Check if image file exists
            if not os.path.exists(actual_path):
                logger.error(f"Image file not found: {actual_path}")
                return {
                    "success": False,
                    "error": f"Image file not found: {actual_path}"
                }
            
            # Prepare the API endpoint for photo upload
            url = f"{self.graph_api_base}/{self.page_id}/photos"
            
            # Prepare the request
            params = {
                "access_token": self.access_token,
                "message": caption
            }
            
            # Open and send the image file
            with open(actual_path, 'rb') as image_file:
                files = {
                    'source': ('image.jpg', image_file, 'image/jpeg')
                }
                
                logger.info(f"Posting to Facebook: {url}")
                logger.info(f"Caption: {caption[:100]}...")
                logger.info(f"Image: {actual_path}")
                
                # Make the API request
                response = requests.post(url, params=params, files=files, timeout=30)
                
                # Check response
                if response.status_code == 200:
                    result = response.json()
                    post_id = result.get('id', result.get('post_id'))
                    
                    logger.info(f"Successfully posted to Facebook! Post ID: {post_id}")
                    
                    return {
                        "success": True,
                        "post_id": post_id,
                        "platform": "facebook",
                        "posted_at": datetime.now(timezone.utc).isoformat(),
                        "url": f"https://www.facebook.com/{post_id}" if post_id else None
                    }
                else:
                    error_data = response.json() if response.content else {}
                    error_msg = error_data.get('error', {}).get('message', f'HTTP {response.status_code}')
                    
                    logger.error(f"Facebook API error: {error_msg}")
                    logger.error(f"Full response: {response.text[:500]}")
                    
                    return {
                        "success": False,
                        "error": f"Facebook API error: {error_msg}",
                        "status_code": response.status_code
                    }
                    
        except FileNotFoundError as e:
            logger.error(f"Image file not found: {e}")
            return {
                "success": False,
                "error": f"Image file not found: {str(e)}"
            }
        except requests.RequestException as e:
            logger.error(f"Network error posting to Facebook: {e}")
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error posting to Facebook: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def post_text_only(self, caption: str) -> Dict[str, Any]:
        """
        Post text-only content to Facebook
        
        Args:
            caption: Text content to post
            
        Returns:
            Dictionary with success status and post details
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "Facebook credentials not configured"
            }
        
        try:
            # Prepare the API endpoint for feed post
            url = f"{self.graph_api_base}/{self.page_id}/feed"
            
            # Prepare the request
            params = {
                "access_token": self.access_token,
                "message": caption
            }
            
            logger.info(f"Posting text to Facebook: {caption[:100]}...")
            
            # Make the API request
            response = requests.post(url, params=params, timeout=30)
            
            # Check response
            if response.status_code == 200:
                result = response.json()
                post_id = result.get('id')
                
                logger.info(f"Successfully posted text to Facebook! Post ID: {post_id}")
                
                return {
                    "success": True,
                    "post_id": post_id,
                    "platform": "facebook",
                    "posted_at": datetime.now(timezone.utc).isoformat(),
                    "url": f"https://www.facebook.com/{post_id}" if post_id else None
                }
            else:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get('error', {}).get('message', f'HTTP {response.status_code}')
                
                logger.error(f"Facebook API error: {error_msg}")
                
                return {
                    "success": False,
                    "error": f"Facebook API error: {error_msg}",
                    "status_code": response.status_code
                }
                
        except requests.RequestException as e:
            logger.error(f"Network error posting to Facebook: {e}")
            return {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error posting to Facebook: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def verify_credentials(self) -> Dict[str, Any]:
        """
        Verify that the Facebook credentials are valid
        
        Returns:
            Dictionary with verification status
        """
        if not self.is_configured():
            return {
                "success": False,
                "configured": False,
                "error": "Facebook credentials not configured"
            }
        
        try:
            # Try to get page information to verify credentials
            url = f"{self.graph_api_base}/{self.page_id}"
            params = {
                "access_token": self.access_token,
                "fields": "id,name"
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                page_data = response.json()
                logger.info(f"Facebook credentials verified. Page: {page_data.get('name')}")
                
                return {
                    "success": True,
                    "configured": True,
                    "page_id": page_data.get('id'),
                    "page_name": page_data.get('name')
                }
            else:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get('error', {}).get('message', 'Invalid credentials')
                
                return {
                    "success": False,
                    "configured": True,
                    "error": f"Invalid credentials: {error_msg}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "configured": True,
                "error": f"Verification failed: {str(e)}"
            }


# Global instance
facebook_poster = FacebookPoster()


# Convenience functions for direct usage
def post_to_facebook(caption: str, image_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Post content to Facebook
    
    Args:
        caption: Text content/caption
        image_path: Optional path to image file
        
    Returns:
        Dictionary with posting result
    """
    if image_path:
        return facebook_poster.post_with_image(caption, image_path)
    else:
        return facebook_poster.post_text_only(caption)


def verify_facebook_setup() -> Dict[str, Any]:
    """Verify Facebook configuration"""
    return facebook_poster.verify_credentials()


if __name__ == "__main__":
    # Test the adapter
    print("Facebook Poster Adapter")
    print("-" * 40)
    
    # Check configuration
    if facebook_poster.is_configured():
        print("✅ Facebook credentials found in environment")
        
        # Verify credentials
        verification = verify_facebook_setup()
        if verification['success']:
            print(f"✅ Credentials verified for page: {verification.get('page_name')}")
        else:
            print(f"❌ Credential verification failed: {verification.get('error')}")
    else:
        print("❌ Facebook credentials not configured")
        print("Please set FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID in .env file")
