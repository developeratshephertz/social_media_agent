# Gemini Agent Project: Social Media Agent

This file serves as a reference for the Gemini agent working on this project.

## Project Overview

This project is a **Social Media Agent** application.

Based on the current file structure, the project appears to consist of:

*   **Frontend:** A React application built with Vite. The source code is in the `src/` directory.
*   **Backend:** A Python server using FastAPI. The source code is in the `server/` directory.

## Key Features (Inferred)

*   **Web Interface:** A user-facing web UI built with React components.
*   **API Server:** A Python backend to handle business logic.
*   **Google Integration:** The `google_complete.py` file suggests integration with Google Drive for file storage or retrieval and Google Calendar for scheduling.
*   **Image Generation:** The presence of `test_image_generation.py` and generated images in `server/public/` suggests capabilities for creating images.

## Agent's Goal

The primary goal of the Gemini agent is to assist in the development, maintenance, and enhancement of this social media agent application as requested by the user.

## Docker Development Environment

This project is configured to run in a Docker environment for consistent development and deployment. The setup uses Docker Compose to orchestrate the frontend and backend services.

### Prerequisites

*   Docker Desktop installed and running.

### Running the Application

To start the application, run the following command in the root of the project:

```bash
docker-compose up --build
```

This will build the Docker images for both the frontend and backend and start the containers.

*   The frontend will be available at [http://localhost:5173](http://localhost:5173)
*   The backend will be available at [http://localhost:8000](http://localhost:8000)

The services are configured for hot-reloading, so any changes you make to the source code will be reflected in real-time.
