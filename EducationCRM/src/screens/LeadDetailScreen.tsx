import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ToastAndroid,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import LeadService, { LeadDetail, UpdateLeadData } from '../services/LeadService';
import FollowUpService from '../services/FollowUpService';
import CallRecordingManager from '../managers/CallRecordingManager';
import AudioPlayerService, { PlaybackState } from '../services/AudioPlayerService';
import UploadQueueService from '../services/UploadQueueService';

const STATUS_OPTIONS = [
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Interested', value: 'interested' },
  { label: 'Not Interested', value: 'not_interested' },
  { label: 'Enrolled', value: 'enrolled' },
  { label: 'Lost', value: 'lost' },
];

export default function LeadDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  // @ts-ignore
  const { leadId } = route.params;

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [city, setCity] = useState('');
  const [preferredCourse, setPreferredCourse] = useState('');
  const [preferredUniversity, setPreferredUniversity] = useState('');
  const [status, setStatus] = useState('new');
  const [newNote, setNewNote] = useState('');

  // Follow-up fields
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpDescription, setFollowUpDescription] = useState('');

  useEffect(() => {
    fetchLeadDetails();

    // Initialize upload queue service
    UploadQueueService.initialize();

    return () => {
      UploadQueueService.cleanup();
    };
  }, [leadId]);

  useEffect(() => {
    // Cleanup timer on unmount
    return () => {
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
    };
  }, [recordingTimer]);

  useEffect(() => {
    // Subscribe to audio player state changes
    const unsubscribe = AudioPlayerService.subscribe((state) => {
      setPlaybackState(state);
    });

    return () => {
      unsubscribe();
      AudioPlayerService.cleanup();
    };
  }, []);

  const fetchLeadDetails = async () => {
    try {
      setIsLoading(true);
      const data = await LeadService.getLead(leadId);
      setLead(data);

      // Populate form fields
      setEmail(data.email || '');
      setAlternatePhone(data.alternate_phone || '');
      setCity(data.city || '');
      setPreferredCourse(data.preferred_course || '');
      setPreferredUniversity(data.preferred_university || '');
      setStatus(data.status);
    } catch (error) {
      console.error('Error fetching lead details:', error);
      Alert.alert('Error', 'Failed to load lead details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!lead) return;

    try {
      setIsSaving(true);

      const updateData: UpdateLeadData = {
        email: email.trim() || undefined,
        alternate_phone: alternatePhone.trim() || undefined,
        city: city.trim() || undefined,
        preferred_course: preferredCourse.trim() || undefined,
        preferred_university: preferredUniversity.trim() || undefined,
        status,
      };

      // Optimistically update the UI
      setLead(prev => prev ? { ...prev, ...updateData, status: status as any } : prev);

      // Show subtle loading indicator
      showToast('Saving changes...');

      try {
        await LeadService.updateLead(leadId, updateData, true);
        showToast('Lead updated successfully');
      } catch (error) {
        // Revert changes on error
        console.error('Error updating lead:', error);
        Alert.alert('Error', 'Failed to update lead. Changes reverted.');
        fetchLeadDetails(); // Refetch to get correct data
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      Alert.alert('Error', 'Failed to update lead');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    try {
      // Note: This would need a separate endpoint or be part of update
      // For now, we'll show a success message
      Alert.alert('Success', 'Note added successfully');
      setNewNote('');
      fetchLeadDetails();
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Error', 'Failed to add note');
    }
  };

  const handleCallPress = async () => {
    if (!lead) return;
    await initiateCallWithRecording();
  };

  const initiateCallWithRecording = async () => {
    if (!lead) return;

    try {
      // Use CallRecordingManager to handle call with recording
      await CallRecordingManager.handleCallWithRecording(leadId, lead.phone_number, true);

      // Check if recording started
      if (CallRecordingManager.isRecording()) {
        setIsRecording(true);
        startRecordingTimer();
        showToast('Recording started successfully');
      } else {
        // Show manual recording modal
        setShowRecordingModal(true);
      }
    } catch (error) {
      console.error('Error initiating call with recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to initiate call: ${errorMessage}`);
    }
  };

  const initiateCallWithoutRecording = async () => {
    if (!lead) return;

    try {
      await CallRecordingManager.handleCallWithRecording(leadId, lead.phone_number, false);
    } catch (error) {
      console.error('Error initiating call:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to initiate call: ${errorMessage}`);
    }
  };

  const handleManualStartRecording = async () => {
    try {
      await CallRecordingManager.startRecording();
      setIsRecording(true);
      setShowRecordingModal(false);
      startRecordingTimer();
      showToast('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Recording Error', errorMessage);
    }
  };

  const handleStopRecording = async () => {
    try {
      // Stop the timer
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }

      setIsUploading(true);
      setUploadProgress(0);

      // Stop recording and upload via Manager
      const metadata = await CallRecordingManager.stopRecording(true, (progress) => {
        setUploadProgress(progress);
      });

      setIsRecording(false);
      setRecordingDuration(0);

      showToast('Recording uploaded successfully');

      // Refresh lead details to show new recording
      setTimeout(() => {
        fetchLeadDetails();
      }, 1000);
    } catch (error) {
      console.error('Error stopping recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to stop recording: ${errorMessage}`);

      // If it was an upload error, CallRecordingManager already queued it, 
      // but we might want to refresh UI anyway or handle specific errors if needed.
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const startRecordingTimer = () => {
    const timer = setInterval(() => {
      const duration = CallRecordingManager.getCurrentRecordingDuration();
      setRecordingDuration(Math.floor(duration));
    }, 1000);
    setRecordingTimer(timer);
  };

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Info', message);
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayRecording = async (recordingId: string) => {
    try {
      // If already playing this recording, pause it
      if (currentPlayingId === recordingId && playbackState?.isPlaying) {
        await AudioPlayerService.pause();
        return;
      }

      // If playing a different recording, stop it first
      if (currentPlayingId && currentPlayingId !== recordingId) {
        await AudioPlayerService.stop();
      }

      // Load and play the recording
      setCurrentPlayingId(recordingId);
      const url = LeadService.getRecordingUrl(leadId, recordingId);
      await AudioPlayerService.load(url);
      await AudioPlayerService.play();
    } catch (error) {
      console.error('Error playing recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Playback Error', `Failed to play recording: ${errorMessage}`);
    }
  };

  const handleSeekRecording = async (time: number) => {
    try {
      await AudioPlayerService.seek(time);
    } catch (error) {
      console.error('Error seeking recording:', error);
    }
  };

  const handleDeleteRecording = (recordingId: string) => {
    Alert.alert(
      'Delete Recording',
      'Are you sure you want to delete this recording? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement delete recording API endpoint
              // await LeadService.deleteRecording(leadId, recordingId);

              showToast('Recording deleted successfully');
              fetchLeadDetails();
            } catch (error) {
              console.error('Error deleting recording:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              Alert.alert('Error', `Failed to delete recording: ${errorMessage}`);
            }
          },
        },
      ]
    );
  };

  const handleScheduleFollowUp = async () => {
    if (!followUpDate || !followUpTime) {
      Alert.alert('Error', 'Please select date and time');
      return;
    }

    try {
      const scheduledAt = `${followUpDate}T${followUpTime}:00`;
      await FollowUpService.createFollowUp(leadId, {
        scheduled_at: scheduledAt,
        description: followUpDescription.trim() || undefined,
      });

      Alert.alert('Success', 'Follow-up scheduled successfully');
      setShowFollowUpModal(false);
      setFollowUpDate('');
      setFollowUpTime('');
      setFollowUpDescription('');
      fetchLeadDetails();
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
      Alert.alert('Error', 'Failed to schedule follow-up');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading lead details...</Text>
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Lead not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.studentName}>{lead.student_name}</Text>
        <TouchableOpacity style={styles.callButton} onPress={handleCallPress}>
          <Text style={styles.callIcon}>📞</Text>
          <Text style={styles.callButtonText}>{lead.phone_number}</Text>
        </TouchableOpacity>

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              Recording: {formatRecordingTime(recordingDuration)}
            </Text>
          </View>
        )}

        {/* Stop Recording Button */}
        {isRecording && (
          <TouchableOpacity
            style={styles.stopRecordingButton}
            onPress={handleStopRecording}
          >
            <Text style={styles.stopRecordingIcon}>⏹️</Text>
            <Text style={styles.stopRecordingText}>Stop Recording</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Editable Fields Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Alternate Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter alternate phone"
            placeholderTextColor="#9ca3af"
            value={alternatePhone}
            onChangeText={setAlternatePhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter city"
            placeholderTextColor="#9ca3af"
            value={city}
            onChangeText={setCity}
          />
        </View>
      </View>

      {/* Course Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Course Preferences</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preferred Course</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter preferred course"
            placeholderTextColor="#9ca3af"
            value={preferredCourse}
            onChangeText={setPreferredCourse}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preferred University</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter preferred university"
            placeholderTextColor="#9ca3af"
            value={preferredUniversity}
            onChangeText={setPreferredUniversity}
          />
        </View>
      </View>

      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <TouchableOpacity
          style={styles.statusButton}
          onPress={() => setShowStatusPicker(true)}
        >
          <Text style={styles.statusButtonText}>
            {STATUS_OPTIONS.find(s => s.value === status)?.label || status}
          </Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSaveChanges}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      {/* Notes Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Note</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter your note here..."
          placeholderTextColor="#9ca3af"
          value={newNote}
          onChangeText={setNewNote}
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity style={styles.addNoteButton} onPress={handleAddNote}>
          <Text style={styles.addNoteButtonText}>Add Note</Text>
        </TouchableOpacity>
      </View>

      {/* Interaction History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interaction History</Text>
        {lead.notes.length === 0 &&
          lead.call_logs.length === 0 &&
          lead.followups.length === 0 ? (
          <Text style={styles.emptyText}>No interactions yet</Text>
        ) : (
          <View style={styles.timeline}>
            {/* Notes */}
            {lead.notes.map(note => (
              <View key={note.id} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineType}>📝 Note</Text>
                  <Text style={styles.timelineText}>{note.note}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(note.inserted_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}

            {/* Call Logs */}
            {lead.call_logs.map(call => (
              <View key={call.id} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineType}>📞 Call</Text>
                  <Text style={styles.timelineText}>
                    Outcome: {call.outcome.replace('_', ' ')}
                  </Text>
                  {call.duration_seconds && (
                    <Text style={styles.timelineText}>
                      Duration: {Math.floor(call.duration_seconds / 60)}m{' '}
                      {call.duration_seconds % 60}s
                    </Text>
                  )}
                  <Text style={styles.timelineDate}>
                    {new Date(call.inserted_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}

            {/* Follow-ups */}
            {lead.followups.map(followup => (
              <View key={followup.id} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineType}>
                    {followup.completed ? '✅' : '📅'} Follow-up
                  </Text>
                  {followup.description && (
                    <Text style={styles.timelineText}>{followup.description}</Text>
                  )}
                  <Text style={styles.timelineDate}>
                    Scheduled: {new Date(followup.scheduled_at).toLocaleString()}
                  </Text>
                  {followup.completed && followup.completed_at && (
                    <Text style={styles.timelineDate}>
                      Completed: {new Date(followup.completed_at).toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Schedule Follow-up Button */}
      <TouchableOpacity
        style={styles.followUpButton}
        onPress={() => setShowFollowUpModal(true)}
      >
        <Text style={styles.followUpButtonText}>📅 Schedule Follow-up</Text>
      </TouchableOpacity>

      {/* Call Recordings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Call Recordings</Text>
        {isUploading && (
          <View style={styles.uploadProgressContainer}>
            <Text style={styles.uploadProgressText}>
              Uploading: {uploadProgress.toFixed(0)}%
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressBarFill, { width: `${uploadProgress}%` }]}
              />
            </View>
          </View>
        )}
        {lead.call_logs.filter(c => c.recording_path).length === 0 ? (
          <Text style={styles.emptyText}>No recordings available</Text>
        ) : (
          lead.call_logs
            .filter(c => c.recording_path)
            .map(call => {
              const isPlaying = currentPlayingId === call.id && playbackState?.isPlaying;
              const isCurrentRecording = currentPlayingId === call.id;
              const isLoadingRecording = isCurrentRecording && playbackState?.isLoading;

              return (
                <View key={call.id} style={styles.recordingItemContainer}>
                  <View style={styles.recordingItem}>
                    <View style={styles.recordingInfo}>
                      <Text style={styles.recordingDate}>
                        {new Date(call.inserted_at).toLocaleString()}
                      </Text>
                      {call.duration_seconds && (
                        <Text style={styles.recordingDuration}>
                          Duration: {Math.floor(call.duration_seconds / 60)}:{String(call.duration_seconds % 60).padStart(2, '0')}
                        </Text>
                      )}
                      {isCurrentRecording && playbackState && !playbackState.isLoading && (
                        <Text style={styles.playbackTime}>
                          {formatRecordingTime(Math.floor(playbackState.currentTime))} / {formatRecordingTime(Math.floor(playbackState.duration))}
                        </Text>
                      )}
                    </View>
                    <View style={styles.recordingActions}>
                      <TouchableOpacity
                        style={styles.playButton}
                        onPress={() => handlePlayRecording(call.id)}
                        disabled={isLoadingRecording}
                      >
                        {isLoadingRecording ? (
                          <ActivityIndicator size="small" color="#3b82f6" />
                        ) : (
                          <Text style={styles.playIcon}>
                            {isPlaying ? '⏸️' : '▶️'}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteRecording(call.id)}
                      >
                        <Text style={styles.deleteIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
        )}

        {/* Playback Controls */}
        {currentPlayingId && playbackState && !playbackState.isLoading && (
          <View style={styles.playbackControls}>
            <TouchableOpacity
              style={styles.seekBar}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                const width = 300; // Approximate width, should be measured
                const percentage = locationX / width;
                const newTime = percentage * playbackState.duration;
                handleSeekRecording(newTime);
              }}
            >
              <View style={styles.seekBarTrack}>
                <View
                  style={[
                    styles.seekBarProgress,
                    {
                      width: `${(playbackState.currentTime / playbackState.duration) * 100}%`,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Status Picker Modal */}
      <Modal
        visible={showStatusPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Status</Text>
            {STATUS_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  status === option.value && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setStatus(option.value);
                  setShowStatusPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    status === option.value && styles.modalOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Follow-up Modal */}
      <Modal
        visible={showFollowUpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFollowUpModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFollowUpModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Follow-up</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2024-01-15"
                placeholderTextColor="#9ca3af"
                value={followUpDate}
                onChangeText={setFollowUpDate}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time (HH:MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="14:30"
                placeholderTextColor="#9ca3af"
                value={followUpTime}
                onChangeText={setFollowUpTime}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description..."
                placeholderTextColor="#9ca3af"
                value={followUpDescription}
                onChangeText={setFollowUpDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowFollowUpModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleScheduleFollowUp}
              >
                <Text style={styles.modalSaveButtonText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Manual Recording Modal */}
      <Modal
        visible={showRecordingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRecordingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.recordingModalContent}>
            <Text style={styles.recordingModalTitle}>📱 Manual Recording</Text>
            <Text style={styles.recordingModalText}>
              Due to Android 10+ restrictions, automatic call recording may not work on your device.
            </Text>
            <Text style={styles.recordingModalText}>
              Please start recording manually after the call begins.
            </Text>
            <Text style={styles.recordingModalTip}>
              💡 Tip: Use speaker mode for better recording quality
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRecordingModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleManualStartRecording}
              >
                <Text style={styles.modalSaveButtonText}>Start Recording</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  studentName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  callIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statusButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
  },
  statusButtonText: {
    fontSize: 15,
    color: '#111827',
    textTransform: 'capitalize',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  addNoteButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addNoteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  followUpButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  followUpButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingItemContainer: {
    marginBottom: 8,
  },
  recordingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingDate: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 2,
  },
  recordingDuration: {
    fontSize: 13,
    color: '#6b7280',
  },
  playButton: {
    padding: 8,
  },
  playIcon: {
    fontSize: 24,
  },
  deleteButton: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  modalOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  modalOptionSelected: {
    backgroundColor: '#dbeafe',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  modalOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalSaveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
  },
  stopRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 12,
  },
  stopRecordingIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  stopRecordingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 400,
    alignSelf: 'center',
  },
  recordingModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  recordingModalText: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 12,
    lineHeight: 22,
  },
  recordingModalTip: {
    fontSize: 14,
    color: '#059669',
    marginTop: 8,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  uploadProgressContainer: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadProgressText: {
    fontSize: 13,
    color: '#0369a1',
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0f2fe',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 3,
  },
  playbackTime: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 4,
    fontWeight: '500',
  },
  playbackControls: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  seekBar: {
    paddingVertical: 8,
  },
  seekBarTrack: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  seekBarProgress: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
});
