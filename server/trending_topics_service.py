"""
AI-powered trending topics service using Groq API
Generates trending topics across different categories with caching
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class TrendingTopicsService:
    """Service for generating AI-powered trending topics"""
    
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.cache_file = "trending_topics_cache.json"
        self.cache_duration_hours = 4
        
        self.categories = {
            "all": "All",
            "technology": "Technology",
            "business": "Business", 
            "lifestyle": "Lifestyle",
            "entertainment": "Entertainment",
            "news": "News"
        }
        
    def is_configured(self) -> bool:
        """Check if the service is properly configured"""
        return bool(self.groq_api_key)
    
    def _load_cache(self) -> Optional[Dict[str, Any]]:
        """Load cached trending topics"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r') as f:
                    cache_data = json.load(f)
                    
                # Check if cache is still valid
                cached_at = datetime.fromisoformat(cache_data.get('cached_at', ''))
                if datetime.now() - cached_at < timedelta(hours=self.cache_duration_hours):
                    logger.info(f"Using cached trending topics from {cached_at}")
                    return cache_data
                else:
                    logger.info(f"Cache expired (cached at {cached_at}), will generate fresh topics")
                    
        except Exception as e:
            logger.error(f"Error loading cache: {e}")
        
        return None
    
    def _save_cache(self, data: Dict[str, Any]):
        """Save trending topics to cache"""
        try:
            cache_data = {
                'cached_at': datetime.now().isoformat(),
                'topics': data
            }
            with open(self.cache_file, 'w') as f:
                json.dump(cache_data, f, indent=2)
            logger.info("Trending topics cached successfully")
        except Exception as e:
            logger.error(f"Error saving cache: {e}")
    
    def _generate_topics_with_groq(self) -> Dict[str, List[str]]:
        """Generate trending topics using Groq API"""
        if not self.groq_api_key:
            raise Exception("Groq API key not configured")
        
        current_date = datetime.now().strftime("%B %Y")
        current_season = self._get_current_season()
        
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json",
        }
        
        # Comprehensive prompt for generating trending topics
        prompt = f"""You are a social media trend expert. Generate 25 current trending topics for {current_date} ({current_season}) that are perfect for social media content creation.

IMPORTANT: Return ONLY a valid JSON object in this exact format:
{{
  "technology": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "business": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "lifestyle": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "entertainment": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "news": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}}

Requirements for each topic:
- Be specific and actionable (not generic)
- Reflect current trends and events in {current_date}
- Be perfect for creating engaging social media posts
- Be relevant to {current_season} season when applicable
- Each topic should be 3-8 words maximum
- Focus on what's actually trending NOW

Categories and examples:
- Technology: AI tools, new apps, tech reviews, digital trends
- Business: entrepreneurship tips, market trends, productivity hacks
- Lifestyle: wellness trends, home improvement, seasonal activities  
- Entertainment: trending shows, viral challenges, celebrity news
- News: current events, social movements, breaking developments

Generate topics that content creators would want to post about RIGHT NOW in {current_date}."""

        data = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert social media trend analyst. Always respond with valid JSON only."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "model": "llama-3.1-8b-instant",
            "max_tokens": 500,
            "temperature": 0.8,
        }
        
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=30,
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"].strip()
                
                # Try to parse JSON response
                try:
                    topics_data = json.loads(content)
                    logger.info("Successfully generated trending topics with Groq API")
                    return topics_data
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON from Groq response: {e}")
                    logger.error(f"Raw response: {content}")
                    raise Exception("Invalid JSON response from AI")
            else:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                raise Exception(f"Groq API error: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error when calling Groq API: {e}")
            raise Exception(f"Network error: {e}")
    
    def _get_current_season(self) -> str:
        """Get current season based on month"""
        month = datetime.now().month
        if month in [12, 1, 2]:
            return "Winter"
        elif month in [3, 4, 5]:
            return "Spring"
        elif month in [6, 7, 8]:
            return "Summer"
        else:
            return "Fall"
    
    def _get_fallback_topics(self) -> Dict[str, List[str]]:
        """Fallback topics when API fails"""
        current_month = datetime.now().strftime("%B")
        return {
            "technology": [
                f"AI productivity tools {datetime.now().year}",
                "Best apps this month",
                "Tech gadget reviews",
                "Smart home automation",
                "Mobile app development"
            ],
            "business": [
                "Remote work productivity",
                f"{current_month} business trends", 
                "Startup success stories",
                "Digital marketing strategies",
                "Entrepreneurship tips"
            ],
            "lifestyle": [
                f"{current_month} wellness tips",
                "Home organization hacks",
                "Seasonal lifestyle changes",
                "Fitness motivation",
                "Mindfulness practices"
            ],
            "entertainment": [
                "Trending Netflix shows",
                "Viral social media challenges", 
                "Celebrity fashion trends",
                "Movie recommendations",
                "Gaming highlights"
            ],
            "news": [
                f"{current_month} current events",
                "Breaking technology news",
                "Social media updates",
                "Global trends",
                "Industry insights"
            ]
        }
    
    def get_trending_topics(self, category: Optional[str] = None) -> Dict[str, Any]:
        """Get trending topics, optionally filtered by category"""
        try:
            # Try to load from cache first
            cached_data = self._load_cache()
            if cached_data:
                topics = cached_data['topics']
            else:
                # Generate fresh topics
                if self.is_configured():
                    logger.info("Generating fresh trending topics with Groq API")
                    topics = self._generate_topics_with_groq()
                    self._save_cache(topics)
                else:
                    logger.warning("Groq API not configured, using fallback topics")
                    topics = self._get_fallback_topics()
            
            # Filter by category if specified
            if category and category != "all" and category in topics:
                filtered_topics = {category: topics[category]}
            else:
                filtered_topics = topics
            
            # Add metadata
            return {
                "success": True,
                "topics": filtered_topics,
                "categories": self.categories,
                "generated_at": datetime.now().isoformat(),
                "using_cache": cached_data is not None,
                "total_topics": sum(len(topics_list) for topics_list in filtered_topics.values())
            }
            
        except Exception as e:
            logger.error(f"Error getting trending topics: {e}")
            # Return fallback topics on error
            fallback_topics = self._get_fallback_topics()
            if category and category != "all" and category in fallback_topics:
                fallback_topics = {category: fallback_topics[category]}
                
            return {
                "success": True,
                "topics": fallback_topics,
                "categories": self.categories,
                "generated_at": datetime.now().isoformat(),
                "using_cache": False,
                "total_topics": sum(len(topics_list) for topics_list in fallback_topics.values()),
                "error": str(e),
                "fallback": True
            }
    
    def refresh_topics(self) -> Dict[str, Any]:
        """Force refresh trending topics (bypass cache)"""
        try:
            # Delete cache file
            if os.path.exists(self.cache_file):
                os.remove(self.cache_file)
                logger.info("Cache cleared")
            
            # Generate fresh topics
            return self.get_trending_topics()
            
        except Exception as e:
            logger.error(f"Error refreshing topics: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Global service instance
trending_service = TrendingTopicsService()