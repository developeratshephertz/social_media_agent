#!/bin/bash

# Social Media Agent Server Startup Script
# This ensures we use Python 3 instead of Python 2

echo "🚀 Starting Social Media Agent Server..."
echo "Using Python 3 for FastAPI compatibility"

# Navigate to server directory
cd "$(dirname "$0")"

# Kill any existing instances on port 8000
if lsof -ti:8000 >/dev/null 2>&1; then
    echo "🔄 Stopping existing server instances..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start the server with Python 3
python3 main.py
