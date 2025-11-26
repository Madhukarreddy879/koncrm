import apiClient from './ApiService';
import S3Service from './S3Service';
import ReactNativeBlobUtil from 'react-native-blob-util';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import ErrorMessageService from './ErrorMessageService';

export interface UploadResult {
  success: boolean;
  recordingId?: string;
  recordingPath?: string;
  error?: string;
}

export interface UploadParams {
  filePath: string;
  leadId: string;
  callLogId: string;
  onProgress?: (progress: number) => void;
}

export interface PendingUpload {
  id: string;
  filePath: string;
  leadId: string;
  callLogId: string;
  retryCount: number;
  timestamp: number;
  lastError?: string;
  status: 'pending' | 'uploading' | 'failed' | 'completed';
}

interface PresignResponse {
  upload_url: string;
  key: string;
  public_url: string;
}

interface AttachRecordingResponse {
  id: string;
  recording_path: string;
  message: string;
}

interface ChunkedUploadInitResponse {
  upload_id: string;
  message: string;
}

interface ChunkedUploadAppendResponse {
  upload_id: string;
  chunks_received: number;
  total_size: number;
}

/**
 * RecordingUploadService - Handles uploading call recordings to the backend
 * 
 * Upload Flow:
 * 1. Request presigned S3 URL from backend
 * 2. Upload file directly to S3 using presigned URL
 * 3. Confirm upload to backend with S3 key
 * 
 * Fallback Flow (if S3 fails):
 * 1. Initialize chunked upload session
 * 2. Upload file in chunks
 * 3. Finalize chunked upload
 * 
 * Retry Logic:
 * - Automatic retry with exponential backoff (3 attempts)
 * - Failed uploads stored in AsyncStorage for persistence
 * - Retry when network is restored
 */
class RecordingUploadService {
  private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_QUEUE_KEY = '@recording_upload_retry_queue';
  private readonly BASE_RETRY_DELAY = 1000; // 1 second
  private isProcessingQueue: boolean = false;
  private netInfoUnsubscribe: (() => void) | null = null;

