import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * RecordingQuality - Available recording quality options
 */
export type RecordingQuality = 'low' | 'medium' | 'high';

/**
 * RecordingQualityConfig - Configuration for each quality level
 */
export interface RecordingQualityConfig {
  bitrate: number; // in kbps
  sampleRate: number; // in Hz
  channels: number; // 1 for mono, 2 for stereo
  label: string;
  description: string;
}

/**
 * AppSettings - Application settings
 */
export interface AppSettings {
  recordingQuality: RecordingQuality;
  autoRecording: boolean;
  cacheRecordings: boolean;
}

const SETTINGS_STORAGE_KEY = '@app_settings';

const QUALITY_CONFIGS: Record<RecordingQuality, RecordingQualityConfig> = {
  low: {
    bitrate: 32,
    sampleRate: 22050,
    channels: 1,
    label: 'Low Quality',
    description: 'Smaller file size, suitable for voice (32 kbps)',
  },
  medium: {
    bitrate: 64,
    sampleRate: 44100,
    channels: 1,
    label: 'Medium Quality',
    description: 'Balanced quality and size (64 kbps)',
  },
  high: {
    bitrate: 128,
    sampleRate: 44100,
    channels: 1,
    label: 'High Quality',
    description: 'Best quality, larger file size (128 kbps)',
  },
};

const DEFAULT_SETTINGS: AppSettings = {
  recordingQuality: 'medium',
  autoRecording: true,
  cacheRecordings: true,
};

/**
 * SettingsService - Manages application settings
 */
class SettingsService {
  private settings: AppSettings = DEFAULT_SETTINGS;
  private listeners: Array<(settings: AppSettings) => void> = [];

  /**
   * Initialize settings service
   */
  async initialize(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (settingsJson) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) };
      }
      console.log('[Settings] Initialized with settings:', this.settings);
    } catch (error) {
      console.error('[Settings] Failed to initialize:', error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  /**
   * Get current settings
   * @returns Current app settings
   */
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Get recording quality configuration
   * @param quality - Quality level (optional, uses current setting if not provided)
   * @returns Quality configuration
   */
  getRecordingQualityConfig(quality?: RecordingQuality): RecordingQualityConfig {
    const qualityLevel = quality || this.settings.recordingQuality;
    return QUALITY_CONFIGS[qualityLevel];
  }

  /**
   * Get all available quality options
   * @returns Array of quality options with configs
   */
  getQualityOptions(): Array<{ value: RecordingQuality; config: RecordingQualityConfig }> {
    return Object.entries(QUALITY_CONFIGS).map(([value, config]) => ({
      value: value as RecordingQuality,
      config,
    }));
  }

  /**
   * Update recording quality setting
   * @param quality - New quality level
   */
  async setRecordingQuality(quality: RecordingQuality): Promise<void> {
    try {
      this.settings.recordingQuality = quality;
      await this.saveSettings();
      this.notifyListeners();
      console.log('[Settings] Recording quality updated:', quality);
    } catch (error) {
      console.error('[Settings] Failed to update recording quality:', error);
    }
  }

  /**
   * Update auto recording setting
   * @param enabled - Whether auto recording is enabled
   */
  async setAutoRecording(enabled: boolean): Promise<void> {
    try {
      this.settings.autoRecording = enabled;
      await this.saveSettings();
      this.notifyListeners();
      console.log('[Settings] Auto recording updated:', enabled);
    } catch (error) {
      console.error('[Settings] Failed to update auto recording:', error);
    }
  }

  /**
   * Update cache recordings setting
   * @param enabled - Whether caching is enabled
   */
  async setCacheRecordings(enabled: boolean): Promise<void> {
    try {
      this.settings.cacheRecordings = enabled;
      await this.saveSettings();
      this.notifyListeners();
      console.log('[Settings] Cache recordings updated:', enabled);
    } catch (error) {
      console.error('[Settings] Failed to update cache recordings:', error);
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<void> {
    try {
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings();
      this.notifyListeners();
      console.log('[Settings] Settings reset to defaults');
    } catch (error) {
      console.error('[Settings] Failed to reset settings:', error);
    }
  }

  /**
   * Subscribe to settings changes
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Save settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('[Settings] Failed to save settings:', error);
    }
  }

  /**
   * Notify all listeners of settings changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.settings);
    });
  }
}

// Export singleton instance
export default new SettingsService();
