# Authentication Setup Guide

## Google OAuth Configuration

Your Social Media Agent now includes Google OAuth authentication! Here's how to set it up:

### 1. Google OAuth Credentials

The following credentials have been configured in your application:

- **Client ID**: `864294913881-3u52e55mtbom4t23vip5bcjffdf96tmv.apps.googleusercontent.com`
- **Client Secret**: `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`

### 2. Database Schema Updates

The following database changes have been made:

#### New Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
```

#### Updated Tables
- **campaigns**: Added `user_id` foreign key
- **posts**: Added `user_id` foreign key  
- **batch_operations**: Added `user_id` foreign key
- **calendar_events**: Added `user_id` foreign key

### 3. Authentication Features

#### Frontend Components
- **Login Page** (`/login`): Google OAuth sign-in with matching UI aesthetic
- **Register Page** (`/register`): Google OAuth registration (email/password form ready for future)
- **Protected Routes**: All main app routes now require authentication
- **User Menu**: Profile dropdown with logout functionality
- **Auth Store**: Zustand store for managing authentication state

#### Backend Services
- **Auth Service**: Google token verification and user management
- **Auth Routes**: `/auth/google`, `/auth/me`, `/auth/logout`
- **User Isolation**: All posts and campaigns are now user-specific
- **JWT Tokens**: Secure session management

### 4. User Experience

1. **First Visit**: Users are redirected to `/login`
2. **Google Sign-In**: One-click authentication with Google
3. **Automatic Registration**: New users are automatically created in the database
4. **User Isolation**: Each user only sees their own campaigns and posts
5. **Persistent Sessions**: Users stay logged in across browser sessions

### 5. Security Features

- **JWT Tokens**: Secure authentication tokens with 7-day expiration
- **User Isolation**: Database queries filtered by user ID
- **Protected Endpoints**: All API endpoints require authentication
- **Secure Storage**: Auth state persisted in localStorage with encryption

### 6. API Changes

#### New Endpoints
- `POST /auth/google` - Google OAuth authentication
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout user

#### Updated Endpoints
- All post creation endpoints now include `user_id`
- All data retrieval endpoints filter by current user
- Batch operations are user-specific

### 7. Environment Variables

Add these to your `.env` file:

```env
# Google OAuth (already configured)
GOOGLE_CLIENT_ID=864294913881-3u52e55mtbom4t23vip5bcjffdf96tmv.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# JWT Secret (change in production)
JWT_SECRET=your-secret-key-change-in-production
```

### 8. Database Migration

To apply the database changes, run the updated `database_schema.sql` file:

```bash
psql -d your_database -f server/database_schema.sql
```

### 9. Testing

1. Start the application: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You should be redirected to the login page
4. Click "Continue with Google" to test authentication
5. After login, you should see the dashboard with your user info in the sidebar

### 10. Future Enhancements

The authentication system is ready for:
- Email/password registration (forms are prepared)
- Password reset functionality
- User profile management
- Role-based access control
- Multi-tenant support

## Troubleshooting

### Common Issues

1. **Google OAuth Error**: Ensure the client ID is correct and the domain is authorized
2. **Database Errors**: Make sure the database schema has been updated
3. **Token Issues**: Check that JWT_SECRET is set in environment variables
4. **CORS Issues**: Ensure the frontend URL is allowed in Google OAuth settings

### Support

If you encounter any issues, check the browser console and server logs for detailed error messages.
