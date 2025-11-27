package com.educationcrm.dialer

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * CallNotificationReceiver - Handles actions from call notification.
 * 
 * This receiver processes:
 * - Mute/unmute action from notification
 * - End call action from notification
 * 
 * Requirement 3.5: Handle notification actions for mute and end call
 */
class CallNotificationReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "CallNotificationReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Received action: ${intent.action}")
        
        when (intent.action) {
            InCallNotificationManager.ACTION_MUTE -> {
                handleMuteAction(context)
            }
            InCallNotificationManager.ACTION_END_CALL -> {
                handleEndCallAction(context)
            }
            else -> {
                Log.w(TAG, "Unknown action: ${intent.action}")
            }
        }
    }
    
    /**
     * Handles the mute action from notification.
     * 
     * Toggles the mute state and updates the notification.
     */
    private fun handleMuteAction(context: Context) {
        Log.d(TAG, "Handling mute action")
        
        // Toggle mute through CallManager
        val success = CallManager.toggleMute()
        
        if (success) {
            // Get current call state to update notification
            val callState = CallManager.getCurrentCall()
            
            if (callState != null) {
                // Calculate call duration if connected
                val callDuration = if (callState.connectTime != null) {
                    val duration = (System.currentTimeMillis() - callState.connectTime) / 1000
                    val minutes = (duration / 60).toInt()
                    val seconds = (duration % 60).toInt()
                    String.format("%02d:%02d", minutes, seconds)
                } else {
                    null
                }
                
                // Update notification with new mute state
                InCallNotificationManager.updateCallNotification(
                    context = context,
                    phoneNumber = callState.phoneNumber,
                    callDuration = callDuration,
                    isRecording = callState.isRecording,
                    isMuted = callState.isMuted
                )
            }
        } else {
            Log.w(TAG, "Failed to toggle mute")
        }
    }
    
    /**
     * Handles the end call action from notification.
     * 
     * Ends the current call and cancels the notification.
     */
    private fun handleEndCallAction(context: Context) {
        Log.d(TAG, "Handling end call action")
        
        // End call through CallManager
        val success = CallManager.endCurrentCall()
        
        if (success) {
            // Cancel notification
            InCallNotificationManager.cancelCallNotification(context)
        } else {
            Log.w(TAG, "Failed to end call")
        }
    }
}
