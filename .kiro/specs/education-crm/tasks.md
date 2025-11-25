# Implementation Plan

## Mobile App Tasks Update (Tasks 14-20)

**Updated:** Tasks 14-20 have been completely revised to use the latest React Native ecosystem and best practices:

- **React Native**: Using latest version via `@react-native-community/cli@latest` (0.76+)
- **Navigation**: `@react-navigation/native` v6+ with native-stack and bottom-tabs
- **Storage**: `@react-native-async-storage/async-storage` (official community package)
- **HTTP Client**: `axios` (latest stable)
- **File Handling**: `react-native-blob-util` (modern, maintained fork)
- **Audio**: `react-native-audio-api` (Web Audio API compatible, high performance)
- **Permissions**: Using React Native's built-in `PermissionsAndroid` API

**Key Changes:**
1. Removed outdated React Native 0.72 reference
2. Fixed package names (AsyncStorage → @react-native-async-storage/async-storage)
3. Replaced custom native module approach with proven libraries
4. Added proper Android permission configuration steps
5. Addressed Android 10+ call recording restrictions with fallback approach
6. Added detailed implementation steps for each screen
7. Included proper build configuration and deployment steps
8. Added offline support and performance optimization tasks

---

- [x] 1. Set up Phoenix project structure and core dependencies
  - Initialize new Phoenix 1.7+ project with PostgreSQL database
  - Add dependencies: Ecto, Argon2, Guardian (JWT), Oban, NimbleCSV
  - Configure database connection with pool size 50 for scalability
  - Set up ETS cache configuration
  - _Requirements: 10.4, 10.5_

- [x] 2. Implement database schema and migrations
  - [x] 2.1 Create branches table migration with indexes
    - Write migration for branches table with name, location, active fields
    - Add indexes for active branches
    - _Requirements: 1.1, 1.3_
  
  - [x] 2.2 Create users table migration with role-based access
    - Write migration for users table with username, password_hash, role, branch_id
    - Add indexes on username and branch_id
    - Implement CHECK constraint for role values
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [x] 2.3 Create leads table migration with all telecaller-editable fields
    - Write migration for leads table with student_name, phone_number, email, alternate_phone, city, preferred_course, preferred_university, status
    - Add indexes on telecaller_id, branch_id, status, phone_number
    - Implement CHECK constraint for status values
    - _Requirements: 3.1, 5.2, 6.3_
  
  - [x] 2.4 Create lead_notes, call_logs, followups, and import_logs tables
    - Write migrations for supporting tables with proper foreign keys and CASCADE deletes
    - Add indexes for query optimization
    - _Requirements: 6.4, 7.1, 8.1, 3.6_

- [x] 3. Create Ecto schemas and changesets
  - [x] 3.1 Implement Branch schema with validation
    - Create Branch schema with name and location fields
    - Write changeset with required field validations
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.2 Implement User schema with password hashing
    - Create User schema with role and branch association
    - Write changeset with Argon2 password hashing
    - Add virtual password field
    - _Requirements: 2.1, 2.2_
  
  - [x] 3.3 Implement Lead schema with all associations
    - Create Lead schema with all telecaller-editable fields
    - Define associations to User, Branch, LeadNote, CallLog, Followup
    - Write changeset for CSV import (name, phone only) and telecaller updates (all fields)
    - _Requirements: 3.1, 5.2, 6.3_
  
  - [x] 3.4 Implement LeadNote, CallLog, Followup, and ImportLog schemas
    - Create schemas with proper associations and validations
    - _Requirements: 6.4, 7.1, 8.1, 3.6_

- [x] 4. Implement Auth context for authentication
  - [x] 4.1 Create authentication functions with JWT
    - Implement authenticate/2 function with username/password validation
    - Implement Guardian JWT token generation with 15-minute expiry
    - Implement refresh token logic with 7-day expiry
    - _Requirements: 2.4_
  
  - [x] 4.2 Create token management functions
    - Implement verify_token/1 to validate JWT and return user
    - Implement revoke_token/1 for logout
    - _Requirements: 2.4_

