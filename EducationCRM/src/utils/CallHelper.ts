import {Linking, Alert, Platform} from 'react-native';

/**
 * CallHelper - Utility for initiating phone calls
 * Handles phone number formatting and call initiation via React Native's Linking API
 */
class CallHelper {
  /**
   * Formats phone number to Indian format with +91 country code
   * @param phoneNumber - Raw phone number (can include spaces, dashes, etc.)
   * @returns Formatted phone number with +91 prefix
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // If number already starts with 91, add + prefix
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+${cleaned}`;
    }

    // If number starts with country code +91, return as is
    if (phoneNumber.startsWith('+91')) {
      return phoneNumber;
    }

    // If 10-digit Indian mobile number, add +91 prefix
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }

    // Return cleaned number with + prefix if it looks like international format
    if (cleaned.length > 10) {
      return `+${cleaned}`;
    }

    // Default: add +91 prefix
    return `+91${cleaned}`;
  }

  /**
   * Initiates a phone call using the device's native dialer
   * @param phoneNumber - Phone number to call (will be formatted to Indian format)
   * @returns Promise that resolves when call is initiated or rejects on error
   */
  async initiateCall(phoneNumber: string): Promise<void> {
    try {
      // Format the phone number
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const telUrl = `tel:${formattedNumber}`;

      // Check if the device supports phone calls
      const canOpen = await Linking.canOpenURL(telUrl);

      if (!canOpen) {
        throw new Error('Device does not support phone calls');
      }

      // Initiate the call
      await Linking.openURL(telUrl);
    } catch (error) {
      // Handle errors gracefully
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      Alert.alert(
        'Call Failed',
        `Unable to initiate call: ${errorMessage}`,
        [{text: 'OK'}],
      );

      throw error;
    }
  }

  /**
   * Checks if the device supports making phone calls
   * @returns Promise that resolves to true if device supports calls, false otherwise
   */
  async canMakeCall(): Promise<boolean> {
    try {
      // Use a dummy tel URL to check capability
      return await Linking.canOpenURL('tel:+911234567890');
    } catch (error) {
      console.error('Error checking call capability:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new CallHelper();
