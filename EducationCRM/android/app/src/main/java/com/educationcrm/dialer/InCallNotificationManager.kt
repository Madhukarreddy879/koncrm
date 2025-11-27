package com.educationcrm.dialer

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.educationcrm.R

/**
 * InCallNotificationManager - Manages notifications for ongoing calls.
 * 
 * This class handles:
 * - Creating notification channel for call notifications
 * - Building high-priority notifications for ongoing calls
 * - Adding notification actions (mute, end call)
 * - Updating notification when app goes to background
 * 
 * Requirement 3.5: Show notification when app goes to background
 */
object InCallNotificationManager {
    
    private const val TAG = "InCallNotificationManager"
    private const val CHANNEL_ID = "in_call_notifications"
    private const val CHANNEL_NAME = "Ongoing Calls"
    private const val NOTIFICATION_ID = 1001
    
    // Action identifiers for notification actions
    const val ACTION_MUTE = "com.educationcrm.ACTION_MUTE"
    const val ACTION_END_CALL = "com.educationcrm.ACTION_END_CALL"
    
    /**
     * Creates the notification channel for call notifications.
     * 
     * This should be called when the app starts or before showing the first notification.
     * 
     * @param context Application context
     */
    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for ongoing phone calls"
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                enableVibration(false) // Don't vibrate for ongoing call notifications
                setSound(null, null) // No sound for ongoing call notifications
            }
            
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    /**
     * Shows a high-priority notification for an ongoing call.
     * 
     * The notification includes:
     * - Phone number being called
     * - Call duration (if connected)
     * - Recording indicator (if recording)
     * - Action buttons for mute and end call
     * - Tap action to return to InCallActivity
     * 
     * Requirement 3.5: Create high-priority notification for ongoing call
     * 
     * @param context Application context
     * @param phoneNumber Phone number being called
     * @param callDuration Call duration string (e.g., "00:42") or null if not connected
     * @param isRecording Whether the call is being recorded
     * @param isMuted Whether the microphone is muted
     * @return The built Notification object
     */
    fun showCallNotification(
        context: Context,
        phoneNumber: String,
        callDuration: String? = null,
        isRecording: Boolean = false,
        isMuted: Boolean = false
    ): Notification {
        // Ensure channel exists
        createNotificationChannel(context)
        
        // Create intent to return to InCallActivity
        val intent = Intent(context, InCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Build notification content
        val contentTitle = if (callDuration != null) {
            "Ongoing Call - $callDuration"
        } else {
            context.getString(R.string.ongoing_call)
        }
        
        val contentText = buildString {
            append(phoneNumber)
            if (isRecording) {
                append(" • Recording")
            }
            if (isMuted) {
                append(" • Muted")
            }
        }
        
        // Build notification
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle(contentTitle)
            .setContentText(contentText)
            .setContentIntent(pendingIntent)
            .setOngoing(true) // Cannot be dismissed by user
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(false)
            .setShowWhen(true)
            .setUsesChronometer(callDuration != null) // Show timer if call is connected
        
        // Add mute action
        val muteAction = createMuteAction(context, isMuted)
        builder.addAction(muteAction)
        
        // Add end call action
        val endCallAction = createEndCallAction(context)
        builder.addAction(endCallAction)
        
        // Show notification
        val notification = builder.build()
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
        
        return notification
    }
    
    /**
     * Creates the mute/unmute notification action.
     * 
     * Requirement 3.5: Add notification action for mute
     * 
     * @param context Application context
     * @param isMuted Current mute state
     * @return NotificationCompat.Action for mute/unmute
     */
    private fun createMuteAction(context: Context, isMuted: Boolean): NotificationCompat.Action {
        val muteIntent = Intent(context, CallNotificationReceiver::class.java).apply {
            action = ACTION_MUTE
        }
        
        val mutePendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            muteIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val muteLabel = if (isMuted) {
            context.getString(R.string.unmute)
        } else {
            context.getString(R.string.mute)
        }
        
        return NotificationCompat.Action.Builder(
            android.R.drawable.ic_btn_speak_now,
            muteLabel,
            mutePendingIntent
        ).build()
    }
    
    /**
     * Creates the end call notification action.
     * 
     * Requirement 3.5: Add notification action for end call
     * 
     * @param context Application context
     * @return NotificationCompat.Action for ending call
     */
    private fun createEndCallAction(context: Context): NotificationCompat.Action {
        val endCallIntent = Intent(context, CallNotificationReceiver::class.java).apply {
            action = ACTION_END_CALL
        }
        
        val endCallPendingIntent = PendingIntent.getBroadcast(
            context,
            1,
            endCallIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Action.Builder(
            android.R.drawable.ic_menu_close_clear_cancel,
            context.getString(R.string.end_call),
            endCallPendingIntent
        ).build()
    }
    
    /**
     * Updates the ongoing call notification.
     * 
     * This should be called when call state changes (e.g., duration updates, mute state changes).
     * 
     * @param context Application context
     * @param phoneNumber Phone number being called
     * @param callDuration Call duration string (e.g., "00:42") or null if not connected
     * @param isRecording Whether the call is being recorded
     * @param isMuted Whether the microphone is muted
     */
    fun updateCallNotification(
        context: Context,
        phoneNumber: String,
        callDuration: String? = null,
        isRecording: Boolean = false,
        isMuted: Boolean = false
    ) {
        showCallNotification(context, phoneNumber, callDuration, isRecording, isMuted)
    }
    
    /**
     * Cancels the ongoing call notification.
     * 
     * This should be called when the call ends.
     * 
     * @param context Application context
     */
    fun cancelCallNotification(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(NOTIFICATION_ID)
    }
}
