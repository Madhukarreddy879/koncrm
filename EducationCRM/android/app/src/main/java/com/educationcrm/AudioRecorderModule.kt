package com.educationcrm

import android.media.MediaRecorder
import android.os.Build
import com.facebook.react.bridge.*
import java.io.File
import java.io.IOException

class AudioRecorderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private var mediaRecorder: MediaRecorder? = null
    private var recordingFilePath: String? = null
    private var recordingStartTime: Long = 0
    
    override fun getName(): String {
        return "AudioRecorderModule"
    }
    
    @ReactMethod
    fun startRecording(filePath: String, sampleRate: Int, bitRate: Int, promise: Promise) {
        try {
            android.util.Log.d("AudioRecorder", "startRecording called with filePath: $filePath, sampleRate: $sampleRate, bitRate: $bitRate")
            
            // Stop any existing recording
            stopRecordingInternal()
            
            recordingFilePath = filePath
            recordingStartTime = System.currentTimeMillis()
            
            // Create parent directory if it doesn't exist
            val file = File(filePath)
            file.parentFile?.mkdirs()
            
            android.util.Log.d("AudioRecorder", "Creating MediaRecorder instance")
            
            // Create MediaRecorder instance
            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(reactApplicationContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }
            
            mediaRecorder?.apply {
                android.util.Log.d("AudioRecorder", "Configuring MediaRecorder")
                
                // Set audio source (MIC for microphone)
                setAudioSource(MediaRecorder.AudioSource.MIC)
                
                // Set output format (AAC in MP4 container)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                
                // Set audio encoder (AAC)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                
                // Set sample rate
                setAudioSamplingRate(sampleRate)
                
                // Set bit rate
                setAudioEncodingBitRate(bitRate)
                
                // Set output file
                setOutputFile(filePath)
                
                android.util.Log.d("AudioRecorder", "Preparing MediaRecorder")
                // Prepare and start recording
                prepare()
                
                android.util.Log.d("AudioRecorder", "Starting MediaRecorder")
                start()
                
                android.util.Log.d("AudioRecorder", "Recording started successfully")
                promise.resolve(filePath)
            }
        } catch (e: IOException) {
            android.util.Log.e("AudioRecorder", "IOException: ${e.message}", e)
            promise.reject("RECORDING_ERROR", "Failed to start recording (IOException): ${e.message}", e)
        } catch (e: IllegalStateException) {
            android.util.Log.e("AudioRecorder", "IllegalStateException: ${e.message}", e)
            promise.reject("RECORDING_ERROR", "Failed to start recording (IllegalStateException): ${e.message}", e)
        } catch (e: SecurityException) {
            android.util.Log.e("AudioRecorder", "SecurityException: ${e.message}", e)
            promise.reject("RECORDING_ERROR", "Failed to start recording (Permission denied): ${e.message}", e)
        } catch (e: Exception) {
            android.util.Log.e("AudioRecorder", "Exception: ${e.message}", e)
            promise.reject("RECORDING_ERROR", "Failed to start recording: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun stopRecording(promise: Promise) {
        try {
            // Check if recording is in progress before stopping
            if (mediaRecorder == null || recordingFilePath == null) {
                promise.reject("RECORDING_ERROR", "No recording in progress")
                return
            }
            
            val duration = (System.currentTimeMillis() - recordingStartTime) / 1000.0
            val filePath = recordingFilePath!!
            val startTime = recordingStartTime
            
            stopRecordingInternal()
            
            val file = File(filePath)
            val fileSize = if (file.exists()) file.length() else 0L
            
            val result = Arguments.createMap().apply {
                putString("filePath", filePath)
                putDouble("duration", duration)
                putDouble("fileSize", fileSize.toDouble())
                putDouble("timestamp", startTime.toDouble())
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("RECORDING_ERROR", "Failed to stop recording: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun cancelRecording(promise: Promise) {
        try {
            val filePath = recordingFilePath
            stopRecordingInternal()
            
            // Delete the recording file
            if (filePath != null) {
                val file = File(filePath)
                if (file.exists()) {
                    file.delete()
                }
            }
            
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("RECORDING_ERROR", "Failed to cancel recording: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun isRecording(promise: Promise) {
        promise.resolve(mediaRecorder != null)
    }
    
    @ReactMethod
    fun getCurrentDuration(promise: Promise) {
        if (mediaRecorder != null && recordingStartTime > 0) {
            val duration = (System.currentTimeMillis() - recordingStartTime) / 1000.0
            promise.resolve(duration)
        } else {
            promise.resolve(0.0)
        }
    }
    
    private fun stopRecordingInternal() {
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
        } catch (e: Exception) {
            // Ignore errors during stop
        } finally {
            mediaRecorder = null
            recordingFilePath = null
            recordingStartTime = 0
        }
    }
    
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        stopRecordingInternal()
    }
}
