import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import AccessibilityService from '../services/AccessibilityService';

interface AccessibilitySetupPromptProps {
  visible: boolean;
  onDismiss: () => void;
  onSetupComplete: () => void;
}

/**
 * Modal component that guides users through enabling the Accessibility Service
 * for automatic call recording.
 */
const AccessibilitySetupPrompt: React.FC<AccessibilitySetupPromptProps> = ({
  visible,
  onDismiss,
  onSetupComplete,
}) => {
  const [isChecking, setIsChecking] = useState(false);

  // Check accessibility status when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && visible) {
        setIsChecking(true);
        const isEnabled = await AccessibilityService.isAccessibilityServiceEnabled();
        setIsChecking(false);
        
        if (isEnabled) {
          onSetupComplete();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [visible, onSetupComplete]);

  const handleOpenSettings = async () => {
    await AccessibilityService.openAccessibilitySettings();
  };

  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Enable Call Recording</Text>
          
          <Text style={styles.description}>
            To automatically record phone calls, you need to enable the Accessibility Service.
          </Text>

          <View style={styles.stepsContainer}>
            <Text style={styles.stepsTitle}>Steps:</Text>
            <Text style={styles.step}>1. Tap "Open Settings" below</Text>
            <Text style={styles.step}>2. Find "EducationCRM" in the list</Text>
            <Text style={styles.step}>3. Toggle it ON</Text>
            <Text style={styles.step}>4. Tap "Allow" when prompted</Text>
            <Text style={styles.step}>5. Return to this app</Text>
          </View>

          <Text style={styles.note}>
            This allows the app to detect when calls start and end to automatically record them.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleOpenSettings}
          >
            <Text style={styles.primaryButtonText}>Open Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onDismiss}
          >
            <Text style={styles.secondaryButtonText}>
              {isChecking ? 'Checking...' : 'Skip for Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#4a4a68',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  stepsContainer: {
    backgroundColor: '#f5f5fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  step: {
    fontSize: 14,
    color: '#4a4a68',
    marginBottom: 4,
    paddingLeft: 4,
  },
  note: {
    fontSize: 12,
    color: '#8888a0',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: '#4361ee',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#8888a0',
    fontSize: 14,
  },
});

export default AccessibilitySetupPrompt;
