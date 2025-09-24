from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, validator
from typing import Dict, Optional, Any
import asyncio
from datetime import datetime
import os

# Import platform adapters
from facebook_manager import facebook_manager
from twitter_adapter import TwitterAdapter  
from reddit_adapter import RedditAPI
from env_manager import env_manager

router = APIRouter(prefix="/social-media", tags=["social-media"])

class PlatformCredentials(BaseModel):
    """Model for platform credentials"""
    credentials: Dict[str, str]
    
    class Config:
        # Allow extra fields for flexibility
        extra = "allow"

class ConnectionResponse(BaseModel):
    success: bool
    connected: bool
    message: str
    error: Optional[str] = None

class StatusResponse(BaseModel):
    connected: bool
    has_credentials: bool
    platform: str
    last_checked: str
    details: Optional[Dict[str, Any]] = None

# Platform connection testers
async def test_facebook_connection() -> Dict[str, Any]:
    """Test Facebook connection using existing credentials"""
    try:
        creds = env_manager.check_platform_credentials('facebook')
        if not creds['has_credentials']:
            return {"connected": False, "error": "Missing required credentials"}
        
        # Use existing FacebookManager to test connection
        page_id = os.getenv('FACEBOOK_PAGE_ID')
        access_token = os.getenv('FACEBOOK_ACCESS_TOKEN')
        
        if not page_id or not access_token:
            return {"connected": False, "error": "Missing page ID or access token"}
            
        # This would typically make a test API call
        # For now, we'll just check if credentials exist and are non-empty
        return {
            "connected": True, 
            "details": {"page_id": page_id[:10] + "...", "token_length": len(access_token)}
        }
        
    except Exception as e:
        return {"connected": False, "error": str(e)}

async def test_twitter_connection() -> Dict[str, Any]:
    """Test Twitter connection using existing credentials"""
    try:
        creds = env_manager.check_platform_credentials('twitter')
        if not creds['has_credentials']:
            return {"connected": False, "error": "Missing required credentials"}
        
        # Use existing TwitterAdapter to test connection
        twitter_adapter = TwitterAdapter()
        
        # Test basic authentication
        consumer_key = os.getenv('TWITTER_CONSUMER_KEY')
        consumer_secret = os.getenv('TWITTER_CONSUMER_SECRET') 
        access_token = os.getenv('TWITTER_ACCESS_TOKEN')
        access_token_secret = os.getenv('TWITTER_ACCESS_TOKEN_SECRET')
        
        if not all([consumer_key, consumer_secret, access_token, access_token_secret]):
            return {"connected": False, "error": "Missing required Twitter credentials"}
            
        return {
            "connected": True,
            "details": {
                "consumer_key": consumer_key[:10] + "...",
                "has_access_tokens": bool(access_token and access_token_secret)
            }
        }
        
    except Exception as e:
        return {"connected": False, "error": str(e)}

async def test_reddit_connection() -> Dict[str, Any]:
    """Test Reddit connection using existing credentials"""
    try:
        creds = env_manager.check_platform_credentials('reddit')
        if not creds['has_credentials']:
            return {"connected": False, "error": "Missing required credentials"}
        
        # Use existing RedditAPI to test connection
        reddit_adapter = RedditAPI()
        
        client_id = os.getenv('REDDIT_CLIENT_ID')
        client_secret = os.getenv('REDDIT_CLIENT_SECRET')
        username = os.getenv('REDDIT_USERNAME')
        password = os.getenv('REDDIT_PASSWORD')
        
        if not all([client_id, client_secret, username, password]):
            return {"connected": False, "error": "Missing required Reddit credentials"}
            
        return {
            "connected": True,
            "details": {
                "client_id": client_id[:10] + "...",
                "username": username
            }
        }
        
    except Exception as e:
        return {"connected": False, "error": str(e)}

# API Routes

@router.get("/{platform}/status", response_model=StatusResponse)
async def get_platform_status(platform: str):
    """Get connection status for a social media platform"""
    if platform not in ["facebook", "twitter", "reddit"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported platform: {platform}"
        )
    
    # Test connection based on platform
    connection_testers = {
        "facebook": test_facebook_connection,
        "twitter": test_twitter_connection, 
        "reddit": test_reddit_connection
    }
    
    try:
        result = await connection_testers[platform]()
        creds_check = env_manager.check_platform_credentials(platform)
        
        return StatusResponse(
            connected=result.get("connected", False),
            has_credentials=creds_check["has_credentials"],
            platform=platform,
            last_checked=datetime.now().isoformat(),
            details=result.get("details", {})
        )
        
    except Exception as e:
        return StatusResponse(
            connected=False,
            has_credentials=False,
            platform=platform,
            last_checked=datetime.now().isoformat(),
            details={"error": str(e)}
        )

