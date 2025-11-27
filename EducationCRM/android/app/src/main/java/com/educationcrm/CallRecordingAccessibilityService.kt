package com.educationcrm

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.view.accessibility.AccessibilityEvent
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

/**
 * Accessibility Service that enables reliable call recording.
 * This service keeps the app process alive during calls and
 * automatically starts/stops recording based on call state.
 */
class CallRecordingAccessibilityService : AccessibilityService() {

    private var telephonyManager: TelephonyManager? = null
    private var phoneStateListener: PhoneStateListener? = null
    private var telephonyCallback: TelephonyCallback? = null
    private var isCallActive = false
    private var currentPhoneNumber: String? = null
    private var recordingFilePath: String? = null

    companion object {
        private const val TAG = "CallRecordingService"
        const val PREFS_NAME = "CallRecordingAccessibilityPrefs"
        const val PREF_AUTO_RECORD_ENABLED = "auto_record_enabled"
        const val PREF_SERVICE_ENABLED = "service_enabled"
        
        var isServiceRunning = false
            private set
        
        var lastCallRecordingPath: String? = null
            private set
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        
        android.util.Log.d(TAG, "Accessibility Service connected")
        isServiceRunning = true
        
        // Configure the service
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                        AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
            notificationTimeout = 100
        }
        serviceInfo = info
        
        // Start listening for phone state changes
        setupPhoneStateListener()
        
        // Save that service is enabled
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(PREF_SERVICE_ENABLED, true)
            .apply()
        
        // Broadcast service started
        sendBroadcast(Intent("com.educationcrm.ACCESSIBILITY_SERVICE_STARTED"))
    }


    private fun setupPhoneStateListener() {
        telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ uses TelephonyCallback
            telephonyCallback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                override fun onCallStateChanged(state: Int) {
                    handleCallStateChange(state)
                }
            }
            try {
                telephonyManager?.registerTelephonyCallback(
                    mainExecutor,
                    telephonyCallback as TelephonyCallback
                )
            } catch (e: SecurityException) {
                android.util.Log.e(TAG, "Failed to register telephony callback: ${e.message}")
            }
        } else {
            // Older Android versions use PhoneStateListener
            @Suppress("DEPRECATION")
            phoneStateListener = object : PhoneStateListener() {
                @Deprecated("Deprecated in Java")
                override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                    currentPhoneNumber = phoneNumber
                    handleCallStateChange(state)
                }
            }
            try {
                @Suppress("DEPRECATION")
                telephonyManager?.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE)
            } catch (e: SecurityException) {
                android.util.Log.e(TAG, "Failed to register phone state listener: ${e.message}")
            }
        }
    }

    private fun handleCallStateChange(state: Int) {
        android.util.Log.d(TAG, "Call state changed: $state")
        
        when (state) {
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                // Call is active (answered)
                if (!isCallActive) {
                    isCallActive = true
                    onCallStarted()
                }
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                // Call ended
                if (isCallActive) {
                    isCallActive = false
                    onCallEnded()
                }
            }
            TelephonyManager.CALL_STATE_RINGING -> {
                // Incoming call ringing - don't start recording yet
                android.util.Log.d(TAG, "Phone ringing")
            }
        }
    }

    private fun onCallStarted() {
        android.util.Log.d(TAG, "Call started - initiating recording")
        
        // Check if auto-record is enabled
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val autoRecordEnabled = prefs.getBoolean(PREF_AUTO_RECORD_ENABLED, true)
        
        if (!autoRecordEnabled) {
            android.util.Log.d(TAG, "Auto-record is disabled")
            return
        }
        
        // Generate file path
        recordingFilePath = generateRecordingPath()
        lastCallRecordingPath = recordingFilePath
        
        // Start recording service
        val intent = Intent(this, RecordingService::class.java).apply {
            action = RecordingService.ACTION_START_CALL_RECORDING
            putExtra(RecordingService.EXTRA_FILE_PATH, recordingFilePath)
            putExtra(RecordingService.EXTRA_SAMPLE_RATE, 44100)
            putExtra(RecordingService.EXTRA_BIT_RATE, 128000)
            currentPhoneNumber?.let { putExtra(RecordingService.EXTRA_PHONE_NUMBER, it) }
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        
        // Broadcast call recording started
        sendBroadcast(Intent("com.educationcrm.CALL_RECORDING_STARTED").apply {
            putExtra("filePath", recordingFilePath)
            putExtra("phoneNumber", currentPhoneNumber)
        })
    }

    private fun onCallEnded() {
        android.util.Log.d(TAG, "Call ended - stopping recording")
        
        // Stop recording service
        val intent = Intent(this, RecordingService::class.java).apply {
            action = RecordingService.ACTION_STOP_RECORDING
        }
        startService(intent)
        
        // Broadcast call recording stopped
        sendBroadcast(Intent("com.educationcrm.CALL_RECORDING_ENDED").apply {
            putExtra("filePath", recordingFilePath)
            putExtra("phoneNumber", currentPhoneNumber)
        })
        
        recordingFilePath = null
        currentPhoneNumber = null
    }

    private fun generateRecordingPath(): String {
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val filename = "call_$timestamp.m4a"
        val cacheDir = cacheDir.absolutePath
        return "$cacheDir/$filename"
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // We don't need to process accessibility events for call recording
        // The service just needs to be running to keep the app alive
    }

    override fun onInterrupt() {
        android.util.Log.d(TAG, "Accessibility Service interrupted")
    }

    override fun onDestroy() {
        android.util.Log.d(TAG, "Accessibility Service destroyed")
        isServiceRunning = false
        
        // Unregister listeners
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            telephonyCallback?.let {
                telephonyManager?.unregisterTelephonyCallback(it)
            }
        } else {
            @Suppress("DEPRECATION")
            telephonyManager?.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
        }
        
        // Update prefs
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(PREF_SERVICE_ENABLED, false)
            .apply()
        
        // Broadcast service stopped
        sendBroadcast(Intent("com.educationcrm.ACCESSIBILITY_SERVICE_STOPPED"))
        
        super.onDestroy()
    }
}
