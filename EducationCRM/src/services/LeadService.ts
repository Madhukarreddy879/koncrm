import apiClient from './ApiService';
import ReactNativeBlobUtil from 'react-native-blob-util';
import CacheService from './CacheService';
import OfflineStorageService from './OfflineStorageService';
import S3Service from './S3Service';

export interface Lead {
  id: string;
  student_name: string;
  phone_number: string;
  email?: string;
  alternate_phone?: string;
  city?: string;
  preferred_course?: string;
  preferred_university?: string;
  status: 'new' | 'contacted' | 'interested' | 'not_interested' | 'enrolled' | 'lost';
  telecaller_id: string;
  branch_id: string;
  assigned_at?: string;
  last_contacted_at?: string;
  call_count: number;
  inserted_at: string;
  updated_at: string;
}

export interface LeadDetail extends Lead {
  notes: LeadNote[];
  call_logs: CallLog[];
  followups: Followup[];
}

export interface LeadNote {
  id: string;
  lead_id: string;
  telecaller_id: string;
  note: string;
  inserted_at: string;
}

export interface CallLog {
  id: string;
  lead_id: string;
  telecaller_id: string;
  outcome: 'connected' | 'no_answer' | 'busy' | 'invalid_number';
  duration_seconds?: number;
  recording_path?: string;
  inserted_at: string;
}

export interface Followup {
  id: string;
  lead_id: string;
  telecaller_id: string;
  scheduled_at: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
  inserted_at: string;
  updated_at: string;
}

export interface LeadFilters {
  status?: string;
  search?: string;
}

