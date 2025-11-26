package com.educationcrm

import android.media.MediaRecorder
import android.os.Build
import com.facebook.react.bridge.*
import java.io.File
import java.io.IOException

class AudioRecorderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "AudioRecorderModule"
    }
    
    @ReactMethod
    fun startRecording(filePath: String, sampleRate: Int, bitRate: Int, promise: Promise) {
        try {
            android.util.Log.d("AudioRecorder", "startRecording called with filePath: $filePath")
            
            val intent = android.content.Intent(reactApplicationContext, RecordingService::class.java).apply {
                action = RecordingService.ACTION_START_RECORDING
                putExtra(RecordingService.EXTRA_FILE_PATH, filePath)
                putExtra(RecordingService.EXTRA_SAMPLE_RATE, sampleRate)
                putExtra(RecordingService.EXTRA_BIT_RATE, bitRate)
            }
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            
            promise.resolve(filePath)
        } catch (e: Exception) {
            android.util.Log.e("AudioRecorder", "Failed to start service", e)
            promise.reject("RECORDING_ERROR", "Failed to start recording service: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun stopRecording(promise: Promise) {
        try {
            // Get final stats before stopping
            val duration = RecordingService.currentDuration
            val isRecording = RecordingService.isRecording
            
            if (!isRecording) {
                promise.reject("RECORDING_ERROR", "No recording in progress")
                return
            }
            
            // Stop the service
            val intent = android.content.Intent(reactApplicationContext, RecordingService::class.java).apply {
                action = RecordingService.ACTION_STOP_RECORDING
            }
            reactApplicationContext.startService(intent)
            
            // Return metadata
            // Note: We can't easily get the exact file size here since the service might still be writing
            // But for UI purposes, we can estimate or check the file
            val result = Arguments.createMap().apply {
                // We assume the file path passed in startRecording is valid
                // Since we don't store it here anymore, we might need to rely on the caller knowing it
                // OR we could expose it from the service. 
                // For simplicity, we'll return basic stats.
                putDouble("duration", duration)
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("RECORDING_ERROR", "Failed to stop recording: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun cancelRecording(promise: Promise) {
        try {
            val intent = android.content.Intent(reactApplicationContext, RecordingService::class.java).apply {
                action = RecordingService.ACTION_STOP_RECORDING
            }
            reactApplicationContext.startService(intent)
            
            // Note: File deletion should be handled by the caller or we need to pass the path to delete
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("RECORDING_ERROR", "Failed to cancel recording: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun isRecording(promise: Promise) {
        promise.resolve(RecordingService.isRecording)
    }
    
    @ReactMethod
    fun getCurrentDuration(promise: Promise) {
        promise.resolve(RecordingService.currentDuration)
    }
}
