import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import LeadService from './LeadService';

/**
 * QueuedUpload - Represents a recording waiting to be uploaded
 */
export interface QueuedUpload {
  id: string;
  leadId: string;
  filePath: string;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

const QUEUE_STORAGE_KEY = '@upload_queue';
const MAX_RETRY_COUNT = 5;

/**
 * UploadQueueService - Manages failed recording uploads and retries
 */
class UploadQueueService {
  private isProcessing: boolean = false;
  private netInfoUnsubscribe: (() => void) | null = null;

  /**
   * Initialize the service and start listening for network changes
   */
  async initialize(): Promise<void> {
    // Listen for network state changes
    this.netInfoUnsubscribe = NetInfo.addEventListener((state: any) => {
      if (state.isConnected && !this.isProcessing) {
        void this.processQueue();
      }
    });

    // Process queue on initialization if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      this.processQueue();
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
  }

  /**
   * Add a failed upload to the queue
   * @param leadId - Lead ID
   * @param filePath - Local file path
   * @returns Promise that resolves when added to queue
   */
  async addToQueue(leadId: string, filePath: string): Promise<void> {
    try {
      const queue = await this.getQueue();

      const queuedUpload: QueuedUpload = {
        id: `${leadId}_${Date.now()}`,
        leadId,
        filePath,
        timestamp: Date.now(),
        retryCount: 0,
      };

      queue.push(queuedUpload);
      await this.saveQueue(queue);

      console.log('[UploadQueue] Added to queue:', queuedUpload.id);
    } catch (error) {
      console.error('[UploadQueue] Failed to add to queue:', error);
    }
  }

  /**
   * Get all queued uploads
   * @returns Promise with array of queued uploads
   */
  async getQueue(): Promise<QueuedUpload[]> {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!queueJson) {
        return [];
      }
      return JSON.parse(queueJson);
    } catch (error) {
      console.error('[UploadQueue] Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Save queue to storage
   * @param queue - Array of queued uploads
   */
  private async saveQueue(queue: QueuedUpload[]): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('[UploadQueue] Failed to save queue:', error);
    }
  }

  /**
   * Remove an upload from the queue
   * @param uploadId - Upload ID to remove
   */
  private async removeFromQueue(uploadId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filteredQueue = queue.filter(item => item.id !== uploadId);
      await this.saveQueue(filteredQueue);
      console.log('[UploadQueue] Removed from queue:', uploadId);
    } catch (error) {
      console.error('[UploadQueue] Failed to remove from queue:', error);
    }
  }

  /**
   * Update an upload in the queue
   * @param upload - Updated upload object
   */
  private async updateInQueue(upload: QueuedUpload): Promise<void> {
    try {
      const queue = await this.getQueue();
      const index = queue.findIndex(item => item.id === upload.id);
      if (index !== -1) {
        queue[index] = upload;
        await this.saveQueue(queue);
      }
    } catch (error) {
      console.error('[UploadQueue] Failed to update queue:', error);
    }
  }

  /**
   * Process the upload queue
   * Attempts to upload all queued recordings
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('[UploadQueue] Already processing queue');
      return;
    }

    try {
      this.isProcessing = true;

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('[UploadQueue] No network connection, skipping queue processing');
        return;
      }

      const queue = await this.getQueue();
      console.log(`[UploadQueue] Processing ${queue.length} queued uploads`);

      for (const upload of queue) {
        try {
          // Check if max retries exceeded
          if (upload.retryCount >= MAX_RETRY_COUNT) {
            console.log(`[UploadQueue] Max retries exceeded for ${upload.id}, removing from queue`);
            await this.removeFromQueue(upload.id);
            continue;
          }

          // Attempt upload
          console.log(`[UploadQueue] Uploading ${upload.id} (attempt ${upload.retryCount + 1})`);
          await LeadService.uploadRecording(upload.leadId, upload.filePath);

          // Success - remove from queue
          await this.removeFromQueue(upload.id);
          console.log(`[UploadQueue] Successfully uploaded ${upload.id}`);
        } catch (error) {
          // Failed - increment retry count and update
          console.error(`[UploadQueue] Failed to upload ${upload.id}:`, error);

          upload.retryCount += 1;
          upload.lastError = error instanceof Error ? error.message : 'Unknown error';
          await this.updateInQueue(upload);
        }
      }
    } catch (error) {
      console.error('[UploadQueue] Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get queue statistics
   * @returns Object with queue stats
   */
  async getQueueStats(): Promise<{
    totalQueued: number;
    failedUploads: number;
  }> {
    const queue = await this.getQueue();
    return {
      totalQueued: queue.length,
      failedUploads: queue.filter(item => item.retryCount > 0).length,
    };
  }

  /**
   * Clear the entire queue
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      console.log('[UploadQueue] Queue cleared');
    } catch (error) {
      console.error('[UploadQueue] Failed to clear queue:', error);
    }
  }
}

// Export singleton instance
export default new UploadQueueService();
