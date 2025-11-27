package com.educationcrm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Settings
import android.text.TextUtils
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * React Native module to manage Accessibility Service for call recording.
 */
class AccessibilityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var recordingStartedReceiver: BroadcastReceiver? = null
    private var recordingEndedReceiver: BroadcastReceiver? = null
    private var recordingStoppedReceiver: BroadcastReceiver? = null

    init {
        setupBroadcastReceivers()
    }

    override fun getName(): String = "AccessibilityModule"

    private fun setupBroadcastReceivers() {
        // Receiver for recording started
        recordingStartedReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val filePath = intent?.getStringExtra("filePath")
                val phoneNumber = intent?.getStringExtra("phoneNumber")
                
                val params = Arguments.createMap().apply {
                    putString("filePath", filePath)
                    putString("phoneNumber", phoneNumber)
                }
                
                sendEvent("com.educationcrm.CALL_RECORDING_STARTED", params)
            }
        }
        
        // Receiver for recording ended
        recordingEndedReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val filePath = intent?.getStringExtra("filePath")
                val phoneNumber = intent?.getStringExtra("phoneNumber")
                
                val params = Arguments.createMap().apply {
                    putString("filePath", filePath)
                    putString("phoneNumber", phoneNumber)
                }
                
                sendEvent("com.educationcrm.CALL_RECORDING_ENDED", params)
            }
        }
        
        // Receiver for recording stopped (with file details)
        recordingStoppedReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val filePath = intent?.getStringExtra("filePath")
                val duration = intent?.getDoubleExtra("duration", 0.0) ?: 0.0
                val fileSize = intent?.getLongExtra("fileSize", 0L) ?: 0L
                val audioSource = intent?.getStringExtra("audioSource")
                
                val params = Arguments.createMap().apply {
                    putString("filePath", filePath)
                    putDouble("duration", duration)
                    putDouble("fileSize", fileSize.toDouble())
                    putString("audioSource", audioSource)
                }
                
                sendEvent("com.educationcrm.RECORDING_STOPPED", params)
            }
        }
        
        // Register receivers
        val startedFilter = IntentFilter("com.educationcrm.CALL_RECORDING_STARTED")
        val endedFilter = IntentFilter("com.educationcrm.CALL_RECORDING_ENDED")
        val stoppedFilter = IntentFilter("com.educationcrm.RECORDING_STOPPED")
        
        reactApplicationContext.registerReceiver(recordingStartedReceiver, startedFilter)
        reactApplicationContext.registerReceiver(recordingEndedReceiver, endedFilter)
        reactApplicationContext.registerReceiver(recordingStoppedReceiver, stoppedFilter)
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            recordingStartedReceiver?.let { reactApplicationContext.unregisterReceiver(it) }
            recordingEndedReceiver?.let { reactApplicationContext.unregisterReceiver(it) }
            recordingStoppedReceiver?.let { reactApplicationContext.unregisterReceiver(it) }
        } catch (e: Exception) {
            // Ignore if already unregistered
        }
    }

    /**
     * Check if the accessibility service is enabled
     */
    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        try {
            val enabled = isServiceEnabled()
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to check accessibility service: ${e.message}", e)
        }
    }

    /**
     * Open Android accessibility settings
     */
    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to open accessibility settings: ${e.message}", e)
        }
    }

    /**
     * Check if the service is currently running
     */
    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(CallRecordingAccessibilityService.isServiceRunning)
    }

    /**
     * Get the last recording path from accessibility service
     */
    @ReactMethod
    fun getLastRecordingPath(promise: Promise) {
        promise.resolve(CallRecordingAccessibilityService.lastCallRecordingPath)
    }

    /**
     * Enable or disable auto-recording
     */
    @ReactMethod
    fun setAutoRecordEnabled(enabled: Boolean, promise: Promise) {
        try {
            reactApplicationContext
                .getSharedPreferences(CallRecordingAccessibilityService.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(CallRecordingAccessibilityService.PREF_AUTO_RECORD_ENABLED, enabled)
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to set auto-record: ${e.message}", e)
        }
    }

    /**
     * Check if auto-recording is enabled
     */
    @ReactMethod
    fun isAutoRecordEnabled(promise: Promise) {
        try {
            val enabled = reactApplicationContext
                .getSharedPreferences(CallRecordingAccessibilityService.PREFS_NAME, Context.MODE_PRIVATE)
                .getBoolean(CallRecordingAccessibilityService.PREF_AUTO_RECORD_ENABLED, true)
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to check auto-record: ${e.message}", e)
        }
    }

    /**
     * Get the audio source used for the last recording
     */
    @ReactMethod
    fun getUsedAudioSource(promise: Promise) {
        promise.resolve(RecordingService.usedAudioSource)
    }

    /**
     * Check if accessibility service is enabled in system settings
     */
    private fun isServiceEnabled(): Boolean {
        val serviceName = "${reactApplicationContext.packageName}/${CallRecordingAccessibilityService::class.java.canonicalName}"
        
        val enabledServices = Settings.Secure.getString(
            reactApplicationContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false

        val colonSplitter = TextUtils.SimpleStringSplitter(':')
        colonSplitter.setString(enabledServices)

        while (colonSplitter.hasNext()) {
            val componentName = colonSplitter.next()
            if (componentName.equals(serviceName, ignoreCase = true)) {
                return true
            }
        }
        return false
    }
}
