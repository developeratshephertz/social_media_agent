#!/usr/bin/env python3

import sys
import os

print("Testing Facebook Integration Imports...")

try:
    # Test Facebook service import
    from facebook_service import FacebookService, facebook_service
    print("[PASS] Facebook service imported successfully")
    
    # Test service initialization
    service = FacebookService()
    print("[PASS] Facebook service can be instantiated")
    
    # Test key methods exist
    assert hasattr(service, 'is_configured')
    assert hasattr(service, 'post_to_facebook') 
    assert hasattr(service, 'post_to_instagram')
    assert hasattr(service, 'get_drive_direct_url')
    print("[PASS] Facebook service has required methods")
    
except Exception as e:
    print("[FAIL] Facebook service import failed: {}".format(e))
    sys.exit(1)

try:
    # Test Scheduler service import
    from scheduler_service import SchedulerService, scheduler_service
    print("[PASS] Scheduler service imported successfully")
    
    # Test service initialization 
    scheduler = SchedulerService()
    print("[PASS] Scheduler service can be instantiated")
    
    # Test key methods exist
    assert hasattr(scheduler, 'start')
    assert hasattr(scheduler, 'stop') 
    assert hasattr(scheduler, 'schedule_post')
    print("[PASS] Scheduler service has required methods")
    
except Exception as e:
    print("[FAIL] Scheduler service import failed: {}".format(e))
    sys.exit(1)

try:
    # Test database service extensions
    from database_service import db_service
    print("[PASS] Database service imported successfully")
    
    # Test new methods exist
    assert hasattr(db_service, 'get_posts_due_for_publishing')
    assert hasattr(db_service, 'count_scheduled_posts')
    assert hasattr(db_service, 'get_recent_published_posts')
    print("[PASS] Database service has extended methods")
    
except Exception as e:
    print("[FAIL] Database service import failed: {}".format(e))
    sys.exit(1)

print("\n[SUCCESS] All Facebook integration components imported successfully!")
print("\nNext steps:")
print("1. Configure your Facebook credentials in .env")
print("2. Install dependencies: pip install -r requirements.txt") 
print("3. Start the server: python main.py")
print("4. Test the API endpoints")
