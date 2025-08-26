# #!/usr/bin/env python3
# """
# Test script to manually post scheduled content to Facebook
# This will take the post data you provided and publish it to Facebook
# """

# import asyncio
# from facebook_poster import post_to_facebook, verify_facebook_setup
# from datetime import datetime

# def test_post_to_facebook():
#     """Test posting the scheduled content to Facebook"""

#     # Your post data from the database
#     post_data = {
#         "id": "beb850df-78ae-4dae-9912-e655cdba5682",
#         "caption": "Dive into the weekend like this! 🌊🚗 Cars under water, because why not? 💦 #UnderwaterRide #CarEnvy #UniqueRides",
#         "image_path": "/public/placeholder_5f585d3b_1755856052.png",
#         "scheduled_at": "2025-08-22 22:00:00+05:30",
#         "platform": "instagram"
#     }

#     print("=" * 60)
#     print("Facebook Post Test")
#     print("=" * 60)

#     # First verify Facebook setup
#     print("\n1. Verifying Facebook configuration...")
#     verification = verify_facebook_setup()

#     if not verification['success']:
#         print(f"❌ Facebook verification failed: {verification.get('error')}")
#         return

#     print(f"✅ Facebook verified for page: {verification.get('page_name')}")

#     # Now attempt to post
#     print(f"\n2. Posting to Facebook...")
#     print(f"   Caption: {post_data['caption'][:80]}...")
#     print(f"   Image: {post_data['image_path']}")

#     result = post_to_facebook(
#         caption=post_data['caption'],
#         image_path=post_data['image_path']
#     )

#     print("\n3. Result:")
#     if result['success']:
#         print(f"✅ Successfully posted to Facebook!")
#         print(f"   Post ID: {result.get('post_id')}")
#         print(f"   URL: {result.get('url')}")
#         print(f"   Posted at: {result.get('posted_at')}")
#     else:
#         print(f"❌ Failed to post to Facebook")
#         print(f"   Error: {result.get('error')}")
#         if 'status_code' in result:
#             print(f"   Status Code: {result.get('status_code')}")

#     print("\n" + "=" * 60)
#     return result


# async def test_scheduler_posting():
#     """Test the scheduler service posting mechanism"""
#     from scheduler_service import SchedulerService

#     print("\n" + "=" * 60)
#     print("Testing Scheduler Service")
#     print("=" * 60)

#     # Create a test post dict as it would come from the database
#     test_post = {
#         "id": "beb850df-78ae-4dae-9912-e655cdba5682",
#         "caption": "Dive into the weekend like this! 🌊🚗 Cars under water, because why not? 💦 #UnderwaterRide #CarEnvy #UniqueRides",
#         "image_path": "/public/placeholder_5f585d3b_1755856052.png",
#         "platform": "instagram",  # Will be treated as Facebook
#         "scheduled_at": "2025-08-22 22:00:00+05:30"
#     }

#     scheduler = SchedulerService()

#     print("\nSimulating scheduler publishing post...")
#     await scheduler._publish_post(test_post)

#     print("\nScheduler test complete!")


# if __name__ == "__main__":
#     print("Social Media Agent - Facebook Posting Test")
#     print("=" * 60)

#     # Test direct posting
#     print("\nOption 1: Direct Facebook Post Test")
#     result = test_post_to_facebook()

#     # Optionally test scheduler posting
#     print("\nOption 2: Test via Scheduler (press Enter to skip, 'y' to run)")
#     response = input("Run scheduler test? (y/N): ").strip().lower()

#     if response == 'y':
#         asyncio.run(test_scheduler_posting())

#     print("\nTest complete!")
