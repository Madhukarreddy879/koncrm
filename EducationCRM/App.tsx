/**
 * Education CRM Mobile App
 * @format
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import SettingsService from './src/services/SettingsService';
import RecordingCacheService from './src/services/RecordingCacheService';
import UploadQueueService from './src/services/UploadQueueService';
import OfflineStorageService from './src/services/OfflineStorageService';
import PermissionService from './src/services/PermissionService';
import AccessibilityService from './src/services/AccessibilityService';
import AccessibilitySetupPrompt from './src/components/AccessibilitySetupPrompt';

const ACCESSIBILITY_PROMPT_DISMISSED_KEY = '@accessibility_prompt_dismissed';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [showAccessibilityPrompt, setShowAccessibilityPrompt] = useState(false);

  useEffect(() => {
    // Log environment configuration
    console.log('[App] Environment Configuration:', {
      API_BASE_URL: Config.API_BASE_URL,
    });

    // Initialize services on app startup
    const initializeServices = async () => {
      try {
        // Check and request permissions on app launch
        const permissions = await PermissionService.checkPermissions();
        
        if (!permissions.allGranted) {
          console.log('[App] Requesting missing permissions...');
          // Request phone state permission for accessibility service
          if (!permissions.phoneState) {
            await PermissionService.requestPermissionWithHandling('phoneState');
          }
        }
        
        await SettingsService.initialize();
        await RecordingCacheService.initialize();
        await UploadQueueService.initialize();
        await OfflineStorageService.initialize();
        console.log('[App] Services initialized successfully');

        // Check accessibility service status (Android only)
        if (Platform.OS === 'android') {
          await checkAccessibilityService();
        }
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

  const checkAccessibilityService = async () => {
    try {
      // Check if user has already dismissed the prompt
      const dismissed = await AsyncStorage.getItem(ACCESSIBILITY_PROMPT_DISMISSED_KEY);
      if (dismissed === 'true') {
        return;
      }

      // Check if accessibility service is enabled
      const isEnabled = await AccessibilityService.isAccessibilityServiceEnabled();
      if (!isEnabled) {
        // Show prompt after a short delay to let the app load
        setTimeout(() => {
          setShowAccessibilityPrompt(true);
        }, 1500);
      }
    } catch (error) {
      console.error('[App] Error checking accessibility service:', error);
    }
  };

  const handleAccessibilityDismiss = async () => {
    setShowAccessibilityPrompt(false);
    // Remember that user dismissed the prompt
    await AsyncStorage.setItem(ACCESSIBILITY_PROMPT_DISMISSED_KEY, 'true');
  };

  const handleAccessibilitySetupComplete = () => {
    setShowAccessibilityPrompt(false);
    console.log('[App] Accessibility service enabled successfully');
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppNavigator />
      <AccessibilitySetupPrompt
        visible={showAccessibilityPrompt}
        onDismiss={handleAccessibilityDismiss}
        onSetupComplete={handleAccessibilitySetupComplete}
      />
    </SafeAreaProvider>
  );
}

export default App;
