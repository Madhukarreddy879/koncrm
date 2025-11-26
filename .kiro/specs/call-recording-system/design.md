# Call Recording System Design

## Overview

The Call Recording System consists of three main components:
1. **Mobile App (React Native)** - Captures audio and uploads recordings
2. **Backend API (Phoenix/Elixir)** - Receives, stores, and serves recordings
3. **Storage Layer** - S3 (production) or local file system (development)

The system follows this flow: Record → Upload (S3 or chunked) → Store → Retrieve

**Current Implementation Status:**
- ✓ Backend API with call logging and recording upload endpoints
- ✓ S3Service for presigned URLs (production) and local storage (development)
- ✓ FileStorage module for chunked uploads and local file management
- ✓ CallLog schema with recording_path field
- ✓ Recording streaming with HTTP range support
- ✓ Oban worker for async recording processing
- ⚠ Mobile app upload integration (NEEDS IMPLEMENTATION)
- ⚠ Mobile app recording list UI (NEEDS IMPLEMENTATION)
- ⚠ Mobile app audio playback (NEEDS IMPLEMENTATION)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile App (React Native)               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ RecordingService │  │ CallRecording    │                │
│  │ (Native Android) │──│ Manager          │                │
│  └──────────────────┘  └──────────────────┘                │
│           │                      │                           │
│           │ Audio File           │ Upload Request            │
│           ▼                      ▼                           │
│  ┌──────────────────────────────────────┐                   │
│  │     File Upload Service              │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS Multipart Upload
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API (Phoenix)                      │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Recording        │  │ Recording        │                │
│  │ Controller       │──│ Context          │                │
│  └──────────────────┘  └──────────────────┘                │
│           │                      │                           │
│           │                      ▼                           │
│           │             ┌──────────────────┐                │
│           │             │ Recording Schema │                │
│           │             │ (Ecto)           │                │
│           │             └──────────────────┘                │
│           │                      │                           │
│           ▼                      ▼                           │
│  ┌──────────────────────────────────────┐                   │
│  │     File Storage Service             │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ File System  │
                  │ Storage      │
                  └──────────────┘
```

### Data Flow

**Recording Upload Flow:**
1. Mobile app completes recording → generates M4A file
2. CallRecordingManager reads file metadata (size, duration)
3. Upload service sends multipart POST to `/api/recordings`
4. Backend validates request (auth, file type, size)
5. Backend saves file to storage directory
6. Backend creates database record with metadata
7. Backend returns recording ID and URL
8. Mobile app updates UI with success status

**Recording Retrieval Flow:**
1. Mobile app requests lead details → includes recording list
2. Backend queries recordings by lead_id
3. Backend returns recording metadata (ID, duration, date, URL)
4. User taps recording → mobile app requests file
5. Backend streams file from storage
6. Mobile app plays audio

## Components and Interfaces

### Backend Components

#### 1. CallLog Schema (`EducationCrm.Leads.CallLog`) - ✓ IMPLEMENTED

**Purpose:** Ecto schema representing a call log with optional recording

**Fields:**
- `id` (binary_id, primary key) - Unique identifier
- `lead_id` (binary_id, foreign key) - Associated lead
- `telecaller_id` (binary_id, foreign key) - Telecaller who made the call
- `outcome` (string) - Call outcome (connected, no_answer, busy, invalid_number)
- `duration_seconds` (integer) - Call duration in seconds
- `recording_path` (string) - Path to recording file (local path or "s3:key" format)
- `inserted_at` (utc_datetime) - When the call was logged

**Relationships:**
- `belongs_to :lead, EducationCrm.Leads.Lead`
- `belongs_to :telecaller, EducationCrm.Accounts.User`

**Validations:**
- Required: outcome, lead_id, telecaller_id
- outcome must be in valid list
- duration_seconds must be >= 0
- recording_path max length 500

**Note:** The system uses CallLog instead of a separate Recording schema. The recording_path field stores either:
- Local file path: `priv/static/recordings/call_log_id_timestamp.aac`
- S3 key: `s3:recordings/uuid.aac`

#### 2. Leads Context (`EducationCrm.Leads`) - ✓ IMPLEMENTED

**Purpose:** Business logic layer for lead and call log operations

**Relevant Functions:**

```elixir
# Log a call attempt
log_call(lead_id, attrs, telecaller_id) :: {:ok, CallLog.t()} | {:error, Ecto.Changeset.t()}

# Attach recording to call log
attach_recording(call_log_id, file_path) :: {:ok, CallLog.t()} | {:error, Ecto.Changeset.t()}

