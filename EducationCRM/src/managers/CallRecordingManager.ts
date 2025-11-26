import { Alert, AppState, AppStateStatus } from 'react-native';
import CallHelper from '../utils/CallHelper';
import RecordingService, { RecordingMetadata } from '../services/RecordingService';
import PermissionService from '../services/PermissionService';
import LeadService from '../services/LeadService';
import UploadQueueService from '../services/UploadQueueService';

/**
 * CallRecordingManager - Coordinates call initiation and recording
 * Handles the complete workflow: permissions, call, recording, and upload
 */
class CallRecordingManager {
  private appStateSubscription: any = null;
  private currentLeadId: string | null = null;
  private currentCallLogId: string | null = null;
  private recordingMetadata: RecordingMetadata | null = null;
  private uploadInProgress: boolean = false;
  private callInitiatedTime: number = 0;
  private appWentToBackground: boolean = false;

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
        Alert.alert(
          'Permission Required',
          'Phone call permission is required to make calls. Please enable it in settings.',
          [{ text: 'OK' }],
        );
        return;
      }

      // Step 2: Store lead ID for later use
      this.currentLeadId = leadId;

      // Step 3: Start recording if auto-record is enabled and permission granted
      if (autoRecord && permissionsGranted.recording) {
        try {
          await this.startRecording();
        } catch (error) {
          console.error('Failed to start recording:', error);
          // Continue with call even if recording fails
          Alert.alert(
            'Recording Failed',
            'Unable to start recording, but call will proceed. You can manually start recording after the call begins.',
            [{ text: 'OK' }],
          );
        }
      } else if (autoRecord && !permissionsGranted.recording) {
        // Show notice about recording permission
        Alert.alert(
          'Recording Permission Denied',
          'Call recording requires microphone permission. The call will proceed without recording.',
          [{ text: 'OK' }],
        );
      }

      // Step 4: Initiate the call
      await CallHelper.initiateCall(phoneNumber);

      // Step 5: Set up app state listener to detect when user returns
      this.setupAppStateListener();

      // Step 6: Log call attempt
      await this.logCallAttempt(leadId);
    } catch (error) {
      // Clean up on error
      await this.cleanup();

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Call Failed', `Unable to initiate call: ${errorMessage}`, [
        { text: 'OK' },
      ]);

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
        const result = await PermissionService.requestRecordingPermission();
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
   * Upload a recording to the server with retry queue support
   * @param leadId - Lead ID
   * @param metadata - Recording metadata
   * @returns Promise that resolves when upload is complete
   */
  private async uploadRecording(
    leadId: string,
    metadata: RecordingMetadata,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    if (this.uploadInProgress) {
      console.log('Upload already in progress');
      return;
    }

    try {
      this.uploadInProgress = true;

      console.log('Uploading recording:', metadata.filePath);

      if (!this.currentCallLogId) {
        console.error('No call log ID available for upload');
        return;
      }

      await LeadService.uploadRecording(
        leadId,
        this.currentCallLogId,
        metadata.filePath,
        onProgress || ((progress) => {
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
        }),
      );

      console.log('Recording uploaded successfully');

      // Clean up local file after successful upload
      await RecordingService.deleteRecording(metadata.filePath);
    } catch (error) {
      console.error('Failed to upload recording:', error);

      // Add to upload queue for retry when network is available
      await UploadQueueService.addToQueue(leadId, metadata.filePath);

      // Show error to user
      Alert.alert(
        'Upload Failed',
        'Failed to upload recording. It will be retried automatically when network is available.',
        [{ text: 'OK' }],
      );

      throw error;
    } finally {
      this.uploadInProgress = false;
    }
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

      // Request missing permissions
      const results = await PermissionService.requestAllPermissions();

      return {
        call: results.call.status === 'granted',
        recording: results.recording.status === 'granted',
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
    
    // Track when app goes to background (dialer opens)
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      console.log('App went to background/inactive - dialer opened');
      this.appWentToBackground = true;
      return;
    }

    // When app becomes active again (user returned from call)
    if (nextAppState === 'active') {
      console.log('App became active - checking if call completed');
      console.log(`Time since call initiated: ${timeSinceCallInitiated}ms`);
      console.log(`App went to background: ${this.appWentToBackground}`);

      // Only stop recording if:
      // 1. App actually went to background (dialer was opened)
      // 2. At least 3 seconds have passed (to avoid stopping immediately)
      // 3. Recording is still in progress
      if (this.appWentToBackground && 
          timeSinceCallInitiated > 3000 && 
          RecordingService.isCurrentlyRecording()) {
        console.log('Stopping recording - call appears to be complete');
        try {
          await this.stopRecording(true);
        } catch (error) {
          console.error('Failed to stop recording on app resume:', error);
        }
      } else {
        console.log('Not stopping recording - call just initiated or recording already stopped');
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
  }

  /**
   * Handle recording failure gracefully
   * @param error - Error that occurred
   */
  private handleRecordingFailure(error: any): void {
    console.error('Recording failure:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    Alert.alert(
      'Recording Error',
      `Recording failed: ${errorMessage}. The call will continue without recording.`,
      [{ text: 'OK' }],
    );
  }
}

// Export singleton instance
export default new CallRecordingManager();
