/**
 * CacheService - In-memory caching for lead data
 * Provides optimistic UI updates and reduces API calls
 */

import { Lead, LeadDetail } from './LeadService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheService {
  private leadListCache: Map<string, CacheEntry<Lead[]>> = new Map();
  private leadDetailCache: Map<string, CacheEntry<LeadDetail>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Cache lead list data
   * @param key - Cache key (e.g., "leads_status_new_page_1")
   * @param data - Lead list data
   * @param ttl - Time to live in milliseconds (default: 5 minutes)
   */
  cacheLeadList(key: string, data: Lead[], ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now();
    this.leadListCache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * Get cached lead list data
   * @param key - Cache key
   * @returns Cached lead list or null if not found/expired
   */
  getLeadList(key: string): Lead[] | null {
    const entry = this.leadListCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.leadListCache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache lead detail data
   * @param leadId - Lead ID
   * @param data - Lead detail data
   * @param ttl - Time to live in milliseconds (default: 5 minutes)
   */
  cacheLeadDetail(leadId: string, data: LeadDetail, ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now();
    this.leadDetailCache.set(leadId, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * Get cached lead detail data
   * @param leadId - Lead ID
   * @returns Cached lead detail or null if not found/expired
   */
  getLeadDetail(leadId: string): LeadDetail | null {
    const entry = this.leadDetailCache.get(leadId);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.leadDetailCache.delete(leadId);
      return null;
    }

    return entry.data;
  }

  /**
   * Update a lead in the cache optimistically
   * @param leadId - Lead ID
   * @param updates - Partial lead updates
   */
  updateLeadOptimistically(leadId: string, updates: Partial<Lead>): void {
    // Update in lead detail cache
    const detailEntry = this.leadDetailCache.get(leadId);
    if (detailEntry) {
      this.leadDetailCache.set(leadId, {
        ...detailEntry,
        data: {
          ...detailEntry.data,
          ...updates,
        },
      });
    }

    // Update in all lead list caches
    this.leadListCache.forEach((entry, key) => {
      const updatedData = entry.data.map(lead =>
        lead.id === leadId ? { ...lead, ...updates } : lead
      );
      this.leadListCache.set(key, {
        ...entry,
        data: updatedData,
      });
    });
  }

  /**
   * Invalidate lead detail cache
   * @param leadId - Lead ID
   */
  invalidateLeadDetail(leadId: string): void {
    this.leadDetailCache.delete(leadId);
  }

  /**
   * Invalidate all lead list caches
   */
  invalidateLeadLists(): void {
    this.leadListCache.clear();
  }

  /**
   * Invalidate all caches
   */
  invalidateAll(): void {
    this.leadListCache.clear();
    this.leadDetailCache.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    const now = Date.now();

    // Clear expired lead lists
    this.leadListCache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.leadListCache.delete(key);
      }
    });

    // Clear expired lead details
    this.leadDetailCache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.leadDetailCache.delete(key);
      }
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    leadListCacheSize: number;
    leadDetailCacheSize: number;
  } {
    return {
      leadListCacheSize: this.leadListCache.size,
      leadDetailCacheSize: this.leadDetailCache.size,
    };
  }
}

export default new CacheService();
