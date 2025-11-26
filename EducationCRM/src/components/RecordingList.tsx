import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { CallLog } from '../services/LeadService';

interface RecordingListProps {
  callLogs: CallLog[];
  onPlayRecording: (recordingId: string) => void;
  currentPlayingId?: string | null;
  isPlaying?: boolean;
  isLoading?: boolean;
  uploadProgress?: number;
  isUploading?: boolean;
  playbackTime?: string;
}

export default function RecordingList({
  callLogs,
  onPlayRecording,
  currentPlayingId,
  isPlaying = false,
  isLoading = false,
  uploadProgress = 0,
  isUploading = false,
  playbackTime,
}: RecordingListProps) {
  // Filter call logs to only show those with recordings
  const recordingsWithPath = callLogs.filter(call => call.recording_path);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getOutcomeColor = (outcome: string): string => {
    switch (outcome) {
      case 'connected':
        return '#10b981';
      case 'no_answer':
        return '#f59e0b';
      case 'busy':
        return '#ef4444';
      case 'invalid_number':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getOutcomeLabel = (outcome: string): string => {
    return outcome.replace('_', ' ').toUpperCase();
  };

  if (recordingsWithPath.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🎙️</Text>
        <Text style={styles.emptyTitle}>No Recordings Yet</Text>
        <Text style={styles.emptySubtitle}>
          Call recordings will appear here once you make calls
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Upload Progress Indicator */}
      {isUploading && (
        <View style={styles.uploadBanner}>
          <View style={styles.uploadContent}>
            <ActivityIndicator size="small" color="#0ea5e9" />
            <Text style={styles.uploadText}>
              Uploading recording... {uploadProgress.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.uploadProgressBar}>
            <View 
              style={[
                styles.uploadProgressFill, 
                { width: `${uploadProgress}%` }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Recording Cards */}
      {recordingsWithPath.map((call, index) => {
        const isCurrentRecording = currentPlayingId === call.id;
        const isPlayingCurrent = isCurrentRecording && isPlaying;
        const isLoadingCurrent = isCurrentRecording && isLoading;

        return (
          <View 
            key={call.id} 
            style={[
              styles.recordingCard,
              isCurrentRecording && styles.recordingCardActive,
              index === 0 && styles.recordingCardFirst,
            ]}
          >
            {/* Left Accent Bar */}
            <View 
              style={[
                styles.accentBar,
                { backgroundColor: getOutcomeColor(call.outcome) }
              ]} 
            />

            {/* Content */}
            <View style={styles.cardContent}>
              {/* Header Row */}
              <View style={styles.headerRow}>
                <View style={styles.dateContainer}>
                  <Text style={styles.dateText}>{formatDate(call.inserted_at)}</Text>
                </View>
                <View 
                  style={[
                    styles.outcomeBadge,
                    { backgroundColor: `${getOutcomeColor(call.outcome)}15` }
                  ]}
                >
                  <Text 
                    style={[
                      styles.outcomeText,
                      { color: getOutcomeColor(call.outcome) }
                    ]}
                  >
                    {getOutcomeLabel(call.outcome)}
                  </Text>
                </View>
              </View>

              {/* Duration and Playback Info */}
              <View style={styles.infoRow}>
                <View style={styles.durationContainer}>
                  <Text style={styles.durationIcon}>⏱️</Text>
                  <Text style={styles.durationText}>
                    {formatDuration(call.duration_seconds)}
                  </Text>
                </View>

                {isCurrentRecording && playbackTime && (
                  <Text style={styles.playbackTimeText}>{playbackTime}</Text>
                )}
              </View>

              {/* Play Button */}
              <TouchableOpacity
                style={[
                  styles.playButton,
                  isPlayingCurrent && styles.playButtonActive,
                ]}
                onPress={() => onPlayRecording(call.id)}
                disabled={isLoadingCurrent}
              >
                {isLoadingCurrent ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.playButtonIcon}>
                      {isPlayingCurrent ? '⏸' : '▶'}
                    </Text>
                    <Text style={styles.playButtonText}>
                      {isPlayingCurrent ? 'Pause' : 'Play Recording'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'System',
  },
  uploadBanner: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    fontFamily: 'System',
  },
  uploadProgressBar: {
    height: 4,
    backgroundColor: '#e0f2fe',
    borderRadius: 2,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#0ea5e9',
    borderRadius: 2,
  },
  recordingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  recordingCardFirst: {
    shadowOpacity: 0.12,
    elevation: 4,
  },
  recordingCardActive: {
    borderColor: '#0ea5e9',
    borderWidth: 2,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.15,
  },
  accentBar: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  outcomeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationIcon: {
    fontSize: 16,
  },
  durationText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4b5563',
    fontFamily: 'System',
  },
  playbackTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0ea5e9',
    fontFamily: 'System',
  },
  playButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  playButtonActive: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  playButtonIcon: {
    fontSize: 16,
    color: '#ffffff',
  },
  playButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'System',
    letterSpacing: 0.3,
  },
});