  /**
   * Initialize the service and start listening for network changes
   */
  async initialize(): Promise<void> {
    // Listen for network state changes
    this.netInfoUnsubscribe = NetInfo.addEventListener((state: any) => {
      if (state.isConnected && !this.isProcessingQueue) {
        void this.processRetryQueue();
      }
    });

    // Process queue on initialization if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      void this.processRetryQueue();
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
   * Upload a recording file using S3 presigned URL with chunked upload fallback
   * Includes automatic retry with exponential backoff
   * @param params - Upload parameters
   * @param retryCount - Current retry attempt (internal use)
   * @returns Promise with upload result
   */
  async uploadRecording(params: UploadParams, retryCount: number = 0): Promise<UploadResult> {
    const { filePath, leadId, callLogId, onProgress } = params;

    try {
      console.log('[RecordingUploadService] Starting upload for call log:', callLogId);

      // Try S3 presigned URL upload first
      try {
        const result = await this.uploadViaS3(filePath, leadId, callLogId, onProgress);
        
        // Success - remove from retry queue if it was there
        await this.removeFromRetryQueue(callLogId);
        
        return result;
      } catch (s3Error) {
        console.warn('[RecordingUploadService] S3 upload failed, falling back to chunked upload:', s3Error);
        
        // Fallback to chunked upload
        const result = await this.uploadViaChunks(filePath, leadId, callLogId, onProgress);
        
        // Success - remove from retry queue if it was there
        await this.removeFromRetryQueue(callLogId);
        
        return result;
      }
    } catch (error) {
      console.error(`[RecordingUploadService] Upload failed (attempt ${retryCount + 1}/${this.MAX_RETRIES}):`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Retry with exponential backoff
      if (retryCount < this.MAX_RETRIES - 1) {
        const delay = this.BASE_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`[RecordingUploadService] Retrying upload in ${delay}ms...`);

        await this.sleep(delay);
        return this.uploadRecording(params, retryCount + 1);
      }

      // Max retries exceeded - add to persistent retry queue
      console.log('[RecordingUploadService] Max retries exceeded, adding to retry queue');
      await this.addToRetryQueue({
        id: callLogId,
        filePath,
        leadId,
        callLogId,
        retryCount: 0,
        timestamp: Date.now(),
        lastError: errorMessage,
        status: 'failed',
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Retry a specific upload from the queue
   * @param uploadId - Upload ID (call log ID)
   * @returns Promise with upload result
   */
  async retryUpload(uploadId: string): Promise<UploadResult> {
    try {
      const queue = await this.getRetryQueue();
      const upload = queue.find(u => u.id === uploadId);

      if (!upload) {
        return {
          success: false,
          error: 'Upload not found in retry queue',
        };
      }

      // Update status to uploading
      upload.status = 'uploading';
      await this.updateInRetryQueue(upload);

      // Attempt upload with exponential backoff
      const delay = this.BASE_RETRY_DELAY * Math.pow(2, upload.retryCount);
      await this.sleep(delay);

      const result = await this.uploadRecording({
        filePath: upload.filePath,
        leadId: upload.leadId,
        callLogId: upload.callLogId,
      });

      if (!result.success) {
        // Update retry count and status
        upload.retryCount += 1;
        upload.lastError = result.error;
        upload.status = 'failed';
        await this.updateInRetryQueue(upload);
      }

      return result;
    } catch (error) {
      console.error('[RecordingUploadService] Retry upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload file using S3 presigned URL
   * @param filePath - Local file path
   * @param leadId - Lead ID
   * @param callLogId - Call log ID
   * @param onProgress - Progress callback
   * @returns Promise with upload result
   */
  private async uploadViaS3(
    filePath: string,
    leadId: string,
    callLogId: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    try {
      // Step 1: Request presigned URL
      console.log('[RecordingUploadService] Requesting presigned URL...');
      const filename = this.extractFilename(filePath);
      const contentType = this.getContentType(filename);

      const presignResponse = await apiClient.post<{ data: PresignResponse }>(
        `/leads/${leadId}/recordings/presign`,
        {
          filename,
          content_type: contentType,
        }
      );

      if (!presignResponse.data?.data) {
        throw new Error('Invalid presign response');
      }

      const { upload_url, key } = presignResponse.data.data;

      // Step 2: Upload to S3
      console.log('[RecordingUploadService] Uploading to S3...');
      await S3Service.uploadFile(filePath, upload_url, contentType, (progress) => {
        // S3 upload is 80% of total progress
        if (onProgress) {
          onProgress(progress * 0.8);
        }
      });

      // Step 3: Confirm upload to backend
      console.log('[RecordingUploadService] Confirming upload with backend...');
      const attachResponse = await apiClient.post<{ data: AttachRecordingResponse }>(
        `/leads/${leadId}/recordings`,
        {
          call_log_id: callLogId,
          s3_key: key,
        }
      );

      if (!attachResponse.data?.data) {
        throw new Error('Invalid attach response');
      }

      if (onProgress) {
        onProgress(100);
      }

      console.log('[RecordingUploadService] S3 upload successful');
      return {
        success: true,
        recordingId: attachResponse.data.data.id,
        recordingPath: attachResponse.data.data.recording_path,
      };
    } catch (error) {
      console.error('[RecordingUploadService] S3 upload error:', error);
      throw error;
    }
  }

  /**
   * Upload file using chunked upload (fallback)
   * @param filePath - Local file path
   * @param leadId - Lead ID
   * @param callLogId - Call log ID
   * @param onProgress - Progress callback
   * @returns Promise with upload result
   */
  private async uploadViaChunks(
    filePath: string,
    leadId: string,
    callLogId: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    let uploadId: string | null = null;

    try {
      const filename = this.extractFilename(filePath);
      const cleanPath = filePath.replace('file://', '');

      // Step 1: Initialize chunked upload
      console.log('[RecordingUploadService] Initializing chunked upload...');
      const initResponse = await apiClient.post<{ data: ChunkedUploadInitResponse }>(
        `/leads/${leadId}/recordings`,
        {
          action: 'init',
          filename,
          call_log_id: callLogId,
        }
      );

      if (!initResponse.data?.data?.upload_id) {
        throw new Error('Invalid init response');
      }

      uploadId = initResponse.data.data.upload_id;
      console.log('[RecordingUploadService] Upload session initialized:', uploadId);

      // Step 2: Read entire file and upload in chunks
      const fileInfo = await ReactNativeBlobUtil.fs.stat(cleanPath);
      const fileSize = fileInfo.size;
      const totalChunks = Math.ceil(fileSize / this.CHUNK_SIZE);

      console.log(`[RecordingUploadService] Uploading ${totalChunks} chunks...`);

      // Read entire file as base64
      const fileData = await ReactNativeBlobUtil.fs.readFile(cleanPath, 'base64');

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, fileSize);
        
        // Calculate base64 positions (base64 is ~4/3 the size of binary)
        const base64ChunkSize = Math.ceil(this.CHUNK_SIZE * 4 / 3);
        const base64Start = Math.floor(start * 4 / 3);
        const base64End = Math.ceil(end * 4 / 3);
        
        // Extract chunk from base64 data
        const chunkData = fileData.substring(base64Start, base64End);

        // Upload chunk
        await apiClient.post<{ data: ChunkedUploadAppendResponse }>(
          `/leads/${leadId}/recordings`,
          {
            action: 'append',
            upload_id: uploadId,
            chunk_index: chunkIndex,
            chunk: chunkData,
          }
        );

        // Update progress
        if (onProgress) {
          const progress = ((chunkIndex + 1) / totalChunks) * 90; // 90% for chunks
          onProgress(progress);
        }

        console.log(`[RecordingUploadService] Uploaded chunk ${chunkIndex + 1}/${totalChunks}`);
      }

      // Step 3: Finalize upload
      console.log('[RecordingUploadService] Finalizing chunked upload...');
      const finalizeResponse = await apiClient.post<{ data: AttachRecordingResponse }>(
        `/leads/${leadId}/recordings`,
        {
          action: 'finalize',
          upload_id: uploadId,
          total_chunks: totalChunks,
          call_log_id: callLogId,
        }
      );

      if (!finalizeResponse.data?.data) {
        throw new Error('Invalid finalize response');
      }

      if (onProgress) {
        onProgress(100);
      }

      console.log('[RecordingUploadService] Chunked upload successful');
      return {
        success: true,
        recordingId: finalizeResponse.data.data.id,
        recordingPath: finalizeResponse.data.data.recording_path,
      };
    } catch (error) {
      console.error('[RecordingUploadService] Chunked upload error:', error);
      
      // Cancel upload session on error
      if (uploadId) {
        try {
          await this.cancelChunkedUpload(leadId, uploadId);
        } catch (cancelError) {
          console.error('[RecordingUploadService] Failed to cancel upload:', cancelError);
        }
      }

      throw error;
    }
  }

  /**
   * Cancel a chunked upload session
   * @param leadId - Lead ID
   * @param uploadId - Upload session ID
   */
  private async cancelChunkedUpload(leadId: string, uploadId: string): Promise<void> {
    try {
      await apiClient.post(`/leads/${leadId}/recordings`, {
        action: 'cancel',
        upload_id: uploadId,
      });
      console.log('[RecordingUploadService] Upload session cancelled:', uploadId);
    } catch (error) {
      console.error('[RecordingUploadService] Failed to cancel upload session:', error);
    }
  }

  /**
   * Extract filename from file path
   * @param filePath - Full file path
   * @returns Filename
   */
  private extractFilename(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || 'recording.aac';
  }

  /**
   * Get content type based on file extension
   * @param filename - Filename
   * @returns MIME type
   */
  private getContentType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'aac':
        return 'audio/aac';
      case 'm4a':
        return 'audio/mp4';
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      default:
        return 'audio/aac';
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========== Retry Queue Management ==========

  /**
   * Get retry queue from AsyncStorage
   * @returns Promise with array of pending uploads
   */
  private async getRetryQueue(): Promise<PendingUpload[]> {
    try {
      const queueJson = await AsyncStorage.getItem(this.RETRY_QUEUE_KEY);
      if (!queueJson) {
        return [];
      }
      return JSON.parse(queueJson);
    } catch (error) {
      console.error('[RecordingUploadService] Failed to get retry queue:', error);
      return [];
    }
  }

  /**
   * Save retry queue to AsyncStorage
   * @param queue - Array of pending uploads
   */
  private async saveRetryQueue(queue: PendingUpload[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.RETRY_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('[RecordingUploadService] Failed to save retry queue:', error);
    }
  }

  /**
   * Add upload to retry queue
   * @param upload - Pending upload
   */
  private async addToRetryQueue(upload: PendingUpload): Promise<void> {
    try {
      const queue = await this.getRetryQueue();
      
      // Check if already in queue
      const existingIndex = queue.findIndex(u => u.id === upload.id);
      if (existingIndex !== -1) {
        // Update existing entry
        queue[existingIndex] = upload;
      } else {
        // Add new entry
        queue.push(upload);
      }

      await this.saveRetryQueue(queue);
      console.log('[RecordingUploadService] Added to retry queue:', upload.id);
    } catch (error) {
      console.error('[RecordingUploadService] Failed to add to retry queue:', error);
    }
  }

  /**
   * Remove upload from retry queue
   * @param uploadId - Upload ID (call log ID)
   */
  private async removeFromRetryQueue(uploadId: string): Promise<void> {
    try {
      const queue = await this.getRetryQueue();
      const filteredQueue = queue.filter(u => u.id !== uploadId);
      await this.saveRetryQueue(filteredQueue);
      console.log('[RecordingUploadService] Removed from retry queue:', uploadId);
    } catch (error) {
      console.error('[RecordingUploadService] Failed to remove from retry queue:', error);
    }
  }

  /**
   * Update upload in retry queue
   * @param upload - Updated upload
   */
  private async updateInRetryQueue(upload: PendingUpload): Promise<void> {
    try {
      const queue = await this.getRetryQueue();
      const index = queue.findIndex(u => u.id === upload.id);
      if (index !== -1) {
        queue[index] = upload;
        await this.saveRetryQueue(queue);
      }
    } catch (error) {
      console.error('[RecordingUploadService] Failed to update retry queue:', error);
    }
  }

  /**
   * Process retry queue when network is restored
   */
  async processRetryQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      console.log('[RecordingUploadService] Already processing retry queue');
      return;
    }

    try {
      this.isProcessingQueue = true;

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('[RecordingUploadService] No network connection, skipping retry queue');
        return;
      }

      const queue = await this.getRetryQueue();
      console.log(`[RecordingUploadService] Processing ${queue.length} queued uploads`);

      for (const upload of queue) {
        try {
          // Check if max retries exceeded
          if (upload.retryCount >= this.MAX_RETRIES) {
            console.log(`[RecordingUploadService] Max retries exceeded for ${upload.id}`);
            continue;
          }

          // Attempt retry
          console.log(`[RecordingUploadService] Retrying upload ${upload.id} (attempt ${upload.retryCount + 1})`);
          await this.retryUpload(upload.id);
        } catch (error) {
          console.error(`[RecordingUploadService] Failed to retry upload ${upload.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[RecordingUploadService] Error processing retry queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Get retry queue for UI display
   * @returns Promise with array of pending uploads
   */
  async getRetryQueueForDisplay(): Promise<PendingUpload[]> {
    return this.getRetryQueue();
  }

  /**
   * Clear retry queue
   */
  async clearRetryQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.RETRY_QUEUE_KEY);
      console.log('[RecordingUploadService] Retry queue cleared');
    } catch (error) {
      console.error('[RecordingUploadService] Failed to clear retry queue:', error);
    }
  }
}

export default new RecordingUploadService();
