import { Platform, NativeModules } from 'react-native';
import RNFS from 'react-native-blob-util';
import SettingsService from './SettingsService';

const { AudioRecorderModule } = NativeModules;

/**
 * RecordingMetadata - Information about a completed recording
 */
export interface RecordingMetadata {
  filePath: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  timestamp: number; // Unix timestamp
}

/**
 * RecordingService - Handles audio recording functionality
 * Uses react-native-audio-api for recording with AAC compression
 */
class RecordingService {
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private currentRecordingPath: string | null = null;

  /**
   * Generates a unique file path for storing recordings
   * @returns Full path to the recording file in cache directory
   */
  private generateRecordingPath(): string {
    const timestamp = Date.now();
    const filename = `recording_${timestamp}.m4a`;
    const cacheDir =
      Platform.OS === 'android'
        ? RNFS.fs.dirs.CacheDir
        : RNFS.fs.dirs.DocumentDir;
    return `${cacheDir}/${filename}`;
  }



  /**
   * Starts audio recording
   * Configures audio format based on user settings (AAC, configurable bitrate, mono)
   * @returns Promise that resolves to the recording file path
   */
  async startRecording(): Promise<string> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    try {
      // Generate file path for this recording
      this.currentRecordingPath = this.generateRecordingPath();

      // Get recording quality settings
      const qualityConfig = SettingsService.getRecordingQualityConfig();
      console.log('Recording with quality config:', qualityConfig);

      // Start recording using native module
      await AudioRecorderModule.startRecording(
        this.currentRecordingPath,
        qualityConfig.sampleRate,
        qualityConfig.bitrate
      );

      // Track recording state
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      console.log('Recording started:', this.currentRecordingPath);

      return this.currentRecordingPath;
    } catch (error) {
      this.isRecording = false;
      this.currentRecordingPath = null;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to start recording: ${errorMessage}`);
    }
  }

  /**
   * Stops the current recording and returns metadata
   * @returns Promise that resolves to recording metadata
   */
  async stopRecording(): Promise<RecordingMetadata> {
    if (!this.isRecording || !this.currentRecordingPath) {
      throw new Error('No recording in progress');
    }

    try {
      // Stop recording using native module
      const result = await AudioRecorderModule.stopRecording();

      const metadata: RecordingMetadata = {
        filePath: result.filePath,
        duration: result.duration,
        fileSize: result.fileSize,
        timestamp: result.timestamp,
      };

      // Reset state
      this.isRecording = false;
      this.currentRecordingPath = null;
      this.recordingStartTime = 0;

      console.log('Recording stopped:', metadata);

      return metadata;
    } catch (error) {
      // Reset state even on error
      this.isRecording = false;
      this.currentRecordingPath = null;
      this.recordingStartTime = 0;

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to stop recording: ${errorMessage}`);
    }
  }

  /**
   * Cancels the current recording and deletes the file
   */
  async cancelRecording(): Promise<void> {
    if (!this.isRecording || !this.currentRecordingPath) {
      return;
    }

    try {
      // Cancel recording using native module (stops and deletes file)
      await AudioRecorderModule.cancelRecording();

      // Reset state
      this.isRecording = false;
      this.currentRecordingPath = null;
      this.recordingStartTime = 0;

      console.log('Recording cancelled');
    } catch (error) {
      console.error('Error cancelling recording:', error);
      // Reset state anyway
      this.isRecording = false;
      this.currentRecordingPath = null;
      this.recordingStartTime = 0;
    }
  }

  /**
   * Checks if a recording is currently in progress
   * @returns True if recording, false otherwise
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Gets the current recording duration in seconds
   * @returns Duration in seconds, or 0 if not recording
   */
  getCurrentDuration(): number {
    if (!this.isRecording) {
      return 0;
    }
    return (Date.now() - this.recordingStartTime) / 1000;
  }

  /**
   * Deletes a recording file
   * @param filePath - Path to the recording file to delete
   */
  async deleteRecording(filePath: string): Promise<void> {
    try {
      if (await RNFS.fs.exists(filePath)) {
        await RNFS.fs.unlink(filePath);
        console.log('Recording deleted:', filePath);
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new RecordingService();
