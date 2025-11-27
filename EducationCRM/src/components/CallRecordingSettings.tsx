import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import AccessibilityService, { AccessibilityStatus } from '../services/AccessibilityService';

interface CallRecordingSettingsProps {
  onClose?: () => void;
}

/**
 * Component for managing call recording settings.
 * Shows accessibility service status and allows enabling/disabling auto-record.
 */
const CallRecordingSettings: React.FC<CallRecordingSettingsProps> = ({ onClose }) => {
  const [status, setStatus] = useState<AccessibilityStatus>({
    isEnabled: false,
    isRunning: false,
    autoRecordEnabled: true,
    audioSource: 'MIC',
  });
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      const currentStatus = await AccessibilityService.getStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('[CallRecordingSettings] Error loading status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Refresh status when app comes to foreground
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        loadStatus();
      }
    });

    return () => subscription.remove();
  }, [loadStatus]);

  const handleOpenSettings = async () => {
    await AccessibilityService.openAccessibilitySettings();
  };

  const handleToggleAutoRecord = async (enabled: boolean) => {
    await AccessibilityService.setAutoRecordEnabled(enabled);
    setStatus(prev => ({ ...prev, autoRecordEnabled: enabled }));
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Call Recording</Text>
        <Text style={styles.infoDescription}>
          Call recording is only available on Android devices.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Call Recording Settings</Text>

      {/* Accessibility Service Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accessibility Service</Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.label}>Status:</Text>
          <View style={[
            styles.statusBadge,
            status.isEnabled ? styles.statusEnabled : styles.statusDisabled
          ]}>
            <Text style={styles.statusText}>
              {status.isEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>

        {!status.isEnabled && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Enable the Accessibility Service for automatic call recording.
              Without it, recording may not capture the other party's voice.
            </Text>
            <TouchableOpacity
              style={styles.enableButton}
              onPress={handleOpenSettings}
            >
              <Text style={styles.enableButtonText}>Enable Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {status.isEnabled && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              ✓ Calls will be recorded automatically
            </Text>
          </View>
        )}
      </View>

      {/* Auto Record Toggle */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-Record Calls</Text>
            <Text style={styles.settingDescription}>
              Automatically start recording when a call connects
            </Text>
          </View>
          <Switch
            value={status.autoRecordEnabled}
            onValueChange={handleToggleAutoRecord}
            trackColor={{ false: '#ddd', true: '#4361ee' }}
            thumbColor={status.autoRecordEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Audio Source Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recording Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Audio Source:</Text>
          <Text style={styles.infoValue}>{status.audioSource}</Text>
        </View>
        <Text style={styles.infoDescription}>
          {status.audioSource === 'VOICE_CALL' 
            ? '✓ Best quality - captures both sides of the call'
            : status.audioSource === 'VOICE_COMMUNICATION'
            ? '✓ Good quality - optimized for voice calls'
            : status.audioSource === 'MIC'
            ? '⚠ Basic quality - use speaker mode for best results'
            : 'Recording source will be determined when call starts'}
        </Text>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8888a0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    color: '#4a4a68',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusEnabled: {
    backgroundColor: '#d4edda',
  },
  statusDisabled: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 12,
  },
  enableButton: {
    backgroundColor: '#4361ee',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  successText: {
    fontSize: 14,
    color: '#155724',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5fa',
    borderRadius: 12,
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8888a0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#4a4a68',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  infoDescription: {
    fontSize: 13,
    color: '#8888a0',
    lineHeight: 18,
  },
});

export default CallRecordingSettings;
