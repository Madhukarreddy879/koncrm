/**
 * Test script to verify AudioRecorderModule is properly linked
 * Run this in your React Native app to test the recording module
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { AudioRecorderModule } = NativeModules;

export async function testRecordingModule() {
  console.log('=== Testing AudioRecorderModule ===');
  
  // Step 1: Check if module exists
  console.log('1. Checking if AudioRecorderModule exists...');
  if (!AudioRecorderModule) {
    console.error('❌ AudioRecorderModule is undefined!');
    console.error('   This means the native module is not properly linked.');
    console.error('   Solution: Rebuild the app with: cd android && ./gradlew clean && cd .. && npx react-native run-android');
    return false;
  }
  console.log('✅ AudioRecorderModule found');
  
  // Step 2: Check permissions
  console.log('2. Checking RECORD_AUDIO permission...');
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      
      if (!granted) {
        console.log('⚠️  RECORD_AUDIO permission not granted, requesting...');
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          console.error('❌ RECORD_AUDIO permission denied');
          return false;
        }
      }
      console.log('✅ RECORD_AUDIO permission granted');
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return false;
    }
  }
  
  // Step 3: Test recording
  console.log('3. Testing recording functionality...');
  const testFilePath = '/data/data/com.educationcrm/cache/test_recording.m4a';
  
  try {
    console.log('   Starting recording...');
    await AudioRecorderModule.startRecording(testFilePath, 44100, 128000);
    console.log('✅ Recording started successfully');
    
    // Record for 2 seconds
    console.log('   Recording for 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('   Stopping recording...');
    const result = await AudioRecorderModule.stopRecording();
    console.log('✅ Recording stopped successfully');
    console.log('   Result:', result);
    
    if (result.fileSize > 0) {
      console.log('✅ Recording file created successfully');
      console.log(`   File size: ${result.fileSize} bytes`);
      console.log(`   Duration: ${result.duration} seconds`);
      return true;
    } else {
      console.error('❌ Recording file is empty');
      return false;
    }
  } catch (error) {
    console.error('❌ Recording test failed:', error);
    return false;
  }
}

// Export for use in your app
export default testRecordingModule;