- [x] 5. Implement Branch context for branch management
  - [x] 5.1 Create branch CRUD functions
    - Implement create_branch/1 with validation
    - Implement update_branch/2 for editing branch details
    - Implement deactivate_branch/1 for soft delete
    - Implement list_branches/0 to return active branches only
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 6. Implement User context for telecaller management
  - [x] 6.1 Create telecaller account management functions
    - Implement create_telecaller/2 with branch assignment
    - Implement list_telecallers/2 with lead count aggregation
    - Implement deactivate_telecaller/1 for soft delete
    - Add branch_id filtering for data isolation
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  
  - [x] 6.2 Create telecaller statistics functions
    - Implement get_telecaller_stats/2 with date range filtering
    - Aggregate call counts and conversion metrics
    - _Requirements: 8.4, 8.5, 9.1, 9.2_

- [x] 7. Implement Lead context for lead management
  - [x] 7.1 Create lead CRUD functions
    - Implement create_lead/2 for single lead creation
    - Implement get_lead/1 with preloaded associations (notes, call_logs, followups)
    - Implement update_lead/2 for telecaller field updates
    - Add telecaller_id authorization check
    - _Requirements: 5.1, 5.2, 6.3, 6.5_
  
  - [x] 7.2 Create bulk lead import with round-robin assignment
    - Implement bulk_create_leads/2 with batch insert
    - Implement distribute_leads/2 with round-robin algorithm
    - Calculate remainder distribution for even allocation
    - _Requirements: 3.4, 4.3, 4.4, 4.5_
  
  - [x] 7.3 Create lead listing with filters and pagination
    - Implement list_leads/2 with telecaller_id filtering
    - Add status filter, search by name/phone
    - Sort by pending follow-ups first
    - Paginate results (50 per page)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.2_
  
  - [x] 7.4 Create lead interaction functions
    - Implement add_note/3 to append notes with timestamp
    - Implement log_call/2 to record call attempts with outcome
    - Implement attach_recording/2 to link audio files
    - Update last_contacted_at and call_count on interactions
    - _Requirements: 6.1, 6.4, 6.5, 8.1, 8.2, 8.3_

- [x] 8. Implement Followup context for follow-up management
  - [x] 8.1 Create follow-up CRUD functions
    - Implement create_followup/2 with lead association
    - Implement list_due_followups/2 filtered by telecaller and date
    - Implement complete_followup/1 to mark done with timestamp
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 8.2 Create follow-up notification query
    - Implement get_upcoming_notifications/0 for 24-hour window
    - Return telecaller and lead details for notification scheduling
    - _Requirements: 7.5_

- [x] 9. Implement Import context for CSV processing
  - [x] 9.1 Create CSV parsing and validation
    - Implement parse_csv/1 using NimbleCSV
    - Validate required fields (name, phone)
    - Return success/error lists with row numbers
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [x] 9.2 Create import orchestration function
    - Implement import_leads/3 combining parse, distribute, and bulk create
    - Create import_log record with success/error counts
    - Return summary with per-telecaller assignment counts
    - _Requirements: 3.3, 3.4, 3.6, 4.3, 4.4_

- [x] 10. Implement Report context for analytics
  - [x] 10.1 Create telecaller performance report
    - Implement telecaller_performance/1 with date range, branch, telecaller filters
    - Aggregate calls made, leads contacted, conversion rates
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 10.2 Create CSV export function
    - Implement export_report/1 to generate CSV from report data
    - _Requirements: 9.5_

