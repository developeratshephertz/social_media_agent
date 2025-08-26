#!/usr/bin/env python3
"""
Test script to verify image generation and serving
"""

import requests
import json
import os

def test_image_generation():
    """Test the complete image generation flow"""
    
    # Test data
    test_description = "A beautiful sunset over mountains"
    
    print("🌅 Testing Image Generation...")
    print(f"Description: {test_description}")
    print("-" * 50)
    
    try:
        # Test caption generation
        print("1. Generating caption...")
        caption_response = requests.post(
            "http://localhost:8000/generate-caption",
            headers={"Content-Type": "application/json"},
            json={"description": test_description},
            timeout=30
        )
        
        if caption_response.status_code == 200:
            caption_result = caption_response.json()
            if caption_result["success"]:
                print(f"✅ Caption generated: {caption_result['caption'][:100]}...")
            else:
                print(f"❌ Caption failed: {caption_result['error']}")
                return
        else:
            print(f"❌ Caption request failed: {caption_response.status_code}")
            return
        
        # Test complete post generation
        print("2. Generating complete post...")
        post_response = requests.post(
            "http://localhost:8000/generate-post",
            headers={"Content-Type": "application/json"},
            json={"description": test_description},
            timeout=60
        )
        
        if post_response.status_code == 200:
            post_result = post_response.json()
            if post_result["success"]:
                print(f"✅ Post generated successfully!")
                print(f"   Image path: {post_result['image_path']}")
                print(f"   Caption: {post_result['caption'][:100]}...")
                
                # Check if image file exists
                image_filename = post_result['image_path'].replace('/public/', '')
                image_path = f"public/{image_filename}"
                
                if os.path.exists(image_path):
                    file_size = os.path.getsize(image_path)
                    print(f"✅ Image file exists: {image_path}")
                    print(f"   File size: {file_size} bytes")
                    
                    # Test image URL accessibility
                    image_url = f"http://localhost:8000{post_result['image_path']}"
                    print(f"   Testing image URL: {image_url}")
                    
                    img_response = requests.get(image_url, timeout=10)
                    if img_response.status_code == 200:
                        print("✅ Image is accessible via URL!")
                    else:
                        print(f"❌ Image URL not accessible: {img_response.status_code}")
                else:
                    print(f"❌ Image file not found: {image_path}")
            else:
                print(f"❌ Post generation failed: {post_result['error']}")
        else:
            print(f"❌ Post request failed: {post_response.status_code}")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

if __name__ == "__main__":
    test_image_generation()
