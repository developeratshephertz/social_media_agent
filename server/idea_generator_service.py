"""
Idea Generator Service with Groq AI Integration
Generates trending content ideas based on user input
"""

import os
import json
import requests
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class IdeaGeneratorService:
    """Service for generating content ideas using Groq AI"""
    
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "llama-3.1-8b-instant"  # Use well-supported model for idea generation
    
    def _build_prompt(self, user_data: Dict[str, Any]) -> str:
        """
        Build an optimized prompt for Groq AI to generate viral content ideas
        """
        age_range = user_data.get("age_range", [18, 35])
        location = user_data.get("location", "global")
        goals = user_data.get("goals", [])
        brand_voice = user_data.get("brand_voice", "casual")
        platforms = user_data.get("platforms", [])
        seasonal_event = user_data.get("seasonal_event", "")
        trend_miner_data = user_data.get("trend_miner_data", "")
        competitor_urls = user_data.get("competitor_urls", "")
        brand_assets_urls = user_data.get("brand_assets_urls", "")
        extra_information = user_data.get("extra_information", "")
        
        # Build context-aware prompt
        prompt = f"""You are a viral content strategist and social media expert. Generate 5 highly engaging, trending content ideas that have maximum potential to go viral and drive engagement.

**TARGET AUDIENCE & CONTEXT:**
- Age Range: {age_range[0]}-{age_range[1]} years old
- Location: {location}
- Brand Voice: {brand_voice}
- Marketing Goals: {', '.join(goals)}
- Platforms: {', '.join(platforms)}

**ADDITIONAL CONTEXT:**
"""
        
        if seasonal_event:
            prompt += f"- Seasonal Event/Timing: {seasonal_event}\n"
        
        if trend_miner_data:
            prompt += f"- Trending Topics/Data: {trend_miner_data}\n"
        
        if competitor_urls:
            prompt += f"- Competitor Analysis: {competitor_urls}\n"
        
        if brand_assets_urls:
            prompt += f"- Brand Assets Available: {brand_assets_urls}\n"
        
        if extra_information:
            prompt += f"- Additional Requirements: {extra_information}\n"
        
        prompt += f"""
**CRITICAL REQUIREMENTS FOR EACH IDEA:**
1. **PLATFORM RESTRICTION:** ALL ideas must ONLY be designed for these platforms: {', '.join(platforms)}. DO NOT suggest any other platforms.
2. **VIRAL POTENTIAL:** Focus on content that has trending elements, current relevance, and emotional triggers
3. **PLATFORM OPTIMIZATION:** Tailor each idea specifically for the selected platforms ({', '.join(platforms)})
4. **ENGAGEMENT DRIVERS:** Include elements that encourage likes, shares, comments, and saves
5. **AUTHENTICITY:** Balance trending appeal with genuine value for the audience

**CRITICAL: OUTPUT FORMAT (VALID JSON ONLY):**
Your response must be ONLY a valid JSON array with exactly 5 objects. Use DOUBLE QUOTES for all strings and arrays. Do not use single quotes. Do not include any other text, explanations, or markdown formatting. Start your response with [ and end with ]. Each object must contain:
{{
  "title": "Catchy, click-worthy title (max 60 chars)",
  "summary": "2-3 sentence hook that explains the idea appeal (max 150 chars)",
  "description": "Detailed execution plan with specific content suggestions, visual ideas, caption recommendations, and posting strategy (300-500 words)",
  "platforms": {platforms} (MUST be exactly these platforms only),
  "content_type": "Video/Image/Carousel/Story/Reel/etc.",
  "estimated_engagement": float (1.0-10.0 predicted engagement rate),
  "trending_score": integer (1-100 viral potential score),
  "best_time_to_post": "Optimal posting time for target audience",
  "hashtags": [8-12 relevant hashtags including trending ones],
  "target_audience": "Specific audience segment description",
  "why_viral": "Explanation of viral elements and trending factors",
  "execution_tips": "3-5 specific tips for maximum impact"
}}

**FOCUS ON:**
- Current trends and viral formats
- Emotional storytelling that resonates
- Interactive elements (polls, questions, challenges)
- User-generated content opportunities  
- Timely/seasonal relevance
- Platform-specific features and algorithms
- Community building potential

Generate ideas that balance entertainment value with business goals. Make each idea feel fresh, authentic, and immediately actionable.

**CRITICAL JSON FORMATTING:**
- Use DOUBLE QUOTES (") for all strings, never single quotes (')
- The "platforms" field must be: {json.dumps(platforms)}
- All strings must be properly escaped
- No trailing commas
- No Python syntax, only pure JSON

**EXAMPLE PLATFORMS FIELD:** "platforms": {json.dumps(platforms)}

RESPOND ONLY WITH VALID JSON ARRAY:"""

        return prompt
    
    async def generate_ideas(self, user_data: Dict[str, Any], user_id: str) -> List[Dict[str, Any]]:
        """
        Generate content ideas using Groq AI
        """
        try:
            if not self.groq_api_key:
                print("❌ Groq API key not found, using fallback ideas")
                return self._get_fallback_ideas(user_data)
            
            print("🤖 Generating ideas with Groq AI...")
            
            # Build optimized prompt
            prompt = self._build_prompt(user_data)
            
            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json",
            }
            
            data = {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a world-class viral content strategist and social media expert. You understand current trends, platform algorithms, and what drives engagement. You MUST respond with ONLY valid JSON format - no markdown, no explanations, no additional text. Your response should start with [ and end with ]."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "model": self.model,
                "max_tokens": 4000,
                "temperature": 0.8,  # Creative but controlled
                "top_p": 0.9,
                "stream": False
            }
            
            print(f"📤 Sending request to Groq API...")
            print(f"🔑 API Key present: {bool(self.groq_api_key)}")
            print(f"🎯 Model: {self.model}")
            print(f"📊 Request data preview: platforms={user_data.get('platforms')}, goals={user_data.get('goals')}")
            
            response = requests.post(
                self.groq_api_url,
                headers=headers,
                json=data,
                timeout=30
            )
            
            print(f"📡 Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"].strip()
                
                print("📥 Received response from Groq API")
                print(f"📄 Content length: {len(content)} characters")
                print(f"📝 Raw content preview: {content[:200]}...")
                
                # Try to parse JSON response
                try:
                    # Clean up the response if it has markdown formatting
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                    elif "```" in content:
                        # Extract content between any code blocks
                        parts = content.split("```")
                        if len(parts) >= 3:
                            content = parts[1].strip()
                    
                    # Remove any leading/trailing whitespace and newlines
                    content = content.strip()
                    
                    # Try to find JSON array in the content if it's embedded
                    if not content.startswith('[') and '[' in content:
                        start_idx = content.find('[')
                        end_idx = content.rfind(']') + 1
                        if start_idx != -1 and end_idx != -1:
                            content = content[start_idx:end_idx]
                    
                    # Fix common JSON formatting issues
                    # Replace single quotes with double quotes for Python-style lists
                    content = content.replace("['", '["').replace("']", '"]').replace("', '", '", "')
                    
                    print(f"🔧 Cleaned content preview: {content[:300]}...")
                    ideas = json.loads(content)
                    
                    if isinstance(ideas, list) and len(ideas) > 0:
                        # Post-process to ensure platform compliance
                        selected_platforms = user_data.get("platforms", [])
                        cleaned_ideas = []
                        
                        for idea in ideas:
                            # Force platforms to match user selection
                            if "platforms" in idea:
                                idea["platforms"] = selected_platforms
                            else:
                                idea["platforms"] = selected_platforms
                            
                            cleaned_ideas.append(idea)
                        
                        print(f"✅ Successfully parsed and cleaned {len(cleaned_ideas)} ideas")
                        print(f"🎯 Enforced platforms: {selected_platforms}")
                        return cleaned_ideas[:5]  # Ensure we return exactly 5 ideas
                    else:
                        print("⚠️ Response is not a valid list, using fallback")
                        return self._get_fallback_ideas(user_data)
                        
                except json.JSONDecodeError as e:
                    print(f"❌ JSON parsing error: {e}")
                    print(f"❌ Full raw content for debugging:")
                    print(content)
                    print(f"❌ Using fallback ideas instead")
                    return self._get_fallback_ideas(user_data)
            else:
                print(f"❌ Groq API error: {response.status_code}")
                print(f"❌ Response headers: {dict(response.headers)}")
                print(f"❌ Response text: {response.text}")
                return self._get_fallback_ideas(user_data)
                
        except Exception as e:
            print(f"❌ Error calling Groq API: {str(e)}")
            return self._get_fallback_ideas(user_data)
    
    def _get_fallback_ideas(self, user_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate fallback ideas when AI service is unavailable
        """
        platforms = user_data.get("platforms", ["instagram"])
        goals = user_data.get("goals", ["engagement"])
        brand_voice = user_data.get("brand_voice", "casual")
        age_range = user_data.get("age_range", [18, 35])
        
        fallback_ideas = [
            {
                "title": "Behind-the-Scenes Content Series",
                "summary": "Show authentic moments and processes that humanize your brand and build connection.",
                "description": f"Create a weekly behind-the-scenes series showcasing your brand's authentic side. Focus on team members, creative processes, daily operations, or product creation. This type of content performs exceptionally well because it builds trust and relatability with your {age_range[0]}-{age_range[1]} audience. Include team member spotlights, workspace tours, brainstorming sessions, and candid moments. Use {brand_voice} tone throughout to maintain brand consistency. Post consistently to build anticipation and engagement.",
                "platforms": platforms,
                "content_type": "Video/Story Series",
                "estimated_engagement": 7.2,
                "trending_score": 85,
                "best_time_to_post": "2-4 PM weekdays",
                "hashtags": ["#BehindTheScenes", "#TeamSpotlight", "#Authentic", "#BrandStory", "#WorkCulture", "#Transparency"],
                "target_audience": f"{age_range[0]}-{age_range[1]} year olds interested in authentic brand stories",
                "why_viral": "Authenticity and relatability drive high engagement",
                "execution_tips": ["Keep it natural", "Show personality", "Include team members", "Use trending audio"]
            },
            {
                "title": "User-Generated Content Challenge",
                "summary": "Launch a branded challenge that encourages followers to create content featuring your product/service.",
                "description": f"Design an engaging challenge that motivates your audience to create content around your brand. This could be a transformation challenge, creative use case showcase, or themed contest. The key is making it fun and shareable while aligning with your {', '.join(goals)} objectives. Provide clear instructions, create a unique hashtag, offer attractive prizes or recognition. Feature the best submissions on your profile to encourage more participation. This approach leverages user creativity while expanding your reach organically.",
                "platforms": platforms,
                "content_type": "Interactive Challenge",
                "estimated_engagement": 8.5,
                "trending_score": 92,
                "best_time_to_post": "6-8 PM",
                "hashtags": ["#Challenge", "#UGC", "#Community", "#Creative", "#ShowOff", "#BrandedChallenge"],
                "target_audience": f"Creative {age_range[0]}-{age_range[1]} year olds who love participating in trends",
                "why_viral": "Participatory content creates community and extends reach",
                "execution_tips": ["Make rules simple", "Offer great prizes", "Feature participants", "Use trending sounds"]
            },
            {
                "title": "Educational Content with Trending Hooks",
                "summary": "Combine valuable educational content with current trends and viral formats for maximum reach.",
                "description": f"Create educational content that teaches your audience something valuable while using trending formats, sounds, or memes. This could be quick tips, tutorials, industry insights, or how-to guides presented in an entertaining way. The combination of value and trending elements significantly boosts engagement and shareability. Structure content with a strong hook in the first 3 seconds, deliver clear value quickly, and end with a call-to-action. Use {brand_voice} tone to maintain brand personality while educating.",
                "platforms": platforms,
                "content_type": "Educational Reel/Video",
                "estimated_engagement": 7.8,
                "trending_score": 88,
                "best_time_to_post": "11 AM-1 PM",
                "hashtags": ["#LearnOnTikTok", "#Educational", "#Tips", "#HowTo", "#Knowledge", "#Tutorial"],
                "target_audience": f"Knowledge-seeking {age_range[0]}-{age_range[1]} year olds who value learning",
                "why_viral": "Educational content with trending elements performs exceptionally well",
                "execution_tips": ["Hook viewers in 3 seconds", "Use trending audio", "Keep it concise", "End with CTA"]
            },
            {
                "title": "Trend Reaction & Brand Spin",
                "summary": "React to current viral trends while cleverly incorporating your brand message or values.",
                "description": f"Monitor trending topics, memes, and viral content, then create your brand's unique take on them. This could be reacting to industry news, participating in viral challenges with a brand twist, or commenting on cultural moments relevant to your audience. The key is staying authentic to your brand voice while being timely and relevant. This approach helps your brand stay current and relatable while potentially reaching new audiences who are following the trend.",
                "platforms": platforms,
                "content_type": "Trend Reaction/Commentary",
                "estimated_engagement": 8.1,
                "trending_score": 95,
                "best_time_to_post": "Peak trend times vary",
                "hashtags": ["#Trending", "#Reaction", "#CurrentEvents", "#BrandTake", "#Viral", "#Timely"],
                "target_audience": f"Trend-aware {age_range[0]}-{age_range[1]} year olds who follow current events",
                "why_viral": "Timeliness and relevance to current trends drive massive reach",
                "execution_tips": ["Be quick to trend", "Stay on-brand", "Add unique perspective", "Use trend hashtags"]
            },
            {
                "title": "Interactive Q&A and Community Building",
                "summary": "Foster community engagement through interactive Q&A sessions and community-focused content.",
                "description": f"Build a strong community by regularly engaging with your audience through Q&A sessions, polls, questions stickers, and community discussions. Address common questions, share insights, and make your audience feel heard and valued. This approach builds loyalty and creates a sense of belonging around your brand. Host regular 'Ask Me Anything' sessions, respond to comments meaningfully, and create content based on community feedback. The {brand_voice} tone should make interactions feel personal and genuine.",
                "platforms": platforms,
                "content_type": "Interactive/Community Content",
                "estimated_engagement": 6.9,
                "trending_score": 78,
                "best_time_to_post": "7-9 PM",
                "hashtags": ["#AMA", "#Community", "#QandA", "#Interactive", "#Engagement", "#AskMeAnything"],
                "target_audience": f"Engaged {age_range[0]}-{age_range[1]} year olds who value community connection",
                "why_viral": "Community engagement creates loyal followers and organic growth",
                "execution_tips": ["Respond promptly", "Ask engaging questions", "Share personal insights", "Build relationships"]
            }
        ]
        
        print(f"📋 Using {len(fallback_ideas)} fallback ideas")
        return fallback_ideas