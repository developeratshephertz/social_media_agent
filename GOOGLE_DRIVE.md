# Google Drive Integration Setup & Testing

## 🎉 Integration Complete!

Your social media agent now has Google Drive integration to save campaigns and images in JSON format!

## ✅ What's Been Implemented

### Backend Changes:
1. **Google OAuth Integration** - Complete authentication flow
2. **Google Drive API** - Save campaigns as JSON files with images
3. **New API Endpoints**:
   - `GET /google/status` - Check connection status
   - `GET /google/connect` - Initiate OAuth flow
   - `GET /callback` - OAuth callback handler
   - `POST /google-drive/save-campaign` - Save campaign to Drive
   - `POST /google-calendar/create-event` - Create calendar events

### Frontend Changes:
1. **GoogleDriveIntegration Component** - New UI component for Drive operations
2. **Settings Page** - Google account connection management
3. **CreateCampaign Page** - Save campaigns to Drive after generation

## 🚀 How to Test

### 1. Start Your Servers
```bash
# Terminal 1: Start the backend
cd "server"
python3 main.py

# Terminal 2: Start the frontend  
npm run dev
```

### 2. Connect Google Drive
1. Go to `http://localhost:5173/settings`
2. Find the "Google Drive" section
3. Click "Connect" button
4. You'll see a popup for Google OAuth
5. Sign in with your Google account
6. Grant permissions for Drive access
7. The status should change to "Connected"

### 3. Test Campaign Creation & Save
1. Go to `http://localhost:5173/create`
2. Enter a product description (e.g., "Eco-friendly bamboo toothbrush")
3. Set days (e.g., 5) and number of posts (e.g., 3)
4. Click "Create" to generate campaigns
5. You'll see a new "Google Drive Integration" section appear
6. Click "Save All to Drive" to save all campaigns
7. Or use individual "Save to Drive" buttons for specific campaigns

### 4. Check Your Google Drive
After saving, you should see:
- **JSON files** with campaign data (captions, metadata, schedule)
- **Image files** (JPEGs converted from generated images)
- Files named like: `campaign_{id}_{timestamp}.json` and `campaign_{id}_image.jpeg`

## 📋 JSON Format Saved to Drive

Each campaign is saved as a JSON file with this structure:
```json
{
  "id": "campaign_id",
  "productDescription": "Your product description",
  "generatedContent": "AI-generated caption with emojis and hashtags",
  "scheduledAt": "2024-01-15T14:30:00.000Z",
  "status": "Draft",
  "imageUrl": "https://drive.google.com/file/d/FILE_ID/view",
  "imageFileId": "drive_file_id",
  "createdAt": "2024-01-15T12:00:00.000Z",
  "activity": [
    {"time": 1642248000000, "text": "Campaign created"}
  ]
}
```

## 🔧 API Testing

You can also test the API directly:

### Check Google Status:
```bash
curl http://localhost:8000/google/status
```

### Save a Campaign:
```bash
curl -X POST http://localhost:8000/google-drive/save-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_123",
    "productDescription": "Test product",
    "generatedContent": "Test caption #test",
    "scheduledAt": "2024-01-15T14:30:00.000Z",
    "status": "Draft",
    "imageUrl": "http://localhost:8000/public/some_image.png",
    "activity": []
  }'
```

## 🐛 Troubleshooting

### If Connection Fails:
1. Check that `Credentials.json` exists in the server folder
2. Ensure Google Cloud project has Drive API enabled
3. Verify redirect URI is set to `http://localhost:8000/callback`
4. Check browser console for errors

### If Saving Fails:
1. Ensure you're connected to Google Drive first
2. Check server logs for API errors
3. Verify the campaign has valid data
4. Check Google Drive API quotas

### Common Issues:
- **"Credentials.json not found"** - Make sure the file exists in server folder
- **"Missing refresh token"** - Reconnect your Google account
- **"Failed to save"** - Check Google API permissions and quotas

## 🎯 Next Steps

Your integration is ready! You can now:
1. Generate campaigns with AI
2. Save them to Google Drive automatically
3. Keep organized backups of all your content
4. Access files from anywhere via Google Drive

The JSON format makes it easy to:
- Import campaigns into other tools
- Backup your content
- Share campaigns with team members
- Track campaign history and performance

Enjoy your new Google Drive integration! 🚀
