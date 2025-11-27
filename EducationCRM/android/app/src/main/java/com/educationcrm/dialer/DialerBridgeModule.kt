package com.educationcrm.dialer

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.telecom.TelecomManager
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.educationcrm.dialer.models.DialerErrorCodes
import java.util.UUID

/**
 * DialerBridgeModule - React Native native module for custom dialer functionality.
 * 
 * This module bridges the Android custom dialer implementation with React Native,
 * providing methods to:
 * - Make calls through the custom dialer
 * - Check and request default dialer status
 * - Control active calls (end, mute, speaker)
 * - Emit call and recording events to React Native
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
class DialerBridgeModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext),
    CrmConnectionEventBus.EventListener {
    
    companion object {
        private const val TAG = "DialerBridgeModule"
        private const val MODULE_NAME = "DialerBridge"
        
        // Event names for React Native
        private const val EVENT_CALL_STARTED = "CALL_STARTED"
        private const val EVENT_CALL_CONNECTED = "CALL_CONNECTED"
        private const val EVENT_CALL_ENDED = "CALL_ENDED"
        private const val EVENT_RECORDING_STARTED = "RECORDING_STARTED"
        private const val EVENT_RECORDING_STOPPED = "RECORDING_STOPPED"
        private const val EVENT_RECORDING_ERROR = "RECORDING_ERROR"
    }
    
    private var recordingBroadcastReceiver: BroadcastReceiver? = null
    
    init {
        // Register as event listener for call events
        CrmConnectionEventBus.registerListener(this)
        
        // Register broadcast receiver for recording events
        registerRecordingBroadcastReceiver()
    }
    
    /**
     * Returns the name of the native module.
     * This name is used to access the module from React Native.
     * 
     * Requirement 6.2: Setup event emitter for sending events to React Native
     * 
     * @return Module name "DialerBridge"
     */
    override fun getName(): String {
        return MODULE_NAME
    }
    
    /**
     * Makes an outgoing call through the custom dialer.
     * 
     * This method:
     * 1. Validates the phone number format
     * 2. Checks if app is default dialer
     * 3. Registers PhoneAccount if needed
     * 4. Places the call through TelecomManager
     * 
     * Requirement 6.1: Expose makeCall method to React Native
     * Requirement 6.3: Validate phone number and initiate call within 1 second
     * 
     * @param phoneNumber The phone number to call (E.164 format recommended)
     * @param leadId The CRM lead ID associated with this call
     * @param promise Promise to resolve with call ID or reject with error
     */
    @ReactMethod
    fun makeCall(phoneNumber: String, leadId: String, promise: Promise) {
        Log.d(TAG, "makeCall called - Phone: $phoneNumber, LeadId: $leadId")
        
        try {
            // Validate phone number
            if (!isValidPhoneNumber(phoneNumber)) {
                Log.e(TAG, "Invalid phone number format: $phoneNumber")
                promise.reject(
                    DialerErrorCodes.INVALID_PHONE_NUMBER,
                    "Invalid phone number format: $phoneNumber"
                )
                return
            }
            
            val context = reactApplicationContext
            
            // Check if app is default dialer
            if (!PhoneAccountManager.isDefaultDialer(context)) {
                Log.e(TAG, "App is not set as default dialer")
                promise.reject(
                    DialerErrorCodes.NOT_DEFAULT_DIALER,
                    "App must be set as default dialer to make calls"
                )
                return
            }
            
            // Register PhoneAccount if not already registered
            val phoneAccountHandle = try {
                PhoneAccountManager.registerPhoneAccount(context)
            } catch (e: SecurityException) {
                Log.e(TAG, "Permission denied for PhoneAccount registration", e)
                promise.reject(
                    DialerErrorCodes.PERMISSION_DENIED,
                    "MANAGE_OWN_CALLS permission required"
                )
                return
            }
            
            // Generate unique call ID
            val callId = UUID.randomUUID().toString()
            
            // Create call URI
            val uri = Uri.fromParts("tel", phoneNumber, null)
            
            // Create extras bundle with call metadata
            val extras = android.os.Bundle().apply {
                putString("callId", callId)
                putString("phoneNumber", phoneNumber)
                putString("leadId", leadId)
            }
            
            // Place the call through TelecomManager
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            
            if (telecomManager == null) {
                Log.e(TAG, "TelecomManager not available")
                promise.reject(
                    DialerErrorCodes.CONNECTION_FAILED,
                    "TelecomManager not available"
                )
                return
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                telecomManager.placeCall(uri, extras)
                
                Log.d(TAG, "Call placed successfully - CallId: $callId")
                
                // Resolve promise with call ID
                val result = Arguments.createMap().apply {
                    putString("callId", callId)
                    putString("phoneNumber", phoneNumber)
                    putString("leadId", leadId)
                }
                promise.resolve(result)
            } else {
                Log.e(TAG, "TelecomManager.placeCall requires Android M (API 23) or higher")
                promise.reject(
                    DialerErrorCodes.CONNECTION_FAILED,
                    "Android version not supported"
                )
            }
            
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException making call", e)
            promise.reject(
                DialerErrorCodes.PERMISSION_DENIED,
                "Required permissions not granted: ${e.message}"
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error making call", e)
            promise.reject(
                DialerErrorCodes.CONNECTION_FAILED,
                "Failed to make call: ${e.message}"
            )
        }
    }
    
    /**
     * Requests the user to set this app as the default dialer.
     * Shows the system dialog for default dialer selection.
     * 
     * Requirement 6.4: Expose requestDefaultDialer method
     * 
     * @param promise Promise to resolve when dialog is shown or reject on error
     */
    @ReactMethod
    fun requestDefaultDialer(promise: Promise) {
        Log.d(TAG, "requestDefaultDialer called")
        
        try {
            val activity = currentActivity
            
            if (activity == null) {
                Log.e(TAG, "No current activity available")
                promise.reject(
                    "NO_ACTIVITY",
                    "No activity available to show default dialer dialog"
                )
                return
            }
            
            PhoneAccountManager.requestDefaultDialer(activity)
            
            Log.d(TAG, "Default dialer request dialog shown")
            promise.resolve(null)
            
        } catch (e: IllegalStateException) {
            Log.e(TAG, "Error requesting default dialer", e)
            promise.reject(
                "UNSUPPORTED_VERSION",
                "Default dialer API requires Android M (API 23) or higher"
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting default dialer", e)
            promise.reject(
                "REQUEST_FAILED",
                "Failed to request default dialer: ${e.message}"
            )
        }
    }
    
    /**
     * Checks if the app is currently set as the default dialer.
     * 
     * Requirement 6.5: Expose isDefaultDialer method
     * 
     * @param promise Promise to resolve with boolean result
     */
    @ReactMethod
    fun isDefaultDialer(promise: Promise) {
        try {
            val isDefault = PhoneAccountManager.isDefaultDialer(reactApplicationContext)
            
            Log.d(TAG, "isDefaultDialer: $isDefault")
            promise.resolve(isDefault)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error checking default dialer status", e)
            promise.reject(
                "CHECK_FAILED",
                "Failed to check default dialer status: ${e.message}"
            )
        }
    }
    
    /**
     * Ends the current active call.
     * 
     * Requirement 6.5: Expose endCurrentCall method
     * 
     * @param promise Promise to resolve with success boolean or reject on error
     */
    @ReactMethod
    fun endCurrentCall(promise: Promise) {
        Log.d(TAG, "endCurrentCall called")
        
        try {
            val success = CallManager.endCurrentCall()
            
            if (success) {
                Log.d(TAG, "Call ended successfully")
                promise.resolve(true)
            } else {
                Log.w(TAG, "No active call to end")
                promise.resolve(false)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error ending call", e)
            promise.reject(
                "END_CALL_FAILED",
                "Failed to end call: ${e.message}"
            )
        }
    }
    
    /**
     * Toggles the mute state of the current call.
     * 
     * Requirement 6.5: Expose toggleMute method
     * 
     * @param promise Promise to resolve with new mute state or reject on error
     */
    @ReactMethod
    fun toggleMute(promise: Promise) {
        Log.d(TAG, "toggleMute called")
        
        try {
            val success = CallManager.toggleMute()
            
            if (success) {
                val isMuted = CallManager.isMuted()
                Log.d(TAG, "Mute toggled - New state: $isMuted")
                promise.resolve(isMuted)
            } else {
                Log.w(TAG, "No active call to toggle mute")
                promise.reject(
                    "NO_ACTIVE_CALL",
                    "No active call to toggle mute"
                )
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error toggling mute", e)
            promise.reject(
                "TOGGLE_MUTE_FAILED",
                "Failed to toggle mute: ${e.message}"
            )
        }
    }
    
    /**
     * Toggles the speaker state of the current call.
     * 
     * Requirement 6.5: Expose toggleSpeaker method
     * 
     * @param promise Promise to resolve with new speaker state or reject on error
     */
    @ReactMethod
    fun toggleSpeaker(promise: Promise) {
        Log.d(TAG, "toggleSpeaker called")
        
        try {
            val success = CallManager.toggleSpeaker()
            
            if (success) {
                val isSpeakerOn = CallManager.isSpeakerOn()
                Log.d(TAG, "Speaker toggled - New state: $isSpeakerOn")
                promise.resolve(isSpeakerOn)
            } else {
                Log.w(TAG, "No active call to toggle speaker")
                promise.reject(
                    "NO_ACTIVE_CALL",
                    "No active call to toggle speaker"
                )
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error toggling speaker", e)
            promise.reject(
                "TOGGLE_SPEAKER_FAILED",
                "Failed to toggle speaker: ${e.message}"
            )
        }
    }
    
    // ========== Event Emission Methods ==========
    
    /**
     * Sends an event to React Native.
     * 
     * @param eventName Name of the event
     * @param params Event parameters
     */
    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
            
            Log.d(TAG, "Event emitted: $eventName")
        } catch (e: Exception) {
            Log.e(TAG, "Error emitting event $eventName", e)
        }
    }
    
    /**
     * Emits CALL_STARTED event to React Native.
     * 
     * Requirement 6.2: Emit CALL_STARTED event with callId, phoneNumber, leadId
     */
    override fun onCallStarted(callId: String, phoneNumber: String, leadId: String, timestamp: Long) {
        val params = Arguments.createMap().apply {
            putString("callId", callId)
            putString("phoneNumber", phoneNumber)
            putString("leadId", leadId)
            putDouble("timestamp", timestamp.toDouble())
        }
        
        sendEvent(EVENT_CALL_STARTED, params)
    }
    
    /**
     * Emits CALL_CONNECTED event to React Native.
     * 
     * Requirement 6.2: Emit CALL_CONNECTED event with callId, phoneNumber
     */
    override fun onCallConnected(callId: String, phoneNumber: String, timestamp: Long) {
        val params = Arguments.createMap().apply {
            putString("callId", callId)
            putString("phoneNumber", phoneNumber)
            putDouble("timestamp", timestamp.toDouble())
        }
        
        sendEvent(EVENT_CALL_CONNECTED, params)
    }
    
    /**
     * Emits CALL_ENDED event to React Native.
     * 
     * Requirement 6.2: Emit CALL_ENDED event with callId, phoneNumber, duration
     */
    override fun onCallEnded(callId: String, phoneNumber: String, duration: Long, timestamp: Long) {
        val params = Arguments.createMap().apply {
            putString("callId", callId)
            putString("phoneNumber", phoneNumber)
            putDouble("duration", duration.toDouble())
            putDouble("timestamp", timestamp.toDouble())
        }
        
        sendEvent(EVENT_CALL_ENDED, params)
    }
    
    /**
     * Handles connection failure events.
     * Emits error information to React Native.
     */
    override fun onConnectionFailed(
        callId: String,
        phoneNumber: String,
        leadId: String,
        errorCode: String,
        errorMessage: String
    ) {
        val params = Arguments.createMap().apply {
            putString("callId", callId)
            putString("phoneNumber", phoneNumber)
            putString("leadId", leadId)
            putString("error", errorMessage)
            putString("code", errorCode)
        }
        
        sendEvent(EVENT_RECORDING_ERROR, params)
    }
    
    /**
     * Handles recording start requests from CrmConnection.
     * Starts the DialerRecordingService.
     */
    override fun onRecordingStartRequested(callId: String, phoneNumber: String, leadId: String) {
        Log.d(TAG, "Recording start requested - CallId: $callId")
        
        try {
            val intent = Intent(reactApplicationContext, DialerRecordingService::class.java).apply {
                action = DialerRecordingService.ACTION_START_RECORDING
                putExtra(DialerRecordingService.EXTRA_CALL_ID, callId)
                putExtra(DialerRecordingService.EXTRA_PHONE_NUMBER, phoneNumber)
                putExtra(DialerRecordingService.EXTRA_LEAD_ID, leadId)
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            
            Log.d(TAG, "DialerRecordingService started")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting recording service", e)
            
            // Emit error event
            val params = Arguments.createMap().apply {
                putString("callId", callId)
                putString("error", "Failed to start recording: ${e.message}")
                putString("code", DialerErrorCodes.RECORDING_INIT_FAILED)
            }
            sendEvent(EVENT_RECORDING_ERROR, params)
        }
    }
    
    /**
     * Handles recording stop requests from CrmConnection.
     * Stops the DialerRecordingService.
     */
    override fun onRecordingStopRequested(callId: String) {
        Log.d(TAG, "Recording stop requested - CallId: $callId")
        
        try {
            val intent = Intent(reactApplicationContext, DialerRecordingService::class.java).apply {
                action = DialerRecordingService.ACTION_STOP_RECORDING
            }
            
            reactApplicationContext.startService(intent)
            
            Log.d(TAG, "DialerRecordingService stop requested")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping recording service", e)
        }
    }
    
    /**
     * Registers broadcast receiver for recording events from DialerRecordingService.
     */
    private fun registerRecordingBroadcastReceiver() {
        recordingBroadcastReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                when (intent?.action) {
                    DialerRecordingService.BROADCAST_RECORDING_STARTED -> {
                        handleRecordingStarted(intent)
                    }
                    DialerRecordingService.BROADCAST_RECORDING_STOPPED -> {
                        handleRecordingStopped(intent)
                    }
                    DialerRecordingService.BROADCAST_RECORDING_ERROR -> {
                        handleRecordingError(intent)
                    }
                }
            }
        }
        
        val filter = IntentFilter().apply {
            addAction(DialerRecordingService.BROADCAST_RECORDING_STARTED)
            addAction(DialerRecordingService.BROADCAST_RECORDING_STOPPED)
            addAction(DialerRecordingService.BROADCAST_RECORDING_ERROR)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactApplicationContext.registerReceiver(
                recordingBroadcastReceiver,
                filter,
                Context.RECEIVER_NOT_EXPORTED
            )
        } else {
            reactApplicationContext.registerReceiver(recordingBroadcastReceiver, filter)
        }
        
        Log.d(TAG, "Recording broadcast receiver registered")
    }
    
    /**
     * Handles RECORDING_STARTED broadcast from DialerRecordingService.
     * 
     * Requirement 6.2: Emit RECORDING_STARTED event with callId
     */
    private fun handleRecordingStarted(intent: Intent) {
        val callId = intent.getStringExtra("callId") ?: return
        
        val params = Arguments.createMap().apply {
            putString("callId", callId)
        }
        
        sendEvent(EVENT_RECORDING_STARTED, params)
    }
    
    /**
     * Handles RECORDING_STOPPED broadcast from DialerRecordingService.
     * 
     * Requirement 6.2: Emit RECORDING_STOPPED event with callId, filePath, duration, fileSize
     */
    private fun handleRecordingStopped(intent: Intent) {
        val callId = intent.getStringExtra("callId") ?: return
        val filePath = intent.getStringExtra("filePath") ?: ""
        val duration = intent.getLongExtra("duration", 0L)
        val fileSize = intent.getLongExtra("fileSize", 0L)
        val phoneNumber = intent.getStringExtra("phoneNumber") ?: ""
        val leadId = intent.getStringExtra("leadId") ?: ""
        val timestamp = intent.getLongExtra("timestamp", 0L)
        
        val params = Arguments.createMap().apply {
            putString("callId", callId)
            putString("filePath", filePath)
            putDouble("duration", (duration / 1000.0)) // Convert to seconds
            putDouble("fileSize", fileSize.toDouble())
            putString("phoneNumber", phoneNumber)
            putString("leadId", leadId)
            putDouble("timestamp", timestamp.toDouble())
        }
        
        sendEvent(EVENT_RECORDING_STOPPED, params)
    }
    
    /**
     * Handles RECORDING_ERROR broadcast from DialerRecordingService.
     * 
     * Requirement 6.2: Emit RECORDING_ERROR event with callId, error, code
     */
    private fun handleRecordingError(intent: Intent) {
        val callId = intent.getStringExtra("callId") ?: return
        val error = intent.getStringExtra("error") ?: "Unknown error"
        val code = intent.getStringExtra("code") ?: "UNKNOWN_ERROR"
        
        val params = Arguments.createMap().apply {
            putString("callId", callId)
            putString("error", error)
            putString("code", code)
        }
        
        sendEvent(EVENT_RECORDING_ERROR, params)
    }
    
    /**
     * Validates phone number format.
     * Accepts numbers with digits, spaces, dashes, parentheses, and plus sign.
     * 
     * @param phoneNumber Phone number to validate
     * @return true if valid, false otherwise
     */
    private fun isValidPhoneNumber(phoneNumber: String): Boolean {
        if (phoneNumber.isBlank()) {
            return false
        }
        
        // Remove common formatting characters
        val digitsOnly = phoneNumber.replace(Regex("[\\s\\-().]"), "")
        
        // Check if it starts with + (international) or is all digits
        val isValid = digitsOnly.matches(Regex("^\\+?[0-9]{7,15}$"))
        
        return isValid
    }
    
    /**
     * Cleanup when module is destroyed.
     */
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        
        // Unregister event listener
        CrmConnectionEventBus.unregisterListener(this)
        
        // Unregister broadcast receiver
        try {
            recordingBroadcastReceiver?.let {
                reactApplicationContext.unregisterReceiver(it)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering broadcast receiver", e)
        }
        
        Log.d(TAG, "DialerBridgeModule destroyed")
    }
}
