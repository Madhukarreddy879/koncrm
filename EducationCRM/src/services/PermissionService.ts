import { Platform, PermissionsAndroid, Permission } from 'react-native';

export type PermissionStatus = 'granted' | 'denied' | 'never_ask_again';

export interface PermissionResult {
  status: PermissionStatus;
  permission: string;
}

class PermissionService {
  /**
   * Request phone call permission (CALL_PHONE)
   * @returns Promise with permission status
   */
  async requestCallPermission(): Promise<PermissionResult> {
    if (Platform.OS !== 'android') {
      return {
        status: 'granted',
        permission: 'CALL_PHONE',
      };
    }

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        {
          title: 'Phone Call Permission',
          message: 'Education CRM needs access to make phone calls to contact students.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      return {
        status: this.mapPermissionResult(result),
        permission: 'CALL_PHONE',
      };
    } catch (error) {
      console.error('[PermissionService] Failed to request call permission:', error);
      return {
        status: 'denied',
        permission: 'CALL_PHONE',
      };
    }
  }

  /**
   * Request audio recording permission (RECORD_AUDIO)
   * @returns Promise with permission status
   */
  async requestRecordingPermission(): Promise<PermissionResult> {
    if (Platform.OS !== 'android') {
      return {
        status: 'granted',
        permission: 'RECORD_AUDIO',
      };
    }

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Audio Recording Permission',
          message: 'Education CRM needs access to record calls for quality and training purposes.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      return {
        status: this.mapPermissionResult(result),
        permission: 'RECORD_AUDIO',
      };
    } catch (error) {
      console.error('[PermissionService] Failed to request recording permission:', error);
      return {
        status: 'denied',
        permission: 'RECORD_AUDIO',
      };
    }
  }

  /**
   * Check if call permission is granted
   * @returns Promise with boolean indicating if permission is granted
   */
  async hasCallPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const result = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CALL_PHONE
      );
      return result;
    } catch (error) {
      console.error('[PermissionService] Failed to check call permission:', error);
      return false;
    }
  }

  /**
   * Check if recording permission is granted
   * @returns Promise with boolean indicating if permission is granted
   */
  async hasRecordingPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const result = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      return result;
    } catch (error) {
      console.error('[PermissionService] Failed to check recording permission:', error);
      return false;
    }
  }

  /**
   * Check all required permissions
   * @returns Promise with object containing status of all permissions
   */
  async checkPermissions(): Promise<{
    call: boolean;
    recording: boolean;
    allGranted: boolean;
  }> {
    const [call, recording] = await Promise.all([
      this.hasCallPermission(),
      this.hasRecordingPermission(),
    ]);

    return {
      call,
      recording,
      allGranted: call && recording,
    };
  }

  /**
   * Request all required permissions
   * @returns Promise with results for all permissions
   */
  async requestAllPermissions(): Promise<{
    call: PermissionResult;
    recording: PermissionResult;
    allGranted: boolean;
  }> {
    if (Platform.OS !== 'android') {
      return {
        call: { status: 'granted', permission: 'CALL_PHONE' },
        recording: { status: 'granted', permission: 'RECORD_AUDIO' },
        allGranted: true,
      };
    }

    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);

      const call: PermissionResult = {
        status: this.mapPermissionResult(results[PermissionsAndroid.PERMISSIONS.CALL_PHONE]),
        permission: 'CALL_PHONE',
      };

      const recording: PermissionResult = {
        status: this.mapPermissionResult(results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]),
        permission: 'RECORD_AUDIO',
      };

      return {
        call,
        recording,
        allGranted: call.status === 'granted' && recording.status === 'granted',
      };
    } catch (error) {
      console.error('[PermissionService] Failed to request all permissions:', error);
      return {
        call: { status: 'denied', permission: 'CALL_PHONE' },
        recording: { status: 'denied', permission: 'RECORD_AUDIO' },
        allGranted: false,
      };
    }
  }

  /**
   * Map Android permission result to our PermissionStatus type
   * @param result - Android permission result
   * @returns Mapped permission status
   */
  private mapPermissionResult(result: string): PermissionStatus {
    switch (result) {
      case PermissionsAndroid.RESULTS.GRANTED:
        return 'granted';
      case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
        return 'never_ask_again';
      case PermissionsAndroid.RESULTS.DENIED:
      default:
        return 'denied';
    }
  }
}

export default new PermissionService();
