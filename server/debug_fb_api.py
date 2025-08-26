#!/usr/bin/env python3

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

page_id = os.getenv("PAGE_ID")
access_token = os.getenv("ACCESS_TOKEN")
base_url = "https://graph.facebook.com/v21.0"

def test_posts_api():
    """Test what data we get from the posts API"""
    if not page_id or not access_token:
        print("❌ Facebook credentials not configured")
        return
    
    # Test basic fields
    url = f"{base_url}/{page_id}/posts"
    params = {
        "access_token": access_token,
        "limit": 1,
        "fields": "id,message,created_time,likes,reactions,comments,shares"
    }
    
    print("🔍 Testing basic fields request...")
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ API Response received")
        print(json.dumps(data, indent=2))
    else:
        print(f"❌ API Error: {response.status_code}")
        print(response.text)
    
    # Test with summary
    print("\n" + "="*50)
    print("🔍 Testing fields with summary...")
    params["fields"] = "id,message,created_time,likes.summary(true),reactions.summary(true),comments.summary(true),shares"
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        print("✅ API Response with summary received")
        print(json.dumps(data, indent=2))
    else:
        print(f"❌ API Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_posts_api()
