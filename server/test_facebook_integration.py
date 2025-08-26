# #!/usr/bin/env python3
# # -*- coding: utf-8 -*-
# """
# Test script for Facebook/Instagram integration
# Tests the core functionality without requiring real API credentials
# """

# import sys
# import os
# from unittest.mock import patch, MagicMock
# import asyncio

# # Add server directory to path
# sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# def test_facebook_service():
#     """Test Facebook service initialization"""
#     print("[TEST] Testing Facebook Service...")

#     try:
#         from facebook_service import FacebookService

#         # Test with mock environment variables
#         with patch.dict(os.environ, {
#             'FACEBOOK_ACCESS_TOKEN': 'test_token',
#             'FACEBOOK_PAGE_ID': 'test_page_id',
#             'INSTAGRAM_BUSINESS_ACCOUNT_ID': 'test_instagram_id'
#         }):
#             service = FacebookService()

#             assert service.is_configured() == True, "Service should be configured with test credentials"
#             assert service.access_token == 'test_token', "Access token should match"
#             assert service.page_id == 'test_page_id', "Page ID should match"
#             assert service.instagram_id == 'test_instagram_id', "Instagram ID should match"

#         print("[PASS] Facebook Service initialization test passed")
#         return True

#     except Exception as e:
#         print("[FAIL] Facebook Service test failed: {}".format(e))
#         return False

# def test_scheduler_service():
#     """Test Scheduler service initialization"""
#     print("🧪 Testing Scheduler Service...")

#     try:
#         from scheduler_service import SchedulerService

#         scheduler = SchedulerService()
#         assert scheduler.is_running == False, "Scheduler should not be running initially"
#         assert scheduler.poll_interval == 60, "Poll interval should be 60 seconds"

#         print("✅ Scheduler Service initialization test passed")
#         return True

#     except Exception as e:
#         print(f"❌ Scheduler Service test failed: {e}")
#         return False

# async def test_scheduler_lifecycle():
#     """Test scheduler start/stop lifecycle"""
#     print("🧪 Testing Scheduler Lifecycle...")

#     try:
#         from scheduler_service import SchedulerService

#         # Mock database operations
#         with patch('scheduler_service.db_service') as mock_db:
#             mock_db.get_posts_due_for_publishing.return_value = []

#             scheduler = SchedulerService()

#             # Test start
#             await scheduler.start()
#             assert scheduler.is_running == True, "Scheduler should be running after start"

#             # Test stop
#             await scheduler.stop()
#             assert scheduler.is_running == False, "Scheduler should not be running after stop"

#         print("✅ Scheduler lifecycle test passed")
#         return True

#     except Exception as e:
#         print(f"❌ Scheduler lifecycle test failed: {e}")
#         return False

# def test_image_processing():
#     """Test image processing functions"""
#     print("🧪 Testing Image Processing...")

#     try:
#         from facebook_service import FacebookService

#         service = FacebookService()

#         # Test Google Drive URL conversion
#         drive_url = "https://drive.google.com/file/d/1234567890abcdef/view"
#         direct_url = service.get_drive_direct_url(drive_url)
#         expected_url = "https://drive.google.com/uc?export=download&id=1234567890abcdef"

#         assert direct_url == expected_url, f"Expected {expected_url}, got {direct_url}"

#         # Test regular URL passthrough
#         regular_url = "https://example.com/image.jpg"
#         result_url = service.get_drive_direct_url(regular_url)
#         assert result_url == regular_url, "Regular URLs should pass through unchanged"

#         print("✅ Image processing test passed")
#         return True

#     except Exception as e:
#         print(f"❌ Image processing test failed: {e}")
#         return False

# def test_imports():
#     """Test that all required modules can be imported"""
#     print("🧪 Testing Module Imports...")

#     try:
#         # Test core imports
#         from facebook_service import facebook_service
#         from scheduler_service import scheduler_service, start_scheduler, stop_scheduler

#         # Test that services are properly instantiated
#         assert facebook_service is not None, "Facebook service should be instantiated"
#         assert scheduler_service is not None, "Scheduler service should be instantiated"

#         print("✅ Module imports test passed")
#         return True

#     except Exception as e:
#         print(f"❌ Module imports test failed: {e}")
#         return False

# def test_database_integration():
#     """Test database service extensions"""
#     print("🧪 Testing Database Integration...")

#     try:
#         from database_service import DatabaseService

#         # Check that new methods exist
#         db_service = DatabaseService()

#         # Test method existence
#         assert hasattr(db_service, 'get_posts_due_for_publishing'), "Missing get_posts_due_for_publishing method"
#         assert hasattr(db_service, 'count_scheduled_posts'), "Missing count_scheduled_posts method"
#         assert hasattr(db_service, 'get_recent_published_posts'), "Missing get_recent_published_posts method"

#         print("✅ Database integration test passed")
#         return True

#     except Exception as e:
#         print(f"❌ Database integration test failed: {e}")
#         return False

# async def run_async_tests():
#     """Run async tests"""
#     results = []
#     results.append(await test_scheduler_lifecycle())
#     return results

# def main():
#     """Run all tests"""
#     print("🚀 Starting Facebook/Instagram Integration Tests\n")

#     # Run synchronous tests
#     sync_results = [
#         test_imports(),
#         test_facebook_service(),
#         test_scheduler_service(),
#         test_image_processing(),
#         test_database_integration()
#     ]

#     # Run asynchronous tests
#     async_results = asyncio.run(run_async_tests())

#     all_results = sync_results + async_results

#     # Summary
#     print("\n" + "="*50)
#     print("📊 TEST SUMMARY")
#     print("="*50)

#     passed = sum(all_results)
#     total = len(all_results)

#     print(f"✅ Passed: {passed}")
#     print(f"❌ Failed: {total - passed}")
#     print(f"📈 Success Rate: {(passed/total)*100:.1f}%")

#     if passed == total:
#         print("\n🎉 All tests passed! The Facebook integration is ready to use.")
#         print("\n📋 Next Steps:")
#         print("1. Set up your Facebook App and get credentials")
#         print("2. Copy server/.env.example to server/.env")
#         print("3. Fill in your Facebook credentials")
#         print("4. Install dependencies: pip install -r server/requirements.txt")
#         print("5. Start the server and test with real credentials")
#         return 0
#     else:
#         print("\n⚠️  Some tests failed. Please check the integration.")
#         return 1

# if __name__ == "__main__":
#     sys.exit(main())
