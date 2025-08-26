#!/usr/bin/env python3
"""
Test script for the Instagram Post Generator API
Run this after starting the server to test the endpoints
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health check endpoint"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Health check: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
    print()

def test_root():
    """Test root endpoint"""
    print("🔍 Testing root endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✅ Root endpoint: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"❌ Root endpoint failed: {e}")
    print()

def test_models():
    """Test models endpoint"""
    print("🔍 Testing models endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/models")
        print(f"✅ Models endpoint: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"❌ Models endpoint failed: {e}")
    print()

def test_generate_caption():
    """Test caption generation endpoint"""
    print("🔍 Testing caption generation...")
    
    test_data = {
        "product_description": "Eco-friendly water bottle with temperature indicator and ergonomic design",
        "posting_date": "2024-01-15",
        "posting_time": "02:30 PM"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/generate-caption-only",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"✅ Caption generation: {response.status_code}")
        result = response.json()
        print(f"Success: {result.get('success')}")
        if result.get('caption'):
            print(f"Generated Caption: {result['caption']}")
        if result.get('error'):
            print(f"Error: {result['error']}")
    except Exception as e:
        print(f"❌ Caption generation failed: {e}")
    print()

def test_generate_post():
    """Test complete post generation endpoint"""
    print("🔍 Testing complete post generation...")
    
    test_data = {
        "product_description": "Wireless earbuds with active noise cancellation and 30-hour battery life",
        "posting_date": "2024-01-16",
        "posting_time": "10:00 AM"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/generate-post",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"✅ Post generation: {response.status_code}")
        result = response.json()
        print(f"Success: {result.get('success')}")
        if result.get('caption'):
            print(f"Generated Caption: {result['caption']}")
        if result.get('image_base64'):
            print(f"Image generated: {len(result['image_base64'])} characters")
        if result.get('error'):
            print(f"Note: {result['error']}")
    except Exception as e:
        print(f"❌ Post generation failed: {e}")
    print()

def test_validation_errors():
    """Test input validation"""
    print("🔍 Testing input validation...")
    
    # Test invalid date format
    invalid_date_data = {
        "product_description": "Test product",
        "posting_date": "15-01-2024",  # Wrong format
        "posting_time": "02:30 PM"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/generate-post",
            json=invalid_date_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"✅ Invalid date validation: {response.status_code}")
        result = response.json()
        print(f"Error message: {result.get('error')}")
    except Exception as e:
        print(f"❌ Invalid date validation failed: {e}")
    
    # Test invalid time format
    invalid_time_data = {
        "product_description": "Test product",
        "posting_date": "2024-01-15",
        "posting_time": "14:30"  # Wrong format
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/generate-post",
            json=invalid_time_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"✅ Invalid time validation: {response.status_code}")
        result = response.json()
        print(f"Error message: {result.get('error')}")
    except Exception as e:
        print(f"❌ Invalid time validation failed: {e}")
    
    print()

def test_generate_batch():
    payload = {
        "description": "Eco-friendly bamboo toothbrush",
        "days": 10,
        "num_posts": 3
    }
    r = requests.post(f"{BASE_URL}/generate-batch", headers={"Content-Type": "application/json"}, json=payload, timeout=120)
    print("status:", r.status_code)
    print(r.json())

def main():
    """Run all tests"""
    print("🚀 Starting API Tests...")
    print("=" * 50)
    
    # Wait a moment for server to be ready
    print("⏳ Waiting for server to be ready...")
    time.sleep(2)
    
    test_health()
    test_root()
    test_models()
    test_generate_caption()
    test_generate_post()
    test_validation_errors()
    test_generate_batch()
    
    print("=" * 50)
    print("✨ API testing completed!")

if __name__ == "__main__":
    main()
