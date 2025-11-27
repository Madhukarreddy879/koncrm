package com.educationcrm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import java.io.File

class RecordingService : Service() {

    private var mediaRecorder: MediaRecorder? = null
    private var recordingFilePath: String? = null
    private var recordingStartTime: Long = 0
    private var currentAudioSource: Int = MediaRecorder.AudioSource.MIC

    companion object {
        const val ACTION_START_RECORDING = "com.educationcrm.action.START_RECORDING"
        const val ACTION_STOP_RECORDING = "com.educationcrm.action.STOP_RECORDING"
        const val ACTION_START_CALL_RECORDING = "com.educationcrm.action.START_CALL_RECORDING"
        const val EXTRA_FILE_PATH = "com.educationcrm.extra.FILE_PATH"
        const val EXTRA_SAMPLE_RATE = "com.educationcrm.extra.SAMPLE_RATE"
        const val EXTRA_BIT_RATE = "com.educationcrm.extra.BIT_RATE"
        const val EXTRA_PHONE_NUMBER = "com.educationcrm.extra.PHONE_NUMBER"
        
        const val CHANNEL_ID = "CallRecordingChannel"
        const val NOTIFICATION_ID = 12345
        const val PREFS_NAME = "CallRecordingPrefs"
        const val PREF_WORKING_AUDIO_SOURCE = "working_audio_source"
        const val PREF_LAST_RECORDING_SUCCESS = "last_recording_success"
        
        // Audio sources to try in order of preference
        val AUDIO_SOURCES = listOf(
            MediaRecorder.AudioSource.VOICE_CALL,           // Best - captures both sides
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,  // Good for VoIP-style
            MediaRecorder.AudioSource.VOICE_RECOGNITION,    // Sometimes works
            MediaRecorder.AudioSource.MIC                   // Fallback - needs speaker
        )
        
        // Static access to current recording state
        var isRecording = false
            private set
        var currentDuration = 0.0
            get() {
                return if (isRecording && startTime > 0) {
                    (System.currentTimeMillis() - startTime) / 1000.0
                } else {
                    0.0
                }
            }
            private set
        var usedAudioSource: String = "MIC"
            private set
        
        private var startTime: Long = 0
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_RECORDING, ACTION_START_CALL_RECORDING -> {
                val filePath = intent.getStringExtra(EXTRA_FILE_PATH)
                val sampleRate = intent.getIntExtra(EXTRA_SAMPLE_RATE, 44100)
                val bitRate = intent.getIntExtra(EXTRA_BIT_RATE, 96000)
                
                if (filePath != null) {
                    startRecordingWithBestSource(filePath, sampleRate, bitRate)
                }
            }
            ACTION_STOP_RECORDING -> {
                stopRecording()
            }
        }
        return START_NOT_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Call Recording Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when call recording is active"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    private fun createNotification(audioSourceName: String): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Recording Call")
            .setContentText("Using: $audioSourceName")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }


    /**
     * Try to start recording with the best available audio source.
     * Tries VOICE_CALL first, then falls back to other sources.
     */
    private fun startRecordingWithBestSource(filePath: String, sampleRate: Int, bitRate: Int) {
        createNotificationChannel()
        
        // Stop any existing recording
        stopRecordingInternal()

        recordingFilePath = filePath
        
        // Create parent directory
        val file = File(filePath)
        file.parentFile?.mkdirs()

        // Get previously working audio source (if any)
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedSource = prefs.getInt(PREF_WORKING_AUDIO_SOURCE, -1)
        
        // Build list of sources to try - put saved source first if it exists
        val sourcesToTry = if (savedSource != -1 && AUDIO_SOURCES.contains(savedSource)) {
            listOf(savedSource) + AUDIO_SOURCES.filter { it != savedSource }
        } else {
            AUDIO_SOURCES
        }

        var recordingStarted = false
        
        android.util.Log.i("RecordingService", "=== Starting recording attempt with ${sourcesToTry.size} audio sources ===")
        
        for (audioSource in sourcesToTry) {
            try {
                android.util.Log.i("RecordingService", "Trying audio source: ${getAudioSourceName(audioSource)}")
                
                if (tryStartRecording(filePath, sampleRate, bitRate, audioSource)) {
                    currentAudioSource = audioSource
                    usedAudioSource = getAudioSourceName(audioSource)
                    recordingStarted = true
                    
                    // Save this as the working source
                    prefs.edit().putInt(PREF_WORKING_AUDIO_SOURCE, audioSource).apply()
                    
                    android.util.Log.i("RecordingService", "✓ Recording started successfully with: $usedAudioSource")
                    break
                } else {
                    android.util.Log.w("RecordingService", "✗ Audio source ${getAudioSourceName(audioSource)} returned false")
                }
            } catch (e: Exception) {
                android.util.Log.w("RecordingService", "✗ Audio source ${getAudioSourceName(audioSource)} threw exception: ${e.message}")
                // Clean up failed attempt
                cleanupFailedRecorder()
            }
        }
        
        android.util.Log.i("RecordingService", "=== Recording attempt complete. Success: $recordingStarted ===")

        if (recordingStarted) {
            recordingStartTime = System.currentTimeMillis()
            startTime = recordingStartTime
            isRecording = true
            
            // Start foreground with notification
            startForeground(NOTIFICATION_ID, createNotification(usedAudioSource))
            
            // Broadcast that recording started
            sendBroadcast(Intent("com.educationcrm.RECORDING_STARTED").apply {
                putExtra("audioSource", usedAudioSource)
                putExtra("filePath", filePath)
            })
            
            android.util.Log.i("RecordingService", "Foreground service started with notification")
        } else {
            android.util.Log.e("RecordingService", "❌ FAILED to start recording with ANY audio source - stopping service")
            stopSelf()
        }
    }

    private fun tryStartRecording(filePath: String, sampleRate: Int, bitRate: Int, audioSource: Int): Boolean {
        return try {
            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            mediaRecorder?.apply {
                setAudioSource(audioSource)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(sampleRate)
                setAudioEncodingBitRate(bitRate)
                setOutputFile(filePath)
                prepare()
                start()
            }
            true
        } catch (e: Exception) {
            android.util.Log.e("RecordingService", "Failed with source ${getAudioSourceName(audioSource)}: ${e.message}")
            cleanupFailedRecorder()
            false
        }
    }

    private fun cleanupFailedRecorder() {
        try {
            mediaRecorder?.release()
        } catch (e: Exception) {
            // Ignore
        }
        mediaRecorder = null
    }

    private fun getAudioSourceName(source: Int): String {
        return when (source) {
            MediaRecorder.AudioSource.VOICE_CALL -> "VOICE_CALL"
            MediaRecorder.AudioSource.VOICE_COMMUNICATION -> "VOICE_COMMUNICATION"
            MediaRecorder.AudioSource.VOICE_RECOGNITION -> "VOICE_RECOGNITION"
            MediaRecorder.AudioSource.MIC -> "MIC"
            else -> "UNKNOWN"
        }
    }

    private fun stopRecording() {
        val wasRecording = isRecording
        val duration = currentDuration
        val filePath = recordingFilePath
        
        stopRecordingInternal()
        stopForeground(STOP_FOREGROUND_REMOVE)
        
        if (wasRecording && filePath != null) {
            // Check if file has content
            val file = File(filePath)
            val fileSize = if (file.exists()) file.length() else 0
            
            // Broadcast recording stopped
            sendBroadcast(Intent("com.educationcrm.RECORDING_STOPPED").apply {
                putExtra("filePath", filePath)
                putExtra("duration", duration)
                putExtra("fileSize", fileSize)
                putExtra("audioSource", usedAudioSource)
            })
            
            android.util.Log.d("RecordingService", "Recording stopped. Duration: $duration, Size: $fileSize bytes")
        }
        
        stopSelf()
    }

    private fun stopRecordingInternal() {
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
        } catch (e: Exception) {
            android.util.Log.e("RecordingService", "Error stopping recorder: ${e.message}")
        } finally {
            mediaRecorder = null
            isRecording = false
            recordingFilePath = null
            startTime = 0
        }
    }

    override fun onDestroy() {
        stopRecordingInternal()
        super.onDestroy()
    }
}