- [x] 11. Implement REST API endpoints for mobile app
  - [x] 11.1 Create authentication endpoints
    - Implement POST /api/auth/login with JWT response
    - Implement POST /api/auth/refresh for token renewal
    - Implement POST /api/auth/logout for token revocation
    - _Requirements: 2.4_
  
  - [x] 11.2 Create lead endpoints with authorization
    - Implement GET /api/leads with pagination and filters
    - Implement GET /api/leads/:id with full history
    - Implement PATCH /api/leads/:id for field updates
    - Add telecaller_id authorization middleware
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.3, 6.5_
  
  - [x] 11.3 Create call logging endpoints
    - Implement POST /api/leads/:id/calls for call attempt logging
    - Implement POST /api/leads/:id/recordings for audio upload with chunked support
    - Implement GET /api/leads/:id/recordings/:recording_id for streaming
    - _Requirements: 6.1, 8.1, 8.2, 13.2, 13.3_
  
  - [x] 11.4 Create follow-up endpoints
    - Implement GET /api/followups with telecaller filtering
    - Implement POST /api/followups for scheduling
    - Implement PATCH /api/followups/:id to mark complete
    - _Requirements: 7.1, 7.3, 7.4_
  
  - [x] 11.5 Create user profile endpoints
    - Implement GET /api/me for current user details
    - Implement GET /api/me/stats for personal metrics
    - _Requirements: 8.4_

- [x] 12. Implement file storage for call recordings
  - [x] 12.1 Create file upload handler
    - Implement chunked file upload support (1MB chunks)
    - Save files to configured storage path with unique names
    - Return file path for database storage
    - _Requirements: 13.2, 13.3_
  
  - [x] 12.2 Create file streaming handler
    - Implement audio file streaming with range support
    - Add authorization check for telecaller access
    - _Requirements: 13.7_

