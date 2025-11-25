/**
 * AudioPlayerService - Handles audio playback functionality
 * Uses react-native-audio-api for playback with Web Audio API compatibility
 */

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

class AudioPlayerService {
  private audioPlayer: any = null; // Will hold the AudioPlayer instance
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

      // Note: In a real implementation with react-native-audio-api:
      // const audioContext = new AudioContext();
      // const response = await fetch(url);
      // const arrayBuffer = await response.arrayBuffer();
      // const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      // this.audioPlayer = audioContext.createBufferSource();
      // this.audioPlayer.buffer = audioBuffer;
      // this.audioPlayer.connect(audioContext.destination);

      // For now, simulate loading
      await new Promise<void>(resolve => setTimeout(resolve, 500));

      // Simulate getting duration (in real implementation, get from audioBuffer.duration)
      const duration = 120; // Mock duration in seconds

      this.updateState({
        isLoading: false,
        duration,
        currentTime: 0,
      });

      console.log('[AudioPlayer] Audio loaded:', url);
    } catch (error) {
      console.error('[AudioPlayer] Failed to load audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load audio';
      this.updateState({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Start or resume playback
   * @returns Promise that resolves when playback starts
   */
  async play(): Promise<void> {
    try {
      if (!this.currentUrl) {
        throw new Error('No audio loaded');
      }

      if (this.playbackState.isPlaying) {
        console.log('[AudioPlayer] Already playing');
        return;
      }

      // In real implementation:
      // this.audioPlayer.start(0, this.playbackState.currentTime);

      this.updateState({ isPlaying: true });

      // Start update interval to track current time
      this.startUpdateInterval();

      console.log('[AudioPlayer] Playback started');
    } catch (error) {
      console.error('[AudioPlayer] Failed to start playback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to play audio';
      this.updateState({ error: errorMessage });
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

      // In real implementation:
      // this.audioPlayer.stop();

      this.updateState({ isPlaying: false });
      this.stopUpdateInterval();

      console.log('[AudioPlayer] Playback paused');
    } catch (error) {
      console.error('[AudioPlayer] Failed to pause playback:', error);
    }
  }

  /**
   * Stop playback and reset position
   */
  async stop(): Promise<void> {
    try {
      if (this.audioPlayer) {
        // In real implementation:
        // this.audioPlayer.stop();
        // this.audioPlayer.disconnect();
        this.audioPlayer = null;
      }

      this.stopUpdateInterval();
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
      await this.stop();

      // Update current time
      this.updateState({ currentTime: time });

      // Resume if was playing
      if (wasPlaying) {
        await this.play();
      }

      console.log('[AudioPlayer] Seeked to:', time);
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
      if (this.playbackState.isPlaying) {
        const newTime = this.playbackState.currentTime + 0.1;

        // Check if reached end
        if (newTime >= this.playbackState.duration) {
          void this.stop();
        } else {
          this.updateState({ currentTime: newTime });
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
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    this.stateListeners = [];
    this.currentUrl = null;
  }
}

// Export singleton instance
export default new AudioPlayerService();
