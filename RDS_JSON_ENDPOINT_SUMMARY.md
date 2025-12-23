# RDS JSON Public Endpoint Implementation

## Overview
A new public RDS JSON endpoint has been implemented to provide real-time RDS (Radio Data System) data in a standardized JSON format. This endpoint can be accessed publicly without authentication and provides current RDS information for the radio station.

## Endpoint Details

### URL
- **Local Network**: `http://192.168.10.121/rds.json`
- **External Domain**: `http://l.103.fm:8080/rds.json`
- **Internal API**: `http://192.168.10.121:5174/rds.json`

### Response Format
```json
{
  "station": {
    "name": "103fm"
  },
  "rds_data": {
    "pty": 4,
    "ms": 1,
    "radiotext": [
      {
        "id": "RT1",
        "message": "Shnaim Ad Arba with Ron Shalom & Yoav Cohen",
        "priority": 1
      },
      {
        "id": "RT2",
        "message": "Download our app from Play Store & App Store",
        "priority": 2
      },
      {
        "id": "RT3",
        "message": "Website: https://103fm.maariv.co.il | WhatsApp: 054-70-103-70",
        "priority": 3
      }
    ]
  },
  "metadata": {
    "timestamp": "2025-08-19T12:45:40.807Z",
    "language": "English"
  }
}
```

## Data Fields

### Station Information
- **name**: Station name (always "103fm")

### RDS Data
- **pty**: Program Type (1=NEWS, 4=SPORTS, 21=PHONE-IN, 26=NATIONAL MUSIC, 17=FINANCE, 0=NONE)
- **ms**: Music/Speech (0=SPEECH ONLY, 1=MUSIC PROGRAMMING)
- **radiotext**: Array of radio text messages with priority levels

### Radio Text Messages
- **RT1**: Primary radio text (current show information)
- **RT2**: Secondary radio text (app download information)
- **RT3**: Tertiary radio text (website and contact information)

### Metadata
- **timestamp**: ISO 8601 timestamp in Israel timezone (+3 hours from UTC)
- **language**: Language of the content (always "English")

## Implementation Details

### Backend Changes
1. **New Route Added**: `/rds.json` endpoint in `server/server.js`
2. **Database Integration**: Uses the same RDS data fetching logic as the admin interface
3. **CORS Headers**: Configured to allow public access from any origin
4. **Caching System**: 30-minute cache with updates at XX:00 and XX:30
5. **Timezone Support**: Israel timezone (+3 hours) for accurate timestamps
6. **Cache Invalidation**: `/api/rds/invalidate-cache` endpoint for manual updates
7. **Smart Update Logic**: Detects half-hour transitions for automatic updates

### Nginx Configuration
- Added location block for `/rds.json` to route to API server
- Configured CORS headers for public access
- Applied to both local network (port 80) and external access (port 8080) servers
- **Fixed**: Reordered location blocks to ensure `/rds.json` is processed before general `/` location

### Data Source
The endpoint fetches data from:
- `schedule_slots` table for current show information
- `rds_settings` table for global RDS configuration and override settings
- Uses the same date/time logic as the admin RDS preview
- **Override Support**: When enabled, uses manual PTY, MS, and RT1 values instead of schedule data

## Usage Examples

### JavaScript Fetch
```javascript
fetch('http://192.168.10.121/rds.json')
  .then(response => response.json())
  .then(data => {
    console.log('Current RDS Data:', data);
    console.log('Show:', data.rds_data.radiotext[0].message);
    console.log('PTY:', data.rds_data.pty);
  });
```

### cURL Command
```bash
curl -s http://192.168.10.121/rds.json | jq .
```

### Python Request
```python
import requests
import json

response = requests.get('http://192.168.10.121/rds.json')
rds_data = response.json()
print(f"Current Show: {rds_data['rds_data']['radiotext'][0]['message']}")
```

## Performance & Caching
- **30-Minute Cache**: Data updates every 30 minutes at XX:00 and XX:30
- **Server-Side Caching**: Reduces database load and improves response time
- **Client-Side Cache**: HTTP cache headers set for 30 minutes
- **Smart Updates**: Only regenerates data when schedule changes
- **Manual Invalidation**: Admin panel "Update Now" button forces immediate cache refresh
- **Automatic Logic**: Detects half-hour transitions (0-29 → 30-59 minutes)
- **Data Consistency**: Both admin API and public JSON use same time calculation

## Security Considerations
- **Public Access**: Endpoint is designed for public consumption
- **CORS Enabled**: Allows cross-origin requests
- **No Authentication**: Intentionally accessible without credentials
- **Read-Only**: Only provides data, no modification capabilities

## Monitoring
- Server logs show when the endpoint is accessed
- Includes timestamp and RDS data values in logs
- Error handling for database connection issues

## Future Enhancements
- Add rate limiting for public access
- Add additional metadata fields
- Support for different output formats (XML, CSV)
- Configurable cache intervals
- Real-time WebSocket updates for premium users
- Webhook notifications when cache is updated
- **Override Scheduling**: Schedule override periods in advance
- **Override History**: Track when overrides were active
