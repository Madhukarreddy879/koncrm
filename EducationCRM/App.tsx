/**
 * Education CRM Mobile App
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Config from 'react-native-config';
import AppNavigator from './src/navigation/AppNavigator';
import SettingsService from './src/services/SettingsService';
import RecordingCacheService from './src/services/RecordingCacheService';
import UploadQueueService from './src/services/UploadQueueService';
import OfflineStorageService from './src/services/OfflineStorageService';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    // Log environment configuration
    console.log('[App] Environment Configuration:', {
      API_BASE_URL: Config.API_BASE_URL,
    });

    // Initialize services on app startup
    const initializeServices = async () => {
      try {
        await SettingsService.initialize();
        await RecordingCacheService.initialize();
        await UploadQueueService.initialize();
        await OfflineStorageService.initialize();
        console.log('[App] Services initialized successfully');
      } catch (error) {
        console.error('[App] Failed to initialize services:', error);
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      UploadQueueService.cleanup();
      OfflineStorageService.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
