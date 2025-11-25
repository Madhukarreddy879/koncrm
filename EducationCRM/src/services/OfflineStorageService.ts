/**
 * OfflineStorageService - Persistent offline storage for lead data
 * Provides offline viewing and queues failed API requests for retry
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lead, LeadDetail, UpdateLeadData } from './LeadService';
import NetInfo from '@react-native-community/netinfo';

const LEADS_STORAGE_KEY = '@offline_leads';
const LEAD_DETAILS_STORAGE_KEY = '@offline_lead_details';
const USER_PROFILE_KEY = '@offline_user_profile';
const USER_STATS_KEY = '@offline_user_stats';
const FAILED_REQUESTS_KEY = '@offline_failed_requests';

interface FailedRequest {
  id: string;
  type: 'update_lead' | 'log_call' | 'add_note' | 'create_followup';
  leadId: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface UserProfile {
  id: string;
  username: string;
  role: string;
  branch_id: string;
}

interface UserStats {
  today_calls: number;
  week_calls: number;
  total_leads: number;
  conversion_rate: number;
}

class OfflineStorageService {
  private isOnline: boolean = true;
  private unsubscribeNetInfo: (() => void) | null = null;

  /**
   * Initialize the service and start monitoring network status
   */
  async initialize(): Promise<void> {
    // Check initial network status
    const netInfoState = await NetInfo.fetch();
    this.isOnline = netInfoState.isConnected ?? false;

    // Subscribe to network status changes
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // If we just came back online, process failed requests
      if (wasOffline && this.isOnline) {
        console.log('[OfflineStorage] Network restored, processing queued requests');
        this.processFailedRequests();
      }
    });
  }

  /**
   * Cleanup and unsubscribe from network monitoring
   */
  cleanup(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }

  /**
   * Check if device is currently online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Store lead list data for offline viewing
   */
  async storeLeadList(leads: Lead[]): Promise<void> {
    try {
      await AsyncStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
    } catch (error) {
      console.error('[OfflineStorage] Failed to store lead list:', error);
    }
  }

  /**
   * Get stored lead list data
   */
  async getLeadList(): Promise<Lead[] | null> {
    try {
      const data = await AsyncStorage.getItem(LEADS_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[OfflineStorage] Failed to get lead list:', error);
      return null;
    }
  }

  /**
   * Store lead detail data for offline viewing
   */
  async storeLeadDetail(leadId: string, lead: LeadDetail): Promise<void> {
    try {
      const key = `${LEAD_DETAILS_STORAGE_KEY}_${leadId}`;
      await AsyncStorage.setItem(key, JSON.stringify(lead));
    } catch (error) {
      console.error('[OfflineStorage] Failed to store lead detail:', error);
    }
  }

  /**
   * Get stored lead detail data
   */
  async getLeadDetail(leadId: string): Promise<LeadDetail | null> {
    try {
      const key = `${LEAD_DETAILS_STORAGE_KEY}_${leadId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[OfflineStorage] Failed to get lead detail:', error);
      return null;
    }
  }

  /**
   * Store user profile for offline viewing
   */
  async storeUserProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('[OfflineStorage] Failed to store user profile:', error);
    }
  }

  /**
   * Get stored user profile
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const data = await AsyncStorage.getItem(USER_PROFILE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[OfflineStorage] Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Store user stats for offline viewing
   */
  async storeUserStats(stats: UserStats): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('[OfflineStorage] Failed to store user stats:', error);
    }
  }

  /**
   * Get stored user stats
   */
  async getUserStats(): Promise<UserStats | null> {
    try {
      const data = await AsyncStorage.getItem(USER_STATS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[OfflineStorage] Failed to get user stats:', error);
      return null;
    }
  }

  /**
   * Queue a failed request for retry when online
   */
  async queueFailedRequest(request: Omit<FailedRequest, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const failedRequest: FailedRequest = {
        ...request,
        id: `${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const existingData = await AsyncStorage.getItem(FAILED_REQUESTS_KEY);
      const existingRequests: FailedRequest[] = existingData ? JSON.parse(existingData) : [];

      existingRequests.push(failedRequest);
      await AsyncStorage.setItem(FAILED_REQUESTS_KEY, JSON.stringify(existingRequests));

      console.log('[OfflineStorage] Queued failed request:', failedRequest.type);
    } catch (error) {
      console.error('[OfflineStorage] Failed to queue request:', error);
    }
  }

  /**
   * Get all queued failed requests
   */
  async getFailedRequests(): Promise<FailedRequest[]> {
    try {
      const data = await AsyncStorage.getItem(FAILED_REQUESTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[OfflineStorage] Failed to get failed requests:', error);
      return [];
    }
  }

  /**
   * Remove a failed request from the queue
   */
  async removeFailedRequest(requestId: string): Promise<void> {
    try {
      const existingData = await AsyncStorage.getItem(FAILED_REQUESTS_KEY);
      const existingRequests: FailedRequest[] = existingData ? JSON.parse(existingData) : [];

      const updatedRequests = existingRequests.filter(req => req.id !== requestId);
      await AsyncStorage.setItem(FAILED_REQUESTS_KEY, JSON.stringify(updatedRequests));
    } catch (error) {
      console.error('[OfflineStorage] Failed to remove failed request:', error);
    }
  }

  /**
   * Process all queued failed requests
   * This is called automatically when network is restored
   */
  async processFailedRequests(): Promise<void> {
    if (!this.isOnline) {
      console.log('[OfflineStorage] Device is offline, skipping request processing');
      return;
    }

    try {
      const failedRequests = await this.getFailedRequests();

      if (failedRequests.length === 0) {
        return;
      }

      console.log(`[OfflineStorage] Processing ${failedRequests.length} failed requests`);

      // Import LeadService dynamically to avoid circular dependency
      const LeadService = (await import('./LeadService')).default;
      const FollowUpService = (await import('./FollowUpService')).default;

      for (const request of failedRequests) {
        try {
          switch (request.type) {
            case 'update_lead':
              await LeadService.updateLead(request.leadId, request.data, false);
              break;
            case 'log_call':
              await LeadService.logCall(request.leadId, request.data);
              break;
            case 'create_followup':
              await FollowUpService.createFollowUp(request.leadId, request.data);
              break;
            // Add more cases as needed
          }

          // Remove successfully processed request
          await this.removeFailedRequest(request.id);
          console.log(`[OfflineStorage] Successfully processed request: ${request.type}`);
        } catch (error) {
          console.error(`[OfflineStorage] Failed to process request ${request.id}:`, error);

          // Increment retry count
          request.retryCount++;

          // Remove if max retries exceeded (e.g., 3 retries)
          if (request.retryCount >= 3) {
            console.log(`[OfflineStorage] Max retries exceeded for request ${request.id}, removing`);
            await this.removeFailedRequest(request.id);
          }
        }
      }
    } catch (error) {
      console.error('[OfflineStorage] Error processing failed requests:', error);
    }
  }

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        LEADS_STORAGE_KEY,
        USER_PROFILE_KEY,
        USER_STATS_KEY,
        FAILED_REQUESTS_KEY,
      ]);

      // Clear all lead detail entries
      const allKeys = await AsyncStorage.getAllKeys();
      const leadDetailKeys = allKeys.filter(key => key.startsWith(LEAD_DETAILS_STORAGE_KEY));
      if (leadDetailKeys.length > 0) {
        await AsyncStorage.multiRemove(leadDetailKeys);
      }

      console.log('[OfflineStorage] Cleared all offline data');
    } catch (error) {
      console.error('[OfflineStorage] Failed to clear offline data:', error);
    }
  }
}

export default new OfflineStorageService();
