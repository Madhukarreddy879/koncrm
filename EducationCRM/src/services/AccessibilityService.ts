import { NativeModules, Platform, NativeEventEmitter } from 'react-native';

const { AccessibilityModule } = NativeModules;

export interface AccessibilityStatus {
  isEnabled: boolean;
  isRunning: boolean;
  autoRecordEnabled: boolean;
  audioSource: string;
}

/**
 * AccessibilityService - Manages the Accessibility Service for call recording
 * This service enables automatic call recording by keeping the app alive during calls
 */
class AccessibilityService {
  /**
   * Check if the accessibility service is enabled in system settings
   */
  async isAccessibilityServiceEnabled(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      return await AccessibilityModule.isAccessibilityServiceEnabled();
    } catch (error) {
      console.error('[AccessibilityService] Error checking service status:', error);
      return false;
    }
  }

  /**
   * Check if the accessibility service is currently running
   */
  async isServiceRunning(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      return await AccessibilityModule.isServiceRunning();
    } catch (error) {
      console.error('[AccessibilityService] Error checking if service is running:', error);
      return false;
    }
  }

  /**
   * Open Android accessibility settings to enable the service
   */
  async openAccessibilitySettings(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      return await AccessibilityModule.openAccessibilitySettings();
    } catch (error) {
      console.error('[AccessibilityService] Error opening settings:', error);
      return false;
    }
  }

  /**
   * Enable or disable auto-recording
   */
  async setAutoRecordEnabled(enabled: boolean): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      return await AccessibilityModule.setAutoRecordEnabled(enabled);
    } catch (error) {
      console.error('[AccessibilityService] Error setting auto-record:', error);
      return false;
    }
  }

  /**
   * Check if auto-recording is enabled
   */
  async isAutoRecordEnabled(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      return await AccessibilityModule.isAutoRecordEnabled();
    } catch (error) {
      console.error('[AccessibilityService] Error checking auto-record:', error);
      return true;
    }
  }

  /**
   * Get the audio source used for the last recording
   */
  async getUsedAudioSource(): Promise<string> {
    if (Platform.OS !== 'android') {
      return 'N/A';
    }

    try {
      return await AccessibilityModule.getUsedAudioSource();
    } catch (error) {
      console.error('[AccessibilityService] Error getting audio source:', error);
      return 'UNKNOWN';
    }
  }

  /**
   * Get the path of the last recording made by the accessibility service
   */
  async getLastRecordingPath(): Promise<string | null> {
    if (Platform.OS !== 'android') {
      return null;
    }

    try {
      return await AccessibilityModule.getLastRecordingPath();
    } catch (error) {
      console.error('[AccessibilityService] Error getting last recording path:', error);
      return null;
    }
  }

  /**
   * Get full accessibility status
   */
  async getStatus(): Promise<AccessibilityStatus> {
    const [isEnabled, isRunning, autoRecordEnabled, audioSource] = await Promise.all([
      this.isAccessibilityServiceEnabled(),
      this.isServiceRunning(),
      this.isAutoRecordEnabled(),
      this.getUsedAudioSource(),
    ]);

    return {
      isEnabled,
      isRunning,
      autoRecordEnabled,
      audioSource,
    };
  }
}

export default new AccessibilityService();
