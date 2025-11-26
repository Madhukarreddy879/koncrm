/**
 * AudioPlayerService - Handles audio playback functionality
 * Uses react-native-audio-api for playback with Web Audio API compatibility
 */

import { AudioContext, AudioBufferSourceNode } from 'react-native-audio-api';
import ReactNativeBlobUtil from 'react-native-blob-util';
import ErrorMessageService from './ErrorMessageService';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

class AudioPlayerService {
  private audioContext: AudioContext | null = null;
  private audioBufferSource: AudioBufferSourceNode | null = null;
  private audioBuffer: any = null; // AudioBuffer type
  private currentUrl: string | null = null;
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
  };
  private stateListeners: Array<(state: PlaybackState) => void> = [];
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private cachedFiles: Map<string, string> = new Map(); // URL -> local file path

  /**
   * Initialize audio context
   */
  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      console.log('[AudioPlayer] AudioContext initialized');
    }
  }

  /**
   * Load an audio file for playback
   * @param url - URL or local path to audio file
   * @returns Promise that resolves when audio is loaded
   */
  async load(url: string): Promise<void> {
    try {
      // Stop current playback if any
      await this.stop();

      this.updateState({ isLoading: true, error: null });
      this.currentUrl = url;

      // Initialize audio context
      this.initAudioContext();

      console.log('[AudioPlayer] Loading audio from:', url);

      // Check if file is already cached
      let filePath = this.cachedFiles.get(url);

      if (!filePath) {
        // Download and cache the file
        filePath = await this.downloadAndCacheFile(url);
      }

      // Read file as array buffer
      const base64Data = await ReactNativeBlobUtil.fs.readFile(filePath, 'base64');
      const arrayBuffer = this.base64ToArrayBuffer(base64Data);

      // Decode audio data
      console.log('[AudioPlayer] Decoding audio data...');
      this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

      const duration = this.audioBuffer.duration;

      this.updateState({
        isLoading: false,
        duration,
        currentTime: 0,
      });

      console.log('[AudioPlayer] Audio loaded successfully, duration:', duration);
    } catch (error) {
      console.error('[AudioPlayer] Failed to load audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load audio';
      this.updateState({
        isLoading: false,
        error: errorMessage,
      });
      
      // Show user-friendly error message
      ErrorMessageService.handleError(error, true);
      
      throw error;
    }
  }

  /**
   * Download and cache audio file
   * @param url - URL to download from
   * @returns Local file path
   */
  private async downloadAndCacheFile(url: string): Promise<string> {
    try {
      console.log('[AudioPlayer] Downloading file from:', url);

      // Get auth token from AsyncStorage
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const token = await AsyncStorage.getItem('@education_crm_token');

      const fileName = `recording_${Date.now()}.aac`;
      const filePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;

      // Download with auth header
      await ReactNativeBlobUtil.config({
        path: filePath,
        fileCache: true,
      }).fetch('GET', url, {
        Authorization: token ? `Bearer ${token}` : '',
      });

      // Cache the file path
      this.cachedFiles.set(url, filePath);

      console.log('[AudioPlayer] File downloaded and cached:', filePath);
      return filePath;
    } catch (error) {
      console.error('[AudioPlayer] Failed to download file:', error);
      
      // Show user-friendly error message
      ErrorMessageService.handleError(error, true);
      
      throw error;
    }
  }

  /**
   * Convert base64 to ArrayBuffer
   * @param base64 - Base64 encoded string
   * @returns ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Use react-native-blob-util's base64 decoding
    const decoded = ReactNativeBlobUtil.base64.decode(base64);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Start or resume playback
   * @returns Promise that resolves when playback starts
   */
  async play(): Promise<void> {
    try {
      if (!this.audioBuffer) {
        throw new Error('No audio loaded');
      }

      if (this.playbackState.isPlaying) {
        console.log('[AudioPlayer] Already playing');
        return;
      }

      // Create new buffer source
      this.audioBufferSource = this.audioContext!.createBufferSource();
      this.audioBufferSource.buffer = this.audioBuffer;
      this.audioBufferSource.connect(this.audioContext!.destination);

      // Set up ended event (using onEnded for react-native-audio-api)
      this.audioBufferSource.onEnded = () => {
        console.log('[AudioPlayer] Playback ended');
        void this.stop();
      };

      // Start playback from current position
      const offset = this.pausedAt || 0;
      this.audioBufferSource.start(this.audioContext!.currentTime, offset);
      this.startTime = this.audioContext!.currentTime - offset;

      this.updateState({ isPlaying: true });

      // Start update interval to track current time
      this.startUpdateInterval();

      console.log('[AudioPlayer] Playback started from:', offset);
    } catch (error) {
      console.error('[AudioPlayer] Failed to start playback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to play audio';
      this.updateState({ error: errorMessage });
      
      // Show user-friendly error message
      ErrorMessageService.handleError(error, true);
      
      throw error;
    }
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    try {
      if (!this.playbackState.isPlaying) {
        return;
      }

      // Stop the buffer source
      if (this.audioBufferSource) {
        this.audioBufferSource.stop();
        this.audioBufferSource.disconnect();
        this.audioBufferSource = null;
      }

      // Save current position
      this.pausedAt = this.audioContext!.currentTime - this.startTime;

      this.updateState({ 
        isPlaying: false,
        currentTime: this.pausedAt
      });
      this.stopUpdateInterval();

      console.log('[AudioPlayer] Playback paused at:', this.pausedAt);
    } catch (error) {
      console.error('[AudioPlayer] Failed to pause playback:', error);
    }
  }

  /**
   * Stop playback and reset position
   */
  async stop(): Promise<void> {
    try {
      if (this.audioBufferSource) {
        try {
          this.audioBufferSource.stop();
          this.audioBufferSource.disconnect();
        } catch (e) {
          // Ignore errors if already stopped
        }
        this.audioBufferSource = null;
      }

      this.stopUpdateInterval();
      this.pausedAt = 0;
      this.startTime = 0;

      this.updateState({
        isPlaying: false,
        currentTime: 0,
      });

      console.log('[AudioPlayer] Playback stopped');
    } catch (error) {
      console.error('[AudioPlayer] Failed to stop playback:', error);
    }
  }

  /**
   * Seek to a specific position
   * @param time - Time in seconds
   */
  async seek(time: number): Promise<void> {
    try {
      const wasPlaying = this.playbackState.isPlaying;

      // Stop current playback
      if (this.audioBufferSource) {
        this.audioBufferSource.stop();
        this.audioBufferSource.disconnect();
        this.audioBufferSource = null;
      }

      // Update paused position
      this.pausedAt = Math.max(0, Math.min(time, this.playbackState.duration));
      this.updateState({ currentTime: this.pausedAt });

      // Resume if was playing
      if (wasPlaying) {
        await this.play();
      }

      console.log('[AudioPlayer] Seeked to:', this.pausedAt);
    } catch (error) {
      console.error('[AudioPlayer] Failed to seek:', error);
    }
  }

  /**
   * Get current playback state
   * @returns Current playback state
   */
  getState(): PlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Subscribe to playback state changes
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: PlaybackState) => void): () => void {
    this.stateListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.stateListeners.indexOf(listener);
      if (index > -1) {
        this.stateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Update playback state and notify listeners
   * @param updates - Partial state updates
   */
  private updateState(updates: Partial<PlaybackState>): void {
    this.playbackState = {
      ...this.playbackState,
      ...updates,
    };

    // Notify all listeners
    this.stateListeners.forEach(listener => {
      listener(this.playbackState);
    });
  }

  /**
   * Start interval to update current time
   */
  private startUpdateInterval(): void {
    this.stopUpdateInterval();

    this.updateInterval = setInterval(() => {
      if (this.playbackState.isPlaying && this.audioContext) {
        const currentTime = this.audioContext.currentTime - this.startTime;

        // Check if reached end
        if (currentTime >= this.playbackState.duration) {
          void this.stop();
        } else {
          this.updateState({ currentTime });
        }
      }
    }, 100) as ReturnType<typeof setInterval>; // Update every 100ms
  }

  /**
   * Stop update interval
   */
  private stopUpdateInterval(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Clear cached files
   */
  async clearCache(): Promise<void> {
    try {
      for (const filePath of this.cachedFiles.values()) {
        await ReactNativeBlobUtil.fs.unlink(filePath).catch(() => {
          // Ignore errors if file doesn't exist
        });
      }
      this.cachedFiles.clear();
      console.log('[AudioPlayer] Cache cleared');
    } catch (error) {
      console.error('[AudioPlayer] Failed to clear cache:', error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    this.stateListeners = [];
    this.currentUrl = null;
    this.audioBuffer = null;

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    console.log('[AudioPlayer] Cleanup complete');
  }
}

// Export singleton instance
export default new AudioPlayerService();
