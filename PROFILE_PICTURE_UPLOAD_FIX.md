# Profile Picture Upload Fix

## Problem Description

Users were experiencing an issue where profile picture uploads in the `/profile` page were not being saved. The uploaded images would disappear after a page refresh, indicating that the files were not being properly uploaded to the server and the profile data was not being updated in the database.

## Root Cause Analysis

The issue was identified in the `uploadAvatar` function in `src/pages/Profile.tsx`:

1. **No Actual File Upload**: The function was only creating a blob URL with `URL.createObjectURL(file)` but not uploading the file to the server
2. **Placeholder Implementation**: The code contained a comment stating "File upload to Supabase storage not implemented in this context"
3. **Missing Profile Update**: The avatar URL was not being saved to the database immediately after upload
4. **Context Not Refreshed**: The AuthContext was not being updated with the new user data after profile changes

## Solution Implemented

### 1. Fixed File Upload Function (`src/pages/Profile.tsx`)

**Before:**
```javascript
const uploadAvatar = async (event) => {
  // ... validation code ...
  const file = event.target.files[0];
  // Placeholder for file upload as direct Supabase storage may not be available
  console.log("File upload to Supabase storage not implemented in this context");
  setAvatarUrl(URL.createObjectURL(file));
  // ... error handling ...
};
```

**After:**
```javascript
const uploadAvatar = async (event) => {
  // ... validation code ...
  const file = event.target.files[0];
  
  // Create FormData for file upload
  const formData = new FormData();
  formData.append('file', file);
  
  // Upload file to server
  const uploadResponse = await fetch('/api/storage/upload/avatars', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  
  // ... error handling and response processing ...
  
  const uploadResult = await uploadResponse.json();
  const newAvatarUrl = uploadResult.data.path;
  
  // Update the avatar URL state
  setAvatarUrl(newAvatarUrl);
  
  // Immediately update the profile with the new avatar URL
  const profileResponse = await fetch('/api/auth/update-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      full_name: name,
      title: title,
      avatar_url: newAvatarUrl
    }),
    credentials: 'include'
  });
  
  // ... error handling and context refresh ...
};
```

### 2. Enhanced Profile Update Function

**Before:**
```javascript
// Note: Cannot update AuthContext directly, data should be saved in DB
```

**After:**
```javascript
// Trigger a custom event to notify AuthContext to refresh
window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: refreshedUserData }));
```

### 3. Added AuthContext Event Listener (`src/contexts/AuthContext.tsx`)

Added a new useEffect hook to listen for user data update events:

```javascript
// Listen for user data updates from profile changes
useEffect(() => {
  const handleUserDataUpdate = (event: CustomEvent) => {
    console.log('AuthContext: Received user data update event', event.detail);
    setUser(event.detail);
  };

  window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
  
  return () => {
    window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
  };
}, []);
```

## Technical Details

### Storage System

The application uses a custom storage system with the following structure:
```
storage/
├── uploads/
│   ├── avatars/           # User profile pictures and avatars
│   ├── work-arrangements/ # PDF work arrangement files
│   ├── profile-pictures/  # Additional profile images
│   ├── documents/         # General document files
│   └── general/           # Catch-all for other file types
```

### API Endpoints Used

1. **File Upload**: `POST /api/storage/upload/avatars`
   - Uploads files to the avatars category
   - Returns file path and metadata

2. **Profile Update**: `POST /api/auth/update-profile`
   - Updates user profile data in the database
   - Includes full_name, title, and avatar_url

3. **User Data Refresh**: `GET /api/auth/refresh-user-data`
   - Fetches the latest user data from the database
   - Used to update the AuthContext

### File Upload Process

1. User selects an image file
2. File is uploaded to `/api/storage/upload/avatars`
3. Server saves file to `storage/uploads/avatars/` with unique filename
4. Server returns the file path
5. Profile is immediately updated with the new avatar URL
6. User data is refreshed and AuthContext is updated
7. UI reflects the changes immediately

## Testing

The fix was tested by:
1. Verifying storage directory structure and permissions
2. Checking TypeScript compilation for errors
3. Ensuring all API endpoints are properly configured
4. Validating the file upload and profile update flow

## Benefits

1. **Immediate Persistence**: Profile pictures are now saved immediately upon upload
2. **No Page Refresh Required**: Changes are reflected in the UI without requiring a page reload
3. **Proper Error Handling**: Comprehensive error handling for upload and update failures
4. **Context Synchronization**: AuthContext is properly updated with new user data
5. **File Organization**: Files are properly organized in the storage system

## Files Modified

1. `src/pages/Profile.tsx` - Fixed uploadAvatar and handleUpdateProfile functions
2. `src/contexts/AuthContext.tsx` - Added event listener for user data updates

## Files Verified

1. `server/routes/storage.js` - Storage API endpoints
2. `server/routes/auth.js` - Profile update and user data refresh endpoints
3. `server/server.js` - Storage route mounting
4. `storage/uploads/avatars/` - Storage directory structure
