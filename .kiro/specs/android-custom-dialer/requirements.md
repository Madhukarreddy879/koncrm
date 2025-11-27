# Requirements Document

## Introduction

This document specifies the requirements for implementing a custom Android dialer with reliable call recording functionality within the existing Education CRM React Native application. The solution will use Android's Telecom API (ConnectionService, InCallService, PhoneAccount) to handle outgoing calls through the app's own calling UI, enabling automatic call recording when calls become active. This approach bypasses Android's background recording restrictions by making the app the default dialer.

## Glossary

- **Telecom_API**: Android's framework for managing phone calls, including ConnectionService and InCallService
- **ConnectionService**: Android service that handles the connection between the app and the telephony framework
- **InCallService**: Android service that provides a custom in-call UI when the app is the default dialer
- **PhoneAccount**: Represents a distinct method to place calls, registered with TelecomManager
- **TelecomManager**: System service for managing phone accounts and call routing
- **MediaRecorder**: Android class for recording audio/video
- **VOICE_RECOGNITION**: Audio source that captures voice input, more reliable than VOICE_CALL on many devices
- **Call_State_ACTIVE**: The state when a call is connected and both parties can communicate
- **Call_State_DISCONNECTED**: The state when a call has ended
- **M4A_Format**: MPEG-4 Audio format, efficient for voice recordings
- **Native_Module**: Kotlin/Java code that bridges React Native with Android platform APIs

## Requirements

### Requirement 1: Default Dialer Registration

**User Story:** As a telecaller, I want the CRM app to be set as my default dialer, so that all outgoing calls are handled through the app with automatic recording.

#### Acceptance Criteria

1. WHEN the user opens the app for the first time, THE Dialer_System SHALL prompt the user to set the app as the default dialer with a clear explanation of benefits.
2. WHEN the user grants default dialer permission, THE Dialer_System SHALL register a PhoneAccount with TelecomManager within 2 seconds.
3. WHILE the app is set as default dialer, THE Dialer_System SHALL intercept all outgoing call intents and route them through the custom ConnectionService.
4. IF the user denies default dialer permission, THEN THE Dialer_System SHALL display a message explaining that call recording will not work reliably and offer to retry.
5. THE Dialer_System SHALL persist the PhoneAccount registration across app restarts and device reboots.

### Requirement 2: ConnectionService Implementation

**User Story:** As a telecaller, I want the app to manage call connections natively, so that I have full control over call states and recording triggers.

#### Acceptance Criteria

1. WHEN an outgoing call is initiated, THE ConnectionService SHALL create a new Connection object and notify TelecomManager within 500 milliseconds.
2. WHILE a Connection is active, THE ConnectionService SHALL track call state transitions (DIALING, RINGING, ACTIVE, DISCONNECTED) and emit events to React Native.
3. WHEN the remote party answers the call, THE ConnectionService SHALL transition the Connection state to ACTIVE and trigger the recording start event.
4. WHEN either party ends the call, THE ConnectionService SHALL transition to DISCONNECTED state and trigger the recording stop event.
5. IF the call fails to connect, THEN THE ConnectionService SHALL report the failure reason to React Native within 1 second.
6. THE ConnectionService SHALL be configured as a self-managed connection service using TelecomManager.METADATA_INCLUDE_SELF_MANAGED_CALLS for full call control.
7. THE ConnectionService SHALL call setAvailable(true) after setup to indicate readiness for outgoing calls.

### Requirement 3: InCallService and Custom UI

**User Story:** As a telecaller, I want to see a custom in-call screen with CRM context, so that I can view lead information while on a call.

#### Acceptance Criteria

1. WHEN a call becomes active, THE InCallService SHALL display a custom in-call Activity within 300 milliseconds.
2. WHILE on an active call, THE InCall_UI SHALL display the caller/callee phone number, call duration timer, and recording indicator.
3. WHILE on an active call, THE InCall_UI SHALL provide buttons for: mute, speaker, hold, and end call.
4. WHEN the user taps the end call button, THE InCall_UI SHALL disconnect the call and return to the previous screen.
5. THE InCall_UI SHALL remain visible even when the app is in background, using a high-priority notification with call controls.

### Requirement 4: Automatic Call Recording

**User Story:** As a telecaller, I want calls to be automatically recorded when they connect, so that I don't have to manually start recording.

#### Acceptance Criteria

1. WHEN the call state transitions to ACTIVE, THE Recording_System SHALL start MediaRecorder with AudioSource.VOICE_RECOGNITION within 500 milliseconds.
2. WHILE recording is active, THE Recording_System SHALL save audio in M4A format (AAC codec) at 44100 Hz sample rate and 128 kbps bitrate.
3. WHEN the call state transitions to DISCONNECTED, THE Recording_System SHALL stop the MediaRecorder and finalize the file within 1 second.
4. THE Recording_System SHALL save recordings to the app's private storage directory with filename format: `call_{timestamp}_{phone_number}.m4a`.
5. IF MediaRecorder fails to start, THEN THE Recording_System SHALL log the error, notify React Native, and continue the call without recording.
6. THE Recording_System SHALL run within a foreground service with microphone type to maintain recording capability when the app is in background (Android 9+ requirement).
7. THE Recording_System SHALL call MediaRecorder.setPrivacySensitive(false) on Android 11+ to allow recording during calls.

