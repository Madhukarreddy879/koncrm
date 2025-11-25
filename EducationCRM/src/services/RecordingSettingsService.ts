import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * RecordingSettings - User preferences for call recording
 */
export interface RecordingSettings {
  autoRecordEnabled: boolean;
  showAndroid10Notice: boolean;
  recordingQuality: 'low' | 'medium' | 'high';
  speakerModeReminder: boolean;
}

const STORAGE_KEY = '@recording_settings';

const DEFAULT_SETTINGS: RecordingSettings = {
  autoRecordEnabled: true,
  showAndroid10Notice: true,
  recordingQuality: 'medium',
  speakerModeReminder: true,
};

/**
 * RecordingSettingsService - Manages user preferences for call recording
 * Handles settings persistence and retrieval
 */
class RecordingSettingsService {
  private cachedSettings: RecordingSettings | null = null;

  /**
   * Get current recording settings
   * @returns Promise with recording settings
   */
  async getSettings(): Promise<RecordingSettings> {
    // Return cached settings if available
    if (this.cachedSettings) {
      return this.cachedSettings;
    }

    try {
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEY);

      if (settingsJson) {
        const settings = JSON.parse(settingsJson) as RecordingSettings;
        this.cachedSettings = settings;
        return settings;
      }

      // Return default settings if none saved
      this.cachedSettings = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to load recording settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update recording settings
   * @param settings - Partial settings to update
   * @returns Promise that resolves when settings are saved
   */
  async updateSettings(
    settings: Partial<RecordingSettings>,
  ): Promise<RecordingSettings> {
    try {
      // Get current settings
      const currentSettings = await this.getSettings();

      // Merge with new settings
      const updatedSettings: RecordingSettings = {
        ...currentSettings,
        ...settings,
      };

      // Save to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));

      // Update cache
      this.cachedSettings = updatedSettings;

      return updatedSettings;
    } catch (error) {
      console.error('Failed to save recording settings:', error);
      throw error;
    }
  }

  /**
   * Check if auto-recording is enabled
   * @returns Promise with boolean indicating if auto-record is enabled
   */
  async isAutoRecordEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.autoRecordEnabled;
  }

  /**
   * Enable or disable auto-recording
   * @param enabled - Whether to enable auto-recording
   */
  async setAutoRecordEnabled(enabled: boolean): Promise<void> {
    await this.updateSettings({autoRecordEnabled: enabled});
  }

  /**
   * Check if Android 10+ notice should be shown
   * @returns Promise with boolean indicating if notice should be shown
   */
  async shouldShowAndroid10Notice(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.showAndroid10Notice;
  }

  /**
   * Dismiss Android 10+ notice (don't show again)
   */
  async dismissAndroid10Notice(): Promise<void> {
    await this.updateSettings({showAndroid10Notice: false});
  }

  /**
   * Get recording quality setting
   * @returns Promise with recording quality
   */
  async getRecordingQuality(): Promise<'low' | 'medium' | 'high'> {
    const settings = await this.getSettings();
    return settings.recordingQuality;
  }

  /**
   * Set recording quality
   * @param quality - Recording quality level
   */
  async setRecordingQuality(
    quality: 'low' | 'medium' | 'high',
  ): Promise<void> {
    await this.updateSettings({recordingQuality: quality});
  }

  /**
   * Check if speaker mode reminder is enabled
   * @returns Promise with boolean indicating if reminder is enabled
   */
  async isSpeakerModeReminderEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.speakerModeReminder;
  }

  /**
   * Enable or disable speaker mode reminder
   * @param enabled - Whether to enable reminder
   */
  async setSpeakerModeReminder(enabled: boolean): Promise<void> {
    await this.updateSettings({speakerModeReminder: enabled});
  }

  /**
   * Reset all settings to defaults
   */
  async resetSettings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      this.cachedSettings = null;
    } catch (error) {
      console.error('Failed to reset recording settings:', error);
      throw error;
    }
  }

  /**
   * Clear cached settings (force reload from storage)
   */
  clearCache(): void {
    this.cachedSettings = null;
  }
}

// Export singleton instance
export default new RecordingSettingsService();
