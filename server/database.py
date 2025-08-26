"""
Database configuration and connection utilities for Social Media Agent
"""
import os
import asyncio
from typing import Optional
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
from databases import Database
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/social_media_agent"
)

# For async operations
database = Database(DATABASE_URL)

# For sync operations with SQLAlchemy
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# SQLAlchemy base
Base = declarative_base()

# Metadata for database operations
metadata = MetaData()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """Database manager for handling connections and operations"""
    
    def __init__(self):
        self.database = database
        self.engine = engine
    
    async def connect(self):
        """Connect to the database"""
        try:
            await self.database.connect()
            logger.info("Database connected successfully")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from the database"""
        try:
            await self.database.disconnect()
            logger.info("Database disconnected successfully")
        except Exception as e:
            logger.error(f"Failed to disconnect from database: {e}")
            raise
    
    def get_sync_session(self):
        """Get a synchronous database session"""
        return SessionLocal()
    
    async def execute_query(self, query: str, values: dict = None):
        """Execute a raw SQL query"""
        try:
            return await self.database.execute(query=query, values=values or {})
        except Exception as e:
            logger.error(f"Failed to execute query: {e}")
            raise
    
    async def fetch_one(self, query: str, values: dict = None):
        """Fetch one record from database"""
        try:
            return await self.database.fetch_one(query=query, values=values or {})
        except Exception as e:
            logger.error(f"Failed to fetch one record: {e}")
            raise
    
    async def fetch_all(self, query: str, values: dict = None):
        """Fetch all records from database"""
        try:
            return await self.database.fetch_all(query=query, values=values or {})
        except Exception as e:
            logger.error(f"Failed to fetch all records: {e}")
            raise


# Global database manager instance
db_manager = DatabaseManager()


def get_database():
    """Dependency to get database instance"""
    return db_manager.database


def get_sync_db():
    """Dependency to get sync database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def check_database_connection() -> bool:
    """Check if database connection is working"""
    try:
        await database.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return False


async def initialize_database():
    """Initialize database tables if they don't exist"""
    try:
        # Check if we can connect
        if not await check_database_connection():
            logger.error("Cannot connect to database for initialization")
            return False
        
        # Read and execute schema file
        schema_path = os.path.join(os.path.dirname(__file__), "database_schema.sql")
        if os.path.exists(schema_path):
            with open(schema_path, 'r') as f:
                schema_sql = f.read()
                
            # Split by semicolon and execute each statement
            statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
            
            for statement in statements:
                try:
                    await database.execute(statement)
                except Exception as e:
                    # Ignore errors for statements that might already exist
                    if "already exists" not in str(e).lower():
                        logger.warning(f"Schema statement warning: {e}")
            
            logger.info("Database schema initialized successfully")
            return True
        else:
            logger.error("Database schema file not found")
            return False
            
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False


async def create_tables():
    """Create all tables using SQLAlchemy metadata"""
    try:
        # Import models to register them with Base
        from . import models  # This will be created next
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("All tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
        return False


def get_database_info():
    """Get database connection information"""
    return {
        "database_url": DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else "Not configured",
        "engine": str(engine.url).split('@')[1] if '@' in str(engine.url) else "Not configured",
        "pool_size": engine.pool.size() if hasattr(engine.pool, 'size') else "Unknown"
    }


# Startup and shutdown events for FastAPI
async def startup_db():
    """Database startup handler"""
    try:
        await db_manager.connect()
        await initialize_database()
        logger.info("Database startup completed")
    except Exception as e:
        logger.error(f"Database startup failed: {e}")
        raise


async def shutdown_db():
    """Database shutdown handler"""
    try:
        await db_manager.disconnect()
        logger.info("Database shutdown completed")
    except Exception as e:
        logger.error(f"Database shutdown failed: {e}")
