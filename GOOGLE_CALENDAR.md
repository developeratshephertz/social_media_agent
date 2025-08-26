# Google Calendar Integration Guide 📅

## 🎉 New Feature Added!

Your Social Media Agent now has **Google Calendar Integration** to automatically create calendar events for your scheduled social media posts!

## ✨ What's New

### Frontend Components:
1. **GoogleCalendarIntegration Component** - New UI component for calendar operations
2. **Enhanced Settings Page** - Google Calendar connection management
3. **Enhanced CreateCampaign Page** - Calendar integration alongside Google Drive

### Backend Enhancements:
1. **Enhanced Calendar API** - Improved event creation with detailed descriptions
2. **Batch Calendar Events** - Create multiple events at once
3. **Smart Event Details** - Rich event descriptions with emojis and metadata
4. **Upcoming Events API** - Fetch social media events from calendar

## 🚀 Features

### 📱 **Smart Calendar Events**
- **Rich Descriptions**: Events include product details, content preview, and image links
- **Automatic Reminders**: 10-minute popup and 1-hour email reminders
- **Color Coding**: Green color for easy identification
- **Proper Timing**: 30-minute events to allow posting and engagement monitoring

### 🔄 **Batch Operations**
- **Create All Events**: Generate calendar events for all scheduled campaigns at once
- **Individual Control**: Create events for specific campaigns
- **Status Awareness**: Only creates events for scheduled campaigns

### 🎯 **Smart Filtering**
- **Scheduled vs Unscheduled**: Clear separation of campaigns
- **Warning Messages**: Alerts for campaigns that need scheduling first
- **Status Indicators**: Visual connection status with color-coded dots

## 📋 **How It Works**

### **1. User Workflow**
```
Create Campaigns → Schedule Posts → Create Calendar Events → Get Reminders
```

### **2. Calendar Event Details**
Each event includes:
- 📱 **Summary**: "📱 Post: [Product Description]"
- 📝 **Description**: Full content preview, product details, status
- ⏰ **Duration**: 30 minutes (allows time for posting and monitoring)
- 🔔 **Reminders**: 10-min popup + 1-hour email
- 🎨 **Color**: Green (#2)

### **3. Event Description Format**
```
📱 Social Media Post Reminder
📝 Content: [First 100 characters of caption]...
🎯 Product: [Product description]
📊 Status: [Campaign status]
🖼️ Image: [Image URL if available]
```

## 🛠️ **API Endpoints**

### **Individual Event Creation**
```http
POST /google-calendar/create-event
Content-Type: application/json

{
  "id": "campaign_id",
  "productDescription": "Eco-friendly bamboo toothbrush",
  "generatedContent": "🌱 Go green with our eco-friendly bamboo toothbrush! ✨",
  "scheduledAt": "2024-01-15T14:30:00.000Z",
  "status": "Scheduled",
  "imageUrl": "http://localhost:8000/public/image.png",
  "activity": [...]
}
```

### **Batch Event Creation**
```http
POST /google-calendar/create-batch-events
Content-Type: application/json

{
  "campaigns": [
    { /* Campaign 1 */ },
    { /* Campaign 2 */ },
    // ... more campaigns
  ]
}
```

### **Get Upcoming Events**
```http
GET /google-calendar/upcoming-events
```

## 🎯 **Usage Instructions**

### **Step 1: Connect Google Calendar**
1. Go to **Settings** page (`/settings`)
2. Find the **Google Calendar** section
3. Click **Connect** (uses same OAuth as Google Drive)
4. Authorize calendar access in the popup
5. Status should show **Connected** with green dot

### **Step 2: Create and Schedule Campaigns**
1. Go to **Create Campaign** page (`/create`)
2. Enter product description, days, and number of posts
3. Click **Create** to generate campaigns
4. Click **Schedule** to assign dates and times
5. Both **Google Drive Integration** and **Google Calendar Integration** sections will appear

### **Step 3: Create Calendar Events**
1. In the **Google Calendar Integration** section:
   - Click **Create All Events** to create events for all scheduled campaigns
   - Or use individual **Create Event** buttons for specific campaigns
2. Calendar events will be created with rich details and reminders
3. Success notifications will show event links

### **Step 4: Monitor Your Calendar**
- Events appear in your Google Calendar
- 📱 prefix helps identify social media posts
- Green color coding for easy recognition
- Automatic reminders before posting time

## 🔧 **Advanced Features**

### **Smart Campaign Filtering**
```javascript
// Only scheduled campaigns get calendar events
const scheduledCampaigns = campaigns.filter(c => c.scheduledAt);
const unscheduledCampaigns = campaigns.filter(c => !c.scheduledAt);
```

### **Enhanced Error Handling**
- OAuth connection validation
- Campaign scheduling validation
- Individual vs batch error reporting
- Graceful degradation for failed events

### **Real-time Status Updates**
- Connection status polling
- Visual status indicators
- Toast notifications for user feedback

## 🐛 **Troubleshooting**

### **Connection Issues**
1. **"Not connected"**: 
   - Try refreshing status
   - Reconnect using Google OAuth
   - Check if popup was blocked

2. **"Failed to create event"**:
   - Ensure campaign is scheduled
   - Check Google Calendar permissions
   - Verify Google APIs are enabled

### **Event Creation Issues**
1. **"Campaign must be scheduled"**:
   - Schedule campaigns first using the Schedule button
   - Only scheduled campaigns can have calendar events

2. **"No scheduled campaigns"**:
   - Create campaigns first
   - Use the Schedule button to assign dates/times

### **Permission Issues**
1. **"Missing calendar scope"**:
   - Reconnect Google account
   - Ensure calendar permissions are granted
   - Check that `Credentials.json` includes calendar scope

## 🎨 **UI/UX Features**

### **Visual Design**
- 📅 Calendar emoji for instant recognition
- Color-coded status dots (🟢 Connected, 🔴 Disconnected)
- Warning messages for unscheduled campaigns
- Individual campaign management interface

### **User Experience**
- **Batch Operations**: "Create All Events (5)" shows count
- **Individual Control**: Create events for specific campaigns
- **Status Awareness**: Clear separation of scheduled vs unscheduled
- **Progress Feedback**: Loading states and success notifications

### **Smart Messaging**
- Connection-aware descriptions
- Campaign count in button labels
- Warning alerts for incomplete setup
- Success notifications with event links

## 🔮 **Integration Benefits**

### **For Content Creators**
1. **Never Miss a Post**: Calendar reminders ensure timely posting
2. **Professional Scheduling**: Integration with existing calendar workflow
3. **Content Overview**: Rich event details for quick reference
4. **Batch Efficiency**: Create multiple reminders at once

### **For Teams**
1. **Shared Visibility**: Team calendar access to posting schedule
2. **Coordination**: Avoid posting conflicts across team members
3. **Backup System**: Calendar backup of all scheduled content
4. **Accountability**: Clear posting responsibilities and timing

## 🚀 **Next Steps**

Your Google Calendar integration is ready to use! The system provides:

✅ **Seamless OAuth Integration** (same connection as Google Drive)  
✅ **Rich Calendar Events** with detailed descriptions  
✅ **Smart Reminders** (10-min popup + 1-hour email)  
✅ **Batch Operations** for efficiency  
✅ **Individual Control** for flexibility  
✅ **Visual Status Indicators** for clarity  
✅ **Error Handling** with helpful messages  

Simply connect your Google account once and enjoy automated calendar reminders for all your social media campaigns!

---

**Happy Scheduling! 📅✨**