# Get lead with preloaded call_logs
get_lead_by(clauses) :: Lead.t() | nil
```

#### 3. Call Controller (`EducationCrmWeb.Api.CallController`) - ✓ IMPLEMENTED

**Purpose:** HTTP API endpoints for call logging and recording operations

**Endpoints:**

```
POST   /api/leads/:lead_id/calls                          - Log a call
POST   /api/leads/:lead_id/recordings/presign             - Get presigned S3 URL
POST   /api/leads/:lead_id/recordings                     - Upload recording (multiple modes)
GET    /api/leads/:lead_id/recordings/:recording_id       - Stream recording file
```

**Request/Response Formats:**

**POST /api/leads/:lead_id/calls**
- Body: `{outcome, duration_seconds}`
- Response: `{data: {id, outcome, duration_seconds, recording_path, inserted_at}}`

**POST /api/leads/:lead_id/recordings/presign**
- Body: `{filename, content_type}`
- Response: `{data: {upload_url, key, public_url}}`
- Purpose: Get presigned S3 URL for direct client upload

**POST /api/leads/:lead_id/recordings** (Multiple modes)

Mode 1: Simple upload (multipart)
- Body: `{file, call_log_id}`
- Response: `{data: {id, recording_path, message}}`

Mode 2: S3 upload confirmation
- Body: `{call_log_id, s3_key}`
- Response: `{data: {id, recording_path, message}}`

Mode 3: Chunked upload init
- Body: `{action: "init", filename, call_log_id}`
- Response: `{data: {upload_id, message}}`

Mode 4: Chunked upload append
- Body: `{action: "append", upload_id, chunk_index, chunk}`
- Response: `{data: {upload_id, chunks_received, total_size}}`

Mode 5: Chunked upload finalize
- Body: `{action: "finalize", upload_id, total_chunks, call_log_id}`
- Response: `{data: {id, recording_path, message}}`

**GET /api/leads/:lead_id/recordings/:recording_id**
- Response: Audio file stream with HTTP range support
- For S3 files: Redirects to presigned S3 URL
- For local files: Streams file directly with 206 Partial Content support

#### 4. File Storage Service (`EducationCrm.FileStorage`) - ✓ IMPLEMENTED

**Purpose:** Handle file system operations for recordings (local storage)

**Functions:**

```elixir
# Save uploaded file to storage
save_recording(upload, call_log_id) :: {:ok, file_path} | {:error, reason}

# Initialize chunked upload session
init_chunked_upload(filename, call_log_id) :: {:ok, upload_id}

# Append chunk to upload session
append_chunk(upload_id, chunk_index, chunk_data) :: {:ok, status} | {:error, reason}

# Finalize chunked upload
finalize_chunked_upload(upload_id, expected_chunks) :: {:ok, file_path} | {:error, reason}

# Delete recording file
delete_recording(file_path) :: :ok

# Cancel chunked upload
cancel_chunked_upload(upload_id) :: :ok
```

**Storage Structure:**
```
priv/static/recordings/
  ├── call_log_id_timestamp.aac
  ├── call_log_id_timestamp.m4a
  └── ...

/tmp/education_crm_uploads/
  └── {upload_id}/
      ├── metadata.json
      ├── chunk_0
      ├── chunk_1
      └── ...
```

#### 5. S3 Service (`EducationCrm.Services.S3Service`) - ✓ IMPLEMENTED

**Purpose:** Handle S3 operations for production file storage

**Functions:**

```elixir
# Generate presigned PUT URL for upload
presigned_put_url(key, content_type) :: {:ok, url} | {:error, reason}

# Generate presigned GET URL for download
presigned_get_url(key) :: {:ok, url} | {:error, reason}

# Format S3 key for storage
format_key(key) :: String.t()  # Returns "s3:key"
```

**Behavior:**
- Production: Uses ExAws to generate real S3 presigned URLs
- Development: Returns local URLs for testing without S3

#### 6. Recording Processor Worker (`EducationCrm.Workers.RecordingProcessorWorker`) - ✓ IMPLEMENTED

**Purpose:** Async background processing of recordings using Oban

**Functions:**

```elixir
# Process chunked upload
perform(%{upload_id, expected_chunks, call_log_id}) :: :ok | {:error, reason}

# Process simple upload
perform(%{temp_file_path, call_log_id, filename}) :: :ok | {:error, reason}

# Enqueue jobs
enqueue_chunked(args) :: {:ok, Oban.Job.t()}
enqueue_simple(args) :: {:ok, Oban.Job.t()}
```

### Mobile App Components

#### 1. Recording Upload Service

**Purpose:** Handle file upload to backend

**Interface:**

```typescript
interface RecordingUploadService {
  // Upload recording file
  uploadRecording(params: {
    filePath: string;
    leadId: string;
    duration: number;
    recordedAt: Date;
  }): Promise<UploadResult>;
  
  // Retry failed upload
  retryUpload(uploadId: string): Promise<UploadResult>;
  
  // Cancel ongoing upload
  cancelUpload(uploadId: string): void;
}

interface UploadResult {
  success: boolean;
  recordingId?: string;
  fileUrl?: string;
  error?: string;
}
```

**Implementation Details:**
- Use `fetch` with FormData for multipart upload
- Include auth token in headers
- Track upload progress
- Implement exponential backoff retry (3 attempts)
- Store failed uploads for later retry

#### 2. Recording List Component

**Purpose:** Display recordings in Lead Detail Screen

**Props:**
```typescript
interface RecordingListProps {
  leadId: string;
  recordings: Recording[];
  onPlayRecording: (recordingId: string) => void;
}

