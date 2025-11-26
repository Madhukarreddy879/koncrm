# Implementation Plan

## Backend Tasks (COMPLETED ✓)

- [x] 1. Database schema and API endpoints - ✓ COMPLETED
  - CallLog schema with recording_path field exists
  - Call logging and recording upload endpoints implemented
  - S3Service for presigned URLs implemented
  - FileStorage for chunked uploads implemented
  - Recording streaming with HTTP range support implemented
  - Oban worker for async processing implemented

## Mobile App Tasks (TO BE IMPLEMENTED)

- [x] 2. Implement mobile app upload service
  - [x] 2.1 Create RecordingUploadService in TypeScript
    - Create `EducationCRM/src/services/RecordingUploadService.ts`
    - Implement S3 presigned URL upload flow:
      1. Request presigned URL from `/api/leads/:lead_id/recordings/presign`
      2. Upload file directly to S3 using presigned URL
      3. Confirm upload to backend with `/api/leads/:lead_id/recordings` (s3_key mode)
    - Implement fallback chunked upload for large files or S3 failures
    - Include auth token in backend request headers
    - Parse response to extract call_log ID and recording path
    - Implement error handling for network errors and non-200 responses
    - _Requirements: 4.1, 4.5, 6.4_
  
  - [x] 2.2 Add upload retry logic with exponential backoff
    - Implement retry queue state management
    - Add `retryUpload` function with exponential backoff (3 attempts)
    - Store failed uploads in AsyncStorage for persistence
    - Retry uploads when network is restored
    - Handle both S3 and chunked upload retries
    - _Requirements: 4.6_
  
  - [x] 2.3 Integrate upload service with CallRecordingManager
    - Import RecordingUploadService in CallRecordingManager
    - Create call_log first via `/api/leads/:lead_id/calls` endpoint
    - Call upload service after recording stops successfully
    - Pass call_log_id, lead_id, and file path to upload
    - Handle upload success and failure states
    - Update UI to show upload status (uploading, success, failed)
    - _Requirements: 4.1, 4.5_

- [x] 3. Create recording list UI component
  - [x] 3.1 Create RecordingList component
    - Create `EducationCRM/src/components/RecordingList.tsx`
    - Display list of call_logs with recordings (filter where recording_path is not null)
    - Show date, time, duration, and call outcome for each recording
    - Show upload progress indicator for pending uploads
    - Add play button for each recording
    - Style with unique, distinctive design (avoid generic Inter/Roboto fonts and purple gradients)
    - Use creative typography and color schemes
    - _Requirements: 5.2, 5.3, 5.4_
  
  - [x] 3.2 Integrate RecordingList into LeadDetailScreen
    - Import RecordingList component
    - Extract call_logs with recordings from lead data (already fetched)
    - Pass recordings data to component
    - Handle recording playback when user taps play button
    - Show empty state when no recordings exist
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 4. Implement audio playback functionality
  - [x] 4.1 Add audio player to mobile app
    - Install react-native-sound or react-native-track-player library
    - Create audio player hook or service
    - Implement play, pause, seek controls
    - Show playback progress and duration
    - Handle audio session management (pause on interruption)
    - _Requirements: 5.3_
  
  - [x] 4.2 Stream audio from backend
    - Fetch recording file from `/api/leads/:lead_id/recordings/:recording_id` endpoint
    - Handle S3 redirects (backend returns presigned URL for S3 files)
    - Handle local file streaming with range requests
    - Cache downloaded files for offline playback
    - Show loading state while fetching audio
    - _Requirements: 5.3, 5.5_

- [x] 5. Add permission handling and error messages
  - [x] 5.1 Check and request audio recording permissions
    - Check permission status on app launch
    - Request permission before starting recording
    - Show explanation dialog if permission denied
    - Link to app settings if permission permanently denied
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 5.2 Implement user-friendly error messages
    - Create error message mapping for common scenarios
    - Display toast/alert for recording errors
    - Show specific messages for:
      - Permission denied
      - Storage full
      - Upload failed (network error)
      - Recording failed (device error)
      - File not found
    - _Requirements: 6.3, 6.4, 6.5_

- [ ] 6. Write backend tests for recording functionality
  - [ ] 6.1 Write unit tests for CallLog schema
    - Test call_log changeset validations
    - Test recording_path field accepts both local and S3 paths
    - Test outcome validation
    - Test duration_seconds validation
    - _Requirements: 4.3, 4.4_
  
  - [ ] 6.2 Write integration tests for API endpoints
    - Test POST /api/leads/:lead_id/calls
    - Test POST /api/leads/:lead_id/recordings/presign
    - Test POST /api/leads/:lead_id/recordings (all modes: simple, S3, chunked)
    - Test GET /api/leads/:lead_id/recordings/:recording_id streaming
    - Test authorization (telecaller can only access their leads)
    - Test error scenarios (invalid file, missing params, unauthorized access)
    - Test HTTP range requests for streaming
    - _Requirements: 4.1, 4.2, 4.5, 5.1, 5.5_
  
  - [ ] 6.3 Write tests for FileStorage service
    - Test save_recording creates correct file path
    - Test init_chunked_upload creates temp directory
    - Test append_chunk saves chunks correctly
    - Test finalize_chunked_upload combines chunks
    - Test delete_recording removes files
    - Test cancel_chunked_upload cleans up temp files
    - _Requirements: 4.3_
  
  - [ ] 6.4 Write tests for S3Service
    - Test presigned_put_url generates valid URLs
    - Test presigned_get_url generates valid URLs
    - Test format_key returns correct format
    - Test development mode returns local URLs
    - _Requirements: 4.3, 4.8_

- [ ] 7. Write mobile app tests
  - [ ] 7.1 Write unit tests for RecordingUploadService
    - Test S3 presigned URL upload flow
    - Test chunked upload flow
    - Test retry logic with exponential backoff
    - Test error handling for network failures
    - Test AsyncStorage persistence for failed uploads
    - _Requirements: 4.1, 4.6_
  
  - [ ] 7.2 Write component tests for RecordingList
    - Test recording list renders correctly with call_logs data
    - Test empty state displays when no recordings
    - Test upload progress indicator displays
    - Test play button triggers playback
    - Test filtering of call_logs with recordings
    - _Requirements: 5.2, 5.3, 5.4_
  
  - [ ] 7.3 Write integration tests for audio playback
    - Test audio player loads and plays recording
    - Test pause and resume functionality
    - Test seek functionality
    - Test error handling for missing files
    - _Requirements: 5.3_
