import { Alert, ToastAndroid, Platform } from 'react-native';

export type ErrorType =
  | 'permission_denied'
  | 'storage_full'
  | 'upload_failed'
  | 'network_error'
  | 'recording_failed'
  | 'file_not_found'
  | 'device_error'
  | 'unknown_error';

export interface ErrorMessage {
  title: string;
  message: string;
  actionable?: boolean;
  action?: () => void;
  actionText?: string;
}

class ErrorMessageService {
  private errorMessages: Record<ErrorType, ErrorMessage> = {
    permission_denied: {
      title: 'Permission Required',
      message: 'This feature requires permission to access your device. Please grant the necessary permissions in Settings.',
      actionable: true,
    },
    storage_full: {
      title: 'Storage Full',
      message: 'Your device storage is full. Please free up some space and try again.',
      actionable: false,
    },
    upload_failed: {
      title: 'Upload Failed',
      message: 'Failed to upload the recording. The upload will be retried automatically when network is available.',
      actionable: false,
    },
    network_error: {
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      actionable: false,
    },
    recording_failed: {
      title: 'Recording Failed',
      message: 'Unable to start or complete the recording. Please check your device settings and try again.',
      actionable: false,
    },
    file_not_found: {
      title: 'File Not Found',
      message: 'The recording file could not be found. It may have been deleted or moved.',
      actionable: false,
    },
    device_error: {
      title: 'Device Error',
      message: 'An error occurred with your device. Please restart the app and try again.',
      actionable: false,
    },
    unknown_error: {
      title: 'Error',
      message: 'An unexpected error occurred. Please try again.',
      actionable: false,
    },
  };

  /**
   * Show error message as an alert dialog
   * @param errorType - Type of error
   * @param customMessage - Optional custom message to override default
   * @param action - Optional action callback
   * @param actionText - Optional action button text
   */
  showAlert(
    errorType: ErrorType,
    customMessage?: string,
    action?: () => void,
    actionText?: string
  ): void {
    const error = this.errorMessages[errorType];
    const message = customMessage || error.message;

    const buttons: any[] = [{ text: 'OK', style: 'cancel' }];

    if (action && actionText) {
      buttons.push({
        text: actionText,
        onPress: action,
      });
    }

    Alert.alert(error.title, message, buttons);
  }

  /**
   * Show error message as a toast (Android only)
   * @param errorType - Type of error
   * @param customMessage - Optional custom message to override default
   */
  showToast(errorType: ErrorType, customMessage?: string): void {
    if (Platform.OS !== 'android') {
      // Fallback to alert on iOS
      this.showAlert(errorType, customMessage);
      return;
    }

    const error = this.errorMessages[errorType];
    const message = customMessage || error.message;

    ToastAndroid.show(message, ToastAndroid.LONG);
  }

  /**
   * Get error message for a specific error type
   * @param errorType - Type of error
   * @returns Error message object
   */
  getErrorMessage(errorType: ErrorType): ErrorMessage {
    return this.errorMessages[errorType];
  }

  /**
   * Map error object to error type
   * @param error - Error object
   * @returns Mapped error type
   */
  mapErrorToType(error: any): ErrorType {
    const errorMessage = error?.message?.toLowerCase() || '';

    // Permission errors
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('denied') ||
      errorMessage.includes('not granted')
    ) {
      return 'permission_denied';
    }

    // Storage errors
    if (
      errorMessage.includes('storage') ||
      errorMessage.includes('space') ||
      errorMessage.includes('disk full') ||
      errorMessage.includes('enospc')
    ) {
      return 'storage_full';
    }

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound')
    ) {
      return 'network_error';
    }

    // Upload errors
    if (
      errorMessage.includes('upload') ||
      errorMessage.includes('failed to upload')
    ) {
      return 'upload_failed';
    }

    // Recording errors
    if (
      errorMessage.includes('recording') ||
      errorMessage.includes('audio') ||
      errorMessage.includes('microphone')
    ) {
      return 'recording_failed';
    }

    // File errors
    if (
      errorMessage.includes('file not found') ||
      errorMessage.includes('enoent') ||
      errorMessage.includes('does not exist')
    ) {
      return 'file_not_found';
    }

    // Device errors
    if (
      errorMessage.includes('device') ||
      errorMessage.includes('hardware')
    ) {
      return 'device_error';
    }

    return 'unknown_error';
  }

  /**
   * Handle error with appropriate message
   * @param error - Error object
   * @param useToast - Whether to use toast instead of alert (default: false)
   * @param customMessage - Optional custom message
   */
  handleError(
    error: any,
    useToast: boolean = false,
    customMessage?: string
  ): void {
    const errorType = this.mapErrorToType(error);
    
    console.error(`[ErrorMessageService] Handling error of type: ${errorType}`, error);

    if (useToast) {
      this.showToast(errorType, customMessage);
    } else {
      this.showAlert(errorType, customMessage);
    }
  }

  /**
   * Show recording permission denied error
   */
  showRecordingPermissionDenied(): void {
    this.showAlert(
      'permission_denied',
      'Audio recording permission is required to record calls. Please enable it in Settings to use this feature.'
    );
  }

  /**
   * Show call permission denied error
   */
  showCallPermissionDenied(): void {
    this.showAlert(
      'permission_denied',
      'Phone call permission is required to make calls. Please enable it in Settings.'
    );
  }

  /**
   * Show storage full error
   */
  showStorageFull(): void {
    this.showAlert(
      'storage_full',
      'Your device storage is full. Please free up some space to continue recording calls.'
    );
  }

  /**
   * Show upload failed error with retry option
   * @param onRetry - Callback for retry action
   */
  showUploadFailed(onRetry?: () => void): void {
    if (onRetry) {
      this.showAlert(
        'upload_failed',
        'Failed to upload the recording. Would you like to retry now?',
        onRetry,
        'Retry'
      );
    } else {
      this.showToast('upload_failed');
    }
  }

  /**
   * Show network error
   */
  showNetworkError(): void {
    this.showToast(
      'network_error',
      'No internet connection. Recordings will be uploaded when connection is restored.'
    );
  }

  /**
   * Show recording failed error
   */
  showRecordingFailed(): void {
    this.showAlert(
      'recording_failed',
      'Failed to start recording. Please check your device settings and try again.'
    );
  }

  /**
   * Show file not found error
   */
  showFileNotFound(): void {
    this.showAlert(
      'file_not_found',
      'The recording file could not be found. It may have been deleted.'
    );
  }

  /**
   * Show device error
   */
  showDeviceError(): void {
    this.showAlert(
      'device_error',
      'A device error occurred. Please restart the app and try again.'
    );
  }
}

export default new ErrorMessageService();
