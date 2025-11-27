import { NativeEventEmitter, NativeModules, DeviceEventEmitter, Platform } from 'react-native';
import RecordingUploadService from './RecordingUploadService';
import LeadService from './LeadService';
import RecordingService from './RecordingService';

/**
 * Service to handle call recording events from the accessibility service
 * and upload recordings to the backend
 */
class CallRecordingEventService {
  private listeners: any[] = [];
  private currentLeadId: string | null = null;
  private currentCallLogId: string | null = null;

  /**
   * Initialize the service and start listening for recording events
   */
  initialize(): void {
    if (Platform.OS !== 'android') {
      return;
    }

    // Listen for recording started events
    const startedListener = DeviceEventEmitter.addListener(
      'com.educationcrm.CALL_RECORDING_STARTED',
      this.handleRecordingStarted.bind(this)
    );

    // Listen for recording ended events
    const endedListener = DeviceEventEmitter.addListener(
      'com.educationcrm.CALL_RECORDING_ENDED',
      this.handleRecordingEnded.bind(this)
    );

    // Listen for recording stopped events from RecordingService
    const stoppedListener = DeviceEventEmitter.addListener(
      'com.educationcrm.RECORDING_STOPPED',
      this.handleRecordingStopped.bind(this)
    );

    this.listeners.push(startedListener, endedListener, stoppedListener);

    console.log('[CallRecordingEventService] Initialized and listening for events');
  }

  /**
   * Set the current lead ID for associating recordings
   */
  setCurrentLead(leadId: string | null): void {
    this.currentLeadId = leadId;
    console.log('[CallRecordingEventService] Current lead set to:', leadId);
  }

  /**
   * Set the current call log ID for associating recordings
   */
  setCurrentCallLog(callLogId: string | null): void {
    this.currentCallLogId = callLogId;
    console.log('[CallRecordingEventService] Current call log set to:', callLogId);
  }

  /**
   * Handle recording started event
   */
  private handleRecordingStarted(event: any): void {
    console.log('[CallRecordingEventService] Recording started:', event);
    const { filePath, phoneNumber } = event;

    // Try to find the lead by phone number if we don't have a current lead
    if (!this.currentLeadId && phoneNumber) {
      this.findLeadByPhoneNumber(phoneNumber);
    }
  }

  /**
   * Handle recording ended event
   */
  private handleRecordingEnded(event: any): void {
    console.log('[CallRecordingEventService] Recording ended:', event);
    // The actual upload will happen when we receive RECORDING_STOPPED
  }

  /**
   * Handle recording stopped event with file details
   */
  private async handleRecordingStopped(event: any): Promise<void> {
    console.log('[CallRecordingEventService] Recording stopped with details:', event);
    
    const { filePath, duration, fileSize, audioSource } = event;

    // Check if we have a valid recording
    if (!filePath || fileSize === 0) {
      console.log('[CallRecordingEventService] No valid recording file, skipping upload');
      return;
    }

    // Check if we have lead and call log IDs
    if (!this.currentLeadId || !this.currentCallLogId) {
      console.warn('[CallRecordingEventService] Missing lead or call log ID, cannot upload recording');
      console.warn('  Lead ID:', this.currentLeadId);
      console.warn('  Call Log ID:', this.currentCallLogId);
      
      // Store for later upload
      await this.storeForLaterUpload(filePath, duration, fileSize);
      return;
    }

    // Upload the recording
    await this.uploadRecording(filePath, this.currentLeadId, this.currentCallLogId);
  }

  /**
   * Upload a recording file to the backend
   */
  private async uploadRecording(
    filePath: string,
    leadId: string,
    callLogId: string
  ): Promise<void> {
    try {
      console.log('[CallRecordingEventService] Uploading recording...');
      console.log('  File:', filePath);
      console.log('  Lead:', leadId);
      console.log('  Call Log:', callLogId);

      const result = await RecordingUploadService.uploadRecording({
        filePath,
        leadId,
        callLogId,
        onProgress: (progress) => {
          console.log(`[CallRecordingEventService] Upload progress: ${progress.toFixed(1)}%`);
        },
      });

      if (result.success) {
        console.log('[CallRecordingEventService] Recording uploaded successfully');
        
        // Delete local file after successful upload
        await RecordingService.deleteRecording(filePath);
        
        // Clear lead cache to refresh UI
        LeadService.clearLeadCache(leadId);
      } else {
        console.error('[CallRecordingEventService] Upload failed:', result.error);
      }
    } catch (error) {
      console.error('[CallRecordingEventService] Error uploading recording:', error);
    }
  }

  /**
   * Store recording for later upload when we have the lead/call log IDs
   */
  private async storeForLaterUpload(
    filePath: string,
    duration: number,
    fileSize: number
  ): Promise<void> {
    console.log('[CallRecordingEventService] Storing recording for later upload');
    // TODO: Implement pending uploads storage
    // For now, recordings without lead/call log will be lost
  }

  /**
   * Try to find a lead by phone number
   */
  private async findLeadByPhoneNumber(phoneNumber: string): Promise<void> {
    try {
      console.log('[CallRecordingEventService] Searching for lead with phone:', phoneNumber);
      // TODO: Implement lead search by phone number
      // This would require a new API endpoint or searching through cached leads
    } catch (error) {
      console.error('[CallRecordingEventService] Error finding lead:', error);
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    this.listeners.forEach(listener => listener.remove());
    this.listeners = [];
    console.log('[CallRecordingEventService] Cleaned up');
  }
}

export default new CallRecordingEventService();