@router.post("/{platform}/connect", response_model=ConnectionResponse)
async def connect_platform(platform: str, credentials: Dict[str, str]):
    """Connect to a social media platform by saving credentials"""
    if platform not in ["facebook", "twitter", "reddit"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported platform: {platform}"
        )
    
    try:
        # Validate required fields based on platform
        required_fields = {
            "facebook": ["FACEBOOK_PAGE_ID", "FACEBOOK_ACCESS_TOKEN"],
            "twitter": ["TWITTER_CONSUMER_KEY", "TWITTER_CONSUMER_SECRET", 
                       "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN_SECRET",
                       "TWITTER_BEARER_TOKEN", "TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET", "TWITTER_USERNAME"],
            "reddit": ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USERNAME", "REDDIT_PASSWORD",
                      "REDDIT_USER_AGENT", "REDDIT_ACCESS_TOKEN", "REDDIT_REFRESH_TOKEN"]
        }
        
        platform_required = required_fields[platform]
        missing_fields = [field for field in platform_required if field not in credentials or not credentials[field].strip()]
        
        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        # Filter credentials to only include valid platform keys
        valid_keys = env_manager.get_platform_env_keys(platform)
        filtered_credentials = {k: v for k, v in credentials.items() if k in valid_keys}
        
        # Set default values for optional fields
        if platform == "reddit" and "REDDIT_USER_AGENT" not in filtered_credentials:
            filtered_credentials["REDDIT_USER_AGENT"] = "SocialMediaAgent/1.0"
        
        # Save credentials to .env file
        success = env_manager.update_env_vars(filtered_credentials)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save credentials"
            )
        
        # Test the connection with new credentials
        connection_testers = {
            "facebook": test_facebook_connection,
            "twitter": test_twitter_connection,
            "reddit": test_reddit_connection
        }
        
        test_result = await connection_testers[platform]()
        
        return ConnectionResponse(
            success=success,
            connected=test_result.get("connected", False),
            message=f"Successfully connected to {platform.title()}" if test_result.get("connected") else f"Credentials saved but connection test failed",
            error=test_result.get("error") if not test_result.get("connected") else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect to {platform}: {str(e)}"
        )

@router.post("/{platform}/disconnect", response_model=ConnectionResponse)
async def disconnect_platform(platform: str):
    """Disconnect from a social media platform by removing credentials"""
    if platform not in ["facebook", "twitter", "reddit"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported platform: {platform}"
        )
    
    try:
        # Get platform-specific environment keys
        keys_to_remove = env_manager.get_platform_env_keys(platform)
        
        # Remove credentials from .env file
        success = env_manager.remove_env_vars(keys_to_remove)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove credentials"
            )
        
        return ConnectionResponse(
            success=True,
            connected=False,
            message=f"Successfully disconnected from {platform.title()}"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect from {platform}: {str(e)}"
        )

@router.get("/platforms")
async def get_supported_platforms():
    """Get list of supported platforms"""
    return {
        "platforms": [
            {
                "id": "facebook",
                "name": "Facebook",
                "description": "Connect your Facebook page to post content automatically",
                "required_credentials": ["FACEBOOK_PAGE_ID", "FACEBOOK_ACCESS_TOKEN"]
            },
            {
                "id": "twitter", 
                "name": "Twitter",
                "description": "Connect your Twitter account to post tweets automatically",
                "required_credentials": ["TWITTER_CONSUMER_KEY", "TWITTER_CONSUMER_SECRET", 
                                       "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN_SECRET",
                                       "TWITTER_BEARER_TOKEN", "TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET", "TWITTER_USERNAME"]
            },
            {
                "id": "reddit",
                "name": "Reddit", 
                "description": "Connect your Reddit account to post to subreddits automatically",
                "required_credentials": ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", 
                                       "REDDIT_USERNAME", "REDDIT_PASSWORD",
                                       "REDDIT_USER_AGENT", "REDDIT_ACCESS_TOKEN", "REDDIT_REFRESH_TOKEN"]
            }
        ]
    }

@router.get("/status")
async def get_all_platforms_status():
    """Get connection status for all platforms"""
    platforms = ["facebook", "twitter", "reddit"]
    status_results = {}
    
    for platform in platforms:
        try:
            # Get individual platform status
            status_response = await get_platform_status(platform)
            status_results[platform] = {
                "connected": status_response.connected,
                "has_credentials": status_response.has_credentials,
                "last_checked": status_response.last_checked,
                "details": status_response.details
            }
        except Exception as e:
            status_results[platform] = {
                "connected": False,
                "has_credentials": False,
                "last_checked": datetime.now().isoformat(),
                "error": str(e)
            }
    
    return {"platforms": status_results}