interface Recording {
  id: string;
  duration: number;
  recordedAt: Date;
  fileUrl: string;
  uploading?: boolean;
  uploadProgress?: number;
}
```

**UI Elements:**
- List of recording cards
- Each card shows: date, time, duration
- Play button to stream audio
- Upload progress indicator for pending uploads
- Error state for failed uploads

## Data Models

### Database Schema

**recordings table:**
```sql
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  telecaller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  format VARCHAR(10) NOT NULL DEFAULT 'm4a',
  recorded_at TIMESTAMP NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  inserted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX recordings_lead_id_index ON recordings(lead_id);
CREATE INDEX recordings_telecaller_id_index ON recordings(telecaller_id);
CREATE INDEX recordings_recorded_at_index ON recordings(recorded_at DESC);
```

### Mobile App State

**Recording State:**
```typescript
interface RecordingState {
  isRecording: boolean;
  currentRecordingPath: string | null;
  recordingStartTime: Date | null;
  uploadQueue: PendingUpload[];
}

interface PendingUpload {
  id: string;
  filePath: string;
  leadId: string;
  duration: number;
  recordedAt: Date;
  retryCount: number;
  status: 'pending' | 'uploading' | 'failed' | 'completed';
  progress: number;
  error?: string;
}
```

## Error Handling

### Backend Error Scenarios

1. **Invalid File Type**
   - Validation: Check file extension and MIME type
   - Response: 400 Bad Request with error message
   - Action: Reject upload

2. **File Too Large**
   - Validation: Check file size (max 100MB)
   - Response: 413 Payload Too Large
   - Action: Reject upload

3. **Storage Full**
   - Detection: Check available disk space before save
   - Response: 507 Insufficient Storage
   - Action: Log error, notify admin

4. **Database Error**
   - Detection: Ecto changeset errors
   - Response: 500 Internal Server Error
   - Action: Delete uploaded file, log error

5. **File Not Found**
   - Detection: File doesn't exist when streaming
   - Response: 404 Not Found
   - Action: Log error, mark record as corrupted

### Mobile App Error Scenarios

1. **Upload Failed**
   - Detection: Network error or non-200 response
   - Action: Add to retry queue, show notification
   - Retry: 3 attempts with exponential backoff

2. **No Network**
   - Detection: Network unavailable
   - Action: Queue upload for later, show offline indicator
   - Retry: When network restored

3. **Authentication Failed**
   - Detection: 401 response
   - Action: Prompt re-login, preserve upload queue
   - Retry: After successful login

4. **File Deleted**
   - Detection: Local file not found
   - Action: Remove from queue, log error
   - Retry: None (permanent failure)

## Testing Strategy

### Backend Tests

**Unit Tests:**
- Recording schema validations
- Context functions (create, list, delete)
- Storage service file operations
- File path generation

**Integration Tests:**
- Upload endpoint with multipart file
- File streaming endpoint
- List recordings by lead
- Delete recording (file + record)
- Error handling for invalid uploads

**Test Data:**
- Sample M4A files (small, medium, large)
- Mock lead and telecaller records
- Invalid file types for rejection tests

### Mobile App Tests

**Unit Tests:**
- Upload service request formatting
- Retry logic with exponential backoff
- File metadata extraction
- State management

**Integration Tests:**
- End-to-end upload flow
- Recording list display
- Audio playback
- Offline queue management

**Manual Tests:**
- Record actual call and verify upload
- Test with poor network conditions
- Verify recordings appear in lead detail
- Test audio playback quality

## Security Considerations

1. **Authentication**
   - All API endpoints require valid JWT token
   - Token includes telecaller_id for authorization

2. **Authorization**
   - Telecallers can only upload recordings for their leads
   - Telecallers can only view recordings for their leads
   - Admins can view all recordings

3. **File Validation**
   - Whitelist allowed file extensions (m4a, mp3, wav)
   - Validate MIME type matches extension
   - Limit file size to prevent abuse

4. **Storage Security**
   - Files stored outside web root
   - Access only through authenticated API
   - No direct file system access from web

5. **Data Privacy**
   - Recordings contain sensitive conversations
   - Implement retention policy (auto-delete after X days)
   - Secure file deletion (overwrite before delete)

## Performance Considerations

1. **File Upload**
   - Stream large files instead of loading into memory
   - Use chunked transfer encoding
   - Implement upload progress tracking

2. **File Streaming**
   - Use Phoenix.Controller.send_file for efficient streaming
   - Set appropriate cache headers
   - Support range requests for seeking

3. **Database Queries**
   - Index on lead_id and telecaller_id
   - Paginate recording lists for leads with many calls
   - Preload associations when needed

4. **Storage Management**
   - Organize files by year/month for easier management
   - Implement cleanup job for old recordings
   - Monitor disk space usage

## Future Enhancements

1. **Cloud Storage**
   - Move from local file system to S3/GCS
   - Reduce server storage requirements
   - Improve scalability

2. **Transcription**
   - Automatic speech-to-text for recordings
   - Searchable transcripts
   - Keyword extraction

3. **Analytics**
   - Call duration statistics
   - Recording quality metrics
   - Storage usage reports

4. **Compression**
   - Compress recordings to reduce storage
   - Balance quality vs file size
   - Background compression job
