import { Alert, AppState, AppStateStatus, DeviceEventEmitter, Platform } from 'react-native';
import CallHelper from '../utils/CallHelper';
import RecordingService, { RecordingMetadata } from '../services/RecordingService';
import PermissionService from '../services/PermissionService';
import LeadService from '../services/LeadService';
import RecordingUploadService from '../services/RecordingUploadService';
import ErrorMessageService from '../services/ErrorMessageService';
import AccessibilityService from '../services/AccessibilityService';
import CallRecordingEventService from '../services/CallRecordingEventService';

/**
 * CallRecordingManager - Coordinates call initiation and recording
 * Handles the complete workflow: permissions, call, recording, and upload
 * 
 * Recording Modes:
 * 1. Accessibility Service Mode (preferred): Auto-records all calls when enabled
 * 2. Manual Mode: App-controlled recording with app state detection
 */
class CallRecordingManager {
  private appStateSubscription: any = null;
  private currentLeadId: string | null = null;
  private currentCallLogId: string | null = null;
  private recordingMetadata: RecordingMetadata | null = null;
  private uploadInProgress: boolean = false;
  private uploadStatus: 'idle' | 'uploading' | 'success' | 'failed' = 'idle';
  private uploadProgress: number = 0;
  private callInitiatedTime: number = 0;
  private appWentToBackground: boolean = false;
  private useAccessibilityService: boolean = false;

  constructor() {
    // Initialize upload service
    RecordingUploadService.initialize().catch(error => {
      console.error('[CallRecordingManager] Failed to initialize upload service:', error);
    });

    // Initialize call recording event service
    CallRecordingEventService.initialize();

    // Check if accessibility service is available
    this.checkAccessibilityServiceStatus();
  }

  /**
   * Check if accessibility service is enabled for auto-recording
   */
  private async checkAccessibilityServiceStatus(): Promise<void> {
    if (Platform.OS !== 'android') {
      this.useAccessibilityService = false;
      return;
    }

    try {
      this.useAccessibilityService = await AccessibilityService.isAccessibilityServiceEnabled();
      console.log(`[CallRecordingManager] Accessibility service enabled: ${this.useAccessibilityService}`);
    } catch (error) {
      console.error('[CallRecordingManager] Error checking accessibility service:', error);
      this.useAccessibilityService = false;
    }
  }

  /**
   * Check if accessibility service mode is active
   */
  async isAccessibilityModeActive(): Promise<boolean> {
    await this.checkAccessibilityServiceStatus();
    return this.useAccessibilityService;
  }

  /**
   * Handles call with automatic recording
   * @param leadId - Lead ID for the call
   * @param phoneNumber - Phone number to call
   * @param autoRecord - Whether to automatically start recording (default: true)
   * @returns Promise that resolves when call is initiated
   */
  async handleCallWithRecording(
    leadId: string,
    phoneNumber: string,
    autoRecord: boolean = true,
  ): Promise<void> {
    try {
      // Step 1: Check and request permissions
      const permissionsGranted = await this.checkAndRequestPermissions();

      if (!permissionsGranted.call) {
        ErrorMessageService.showCallPermissionDenied();
        return;
      }

      // Step 2: Store lead ID for later use
      this.currentLeadId = leadId;

      // Step 3: Log call attempt BEFORE initiating call
      await this.logCallAttempt(leadId);

      // Step 3.5: Set lead and call log in event service for accessibility recording
      CallRecordingEventService.setCurrentLead(leadId);
      if (this.currentCallLogId) {
        CallRecordingEventService.setCurrentCallLog(this.currentCallLogId);
      }

      // Step 4: Check if accessibility service is handling recording
      await this.checkAccessibilityServiceStatus();

      // Step 5: Initiate the call
      await CallHelper.initiateCall(phoneNumber);

      // Step 6: Set up app state listener to detect when user returns
      this.setupAppStateListener();

      // Step 7: Handle recording based on mode
      if (this.useAccessibilityService) {
        // Accessibility service will auto-start recording when call connects
        console.log('[CallRecording] Accessibility service will handle recording automatically');
        // Recording will be handled by CallRecordingAccessibilityService
      } else if (autoRecord && permissionsGranted.recording) {
        // Fallback: Manual recording mode
        // Wait 3 seconds for call to connect before starting recording
        console.log('[CallRecording] Using manual recording mode (accessibility service not enabled)');
        setTimeout(async () => {
          try {
            await this.startRecording();
            console.log('[CallRecording] Recording started after call connection delay');
          } catch (error) {
            console.error('[CallRecording] Failed to start delayed recording:', error);
            // Don't show error to user as call is already in progress
          }
        }, 3000);
      } else if (autoRecord && !permissionsGranted.recording) {
        // Show notice about recording permission
        ErrorMessageService.showRecordingPermissionDenied();
      }
    } catch (error) {
      // Clean up on error
      await this.cleanup();

      ErrorMessageService.handleError(error, false, 'Unable to initiate call. Please try again.');

      throw error;
    }
  }

