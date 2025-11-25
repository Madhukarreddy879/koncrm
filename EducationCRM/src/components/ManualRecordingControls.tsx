import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import CallRecordingManager from '../managers/CallRecordingManager';

interface ManualRecordingControlsProps {
  leadId: string;
  onRecordingComplete?: (filePath: string) => void;
}

/**
 * ManualRecordingControls - Manual start/stop controls for call recording
 * Provides fallback for Android 10+ devices where automatic recording may not work
 */
const ManualRecordingControls: React.FC<ManualRecordingControlsProps> = ({
  leadId,
  onRecordingComplete,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [intervalId, setIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Check initial recording state
    setIsRecording(CallRecordingManager.isRecording());

    // Clean up interval on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => {
    // Update duration every second when recording
    if (isRecording) {
      const id = setInterval(() => {
        const currentDuration =
          CallRecordingManager.getCurrentRecordingDuration();
        setDuration(Math.floor(currentDuration));
      }, 1000);

      setIntervalId(id);

      return () => {
        clearInterval(id);
      };
    } else {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    }
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      await CallRecordingManager.startRecording();
      setIsRecording(true);
      setDuration(0);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Recording Failed', `Unable to start recording: ${errorMessage}`, [
        {text: 'OK'},
      ]);
    }
  };

  const handleStopRecording = async () => {
    try {
      const metadata = await CallRecordingManager.stopRecording(true);
      setIsRecording(false);
      setDuration(0);

      if (onRecordingComplete) {
        onRecordingComplete(metadata.filePath);
      }

      Alert.alert('Recording Saved', 'Call recording has been saved and uploaded.', [
        {text: 'OK'},
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Stop Recording Failed', `Unable to stop recording: ${errorMessage}`, [
        {text: 'OK'},
      ]);
    }
  };

  const handleCancelRecording = () => {
    Alert.alert(
      'Cancel Recording',
      'Are you sure you want to cancel this recording? It will be deleted.',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            await CallRecordingManager.cancelRecording();
            setIsRecording(false);
            setDuration(0);
          },
        },
      ],
    );
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {!isRecording ? (
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartRecording}
          activeOpacity={0.7}>
          <View style={styles.recordIcon} />
          <Text style={styles.startButtonText}>Start Recording</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.recordingContainer}>
          <View style={styles.recordingHeader}>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording</Text>
            </View>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopRecording}
              activeOpacity={0.7}>
              <Text style={styles.stopButtonText}>Stop & Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelRecording}
              activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {Platform.OS === 'android' && Platform.Version >= 29 && (
        <Text style={styles.hint}>
          💡 Tip: Use speaker mode for better recording quality
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginVertical: 8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  recordIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingContainer: {
    gap: 12,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC3545',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC3545',
  },
  durationText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    fontVariant: ['tabular-nums'],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#28A745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6C757D',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ManualRecordingControls;
