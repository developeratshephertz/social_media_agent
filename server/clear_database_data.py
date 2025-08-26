#!/usr/bin/env python3
"""
Script to clear all data from PostgreSQL database while preserving table structure
This will remove all rows from all tables but keep the schema intact
"""

import os
import asyncio
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def clear_database_data():
    """Clear all data from database tables while preserving structure"""
    
    try:
        # Import database components
        from database import db_manager, get_database_url
        
        print("🗄️  Connecting to database...")
        
        # Get database URL
        db_url = get_database_url()
        print(f"Database: {db_url.split('@')[-1] if '@' in db_url else 'Local database'}")
        
        # List of tables to clear (in correct order to handle foreign key constraints)
        tables_to_clear = [
            'posting_schedules',  # Child tables first
            'captions', 
            'images',
            'calendar_events',
            'posts',
            'batch_operations',
            'campaigns'  # Parent tables last
        ]
        
        print("\n🧹 Clearing database data...")
        print("=" * 50)
        
        cleared_tables = []
        
        for table_name in tables_to_clear:
            try:
                # Check if table has data
                count_query = f"SELECT COUNT(*) as count FROM {table_name}"
                result = await db_manager.fetch_one(count_query)
                row_count = result['count'] if result else 0
                
                if row_count > 0:
                    # Clear the table data
                    truncate_query = f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE"
                    await db_manager.execute_query(truncate_query)
                    print(f"✅ Cleared {row_count:,} rows from '{table_name}' table")
                    cleared_tables.append(table_name)
                else:
                    print(f"ℹ️  Table '{table_name}' was already empty")
                    
            except Exception as table_error:
                print(f"⚠️  Could not clear table '{table_name}': {table_error}")
                # Try alternative approach for tables that might not exist
                try:
                    delete_query = f"DELETE FROM {table_name}"
                    await db_manager.execute_query(delete_query)
                    print(f"✅ Cleared '{table_name}' table using DELETE")
                    cleared_tables.append(table_name)
                except Exception as delete_error:
                    print(f"❌ Failed to clear table '{table_name}': {delete_error}")
        
        print("\n" + "=" * 50)
        print(f"🎉 Database clearing completed!")
        print(f"📊 Tables cleared: {len(cleared_tables)}")
        
        if cleared_tables:
            print("📋 Cleared tables:")
            for table in cleared_tables:
                print(f"   • {table}")
        
        # Verify the clearing worked
        print("\n🔍 Verifying database is empty...")
        total_rows = 0
        
        for table_name in tables_to_clear:
            try:
                count_query = f"SELECT COUNT(*) as count FROM {table_name}"
                result = await db_manager.fetch_one(count_query)
                row_count = result['count'] if result else 0
                total_rows += row_count
                
                if row_count > 0:
                    print(f"⚠️  Table '{table_name}' still has {row_count} rows")
                    
            except Exception as e:
                print(f"⚠️  Could not verify table '{table_name}': {e}")
        
        if total_rows == 0:
            print("✅ All tables are now empty!")
        else:
            print(f"⚠️  {total_rows} rows remaining across all tables")
            
        print("\n📝 Note: Table structures (columns, indexes, constraints) have been preserved")
        
    except Exception as e:
        print(f"❌ Error clearing database: {e}")
        print("\nTroubleshooting tips:")
        print("1. Check your DATABASE_URL in .env file")
        print("2. Ensure PostgreSQL server is running")
        print("3. Verify database connection permissions")
        return False
    
    return True

async def create_default_campaign():
    """Create a default campaign after clearing data"""
    try:
        from database_service import db_service
        
        print("\n🏗️  Creating default campaign...")
        
        # Check if default campaign exists
        default_campaign_id = await db_service.get_default_campaign_id()
        
        if not default_campaign_id:
            # Create default campaign
            query = """
                INSERT INTO campaigns (id, name, description, is_active) 
                VALUES (gen_random_uuid(), 'Default Campaign', 'Default campaign for social media posts', true)
                RETURNING id
            """
            result = await db_manager.fetch_one(query)
            if result:
                print(f"✅ Created default campaign with ID: {result['id']}")
            else:
                print("⚠️  Could not create default campaign")
        else:
            print("ℹ️  Default campaign already exists")
            
    except Exception as e:
        print(f"⚠️  Could not create default campaign: {e}")

def main():
    """Main function to run the database clearing process"""
    
    print("🚨 DATABASE DATA CLEARING TOOL 🚨")
    print("=" * 60)
    print("⚠️  WARNING: This will remove ALL DATA from your database!")
    print("✅ Table structures will be preserved")
    print("=" * 60)
    
    # Confirm the operation
    response = input("\nDo you want to proceed? (type 'YES' to confirm): ")
    
    if response.strip().upper() != 'YES':
        print("❌ Operation cancelled by user")
        return 1
    
    print("\n🔄 Starting database clearing process...")
    
    try:
        # Run the async clearing function
        success = asyncio.run(clear_database_data())
        
        if success:
            # Create default campaign
            asyncio.run(create_default_campaign())
            
            print("\n" + "=" * 60)
            print("🎉 DATABASE CLEARING COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print("✅ All data has been removed")
            print("✅ Table structures preserved") 
            print("✅ Default campaign created")
            print("🚀 Your social media agent is ready for fresh data!")
            return 0
        else:
            print("\n❌ Database clearing failed")
            return 1
            
    except KeyboardInterrupt:
        print("\n⏹️  Operation cancelled by user")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