export interface LeadsResponse {
  data: Lead[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

export interface UpdateLeadData {
  email?: string;
  alternate_phone?: string;
  city?: string;
  preferred_course?: string;
  preferred_university?: string;
  status?: string;
}

export interface CallData {
  outcome: 'connected' | 'no_answer' | 'busy' | 'invalid_number';
  duration_seconds?: number;
}

class LeadService {
  /**
   * Fetch paginated list of leads with optional filters
   * @param filters - Optional filters (status, search)
   * @param page - Page number (default: 1)
   * @param useCache - Whether to use cached data (default: true)
   * @returns Promise with paginated leads response
   */
  async fetchLeads(
    filters: LeadFilters = {},
    page: number = 1,
    useCache: boolean = true
  ): Promise<LeadsResponse> {
    try {
      // Generate cache key based on filters and page
      const cacheKey = `leads_${filters.status || 'all'}_${filters.search || 'none'}_page_${page}`;

      // Check cache first
      if (useCache) {
        const cachedData = CacheService.getLeadList(cacheKey);
        if (cachedData) {
          console.log('[LeadService] Returning cached leads');
          // Return cached data with approximate pagination info
          return {
            data: cachedData,
            page,
            page_size: 50,
            total_count: cachedData.length,
            total_pages: 1,
          };
        }
      }

      const params: Record<string, string | number> = { page };

      if (filters.status) {
        params.status = filters.status;
      }

      if (filters.search) {
        params.search = filters.search;
      }

      const response = await apiClient.get<LeadsResponse>('/leads', { params });

      // Cache the response data
      CacheService.cacheLeadList(cacheKey, response.data.data);

      // Store for offline viewing
      await OfflineStorageService.storeLeadList(response.data.data);

      return response.data;
    } catch (error) {
      console.error('[LeadService] Failed to fetch leads:', error);

      // If offline, try to return stored data
      if (!OfflineStorageService.isDeviceOnline()) {
        const offlineData = await OfflineStorageService.getLeadList();
        if (offlineData) {
          console.log('[LeadService] Returning offline lead list');
          return {
            data: offlineData,
            page: 1,
            page_size: 50,
            total_count: offlineData.length,
            total_pages: 1,
          };
        }
      }

      throw error;
    }
  }

  /**
   * Get detailed information for a specific lead
   * @param id - Lead ID
   * @param useCache - Whether to use cached data (default: true)
   * @returns Promise with lead detail including notes, call logs, and followups
   */
  async getLead(id: string, useCache: boolean = true): Promise<LeadDetail> {
    try {
      // Check cache first
      if (useCache) {
        const cachedData = CacheService.getLeadDetail(id);
        if (cachedData) {
          console.log('[LeadService] Returning cached lead detail');
          return cachedData;
        }
      }

      const response = await apiClient.get<{ data: LeadDetail }>(`/leads/${id}`);

      // Cache the response
      CacheService.cacheLeadDetail(id, response.data.data);

      // Store for offline viewing
      await OfflineStorageService.storeLeadDetail(id, response.data.data);

      return response.data.data;
    } catch (error) {
      console.error('[LeadService] Failed to get lead:', error);

      // If offline, try to return stored data
      if (!OfflineStorageService.isDeviceOnline()) {
        const offlineData = await OfflineStorageService.getLeadDetail(id);
        if (offlineData) {
          console.log('[LeadService] Returning offline lead detail');
          return offlineData;
        }
      }

      throw error;
    }
  }

  /**
   * Update lead information with optimistic updates
   * @param id - Lead ID
   * @param data - Updated lead data
   * @param optimistic - Whether to update cache optimistically (default: true)
   * @returns Promise with updated lead
   */
  async updateLead(id: string, data: UpdateLeadData, optimistic: boolean = true): Promise<Lead> {
    try {
      // Optimistically update cache before API call
      if (optimistic) {
        CacheService.updateLeadOptimistically(id, data as any);
      }

      const response = await apiClient.patch<{ data: Lead }>(`/leads/${id}`, data);

      // Update cache with actual response
      CacheService.updateLeadOptimistically(id, response.data.data);

      return response.data.data;
    } catch (error) {
      console.error('[LeadService] Failed to update lead:', error);

      // If offline, queue the request for retry
      if (!OfflineStorageService.isDeviceOnline()) {
        await OfflineStorageService.queueFailedRequest({
          type: 'update_lead',
          leadId: id,
          data,
        });
        console.log('[LeadService] Queued lead update for retry when online');
        // Return optimistic data
        return { id, ...data } as Lead;
      }

      // Revert optimistic update on error by invalidating cache
      if (optimistic) {
        CacheService.invalidateLeadDetail(id);
        CacheService.invalidateLeadLists();
      }

      throw error;
    }
  }

  /**
   * Log a call attempt for a lead
   * @param leadId - Lead ID
   * @param callData - Call outcome and duration
   * @returns Promise with created call log
   */
  async logCall(leadId: string, callData: CallData): Promise<CallLog> {
    try {
      const response = await apiClient.post<{ data: CallLog }>(`/leads/${leadId}/calls`, callData);
      return response.data.data;
    } catch (error) {
      console.error('[LeadService] Failed to log call:', error);
      throw error;
    }
  }

  /**
   * Upload call recording with chunked upload support and retry logic
   * @param leadId - Lead ID
   * @param audioFilePath - Local path to audio file
   * @param onProgress - Optional callback for upload progress
   * @param retryCount - Current retry attempt (default: 0)
   * @returns Promise with recording metadata
   */
  async uploadRecording(
    leadId: string,
    callLogId: string,
    audioFilePath: string,
    onProgress?: (progress: number) => void,
    retryCount: number = 0
  ): Promise<{ recording_id: string; recording_path: string }> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      // 1. Get presigned URL
      console.log('[LeadService] Requesting presigned URL...');
      const filename = audioFilePath.split('/').pop() || 'recording.aac';
      const presignResponse = await apiClient.post<{ data: { upload_url: string; key: string; public_url: string } }>(
        `/leads/${leadId}/recordings/presign`,
        { filename }
      );

      const { upload_url, key, public_url } = presignResponse.data.data;

      // 2. Upload to S3
      console.log('[LeadService] Uploading to S3...');
      await S3Service.uploadFile(audioFilePath, upload_url, 'audio/aac', onProgress);

      // 3. Attach to call log
      console.log('[LeadService] Attaching recording to call log...');
      const attachResponse = await apiClient.post<{ data: { id: string; recording_path: string } }>(
        `/leads/${leadId}/recordings`,
        {
          call_log_id: callLogId,
          s3_key: key
        }
      );

      return {
        recording_id: attachResponse.data.data.id,
        recording_path: attachResponse.data.data.recording_path
      };
    } catch (error) {
      console.error(`[LeadService] Failed to upload recording (attempt ${retryCount + 1}/${maxRetries}):`, error);

      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`[LeadService] Retrying upload in ${delay}ms...`);

        await new Promise<void>(resolve => setTimeout(resolve, delay));
        return this.uploadRecording(leadId, callLogId, audioFilePath, onProgress, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Get streaming URL for a call recording
   * @param leadId - Lead ID
   * @param recordingId - Recording ID
   * @returns URL string for streaming
   */
  getRecordingUrl(leadId: string, recordingId: string): string {
    return `${apiClient.defaults.baseURL}/leads/${leadId}/recordings/${recordingId}`;
  }

  /**
   * Clear all cached lead data
   */
  clearCache(): void {
    CacheService.invalidateAll();
  }

  /**
   * Clear cached data for a specific lead
   * @param leadId - Lead ID
   */
  clearLeadCache(leadId: string): void {
    CacheService.invalidateLeadDetail(leadId);
  }
}

export default new LeadService();
