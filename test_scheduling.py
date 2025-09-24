#!/usr/bin/env python3

from datetime import datetime, timedelta
from typing import List

def _compute_schedule_dates(num_posts: int, days: int) -> List[str]:
    """Distribute posts across the given days; allow multiple posts per day.
    
    Posts start from the next hour after current time.
    No posts scheduled after 10 PM (22:00).
    Example: If created at 2:30 PM, first post at 3:00 PM.
    """
    if num_posts <= 0:
        return []
    if days <= 0:
        days = 1

    # Define business hours (9 AM to 10 PM)
    EARLIEST_HOUR = 9
    LATEST_HOUR = 22  # 10 PM
    BUSINESS_HOURS_PER_DAY = LATEST_HOUR - EARLIEST_HOUR  # 13 hours

    # Start from next hour after current time, but not earlier than 9 AM
    now = datetime.now()
    next_hour = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    
    # If it's past 10 PM, start tomorrow at 9 AM
    if next_hour.hour > LATEST_HOUR:
        start_time = (next_hour + timedelta(days=1)).replace(hour=EARLIEST_HOUR)
    # If it's before 9 AM, start at 9 AM today
    elif next_hour.hour < EARLIEST_HOUR:
        start_time = next_hour.replace(hour=EARLIEST_HOUR)
    else:
        start_time = next_hour

    # Calculate optimal distribution
    posts_per_day = (num_posts + days - 1) // days  # Ceiling division
    
    # If too many posts for business hours, spread across more days
    if posts_per_day > BUSINESS_HOURS_PER_DAY:
        # Recalculate days to accommodate all posts within business hours
        days = (num_posts + BUSINESS_HOURS_PER_DAY - 1) // BUSINESS_HOURS_PER_DAY
        posts_per_day = (num_posts + days - 1) // days

    results: List[str] = []
    for i in range(num_posts):
        day_index = i // posts_per_day
        slot_index = i % posts_per_day

        # Start at the base time for this day
        schedule_time = start_time + timedelta(days=day_index)
        
        if posts_per_day == 1:
            # Single post per day, use the start time for each day
            # But ensure it's within business hours
            if schedule_time.hour < EARLIEST_HOUR:
                schedule_time = schedule_time.replace(hour=EARLIEST_HOUR)
            elif schedule_time.hour > LATEST_HOUR:
                schedule_time = schedule_time.replace(hour=LATEST_HOUR)
        else:
            # Multiple posts per day, distribute evenly within business hours
            base_hour = max(schedule_time.hour, EARLIEST_HOUR)
            hours_remaining_today = LATEST_HOUR - base_hour
            
            # If not enough hours left today for all posts, spread across more days
            if hours_remaining_today < posts_per_day - 1:
                # Redistribute posts across more days to stay within business hours
                # Move this post to the next day if needed
                if slot_index > hours_remaining_today:
                    extra_days = (slot_index - hours_remaining_today + BUSINESS_HOURS_PER_DAY - 1) // BUSINESS_HOURS_PER_DAY
                    schedule_time = (schedule_time + timedelta(days=extra_days)).replace(hour=EARLIEST_HOUR)
                    slot_index = slot_index % BUSINESS_HOURS_PER_DAY
                    base_hour = EARLIEST_HOUR
                    hours_remaining_today = BUSINESS_HOURS_PER_DAY
            
            # Calculate the target hour within business hours
            if posts_per_day > 1 and hours_remaining_today > 0:
                hour_spacing = max(1, hours_remaining_today // posts_per_day)
                target_hour = base_hour + (slot_index * hour_spacing)
                
                # Ensure we absolutely don't exceed business hours
                target_hour = min(target_hour, LATEST_HOUR)
                
                schedule_time = schedule_time.replace(hour=target_hour)

        results.append(schedule_time.isoformat())
    return results

def test_scheduling():
    print("🧪 Testing Schedule Distribution Logic\n")
    
    # Test Case 1: 2 posts over 1 day (your reported problem)
    print("📋 Test Case 1: 2 posts, 1 day")
    dates1 = _compute_schedule_dates(2, 1)
    for i, date in enumerate(dates1):
        print(f"   Post {i + 1}: {datetime.fromisoformat(date).strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test Case 2: 3 posts over 2 days
    print("📋 Test Case 2: 3 posts, 2 days") 
    dates2 = _compute_schedule_dates(3, 2)
    for i, date in enumerate(dates2):
        print(f"   Post {i + 1}: {datetime.fromisoformat(date).strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test Case 3: 5 posts over 3 days
    print("📋 Test Case 3: 5 posts, 3 days")
    dates3 = _compute_schedule_dates(5, 3)
    for i, date in enumerate(dates3):
        print(f"   Post {i + 1}: {datetime.fromisoformat(date).strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test Case 4: 4 posts over 1 day (multiple posts same day)
    print("📋 Test Case 4: 4 posts, 1 day")
    dates4 = _compute_schedule_dates(4, 1)
    for i, date in enumerate(dates4):
        print(f"   Post {i + 1}: {datetime.fromisoformat(date).strftime('%Y-%m-%d %H:%M:%S')}")
    print()

if __name__ == "__main__":
    test_scheduling()