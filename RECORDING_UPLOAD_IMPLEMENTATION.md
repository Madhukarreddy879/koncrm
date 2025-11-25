# Call Recording File Storage Implementation

## Overview

This document describes the implementation of file storage for call recordings with support for chunked uploads and streaming playback.

## Components Implemented

### 1. FileStorage Module (`lib/education_crm/file_storage.ex`)

A dedicated module for handling file operations with the following capabilities:

#### Chunked Upload Support
- **`init_chunked_upload/2`**: Initializes an upload session with a unique ID
- **`append_chunk/3`**: Appends individual chunks to the upload session
- **`finalize_chunked_upload/2`**: Combines all chunks into the final file
- **`cancel_chunked_upload/1`**: Cancels an upload and cleans up temporary files

#### Simple Upload Support
- **`save_recording/2`**: Handles traditional single-file uploads

#### File Management
- **`delete_recording/1`**: Removes recording files from storage

#### Features
- Temporary storage in system temp directory during chunked uploads
- Metadata tracking for upload sessions (filename, call_log_id, chunks received)
- Automatic cleanup of temporary files after finalization
- Unique filename generation with timestamps
- Configurable storage directory

### 2. Enhanced CallController (`lib/education_crm_web/controllers/api/call_controller.ex`)

Updated the existing CallController with comprehensive upload and streaming capabilities:

#### Upload Endpoints

**POST /api/leads/:lead_id/recordings**

Supports three modes of operation:

1. **Chunked Upload Initialization** (`action=init`)
   ```json
   {
     "action": "init",
     "filename": "recording.aac",
     "call_log_id": "uuid"
   }
   ```
   Response: `201 Created` with `upload_id`

2. **Chunked Upload Append** (`action=append`)
   ```json
   {
     "action": "append",
     "upload_id": "session_id",
     "chunk_index": 0,
     "chunk": "<binary_data>"
   }
   ```
   Response: `202 Accepted` with upload status

3. **Chunked Upload Finalization** (`action=finalize`)
   ```json
   {
     "action": "finalize",
     "upload_id": "session_id",
     "total_chunks": 5,
     "call_log_id": "uuid"
   }
   ```
   Response: `200 OK` with recording details

4. **Simple Upload** (traditional multipart/form-data)
   ```
   file: <audio_file>
   call_log_id: <uuid>
   ```
   Response: `200 OK` with recording details

#### Streaming Endpoint

**GET /api/leads/:lead_id/recordings/:recording_id**

Features:
- Full file streaming (HTTP 200)
- Partial content delivery with Range support (HTTP 206)
- Automatic content-type detection based on file extension
- Authorization checks to ensure telecaller owns the lead
- Support for audio formats: AAC, MP3, M4A, WAV, OGG

Range Request Example:
```
GET /api/leads/{id}/recordings/{recording_id}
Range: bytes=0-1048575
```

Response:
```
HTTP/1.1 206 Partial Content
Content-Type: audio/aac
Content-Range: bytes 0-1048575/5242880
Accept-Ranges: bytes
```

### 3. Configuration (`config/config.exs`)

Added configuration options:
```elixir
config :education_crm,
  recordings_path: "priv/static/recordings",
  chunk_size: 1_048_576  # 1MB chunks
```

## Security Features

1. **Authorization Checks**: All endpoints verify that the telecaller owns the lead before allowing access
2. **File Path Validation**: Recording paths are validated before streaming
3. **Unique Filenames**: Generated with call_log_id and timestamp to prevent collisions
4. **Cleanup on Failure**: Temporary files are removed if database operations fail

## Error Handling

Comprehensive error responses for:
- Missing or invalid parameters (`400 Bad Request`)
- Unauthorized access (`403 Forbidden`)
- Resource not found (`404 Not Found`)
- Incomplete uploads (`400 Bad Request`)
- Invalid range requests (`416 Range Not Satisfiable`)
- Server errors (`500 Internal Server Error`)

## Usage Examples

### Mobile App - Chunked Upload Flow

```javascript
// 1. Initialize upload
const initResponse = await fetch('/api/leads/{lead_id}/recordings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'init',
    filename: 'recording.aac',
    call_log_id: callLogId
  })
});
const { upload_id } = await initResponse.json();

// 2. Upload chunks (1MB each)
const chunkSize = 1048576;
for (let i = 0; i < totalChunks; i++) {
  const chunk = fileData.slice(i * chunkSize, (i + 1) * chunkSize);
  
  await fetch('/api/leads/{lead_id}/recordings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'append',
      upload_id: upload_id,
      chunk_index: i,
      chunk: btoa(chunk) // Base64 encode
    })
  });
}

// 3. Finalize upload
await fetch('/api/leads/{lead_id}/recordings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'finalize',
    upload_id: upload_id,
    total_chunks: totalChunks,
    call_log_id: callLogId
  })
});
```

### Mobile App - Simple Upload

```javascript
const formData = new FormData();
formData.append('file', audioFile);
formData.append('call_log_id', callLogId);

await fetch('/api/leads/{lead_id}/recordings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Mobile App - Streaming Playback

```javascript
// Full file
<audio src={`/api/leads/${leadId}/recordings/${recordingId}`} controls />

// With range support for seeking
fetch(`/api/leads/${leadId}/recordings/${recordingId}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Range': 'bytes=0-1048575'
  }
});
```

## Performance Considerations

1. **Chunked Uploads**: 1MB chunks balance memory usage and network efficiency
2. **Streaming**: Range support enables efficient seeking without loading entire file
3. **Temporary Storage**: Uses system temp directory to avoid filling application storage
4. **Automatic Cleanup**: Temporary files are removed after finalization or on error

## Testing

The implementation has been verified to:
- Compile without errors
- Integrate with existing API endpoints
- Pass all existing integration tests
- Support authorization checks

## Requirements Satisfied

✅ **Requirement 13.2**: Chunked file upload support (1MB chunks)
✅ **Requirement 13.3**: Save files to configured storage path with unique names
✅ **Requirement 13.3**: Return file path for database storage
✅ **Requirement 13.7**: Audio file streaming with range support
✅ **Requirement 13.7**: Authorization check for telecaller access

## Future Enhancements

Potential improvements for future iterations:
1. File compression for storage optimization
2. CDN integration for faster playback
3. Automatic transcription of recordings
4. Recording retention policies
5. Encryption at rest for sensitive recordings
