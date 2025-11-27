package com.educationcrm.dialer

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.MediaRecorder
import android.os.Build
import android.os.Environment
import android.os.IBinder
import android.os.StatFs
import androidx.core.app.NotificationCompat
import com.educationcrm.R
import com.educationcrm.dialer.models.RecordingResult
import java.io.File

/**
 * Foreground service specifically for dialer-initiated call recordings.
 * This is separate from the existing RecordingService.kt to handle recordings
 * triggered by the custom dialer ConnectionService.
 */
class DialerRecordingService : Service() {

    private var mediaRecorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var recordingStartTime: Long = 0
    private var currentCallId: String? = null
    private var currentPhoneNumber: String? = null
    private var currentLeadId: String? = null

    companion object {
        const val ACTION_START_RECORDING = "com.educationcrm.dialer.action.START_RECORDING"
        const val ACTION_STOP_RECORDING = "com.educationcrm.dialer.action.STOP_RECORDING"
        
        const val EXTRA_CALL_ID = "call_id"
        const val EXTRA_PHONE_NUMBER = "phone_number"
        const val EXTRA_LEAD_ID = "lead_id"
        
        const val CHANNEL_ID = "DialerCallRecordingChannel"
        const val NOTIFICATION_ID = 54321
        
        const val MIN_STORAGE_BYTES = 100L * 1024 * 1024 // 100MB
        
        // Broadcast actions for event emission
        const val BROADCAST_RECORDING_STARTED = "com.educationcrm.dialer.RECORDING_STARTED"
        const val BROADCAST_RECORDING_STOPPED = "com.educationcrm.dialer.RECORDING_STOPPED"
        const val BROADCAST_RECORDING_ERROR = "com.educationcrm.dialer.RECORDING_ERROR"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_RECORDING -> {
                val callId = intent.getStringExtra(EXTRA_CALL_ID)
                val phoneNumber = intent.getStringExtra(EXTRA_PHONE_NUMBER)
                val leadId = intent.getStringExtra(EXTRA_LEAD_ID)
                
                if (callId != null && phoneNumber != null && leadId != null) {
                    startRecording(callId, phoneNumber, leadId)
                } else {
                    android.util.Log.e("DialerRecordingService", "Missing required parameters for recording")
                    stopSelf()
                }
            }
            ACTION_STOP_RECORDING -> {
                stopRecording()
            }
        }
        return START_NOT_STICKY
    }

    /**
     * Creates the notification channel for call recording notifications.
     * Required for Android O (API 26) and above.
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Dialer Call Recording",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when dialer call recording is active"
                setShowBadge(false)
                setSound(null, null)
            }
            
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    /**
     * Creates the persistent notification shown during recording.
     */
    private fun createNotification(): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Recording Call")
            .setContentText("Call recording in progress")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }

    /**
     * Starts recording for the given call.
     * Checks storage availability before starting.
     */
    private fun startRecording(callId: String, phoneNumber: String, leadId: String) {
        android.util.Log.i("DialerRecordingService", "Starting recording for call: $callId")
        
        // Check storage availability
        if (!hasEnoughStorage()) {
            android.util.Log.w("DialerRecordingService", "Low storage warning: less than 100MB available")
            emitRecordingError(callId, "Low storage space", "LOW_STORAGE")
            // Continue anyway but warn
        }
        
        currentCallId = callId
        currentPhoneNumber = phoneNumber
        currentLeadId = leadId
        
        try {
            // Create output file
            outputFile = createOutputFile(callId, phoneNumber)
            
            // Setup MediaRecorder
            setupMediaRecorder(outputFile!!)
            
            // Start recording
            mediaRecorder?.start()
            recordingStartTime = System.currentTimeMillis()
            
            // Start foreground service with notification
            startForeground(NOTIFICATION_ID, createNotification())
            
            // Emit recording started event
            emitRecordingStarted(callId)
            
            android.util.Log.i("DialerRecordingService", "Recording started successfully")
            
        } catch (e: Exception) {
            android.util.Log.e("DialerRecordingService", "Failed to start recording: ${e.message}", e)
            emitRecordingError(callId, e.message ?: "Unknown error", "RECORDING_INIT_FAILED")
            cleanupRecorder()
            stopSelf()
        }
    }

    /**
     * Stops the current recording and returns the result.
     */
    private fun stopRecording() {
        android.util.Log.i("DialerRecordingService", "Stopping recording")
        
        val callId = currentCallId
        val phoneNumber = currentPhoneNumber
        val leadId = currentLeadId
        val file = outputFile
        
        if (callId == null || phoneNumber == null || leadId == null || file == null) {
            android.util.Log.w("DialerRecordingService", "No active recording to stop")
            stopSelf()
            return
        }
        
        try {
            // Stop and release MediaRecorder
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            
            // Calculate duration and file size
            val duration = System.currentTimeMillis() - recordingStartTime
            val fileSize = if (file.exists()) file.length() else 0L
            
            // Create result
            val result = RecordingResult(
                callId = callId,
                filePath = file.absolutePath,
                duration = duration,
                fileSize = fileSize,
                phoneNumber = phoneNumber,
                leadId = leadId,
                timestamp = recordingStartTime
            )
            
            // Emit recording stopped event
            emitRecordingStopped(result)
            
            android.util.Log.i("DialerRecordingService", "Recording stopped. Duration: ${duration}ms, Size: ${fileSize} bytes")
            
        } catch (e: Exception) {
            android.util.Log.e("DialerRecordingService", "Error stopping recording: ${e.message}", e)
            emitRecordingError(callId, e.message ?: "Unknown error", "RECORDING_STOP_FAILED")
        } finally {
            cleanupRecorder()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    /**
     * Configures MediaRecorder with the specified audio settings.
     * Matches the configuration from existing RecordingService.kt for consistency.
     */
    private fun setupMediaRecorder(outputFile: File) {
        mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(this)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }
        
        mediaRecorder?.apply {
            // Use VOICE_RECOGNITION as specified in requirements
            setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setAudioSamplingRate(44100)
            setAudioEncodingBitRate(128000)
            setOutputFile(outputFile.absolutePath)
            
            // Set privacy sensitive to false on Android 11+ to allow recording during calls
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                setPrivacySensitive(false)
            }
            
            prepare()
        }
    }

    /**
     * Creates the output file for the recording.
     * Uses naming convention: call_{timestamp}_{phone}.m4a
     */
    private fun createOutputFile(callId: String, phoneNumber: String): File {
        val timestamp = System.currentTimeMillis()
        val sanitizedPhone = phoneNumber.replace(Regex("[^0-9]"), "")
        val fileName = "call_${timestamp}_${sanitizedPhone}.m4a"
        
        // Save to app's private files directory (same location as existing recordings)
        val recordingsDir = File(filesDir, "recordings")
        recordingsDir.mkdirs()
        
        return File(recordingsDir, fileName)
    }

    /**
     * Checks if there's enough storage available.
     * Returns false if less than 100MB is available.
     */
    private fun hasEnoughStorage(): Boolean {
        return try {
            val stat = StatFs(filesDir.absolutePath)
            val availableBytes = stat.availableBlocksLong * stat.blockSizeLong
            availableBytes >= MIN_STORAGE_BYTES
        } catch (e: Exception) {
            android.util.Log.e("DialerRecordingService", "Error checking storage: ${e.message}")
            true // Assume enough storage if check fails
        }
    }

    /**
     * Cleans up MediaRecorder resources.
     */
    private fun cleanupRecorder() {
        try {
            mediaRecorder?.release()
        } catch (e: Exception) {
            android.util.Log.e("DialerRecordingService", "Error releasing MediaRecorder: ${e.message}")
        } finally {
            mediaRecorder = null
            currentCallId = null
            currentPhoneNumber = null
            currentLeadId = null
            outputFile = null
            recordingStartTime = 0
        }
    }

    /**
     * Emits recording started event to DialerBridgeModule.
     */
    private fun emitRecordingStarted(callId: String) {
        val intent = Intent(BROADCAST_RECORDING_STARTED).apply {
            putExtra("callId", callId)
        }
        sendBroadcast(intent)
    }

    /**
     * Emits recording stopped event to DialerBridgeModule.
     */
    private fun emitRecordingStopped(result: RecordingResult) {
        val intent = Intent(BROADCAST_RECORDING_STOPPED).apply {
            putExtra("callId", result.callId)
            putExtra("filePath", result.filePath)
            putExtra("duration", result.duration)
            putExtra("fileSize", result.fileSize)
            putExtra("phoneNumber", result.phoneNumber)
            putExtra("leadId", result.leadId)
            putExtra("timestamp", result.timestamp)
        }
        sendBroadcast(intent)
    }

    /**
     * Emits recording error event to DialerBridgeModule.
     */
    private fun emitRecordingError(callId: String, error: String, code: String) {
        val intent = Intent(BROADCAST_RECORDING_ERROR).apply {
            putExtra("callId", callId)
            putExtra("error", error)
            putExtra("code", code)
        }
        sendBroadcast(intent)
    }

    override fun onDestroy() {
        cleanupRecorder()
        super.onDestroy()
    }
}
