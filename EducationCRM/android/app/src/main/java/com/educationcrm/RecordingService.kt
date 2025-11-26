package com.educationcrm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import java.io.File
import java.io.IOException

class RecordingService : Service() {

    private var mediaRecorder: MediaRecorder? = null
    private var recordingFilePath: String? = null
    private var recordingStartTime: Long = 0

    companion object {
        const val ACTION_START_RECORDING = "com.educationcrm.action.START_RECORDING"
        const val ACTION_STOP_RECORDING = "com.educationcrm.action.STOP_RECORDING"
        const val EXTRA_FILE_PATH = "com.educationcrm.extra.FILE_PATH"
        const val EXTRA_SAMPLE_RATE = "com.educationcrm.extra.SAMPLE_RATE"
        const val EXTRA_BIT_RATE = "com.educationcrm.extra.BIT_RATE"
        
        const val CHANNEL_ID = "CallRecordingChannel"
        const val NOTIFICATION_ID = 12345
        
        // Static access to current recording state for the module to query
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
        
        private var startTime: Long = 0
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_RECORDING -> {
                val filePath = intent.getStringExtra(EXTRA_FILE_PATH)
                val sampleRate = intent.getIntExtra(EXTRA_SAMPLE_RATE, 44100)
                val bitRate = intent.getIntExtra(EXTRA_BIT_RATE, 96000)
                
                if (filePath != null) {
                    startRecording(filePath, sampleRate, bitRate)
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
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    private fun startRecording(filePath: String, sampleRate: Int, bitRate: Int) {
        createNotificationChannel()
        
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Call Recording")
            .setContentText("Recording in progress...")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now) // Using system icon for now
            .build()

        startForeground(NOTIFICATION_ID, notification)

        try {
            // Stop any existing recording
            stopRecordingInternal()

            recordingFilePath = filePath
            recordingStartTime = System.currentTimeMillis()
            startTime = recordingStartTime

            // Create parent directory if it doesn't exist
            val file = File(filePath)
            file.parentFile?.mkdirs()

            // Create MediaRecorder instance
            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            mediaRecorder?.apply {
                // Set audio source - use MIC for all versions to support speaker mode recording
                val audioSource = MediaRecorder.AudioSource.MIC
                setAudioSource(audioSource)

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

                // Prepare and start recording
                prepare()
                start()
                
                isRecording = true
                android.util.Log.d("RecordingService", "Recording started: $filePath")
            }
        } catch (e: Exception) {
            android.util.Log.e("RecordingService", "Failed to start recording", e)
            stopSelf()
        }
    }

    private fun stopRecording() {
        stopRecordingInternal()
        stopForeground(true)
        stopSelf()
    }

    private fun stopRecordingInternal() {
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
        } catch (e: Exception) {
            android.util.Log.e("RecordingService", "Error stopping recorder", e)
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
