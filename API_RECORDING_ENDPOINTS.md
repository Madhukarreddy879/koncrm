# Call Recording API Endpoints Reference

## Upload Recording

### Endpoint
```
POST /api/leads/:lead_id/recordings
```

### Authentication
Required: Bearer token in Authorization header

### Upload Methods

#### Method 1: Simple Upload (Recommended for small files < 5MB)

**Request Type**: `multipart/form-data`

**Parameters**:
- `file` (required): Audio file
- `call_log_id` (required): UUID of the call log

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@recording.aac" \
  -F "call_log_id=123e4567-e89b-12d3-a456-426614174000" \
  http://localhost:4000/api/leads/LEAD_ID/recordings
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "recording_path": "priv/static/recordings/call_log_id_1234567890.aac",
    "message": "Recording uploaded successfully"
  }
}
```

#### Method 2: Chunked Upload (Recommended for large files > 5MB)

##### Step 1: Initialize Upload

**Request Type**: `application/json`

**Parameters**:
- `action`: "init"
- `filename` (required): Original filename
- `call_log_id` (required): UUID of the call log

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "init",
    "filename": "recording.aac",
    "call_log_id": "123e4567-e89b-12d3-a456-426614174000"
  }' \
  http://localhost:4000/api/leads/LEAD_ID/recordings
```

**Response** (201 Created):
```json
{
  "data": {
    "upload_id": "abc123xyz789",
    "message": "Upload session initialized"
  }
}
```

##### Step 2: Upload Chunks

**Request Type**: `application/json`

**Parameters**:
- `action`: "append"
- `upload_id` (required): Session ID from init
- `chunk_index` (required): Zero-based chunk index
- `chunk` (required): Binary chunk data (can be base64 encoded)

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "append",
    "upload_id": "abc123xyz789",
    "chunk_index": 0,
    "chunk": "BASE64_ENCODED_CHUNK_DATA"
  }' \
  http://localhost:4000/api/leads/LEAD_ID/recordings
```

**Response** (202 Accepted):
```json
{
  "data": {
    "upload_id": "abc123xyz789",
    "chunks_received": 1,
    "total_size": 1048576
  }
}
```

##### Step 3: Finalize Upload

**Request Type**: `application/json`

**Parameters**:
- `action`: "finalize"
- `upload_id` (required): Session ID from init
- `total_chunks` (required): Total number of chunks uploaded
- `call_log_id` (required): UUID of the call log

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "finalize",
    "upload_id": "abc123xyz789",
    "total_chunks": 5,
    "call_log_id": "123e4567-e89b-12d3-a456-426614174000"
  }' \
  http://localhost:4000/api/leads/LEAD_ID/recordings
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "recording_path": "priv/static/recordings/call_log_id_1234567890.aac",
    "message": "Recording uploaded successfully"
  }
}
```

## Stream Recording

### Endpoint
```
GET /api/leads/:lead_id/recordings/:recording_id
```

### Authentication
Required: Bearer token in Authorization header

### Features
- Full file streaming
- Partial content delivery (HTTP 206)
- Range request support for seeking
- Automatic content-type detection

### Examples

#### Full File Stream

**Request**:
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/leads/LEAD_ID/recordings/RECORDING_ID
```

**Response** (200 OK):
```
Content-Type: audio/aac
Accept-Ranges: bytes
Content-Length: 5242880

<binary audio data>
```

#### Partial Content (Range Request)

**Request**:
```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Range: bytes=0-1048575" \
  http://localhost:4000/api/leads/LEAD_ID/recordings/RECORDING_ID
```

**Response** (206 Partial Content):
```
Content-Type: audio/aac
Accept-Ranges: bytes
Content-Range: bytes 0-1048575/5242880
Content-Length: 1048576

<binary audio data>
```

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "File is required"
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Authorization header is required"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "You are not authorized to access this lead"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Recording not found"
  }
}
```

### 416 Range Not Satisfiable
```json
{
  "error": {
    "code": "INVALID_RANGE",
    "message": "Invalid range request"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "SERVER_ERROR",
    "message": "Failed to save recording: <reason>"
  }
}
```

## Supported Audio Formats

- AAC (`.aac`) - `audio/aac`
- MP3 (`.mp3`) - `audio/mpeg`
- M4A (`.m4a`) - `audio/mp4`
- WAV (`.wav`) - `audio/wav`
- OGG (`.ogg`) - `audio/ogg`

## Configuration

Default settings in `config/config.exs`:
```elixir
config :education_crm,
  recordings_path: "priv/static/recordings",
  chunk_size: 1_048_576  # 1MB chunks
```

## Best Practices

1. **Use chunked upload for files > 5MB** to avoid timeout issues
2. **Implement retry logic** for failed chunk uploads
3. **Use range requests** for audio seeking to reduce bandwidth
4. **Validate file types** on the client before uploading
5. **Show upload progress** using chunks_received from append responses
6. **Clean up failed uploads** by not finalizing incomplete sessions
