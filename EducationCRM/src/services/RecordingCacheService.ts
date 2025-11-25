import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';

/**
 * CachedRecording - Represents a cached recording
 */
export interface CachedRecording {
  recordingId: string;
  leadId: string;
  localPath: string;
  remoteUrl: string;
  fileSize: number;
  cachedAt: number;
  lastAccessedAt: number;
}

const CACHE_STORAGE_KEY = '@recording_cache';
const CACHE_DIR_NAME = 'recording_cache';
const MAX_CACHE_SIZE_MB = 100; // Maximum cache size in MB
const MAX_CACHE_AGE_DAYS = 30; // Maximum age of cached recordings

/**
 * RecordingCacheService - Manages local caching of recordings for offline playback
 */
class RecordingCacheService {
  private cacheDir: string = '';

  /**
   * Initialize the cache service
   */
  async initialize(): Promise<void> {
    try {
      // Set up cache directory
      const baseDir = ReactNativeBlobUtil.fs.dirs.CacheDir;
      this.cacheDir = `${baseDir}/${CACHE_DIR_NAME}`;

      // Create cache directory if it doesn't exist
      const exists = await ReactNativeBlobUtil.fs.exists(this.cacheDir);
      if (!exists) {
        await ReactNativeBlobUtil.fs.mkdir(this.cacheDir);
      }

      console.log('[RecordingCache] Initialized with cache dir:', this.cacheDir);

      // Clean up old cache entries
      await this.cleanupOldCache();
    } catch (error) {
      console.error('[RecordingCache] Failed to initialize:', error);
    }
  }

