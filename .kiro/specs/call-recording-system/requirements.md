# Call Recording System Requirements

## Introduction

The Call Recording System enables telecallers to automatically record phone conversations with leads, store the recordings securely, and access them later for quality assurance and training purposes. The system integrates with the existing CRM lead management workflow.

## Glossary

- **Recording Service**: The native Android module that handles audio capture using MediaRecorder API
- **Call Recording Manager**: The TypeScript service that orchestrates recording lifecycle and state management
- **Lead Detail Screen**: The mobile app screen where telecallers view lead information and initiate calls
- **Backend API**: The Phoenix/Elixir server that stores recording metadata and files
- **Recording File**: The audio file (M4A format) containing the recorded conversation

## Requirements

### Requirement 1: Automatic Call Detection and Recording

**User Story:** As a telecaller, I want the app to automatically start recording when I initiate a call from the lead detail screen, so that I don't have to manually start recording each time.

#### Acceptance Criteria

1. WHEN the telecaller taps the call button on the Lead Detail Screen, THE Recording Service SHALL start audio capture before opening the dialer
2. WHEN the Recording Service starts successfully, THE Call Recording Manager SHALL store the recording file path and timestamp
3. IF the Recording Service fails to start, THEN THE Call Recording Manager SHALL log the error and display a notification to the user
4. WHILE the call is in progress, THE Recording Service SHALL continue capturing audio regardless of app state changes

### Requirement 2: Recording Persistence During App State Changes

**User Story:** As a telecaller, I want recordings to continue even when the dialer app is in the foreground, so that the entire conversation is captured.

#### Acceptance Criteria

1. WHEN the app transitions to background state due to dialer opening, THE Recording Service SHALL continue audio capture
2. WHEN the app returns to active state, THE Call Recording Manager SHALL verify the recording is still in progress
3. THE Call Recording Manager SHALL track the time elapsed since call initiation to prevent premature stopping
4. WHILE the recording is active, THE Call Recording Manager SHALL maintain the recording state across app lifecycle events

### Requirement 3: Manual Recording Control

**User Story:** As a telecaller, I want to manually stop the recording when the call ends, so that I can control when the recording is finalized.

#### Acceptance Criteria

1. WHEN the telecaller taps the stop recording button, THE Recording Service SHALL stop audio capture and finalize the file
2. WHEN the recording stops successfully, THE Call Recording Manager SHALL return the file path and duration
3. THE Lead Detail Screen SHALL display the recording status (recording/stopped) to the telecaller
4. IF the recording fails to stop, THEN THE Call Recording Manager SHALL log the error and retry once

### Requirement 4: Recording Upload and Storage (IMPLEMENTED)

**User Story:** As a telecaller, I want my call recordings to be automatically uploaded to the server and stored in the database, so that they are backed up and accessible to my manager.

#### Acceptance Criteria (✓ = Implemented)

1. ✓ WHEN a recording is stopped successfully, THE Call Recording Manager SHALL initiate upload to the Backend API
2. ✓ THE Backend API SHALL accept multipart file uploads with recording metadata (call_log_id)
3. ✓ THE Backend API SHALL store the recording file in S3 or local storage with a unique identifier
4. ✓ THE Backend API SHALL create a database record (call_log) linking the recording to the lead and telecaller
5. ✓ WHEN the upload completes successfully, THE Backend API SHALL return the recording URL and call_log ID
6. THE Call Recording Manager SHALL retry failed uploads up to three times with exponential backoff (NEEDS IMPLEMENTATION)
7. ✓ THE Backend API SHALL support chunked uploads for large files
8. ✓ THE Backend API SHALL support presigned S3 URLs for direct client uploads

### Requirement 5: Recording Retrieval and Display (PARTIALLY IMPLEMENTED)

**User Story:** As a telecaller, I want to see a list of my previous call recordings for each lead, so that I can review past conversations.

#### Acceptance Criteria (✓ = Implemented)

1. ✓ WHEN the Lead Detail Screen loads, THE Backend API SHALL return all call_logs (including recordings) associated with the current lead
2. THE Lead Detail Screen SHALL display a list of recordings with metadata (date, time, duration) (NEEDS IMPLEMENTATION)
3. THE Lead Detail Screen SHALL stream or download the audio file for playback (NEEDS IMPLEMENTATION)
4. WHERE the recording is still uploading, THE Lead Detail Screen SHALL display an upload progress indicator (NEEDS IMPLEMENTATION)
5. ✓ THE Backend API SHALL provide a secure endpoint to retrieve recording files by call_log ID with range support for streaming

### Requirement 6: Recording Permissions and Error Handling

**User Story:** As a telecaller, I want clear error messages when recording fails, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN the app launches, THE Recording Service SHALL check for audio recording permissions
2. IF audio recording permission is not granted, THEN THE Call Recording Manager SHALL request permission before starting recording
3. IF permission is denied, THEN THE Lead Detail Screen SHALL display a message explaining why recording is needed
4. WHEN any recording error occurs, THE Call Recording Manager SHALL log detailed error information for debugging
5. THE Lead Detail Screen SHALL display user-friendly error messages for common failure scenarios (no permission, storage full, etc.)