- [x] 13. Implement Phoenix LiveView admin portal
  - [x] 13.1 Create admin authentication and layout
    - Implement admin login page with session management
    - Create admin layout with navigation menu
    - Add authorization plug for admin-only routes
    - _Requirements: 2.4_
  
  - [x] 13.2 Create DashboardLive for system overview
    - Display total leads, active telecallers, today's calls
    - Implement real-time updates via PubSub
    - _Requirements: 9.4_
  
  - [x] 13.3 Create BranchLive.Index for branch management
    - List all branches with edit/deactivate actions
    - Implement modal with BranchFormComponent for create/edit
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 13.4 Create TelecallerLive.Index for user management
    - List telecallers with branch, status, lead count
    - Add filters by branch and status
    - Implement modal with TelecallerFormComponent for creation
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 13.5 Create ImportLive.New for CSV import
    - Implement drag-drop CSV file upload
    - Add telecaller multi-select with current lead counts
    - Display real-time import progress with ImportProgressComponent
    - Show import summary table with success/errors and per-telecaller distribution
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2_
  
  - [x] 13.6 Create ReportLive.Index for performance reports
    - Add date range picker with branch and telecaller filters
    - Display performance table with ReportTableComponent (sortable columns)
    - Implement CSV export button
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [-] 14. Set up React Native mobile app project
  - [x] 14.1 Initialize React Native project with latest version
    - Run: `npx @react-native-community/cli@latest init EducationCRM`
    - Verify project builds on Android: `cd EducationCRM/android && ./gradlew assembleDebug`
    - Test app runs: `npx react-native run-android`
    - _Requirements: 11.4_
  
  - [x] 14.2 Install core dependencies
    - Install navigation: `npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context`
    - Install HTTP client: `npm install axios`
    - Install storage: `npm install @react-native-async-storage/async-storage`
    - Install file handling: `npm install react-native-blob-util`
    - Install audio: `npm install react-native-audio-api` (for recording/playback)
    - _Requirements: 11.4, 12.4, 12.5, 13.5_
  
  - [x] 14.3 Configure Android permissions in AndroidManifest.xml
    - Add to android/app/src/main/AndroidManifest.xml before `<application>` tag:
      - `<uses-permission android:name="android.permission.INTERNET" />`
      - `<uses-permission android:name="android.permission.CALL_PHONE" />`
      - `<uses-permission android:name="android.permission.READ_PHONE_STATE" />`
      - `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
      - `<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />`
      - `<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />`
    - Note: Runtime permissions will be handled in code for Android 6.0+
    - _Requirements: 12.4, 12.5, 13.5_
  
  - [x] 14.4 Create navigation structure
    - Create src/navigation/AppNavigator.tsx with NavigationContainer
    - Set up AuthStack (LoginScreen) using createNativeStackNavigator
    - Set up MainStack with bottom tabs (Leads, Follow-ups, Stats) using createBottomTabNavigator
    - Implement conditional rendering based on auth state
    - _Requirements: 11.1_

- [x] 15. Implement mobile app services layer
  - [x] 15.1 Create ApiService with JWT interceptor
    - Create src/services/ApiService.ts
    - Configure Axios instance with base URL from environment config
    - Implement request interceptor to add JWT token from AsyncStorage to headers
    - Implement response interceptor to handle 401 errors
    - Add automatic token refresh logic using refresh token endpoint
    - Implement request/response logging for debugging
    - Export configured axios instance
    - _Requirements: 2.4_
  
  - [x] 15.2 Create AuthService for authentication
    - Create src/services/AuthService.ts
    - Implement login(username, password) - calls POST /api/auth/login
    - Implement logout() - calls POST /api/auth/logout and clears AsyncStorage
    - Implement getToken() - retrieves JWT from AsyncStorage
    - Implement setToken(token, refreshToken) - stores tokens securely
    - Implement refreshToken() - calls POST /api/auth/refresh
    - _Requirements: 2.4_
  
  - [x] 15.3 Create LeadService for lead operations
    - Create src/services/LeadService.ts
    - Implement fetchLeads(filters, page) - calls GET /api/leads with query params
    - Implement getLead(id) - calls GET /api/leads/:id
    - Implement updateLead(id, data) - calls PATCH /api/leads/:id
    - Implement logCall(leadId, callData) - calls POST /api/leads/:id/calls
    - Implement uploadRecording(leadId, audioFile) - uses react-native-blob-util for chunked upload to POST /api/leads/:id/recordings
    - _Requirements: 5.1, 5.3, 5.4, 6.3, 8.1, 13.3_
  
  - [x] 15.4 Create FollowUpService for follow-up operations
    - Create src/services/FollowUpService.ts
    - Implement fetchFollowUps(filters) - calls GET /api/followups
    - Implement createFollowUp(leadId, data) - calls POST /api/followups
    - Implement markComplete(id) - calls PATCH /api/followups/:id
    - _Requirements: 7.1, 7.4_
  
  - [x] 15.5 Create PermissionService for runtime permissions
    - Create src/services/PermissionService.ts
    - Implement requestCallPermission() - uses PermissionsAndroid for CALL_PHONE
    - Implement requestRecordingPermission() - uses PermissionsAndroid for RECORD_AUDIO
    - Implement checkPermissions() - checks all required permissions
    - Return permission status (granted/denied/never_ask_again)
    - _Requirements: 12.4, 13.5_

- [x] 16. Implement call initiation and recording functionality
  - [x] 16.1 Create CallHelper utility for phone dialing
    - Create src/utils/CallHelper.ts
    - Implement initiateCall(phoneNumber) using React Native's Linking API
    - Format phone number for Indian format (+91)
    - Use `Linking.openURL('tel:${phoneNumber}')` to trigger native dialer
    - Handle errors if device doesn't support phone calls
    - _Requirements: 12.1, 13.1_
  
  - [x] 16.2 Implement audio recording with react-native-audio-api
    - Create src/services/RecordingService.ts
    - Implement startRecording() - initializes AudioRecorder from react-native-audio-api
    - Implement stopRecording() - stops recording and returns file path
    - Configure audio format: AAC, 64kbps, mono for compression
    - Store recordings in app's cache directory
    - Return recording metadata (duration, file size, path)
    - _Requirements: 12.2, 13.2_
  
  - [x] 16.3 Create CallRecordingManager to coordinate call and recording
    - Create src/managers/CallRecordingManager.ts
    - Implement handleCallWithRecording(leadId, phoneNumber)
    - Check and request permissions before initiating call
    - Start recording when call is initiated
    - Listen for call state changes (if possible, or use manual stop)
    - Stop recording when user returns to app
    - Automatically upload recording via LeadService
    - Handle recording failures gracefully
    - _Requirements: 12.1, 12.2, 13.1, 13.2, 13.4_
  
  - [x] 16.4 Add Android 10+ call recording limitations notice
    - Create user-facing notice that call recording may not work on Android 10+
    - Implement fallback: manual recording start/stop buttons
    - Add setting to enable/disable automatic recording attempts
    - Document workaround: use speaker mode for better recording quality
    - _Requirements: 12.2, 13.5_

- [x] 17. Implement mobile app screens
  - [x] 17.1 Create LoginScreen
    - Create src/screens/LoginScreen.tsx
    - Build TextInput components for username and password
    - Add password visibility toggle icon
    - Implement login button with ActivityIndicator for loading state
    - Call AuthService.login() on button press
    - Display error messages using Alert or inline Text component
    - Navigate to MainStack on successful login
    - Store auth state in React Context or state management
    - _Requirements: 2.4_
  
  - [x] 17.2 Create LeadListScreen
    - Create src/screens/LeadListScreen.tsx
    - Implement FlatList with renderItem for lead cards
    - Add RefreshControl for pull-to-refresh functionality
    - Create search TextInput with useDebounce hook (300ms delay)
    - Add horizontal ScrollView with status filter chips (New, Contacted, Interested, etc.)
    - Display lead cards showing: student name, phone, status badge, last contact date
    - Add priority indicator (red dot/badge) for leads with due follow-ups
    - Implement pagination with onEndReached callback
    - Handle empty state with friendly message
    - Navigate to LeadDetailScreen on card press
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 11.5_
  
  - [x] 17.3 Create LeadDetailScreen
    - Create src/screens/LeadDetailScreen.tsx
    - Display student name as header (read-only)
    - Create tappable phone number button with phone icon - calls CallHelper.initiateCall()
    - Add editable TextInput fields: email, alternate phone, city, preferred course, preferred university
    - Implement status Picker/dropdown with all status options
    - Add "Save Changes" button that calls LeadService.updateLead()
    - Create notes section with TextInput and "Add Note" button
    - Display interaction history as timeline/list (notes, calls, status changes)
    - Add "Schedule Follow-up" button that opens modal/bottom sheet
    - List call recordings with play button using react-native-audio-api player
    - Show recording duration and timestamp for each recording
    - Implement audio playback controls (play/pause/seek)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 12.1, 13.6, 13.7_
  
  - [x] 17.4 Create FollowUpListScreen
    - Create src/screens/FollowUpListScreen.tsx
    - Fetch follow-ups using FollowUpService.fetchFollowUps()
    - Group follow-ups by date categories: Overdue (red), Today (orange), Upcoming (green)
    - Use SectionList to display grouped follow-ups
    - Display follow-up cards with: lead name, scheduled time, description
    - Add checkbox/button to mark follow-up complete
    - Show empty state for each section when no follow-ups
    - Implement pull-to-refresh
    - Navigate to LeadDetailScreen when tapping follow-up card
    - _Requirements: 7.3, 7.4_
  
  - [x] 17.5 Create StatsScreen
    - Create src/screens/StatsScreen.tsx
    - Fetch stats using GET /api/me/stats endpoint
    - Display cards/sections for key metrics:
      - Today's calls count with icon
      - This week's calls count
      - Total leads assigned
      - Conversion rate (enrolled/total leads as percentage)
    - Add date range selector for viewing historical stats (optional)
    - Use ScrollView for layout
    - Implement pull-to-refresh to update stats
    - Style with cards and visual hierarchy
    - _Requirements: 8.4, 8.5_

- [x] 18. Implement call recording workflow in mobile app
  - [x] 18.1 Integrate call initiation with recording in LeadDetailScreen
    - Update phone number button to use CallRecordingManager.handleCallWithRecording()
    - Show modal/alert asking user to start recording manually (due to Android restrictions)
    - Display recording indicator (red dot + timer) when recording is active
    - Add "Stop Recording" button that appears during recording
    - Show toast/notification when recording starts successfully
    - Handle permission denials with user-friendly messages
    - _Requirements: 12.1, 12.2, 13.1, 13.4_
  
  - [x] 18.2 Implement recording upload and playback
    - Stop recording when user presses "Stop Recording" button
    - Show upload progress indicator while uploading
    - Upload recording file using LeadService.uploadRecording() with chunked upload
    - Retry upload on failure with exponential backoff
    - Store failed uploads locally and retry when network available
    - Refresh lead detail to show new recording in list
    - Implement audio playback using react-native-audio-api AudioPlayer
    - Display playback controls: play/pause button, seek bar, current time/duration
    - Show loading state while recording loads
    - Handle playback errors gracefully
    - _Requirements: 13.2, 13.3, 13.6, 13.7_
  
  - [x] 18.3 Add recording management features
    - Implement local caching of recordings for offline playback
    - Add ability to delete recordings (with confirmation)
    - Show recording file size and quality info
    - Implement background upload queue for recordings
    - Add settings for recording quality (bitrate selection)
    - _Requirements: 13.2, 13.3_

- [x] 19. Implement caching and performance optimizations for mobile app
  - [x] 19.1 Optimize FlatList performance
    - Configure FlatList with windowSize={10} for efficient virtualization
    - Add getItemLayout for fixed-height items to improve scroll performance
    - Implement keyExtractor using lead.id
    - Use React.memo for LeadCard component to prevent unnecessary re-renders
    - Add maxToRenderPerBatch={10} and updateCellsBatchingPeriod={50}
    - _Requirements: 11.5_
  
  - [x] 19.2 Implement optimistic UI updates
    - Update lead status immediately in UI before API call completes
    - Revert changes if API call fails
    - Show subtle loading indicator during background sync
    - Cache lead list data in memory to reduce API calls
    - _Requirements: 11.5_
  
  - [x] 19.3 Add debounced search and request optimization
    - Create useDebounce custom hook with 300ms delay
    - Apply debounce to search input in LeadListScreen
    - Cancel pending API requests when new search is initiated
    - Implement request deduplication for identical concurrent requests
    - _Requirements: 11.5_
  
  - [x] 19.4 Implement offline data persistence
    - Cache lead list data in AsyncStorage for offline viewing
    - Store user profile and stats locally
    - Queue failed API requests for retry when online
    - Show offline indicator in UI when network unavailable
    - Sync queued changes when connection restored
    - _Requirements: 11.5_



- [ ] 20. Configure mobile app build and deployment
  - [x] 20.1 Set up environment configuration
    - Create .env file for development with API_BASE_URL
    - Install react-native-config: `npm install react-native-config`
    - Configure different environments: .env.development, .env.production
    - Update gradle files to use environment variables
    - Add .env files to .gitignore
    - _Requirements: 11.4_
  
  - [x] 20.2 Configure Android release build
    - Generate signing key: `keytool -genkeypair -v -storetype PKCS12 -keystore education-crm.keystore -alias education-crm -keyalg RSA -keysize 2048 -validity 10000`
    - Update android/app/build.gradle with signing config
    - Add keystore file to android/app/ (keep secure, don't commit)
    - Configure ProGuard rules in proguard-rules.pro for production
    - Enable code shrinking and obfuscation
    - Set versionCode and versionName in build.gradle
    - _Requirements: 11.4_
  
  - [x] 20.3 Build and test release APK
    - Build release APK: `cd android && ./gradlew assembleRelease`
    - Test release APK on physical device
    - Verify all features work in release mode
    - Check app size and optimize if needed
    - Test on different Android versions (8.0+)
    - _Requirements: 11.4_
  
  - [ ] 20.4 Prepare for distribution
    - Create app icon and splash screen assets
    - Update app name and package identifier
    - Write release notes and changelog
    - Create internal distribution plan (APK sharing or Play Store internal testing)
    - Document installation instructions for telecallers
    - _Requirements: 11.4_

- [ ] 21. Configure production deployment for backend
  - [ ] 21.1 Set up production configuration
    - Configure environment variables for database, JWT secret, storage path
    - Set up database connection pooling (pool_size: 50)
    - Configure CORS for admin portal domain
    - Set up HTTPS/TLS configuration
    - _Requirements: 10.1, 10.4_
  
  - [ ] 21.2 Create release build scripts
    - Write mix release configuration
    - Create systemd service file or Docker configuration
    - Document deployment steps
    - _Requirements: 10.1_
