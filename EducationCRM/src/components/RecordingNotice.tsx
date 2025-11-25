import React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';

/**
 * RecordingNotice - Displays information about call recording limitations on Android 10+
 * Shows important notice about recording restrictions and workarounds
 */
const RecordingNotice: React.FC = () => {
  // Only show on Android 10+ (API level 29+)
  if (Platform.OS !== 'android' || Platform.Version < 29) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Call Recording Notice</Text>
      </View>

      <Text style={styles.description}>
        Due to Android 10+ privacy restrictions, automatic call recording may not
        work on all devices.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What this means:</Text>
        <Text style={styles.bulletPoint}>
          • Automatic recording may fail on some devices
        </Text>
        <Text style={styles.bulletPoint}>
          • You may need to manually start/stop recording
        </Text>
        <Text style={styles.bulletPoint}>
          • Some manufacturers block call recording entirely
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended workaround:</Text>
        <Text style={styles.bulletPoint}>
          • Use speaker mode during calls for better recording quality
        </Text>
        <Text style={styles.bulletPoint}>
          • Manually start recording before making the call
        </Text>
        <Text style={styles.bulletPoint}>
          • Stop recording after the call ends
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Recording calls helps maintain quality and resolve disputes. Please
          inform students that calls may be recorded.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#856404',
  },
  description: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 16,
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFE69C',
  },
  footerText: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

export default RecordingNotice;