### Requirement 5: Recording File Management

**User Story:** As a telecaller, I want recordings to be automatically uploaded to the CRM backend, so that call history is preserved in the system.

#### Acceptance Criteria

1. WHEN a recording is completed, THE Upload_System SHALL queue the file for upload to the backend API within 5 seconds.
2. WHILE uploading, THE Upload_System SHALL show upload progress in the notification area.
3. WHEN upload succeeds, THE Upload_System SHALL delete the local recording file and update the call log in React Native.
4. IF upload fails due to network issues, THEN THE Upload_System SHALL retry up to 3 times with exponential backoff (5s, 15s, 45s).
5. IF all upload retries fail, THEN THE Upload_System SHALL keep the local file and queue it for retry when network is available.

### Requirement 6: React Native Bridge

**User Story:** As a developer, I want native dialer functionality exposed to React Native, so that the CRM UI can initiate calls and receive call events.

#### Acceptance Criteria

1. THE Native_Bridge SHALL expose a `makeCall(phoneNumber: string, leadId: string)` method to React Native.
2. THE Native_Bridge SHALL emit events to React Native for: CALL_STARTED, CALL_CONNECTED, CALL_ENDED, RECORDING_STARTED, RECORDING_STOPPED, RECORDING_ERROR.
3. WHEN React Native calls `makeCall`, THE Native_Bridge SHALL validate the phone number format and initiate the call within 1 second.
4. THE Native_Bridge SHALL expose a `requestDefaultDialer()` method that triggers the system default dialer selection dialog.
5. THE Native_Bridge SHALL expose a `isDefaultDialer()` method that returns the current default dialer status.

### Requirement 7: Permissions Management

**User Story:** As a user, I want the app to request only necessary permissions with clear explanations, so that I understand why each permission is needed.

#### Acceptance Criteria

1. WHEN the app needs CALL_PHONE permission, THE Permission_System SHALL display a rationale explaining it's needed to make calls.
2. WHEN the app needs RECORD_AUDIO permission, THE Permission_System SHALL display a rationale explaining it's needed for call recording.
3. WHEN the app needs READ_PHONE_STATE permission, THE Permission_System SHALL display a rationale explaining it's needed to detect call states.
4. IF any required permission is denied, THEN THE Permission_System SHALL gracefully degrade functionality and inform the user what features are unavailable.
5. THE Permission_System SHALL check and request permissions before attempting to make the first call.

### Requirement 8: Error Handling and Reliability

**User Story:** As a telecaller, I want the dialer to handle errors gracefully, so that my work is not interrupted by technical issues.

#### Acceptance Criteria

1. IF the ConnectionService crashes, THEN THE Dialer_System SHALL restart the service automatically within 3 seconds.
2. IF recording fails mid-call, THEN THE Dialer_System SHALL continue the call and notify the user that recording stopped.
3. WHILE the device has low storage (less than 100MB free), THE Recording_System SHALL warn the user before starting new recordings.
4. THE Dialer_System SHALL log all errors to a local file for debugging purposes.
5. IF the app is killed during an active call, THEN THE ConnectionService SHALL maintain the call through the system dialer.

### Requirement 9: Integration with Existing CRM

**User Story:** As a telecaller, I want call recordings linked to leads in the CRM, so that I can review call history from the lead detail screen.

#### Acceptance Criteria

1. WHEN initiating a call from a lead detail screen, THE CRM_Integration SHALL pass the lead ID to the native dialer module.
2. WHEN a recording is uploaded, THE CRM_Integration SHALL associate the recording with the corresponding lead and call log.
3. THE CRM_Integration SHALL update the existing RecordingList component to display recordings from the new system.
4. WHEN viewing a lead, THE CRM_Integration SHALL display all associated call recordings with playback controls.
5. THE CRM_Integration SHALL maintain backward compatibility with any existing recordings in the system.

### Requirement 10: Foreground Service for Background Recording

**User Story:** As a telecaller, I want call recording to continue even when the app is in background, so that the entire call is captured.

#### Acceptance Criteria

1. WHEN a call becomes active, THE Foreground_Service SHALL start with type "microphone" to maintain recording capability.
2. WHILE the foreground service is running, THE Foreground_Service SHALL display a persistent notification showing call status and recording indicator.
3. THE Foreground_Service SHALL configure a notification channel with ID and name for call recording notifications.
4. WHEN the call ends, THE Foreground_Service SHALL stop within 2 seconds after recording is finalized.
5. THE Foreground_Service SHALL declare foregroundServiceType="microphone" in AndroidManifest.xml for Android 10+ compatibility.