  /**
   * Manually start recording during a call
   * @returns Promise that resolves to the recording file path
   */
  async startRecording(): Promise<string> {
    try {
      // Check recording permission
      const hasPermission = await PermissionService.hasRecordingPermission();

      if (!hasPermission) {
        const result = await PermissionService.requestPermissionWithHandling('recording');
        if (result.status !== 'granted') {
          throw new Error('Recording permission denied');
        }
      }

      // Start recording
      const filePath = await RecordingService.startRecording();
      console.log('Recording started:', filePath);

      return filePath;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Manually stop recording
   * @param uploadImmediately - Whether to upload immediately (default: true)
   * @returns Promise that resolves to recording metadata
   */
  async stopRecording(
    uploadImmediately: boolean = true,
    onProgress?: (progress: number) => void,
  ): Promise<RecordingMetadata> {
    try {
      // Stop recording
      const metadata = await RecordingService.stopRecording();
      this.recordingMetadata = metadata;

      console.log('Recording stopped:', metadata);

      // Upload if requested and we have a lead ID
      if (uploadImmediately && this.currentLeadId) {
        await this.uploadRecording(this.currentLeadId, metadata, onProgress);
      }

      return metadata;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Cancel current recording
   */
  async cancelRecording(): Promise<void> {
    try {
      await RecordingService.cancelRecording();
      this.recordingMetadata = null;
      console.log('Recording cancelled');
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  }

  /**
   * Check if currently recording
   * @returns True if recording is in progress
   */
  isRecording(): boolean {
    return RecordingService.isCurrentlyRecording();
  }

  /**
   * Get current recording duration
   * @returns Duration in seconds
   */
  getCurrentRecordingDuration(): number {
    return RecordingService.getCurrentDuration();
  }

  /**
   * Upload a recording to the server using RecordingUploadService
   * @param leadId - Lead ID
   * @param metadata - Recording metadata
   * @param onProgress - Progress callback
   * @returns Promise that resolves when upload is complete
   */
  private async uploadRecording(
    leadId: string,
    metadata: RecordingMetadata,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    if (this.uploadInProgress) {
      console.log('[CallRecordingManager] Upload already in progress');
      return;
    }

    if (!this.currentCallLogId) {
      console.error('[CallRecordingManager] No call log ID available for upload');
      return;
    }

    try {
      this.uploadInProgress = true;
      this.uploadStatus = 'uploading';
      this.uploadProgress = 0;

      console.log('[CallRecordingManager] Uploading recording:', metadata.filePath);

      const result = await RecordingUploadService.uploadRecording({
        filePath: metadata.filePath,
        leadId,
        callLogId: this.currentCallLogId,
        onProgress: (progress) => {
          this.uploadProgress = progress;
          if (onProgress) {
            onProgress(progress);
          }
          console.log(`[CallRecordingManager] Upload progress: ${progress.toFixed(2)}%`);
        },
      });

      if (result.success) {
        console.log('[CallRecordingManager] Recording uploaded successfully');
        this.uploadStatus = 'success';
        this.uploadProgress = 100;

        // Clean up local file after successful upload
        await RecordingService.deleteRecording(metadata.filePath);

        // Invalidate cache so UI fetches fresh data
        LeadService.clearLeadCache(leadId);

        // Notify listeners
        this.notifyListeners(true);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('[CallRecordingManager] Failed to upload recording:', error);
      this.uploadStatus = 'failed';

      // Show error to user
      ErrorMessageService.showUploadFailed();

      throw error;
    } finally {
      this.uploadInProgress = false;
    }
  }

  // Event Listeners
  private listeners: ((success: boolean) => void)[] = [];

  /**
   * Add listener for recording completion
   * @param callback - Function to call when recording upload completes
   */
  addRecordingCompletedListener(callback: (success: boolean) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove listener
   * @param callback - Function to remove
   */
  removeRecordingCompletedListener(callback: (success: boolean) => void): void {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Notify listeners of completion
   * @param success - Whether upload was successful
   */
  private notifyListeners(success: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(success);
      } catch (error) {
        console.error('[CallRecordingManager] Error in listener:', error);
      }
    });
  }

  /**
   * Get current upload status
   * @returns Upload status object
   */
  getUploadStatus(): {
    status: 'idle' | 'uploading' | 'success' | 'failed';
    progress: number;
  } {
    return {
      status: this.uploadStatus,
      progress: this.uploadProgress,
    };
  }

  /**
   * Check and request necessary permissions
   * @returns Promise with permission status
   */
  private async checkAndRequestPermissions(): Promise<{
    call: boolean;
    recording: boolean;
  }> {
    try {
      // Check current permissions
      const currentPermissions = await PermissionService.checkPermissions();

      // If all granted, return immediately
      if (currentPermissions.allGranted) {
        return { call: true, recording: true };
      }

      // Request call permission with proper handling
      const callResult = await PermissionService.requestPermissionWithHandling('call');

      // Request recording permission with proper handling
      const recordingResult = await PermissionService.requestPermissionWithHandling('recording');

      return {
        call: callResult.status === 'granted',
        recording: recordingResult.status === 'granted',
      };
    } catch (error) {
      console.error('Failed to check/request permissions:', error);
      return { call: false, recording: false };
    }
  }

  /**
   * Log call attempt to the server
   * @param leadId - Lead ID
   */
  private async logCallAttempt(leadId: string): Promise<void> {
    try {
      const callLog = await LeadService.logCall(leadId, {
        outcome: 'connected', // Default to connected, can be updated later
        duration_seconds: 0,
      });
      this.currentCallLogId = callLog.id;
      
      // Update event service with call log ID
      CallRecordingEventService.setCurrentCallLog(callLog.id);
      
      console.log('[CallRecordingManager] Call log created:', callLog.id);
    } catch (error) {
      console.error('Failed to log call attempt:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Set up app state listener to detect when user returns from call
   */
  private setupAppStateListener(): void {
    // Remove existing listener if any
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    // Mark when call was initiated
    this.callInitiatedTime = Date.now();
    this.appWentToBackground = false;

    // Add new listener
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this),
    );
  }

  /**
   * Handle app state changes (detect return from call)
   * @param nextAppState - Next app state
   */
  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    const timeSinceCallInitiated = Date.now() - this.callInitiatedTime;

    console.log(`[CallRecording] App state changed to: ${nextAppState}`);
    console.log(`[CallRecording] Time since call initiated: ${timeSinceCallInitiated}ms`);
    console.log(`[CallRecording] App went to background: ${this.appWentToBackground}`);
    console.log(`[CallRecording] Recording in progress: ${RecordingService.isCurrentlyRecording()}`);

    // Track when app goes to background (dialer opens)
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      console.log('[CallRecording] App went to background/inactive - dialer opened');
      this.appWentToBackground = true;
      return;
    }

    // When app becomes active again (user returned from call)
    if (nextAppState === 'active') {
      console.log('[CallRecording] App became active - checking if call completed');

      // Only stop recording if:
      // 1. App actually went to background (dialer was opened)
      // 2. At least 3 seconds have passed (to avoid stopping immediately)
      // 3. Recording is still in progress
      if (this.appWentToBackground &&
        timeSinceCallInitiated > 3000 &&
        RecordingService.isCurrentlyRecording()) {
        console.log('[CallRecording] Stopping recording - call appears to be complete');
        try {
          await this.stopRecording(true);
        } catch (error) {
          console.error('[CallRecording] Failed to stop recording on app resume:', error);
        }
      } else {
        console.log('[CallRecording] Not stopping recording:');
        console.log(`  - Went to background: ${this.appWentToBackground}`);
        console.log(`  - Time passed: ${timeSinceCallInitiated}ms (need >3000ms)`);
        console.log(`  - Recording active: ${RecordingService.isCurrentlyRecording()}`);
      }

      // Clean up
      await this.cleanup();
    }
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Reset state
    this.currentLeadId = null;
    this.currentCallLogId = null;
    this.recordingMetadata = null;
    this.callInitiatedTime = 0;
    this.appWentToBackground = false;
    this.uploadStatus = 'idle';
    this.uploadProgress = 0;
  }

  /**
   * Cleanup on app shutdown
   */
  destroy(): void {
    RecordingUploadService.cleanup();
    CallRecordingEventService.cleanup();
  }

  /**
   * Handle recording failure gracefully
   * @param error - Error that occurred
   */
  private handleRecordingFailure(error: any): void {
    console.error('Recording failure:', error);
    ErrorMessageService.handleError(error, false,
      'Recording failed. The call will continue without recording.'
    );
  }
}

// Export singleton instance
export default new CallRecordingManager();
