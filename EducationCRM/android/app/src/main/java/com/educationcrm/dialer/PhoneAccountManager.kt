package com.educationcrm.dialer

import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.util.Log
import com.educationcrm.dialer.models.DialerErrorCodes

/**
 * PhoneAccountManager - Singleton object for managing PhoneAccount registration
 * and default dialer status with Android's TelecomManager.
 * 
 * This manager handles:
 * - PhoneAccount registration with CAPABILITY_CALL_PROVIDER and CAPABILITY_SELF_MANAGED
 * - Default dialer status checking
 * - Default dialer permission requests
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.6
 */
object PhoneAccountManager {
    private const val TAG = "PhoneAccountManager"
    private const val PHONE_ACCOUNT_ID = "crm_dialer_account"
    const val REQUEST_DEFAULT_DIALER = 1001
    
    private var phoneAccountHandle: PhoneAccountHandle? = null
    
    /**
     * Registers a PhoneAccount with TelecomManager for handling outgoing calls.
     * 
     * The PhoneAccount is configured with:
     * - CAPABILITY_CALL_PROVIDER: Allows the app to place calls
     * - CAPABILITY_SELF_MANAGED: Gives full control over call management
     * - TEL URI scheme support: Handles tel: URIs
     * 
     * Requirement 1.2: Register PhoneAccount with TelecomManager within 2 seconds
     * Requirement 1.5: Persist PhoneAccount registration across app restarts
     * Requirement 2.6: Configure as self-managed connection service
     * 
     * @param context Application or Activity context
     * @return PhoneAccountHandle for the registered account
     * @throws SecurityException if MANAGE_OWN_CALLS permission is not granted
     */
    fun registerPhoneAccount(context: Context): PhoneAccountHandle {
        try {
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            
            if (telecomManager == null) {
                Log.e(TAG, "TelecomManager not available")
                throw IllegalStateException("TelecomManager not available")
            }
            
            // Create ComponentName for CrmConnectionService
            val componentName = ComponentName(
                context.packageName,
                "com.educationcrm.dialer.CrmConnectionService"
            )
            
            // Create PhoneAccountHandle with unique ID
            val handle = PhoneAccountHandle(componentName, PHONE_ACCOUNT_ID)
            
            // Build PhoneAccount with required capabilities
            val phoneAccount = PhoneAccount.builder(handle, "CRM Dialer")
                .setCapabilities(
                    PhoneAccount.CAPABILITY_CALL_PROVIDER or
                    PhoneAccount.CAPABILITY_SELF_MANAGED
                )
                .addSupportedUriScheme(PhoneAccount.SCHEME_TEL)
                .build()
            
            // Register the PhoneAccount
            telecomManager.registerPhoneAccount(phoneAccount)
            
            phoneAccountHandle = handle
            
            Log.d(TAG, "PhoneAccount registered successfully: $PHONE_ACCOUNT_ID")
            return handle
            
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException registering PhoneAccount: ${e.message}")
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "Error registering PhoneAccount: ${e.message}")
            throw e
        }
    }
    
    /**
     * Checks if the app is currently set as the default dialer.
     * 
     * Requirement 1.1: Check default dialer status
     * Requirement 1.3: Detect when app is set as default dialer
     * 
     * @param context Application or Activity context
     * @return true if app is default dialer, false otherwise
     */
    fun isDefaultDialer(context: Context): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                val defaultDialerPackage = telecomManager?.defaultDialerPackage
                val isDefault = defaultDialerPackage == context.packageName
                
                Log.d(TAG, "Default dialer check - Current: $defaultDialerPackage, App: ${context.packageName}, IsDefault: $isDefault")
                isDefault
            } else {
                // Default dialer API not available before Android M (API 23)
                Log.w(TAG, "Default dialer API not available on Android version < 23")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking default dialer status: ${e.message}")
            false
        }
    }
    
    /**
     * Requests the user to set this app as the default dialer.
     * Shows the system dialog for default dialer selection.
     * 
     * Requirement 1.1: Prompt user to set app as default dialer
     * Requirement 1.4: Handle user denial with retry option
     * 
     * @param activity Activity context (required for startActivityForResult)
     * @throws IllegalStateException if called on Android version < M (API 23)
     */
    fun requestDefaultDialer(activity: Activity) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER)
                    .putExtra(
                        TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME,
                        activity.packageName
                    )
                
                Log.d(TAG, "Requesting default dialer permission for package: ${activity.packageName}")
                activity.startActivityForResult(intent, REQUEST_DEFAULT_DIALER)
            } else {
                Log.e(TAG, "Default dialer API not available on Android version < 23")
                throw IllegalStateException("Default dialer API requires Android M (API 23) or higher")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting default dialer: ${e.message}")
            throw e
        }
    }
    
    /**
     * Gets the cached PhoneAccountHandle if available.
     * 
     * @return PhoneAccountHandle or null if not registered
     */
    fun getPhoneAccountHandle(): PhoneAccountHandle? {
        return phoneAccountHandle
    }
    
    /**
     * Unregisters the PhoneAccount from TelecomManager.
     * Should be called when the app no longer wants to handle calls.
     * 
     * @param context Application or Activity context
     */
    fun unregisterPhoneAccount(context: Context) {
        try {
            phoneAccountHandle?.let { handle ->
                val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                telecomManager?.unregisterPhoneAccount(handle)
                phoneAccountHandle = null
                Log.d(TAG, "PhoneAccount unregistered successfully")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering PhoneAccount: ${e.message}")
        }
    }
}
