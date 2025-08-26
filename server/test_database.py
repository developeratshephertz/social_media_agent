#!/usr/bin/env python3
"""
Database Integration Test Script
This script tests the PostgreSQL integration for the Social Media Agent
"""
import os
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_database_integration():
    """Test database integration functionality"""
    print("🔍 Testing Social Media Agent Database Integration")
    print("=" * 50)
    
    try:
        # Import our database modules
        from database import db_manager, initialize_database, check_database_connection
        from database_service import db_service
        
        # Test 1: Database connection
        print("1️⃣ Testing database connection...")
        await db_manager.connect()
        connection_ok = await check_database_connection()
        if connection_ok:
            print("✅ Database connection successful")
        else:
            print("❌ Database connection failed")
            return False
            
        # Test 2: Database initialization
        print("\n2️⃣ Testing database initialization...")
        init_success = await initialize_database()
        if init_success:
            print("✅ Database initialization successful")
        else:
            print("❌ Database initialization failed")
            return False
            
        # Test 3: Get default campaign
        print("\n3️⃣ Testing default campaign retrieval...")
        campaign_id = await db_service.get_default_campaign_id()
        if campaign_id:
            print(f"✅ Default campaign ID: {campaign_id}")
        else:
            print("❌ Could not get default campaign ID")
            
        # Test 4: Create a test post
        print("\n4️⃣ Testing post creation...")
        test_description = "Test post for database integration"
        test_caption = "🧪 Testing database integration! #Test #Database #SocialMedia"
        test_image_path = "/public/test_image.png"
        
        post_id = await db_service.create_post(
            original_description=test_description,
            caption=test_caption,
            image_path=test_image_path,
            campaign_id=campaign_id,
            platform="instagram"
        )
        
        if post_id:
            print(f"✅ Test post created with ID: {post_id}")
        else:
            print("❌ Failed to create test post")
            return False
            
        # Test 5: Save image info
        print("\n5️⃣ Testing image info storage...")
        image_id = await db_service.save_image_info(
            post_id=post_id,
            file_path=test_image_path,
            generation_method="test",
            generation_prompt=test_description
        )
        
        if image_id:
            print(f"✅ Image info saved with ID: {image_id}")
        else:
            print("❌ Failed to save image info")
            
        # Test 6: Save caption info
        print("\n6️⃣ Testing caption info storage...")
        caption_id = await db_service.save_caption_info(
            post_id=post_id,
            content=test_caption,
            generation_method="test",
            generation_prompt=f"Test caption for: {test_description}"
        )
        
        if caption_id:
            print(f"✅ Caption info saved with ID: {caption_id}")
        else:
            print("❌ Failed to save caption info")
            
        # Test 7: Save posting schedule
        print("\n7️⃣ Testing posting schedule storage...")
        from datetime import datetime, timedelta
        scheduled_time = datetime.now() + timedelta(hours=1)
        
        schedule_id = await db_service.save_posting_schedule(
            post_id=post_id,
            scheduled_at=scheduled_time,
            priority=1
        )
        
        if schedule_id:
            print(f"✅ Posting schedule saved with ID: {schedule_id}")
        else:
            print("❌ Failed to save posting schedule")
            
        # Test 8: Retrieve post data
        print("\n8️⃣ Testing post retrieval...")
        retrieved_post = await db_service.get_post_by_id(post_id)
        
        if retrieved_post:
            print(f"✅ Post retrieved successfully")
            print(f"   Description: {retrieved_post.get('original_description')}")
            print(f"   Caption: {retrieved_post.get('caption')}")
            print(f"   Status: {retrieved_post.get('status')}")
        else:
            print("❌ Failed to retrieve post")
            
        # Test 9: Get recent posts
        print("\n9️⃣ Testing recent posts query...")
        recent_posts = await db_service.get_recent_posts(limit=5)
        
        if recent_posts:
            print(f"✅ Retrieved {len(recent_posts)} recent posts")
            for i, post in enumerate(recent_posts[:2]):  # Show first 2
                print(f"   Post {i+1}: {post.get('original_description', 'No description')[:50]}...")
        else:
            print("❌ No recent posts found")
            
        # Test 10: Get database statistics
        print("\n🔟 Testing database statistics...")
        stats = await db_service.get_database_stats()
        
        if stats:
            print("✅ Database statistics retrieved:")
            for key, value in stats.items():
                print(f"   {key.replace('_', ' ').title()}: {value}")
        else:
            print("❌ Failed to get database statistics")
            
        # Test 11: Create batch operation
        print("\n1️⃣1️⃣ Testing batch operation...")
        batch_id = await db_service.create_batch_operation(
            description="Test batch operation",
            num_posts=3,
            days_duration=7,
            created_by="test_script"
        )
        
        if batch_id:
            print(f"✅ Batch operation created with ID: {batch_id}")
            
            # Update batch progress
            await db_service.update_batch_operation_progress(
                batch_id=batch_id,
                posts_generated=1,
                posts_failed=0,
                status="in_progress"
            )
            print("✅ Batch operation progress updated")
        else:
            print("❌ Failed to create batch operation")
            
        print("\n" + "=" * 50)
        print("🎉 All database integration tests completed successfully!")
        print("Your PostgreSQL integration is working correctly.")
        
        # Close database connection
        await db_manager.disconnect()
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all required modules are installed:")
        print("pip install -r requirements.txt")
        return False
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        print("\nTroubleshooting tips:")
        print("1. Make sure PostgreSQL is running")
        print("2. Check your DATABASE_URL in .env file")
        print("3. Verify database user has proper permissions")
        print("4. Ensure the database exists")
        return False

def main():
    """Main test function"""
    print("Social Media Agent - Database Integration Test")
    print("This script will test your PostgreSQL integration setup.\n")
    
    # Check environment variables
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        print("Please check your .env file configuration")
        return False
        
    print(f"📊 Database URL: {database_url.split('@')[1] if '@' in database_url else 'Not configured'}")
    
    # Run async tests
    try:
        result = asyncio.run(test_database_integration())
        if result:
            print("\n✅ Database integration test PASSED")
            return True
        else:
            print("\n❌ Database integration test FAILED")
            return False
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
        return False
    except Exception as e:
        print(f"\n❌ Test runner error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
