# Recording Playback and Upload Fix

## Issues Identified

Based on the screenshots provided, there were two main issues:

1. **Recording not uploading to S3**: The recording showed 0:00 duration, indicating it wasn't properly saved or uploaded
2. **Playback failing**: Error "Failed to play recording: Failed to decode audio data"

## Root Causes

### 1. Development Mode Upload Issue
In development mode, the S3Service was returning a local URL (`/api/uploads/...`) for presigned uploads, but there was no endpoint to handle PUT requests to that URL. This caused uploads to fail silently.

### 2. Recording Path Format Issue
The recording paths were being stored in different formats:
- Some as local file paths (`priv/static/recordings/...`)
- Some with `s3:` prefix
- But the playback endpoint expected URLs

### 3. File Serving Issue
Even when recordings were saved locally, they weren't accessible via HTTP for playback.

## Fixes Implemented

### 1. Created Upload Controller (`lib/education_crm_web/controllers/api/upload_controller.ex`)
- **`upload/2` action**: Handles PUT requests to `/api/uploads/:key` to simulate S3 presigned URL uploads in development
- **`serve/2` action**: Serves uploaded files from `/uploads/*path` for playback
- Properly handles subdirectories in upload keys
- Sets correct content types for audio files

### 2. Updated Router (`lib/education_crm_web/router.ex`)
- Added route for PUT `/api/uploads/:key` (development only)
- Added route for GET `/uploads/*path` to serve uploaded files (development only)

### 3. Enhanced S3Service (`lib/education_crm/services/s3_service.ex`)
- Added `get_public_url/1` function that returns:
  - Local HTTP URL in development (`http://localhost:4000/uploads/...`)
  - S3 public URL in production
- Updated `presigned_put_url/2` to ensure upload directory exists
- Updated `presigned_get_url/1` to return proper local URLs

### 4. Updated CallController (`lib/education_crm_web/controllers/api/call_controller.ex`)
- Modified `presign_upload/2` to use `get_public_url/1` instead of `format_key/1`
- Modified `upload_recording/2` (S3 key variant) to store public URLs instead of `s3:` prefixed keys
- Updated `show_recording/2` to handle HTTP URLs by redirecting to them
- Now properly handles both local file paths and HTTP URLs

## How It Works Now

### Upload Flow (Development)
1. Mobile app requests presigned URL from `/api/leads/:lead_id/recordings/presign`
2. Backend returns:
   - `upload_url`: `http://localhost:4000/api/uploads/recordings/uuid.m4a`
   - `key`: `recordings/uuid.m4a`
   - `public_url`: `http://localhost:4000/uploads/recordings/uuid.m4a`
3. Mobile app PUTs file to `upload_url`
4. UploadController saves file to `priv/static/uploads/recordings/uuid.m4a`
5. Mobile app confirms upload with `s3_key`
6. Backend stores `public_url` in database as `recording_path`

### Playback Flow (Development)
1. Mobile app requests recording from `/api/leads/:lead_id/recordings/:recording_id`
2. Backend checks `recording_path`:
   - If it starts with `http`, redirects to that URL
   - If it's a local file path, streams the file directly
3. Mobile app receives redirect to `/uploads/recordings/uuid.m4a`
4. UploadController serves the file with proper content type and range support
5. AudioPlayerService downloads and plays the file

### Production Behavior
In production (when `environment` is `:prod`):
- `presigned_put_url/2` generates real S3 presigned URLs
- `get_public_url/1` returns S3 public URLs
- Files are uploaded directly to S3
- Playback redirects to S3 URLs

## Testing the Fix

### 1. Restart Phoenix Server
```bash
mix phx.server
```

### 2. Make a Test Call
- Open the mobile app
- Make a call with recording enabled
- Verify the recording uploads successfully

### 3. Check Upload
```bash
ls -la priv/static/uploads/recordings/
```
You should see the uploaded `.m4a` files.

### 4. Test Playback
- In the app, tap "Play Recording" on a call log
- The recording should play without errors

### 5. Check Logs
Look for these log messages:
```
[S3Service] Uploading file: /path/to/recording.m4a
[S3Service] Target URL: http://localhost:4000/api/uploads/recordings/uuid.m4a
[S3Service] Upload successful
[RecordingUploadService] S3 upload successful
```

## Database Migration (If Needed)

If you have existing recordings with incorrect paths, you may need to update them:

```elixir
# In IEx console (iex -S mix)
alias EducationCrm.Repo
alias EducationCrm.Leads.CallLog

# Update recordings with local file paths to use HTTP URLs
CallLog
|> Repo.all()
|> Enum.filter(fn cl -> 
  cl.recording_path && 
  String.starts_with?(cl.recording_path, "priv/static/") 
end)
|> Enum.each(fn cl ->
  # Extract filename from path
  filename = Path.basename(cl.recording_path)
  # Create HTTP URL
  new_path = "http://localhost:4000/uploads/recordings/#{filename}"
  
  cl
  |> Ecto.Changeset.change(recording_path: new_path)
  |> Repo.update()
end)
```

## Additional Improvements

### 1. Better Error Handling
The ErrorMessageService now properly handles:
- Upload failures
- Network errors
- File not found errors
- Playback errors

### 2. Logging
Added comprehensive logging throughout the upload and playback flow for easier debugging.

### 3. Range Support
The serve endpoint supports HTTP Range requests for efficient audio streaming and seeking.

## Files Modified

1. `lib/education_crm_web/controllers/api/upload_controller.ex` (NEW)
2. `lib/education_crm_web/router.ex`
3. `lib/education_crm/services/s3_service.ex`
4. `lib/education_crm_web/controllers/api/call_controller.ex`

## Next Steps

1. Test the fix with a new recording
2. If existing recordings don't play, run the database migration script above
3. Monitor logs for any remaining issues
4. Consider adding automated tests for the upload/playback flow

## Production Deployment

When deploying to production:
1. Ensure AWS credentials are properly configured
2. Set `AWS_BUCKET_NAME` environment variable
3. Set `environment` config to `:prod`
4. The code will automatically use real S3 instead of local storage