  /**
   * Cache a recording for offline playback
   * @param recordingId - Recording ID
   * @param leadId - Lead ID
   * @param remoteUrl - Remote URL of the recording
   * @returns Promise that resolves to the local file path
   */
  async cacheRecording(
    recordingId: string,
    leadId: string,
    remoteUrl: string
  ): Promise<string> {
    try {
      // Check if already cached
      const cached = await this.getCachedRecording(recordingId);
      if (cached) {
        // Update last accessed time
        await this.updateLastAccessed(recordingId);
        return cached.localPath;
      }

      // Download the recording
      const localPath = `${this.cacheDir}/${recordingId}.aac`;
      console.log('[RecordingCache] Downloading recording:', remoteUrl);

      const response = await ReactNativeBlobUtil.config({
        path: localPath,
      }).fetch('GET', remoteUrl);

      // Get file size
      const stat = await ReactNativeBlobUtil.fs.stat(localPath);
      const fileSize = stat.size;

      // Save to cache index
      const cachedRecording: CachedRecording = {
        recordingId,
        leadId,
        localPath,
        remoteUrl,
        fileSize,
        cachedAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      await this.addToCacheIndex(cachedRecording);

      console.log('[RecordingCache] Recording cached:', recordingId);

      // Check cache size and cleanup if needed
      await this.enforceCacheSize();

      return localPath;
    } catch (error) {
      console.error('[RecordingCache] Failed to cache recording:', error);
      throw error;
    }
  }

  /**
   * Get a cached recording
   * @param recordingId - Recording ID
   * @returns Promise with cached recording or null
   */
  async getCachedRecording(recordingId: string): Promise<CachedRecording | null> {
    try {
      const cache = await this.getCacheIndex();
      const cached = cache.find(item => item.recordingId === recordingId);

      if (!cached) {
        return null;
      }

      // Check if file still exists
      const exists = await ReactNativeBlobUtil.fs.exists(cached.localPath);
      if (!exists) {
        // Remove from cache index
        await this.removeFromCacheIndex(recordingId);
        return null;
      }

      return cached;
    } catch (error) {
      console.error('[RecordingCache] Failed to get cached recording:', error);
      return null;
    }
  }

  /**
   * Delete a cached recording
   * @param recordingId - Recording ID
   */
  async deleteCachedRecording(recordingId: string): Promise<void> {
    try {
      const cached = await this.getCachedRecording(recordingId);
      if (!cached) {
        return;
      }

      // Delete file
      const exists = await ReactNativeBlobUtil.fs.exists(cached.localPath);
      if (exists) {
        await ReactNativeBlobUtil.fs.unlink(cached.localPath);
      }

      // Remove from cache index
      await this.removeFromCacheIndex(recordingId);

      console.log('[RecordingCache] Deleted cached recording:', recordingId);
    } catch (error) {
      console.error('[RecordingCache] Failed to delete cached recording:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns Promise with cache stats
   */
  async getCacheStats(): Promise<{
    totalFiles: number;
    totalSizeMB: number;
    oldestCacheDate: number | null;
  }> {
    try {
      const cache = await this.getCacheIndex();

      const totalSizeBytes = cache.reduce((sum, item) => sum + item.fileSize, 0);
      const totalSizeMB = totalSizeBytes / (1024 * 1024);

      const oldestCacheDate = cache.length > 0
        ? Math.min(...cache.map(item => item.cachedAt))
        : null;

      return {
        totalFiles: cache.length,
        totalSizeMB,
        oldestCacheDate,
      };
    } catch (error) {
      console.error('[RecordingCache] Failed to get cache stats:', error);
      return {
        totalFiles: 0,
        totalSizeMB: 0,
        oldestCacheDate: null,
      };
    }
  }

  /**
   * Clear all cached recordings
   */
  async clearCache(): Promise<void> {
    try {
      const cache = await this.getCacheIndex();

      // Delete all files
      for (const item of cache) {
        const exists = await ReactNativeBlobUtil.fs.exists(item.localPath);
        if (exists) {
          await ReactNativeBlobUtil.fs.unlink(item.localPath);
        }
      }

      // Clear cache index
      await AsyncStorage.removeItem(CACHE_STORAGE_KEY);

      console.log('[RecordingCache] Cache cleared');
    } catch (error) {
      console.error('[RecordingCache] Failed to clear cache:', error);
    }
  }

  /**
   * Get cache index from storage
   * @returns Promise with array of cached recordings
   */
  private async getCacheIndex(): Promise<CachedRecording[]> {
    try {
      const cacheJson = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
      if (!cacheJson) {
        return [];
      }
      return JSON.parse(cacheJson);
    } catch (error) {
      console.error('[RecordingCache] Failed to get cache index:', error);
      return [];
    }
  }

  /**
   * Save cache index to storage
   * @param cache - Array of cached recordings
   */
  private async saveCacheIndex(cache: CachedRecording[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('[RecordingCache] Failed to save cache index:', error);
    }
  }

  /**
   * Add a recording to the cache index
   * @param recording - Cached recording to add
   */
  private async addToCacheIndex(recording: CachedRecording): Promise<void> {
    try {
      const cache = await this.getCacheIndex();
      cache.push(recording);
      await this.saveCacheIndex(cache);
    } catch (error) {
      console.error('[RecordingCache] Failed to add to cache index:', error);
    }
  }

  /**
   * Remove a recording from the cache index
   * @param recordingId - Recording ID to remove
   */
  private async removeFromCacheIndex(recordingId: string): Promise<void> {
    try {
      const cache = await this.getCacheIndex();
      const filteredCache = cache.filter(item => item.recordingId !== recordingId);
      await this.saveCacheIndex(filteredCache);
    } catch (error) {
      console.error('[RecordingCache] Failed to remove from cache index:', error);
    }
  }

  /**
   * Update last accessed time for a cached recording
   * @param recordingId - Recording ID
   */
  private async updateLastAccessed(recordingId: string): Promise<void> {
    try {
      const cache = await this.getCacheIndex();
      const index = cache.findIndex(item => item.recordingId === recordingId);
      if (index !== -1) {
        cache[index].lastAccessedAt = Date.now();
        await this.saveCacheIndex(cache);
      }
    } catch (error) {
      console.error('[RecordingCache] Failed to update last accessed:', error);
    }
  }

  /**
   * Enforce cache size limit by removing least recently accessed files
   */
  private async enforceCacheSize(): Promise<void> {
    try {
      const cache = await this.getCacheIndex();
      const stats = await this.getCacheStats();

      if (stats.totalSizeMB <= MAX_CACHE_SIZE_MB) {
        return;
      }

      console.log('[RecordingCache] Cache size exceeded, cleaning up...');

      // Sort by last accessed time (oldest first)
      const sortedCache = [...cache].sort(
        (a, b) => a.lastAccessedAt - b.lastAccessedAt
      );

      // Remove oldest files until under limit
      let currentSizeMB = stats.totalSizeMB;
      for (const item of sortedCache) {
        if (currentSizeMB <= MAX_CACHE_SIZE_MB) {
          break;
        }

        await this.deleteCachedRecording(item.recordingId);
        currentSizeMB -= item.fileSize / (1024 * 1024);
      }

      console.log('[RecordingCache] Cache cleanup complete');
    } catch (error) {
      console.error('[RecordingCache] Failed to enforce cache size:', error);
    }
  }

  /**
   * Clean up old cache entries
   */
  private async cleanupOldCache(): Promise<void> {
    try {
      const cache = await this.getCacheIndex();
      const now = Date.now();
      const maxAge = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;

      for (const item of cache) {
        const age = now - item.cachedAt;
        if (age > maxAge) {
          await this.deleteCachedRecording(item.recordingId);
        }
      }
    } catch (error) {
      console.error('[RecordingCache] Failed to cleanup old cache:', error);
    }
  }
}

// Export singleton instance
export default new RecordingCacheService();
