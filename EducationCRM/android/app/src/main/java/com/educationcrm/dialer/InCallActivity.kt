package com.educationcrm.dialer

import android.content.Context
import android.media.AudioManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.ImageButton
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.educationcrm.R
import com.educationcrm.dialer.models.CallState
import com.educationcrm.dialer.models.CallStateEnum
import java.util.Timer
import java.util.TimerTask

/**
 * InCallActivity - Custom in-call UI displayed during active calls.
 * 
 * This activity provides:
 * - Phone number display
 * - Call duration timer
 * - Recording indicator
 * - Call control buttons (mute, speaker, end call)
 * - Real-time UI updates based on call state changes
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
class InCallActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "InCallActivity"
        const val EXTRA_CALL_ID = "call_id"
        const val EXTRA_PHONE_NUMBER = "phone_number"
        const val EXTRA_LEAD_ID = "lead_id"
    }
    
    // UI Elements
    private lateinit var tvPhoneNumber: TextView
    private lateinit var tvCallStatus: TextView
    private lateinit var tvCallDuration: TextView
    private lateinit var recordingIndicator: View
    private lateinit var btnMute: ImageButton
    private lateinit var btnSpeaker: ImageButton
    private lateinit var btnEndCall: ImageButton
    private lateinit var tvMuteLabel: TextView
    private lateinit var tvSpeakerLabel: TextView
    
    // Call state
    private var callId: String? = null
    private var phoneNumber: String? = null
    private var leadId: String? = null
    
    // Timer for call duration
    private var durationTimer: Timer? = null
    private var callStartTime: Long = 0
    private val handler = Handler(Looper.getMainLooper())
    
    // Audio manager for mute/speaker control
    private lateinit var audioManager: AudioManager
    
    // State tracking
    private var isMuted = false
    private var isSpeakerOn = false
    
    /**
     * Initializes the activity, sets up UI, and binds to call state.
     * 
     * Requirement 3.1: Display custom in-call Activity within 300ms when call becomes active
     * Requirement 3.2: Display phone number, call duration timer, and recording indicator
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Keep screen on during call
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )
        
        setContentView(R.layout.activity_in_call)
        
        // Get call details from intent
        callId = intent.getStringExtra(EXTRA_CALL_ID)
        phoneNumber = intent.getStringExtra(EXTRA_PHONE_NUMBER)
        leadId = intent.getStringExtra(EXTRA_LEAD_ID)
        
        Log.d(TAG, "onCreate - CallId: $callId, Phone: $phoneNumber")
        
        // Initialize audio manager
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        
        // Initialize UI
        initializeViews()
        setupCallControls()
        
        // Update UI with current call state
        updateUIFromCallState()
        
        // Start monitoring call state
        startCallStateMonitoring()
    }
    
    /**
     * Initializes all UI view references.
     */
    private fun initializeViews() {
        tvPhoneNumber = findViewById(R.id.tvPhoneNumber)
        tvCallStatus = findViewById(R.id.tvCallStatus)
        tvCallDuration = findViewById(R.id.tvCallDuration)
        recordingIndicator = findViewById(R.id.recordingIndicator)
        btnMute = findViewById(R.id.btnMute)
        btnSpeaker = findViewById(R.id.btnSpeaker)
        btnEndCall = findViewById(R.id.btnEndCall)
        tvMuteLabel = findViewById(R.id.tvMuteLabel)
        tvSpeakerLabel = findViewById(R.id.tvSpeakerLabel)
        
        // Set phone number
        tvPhoneNumber.text = formatPhoneNumber(phoneNumber ?: "Unknown")
        tvCallStatus.text = "Calling..."
    }
    
    /**
     * Sets up click handlers for call control buttons.
     * 
     * Requirement 3.3: Provide buttons for mute, speaker, and end call
     * Requirement 3.4: Handle button clicks to control call
     */
    private fun setupCallControls() {
        // Mute button
        btnMute.setOnClickListener {
            toggleMute()
        }
        
        // Speaker button
        btnSpeaker.setOnClickListener {
            toggleSpeaker()
        }
        
        // End call button
        btnEndCall.setOnClickListener {
            endCall()
        }
    }
    
    /**
     * Toggles microphone mute state.
     * 
     * Requirement 3.3: Provide mute functionality
     */
    private fun toggleMute() {
        isMuted = !isMuted
        
        Log.d(TAG, "Toggling mute - NewState: $isMuted")
        
        // Update audio manager
        audioManager.isMicrophoneMute = isMuted
        
        // Update CallManager state
        CallManager.toggleMute()
        
        // Update UI
        updateMuteButton()
    }
    
    /**
     * Toggles speaker phone state.
     * 
     * Requirement 3.3: Provide speaker functionality
     */
    private fun toggleSpeaker() {
        isSpeakerOn = !isSpeakerOn
        
        Log.d(TAG, "Toggling speaker - NewState: $isSpeakerOn")
        
        // Update audio manager
        audioManager.isSpeakerphoneOn = isSpeakerOn
        
        // Update CallManager state
        CallManager.toggleSpeaker()
        
        // Update UI
        updateSpeakerButton()
    }
    
    /**
     * Ends the current call.
     * 
     * Requirement 3.4: End call when user taps end call button
     */
    private fun endCall() {
        Log.d(TAG, "End call button pressed")
        
        val success = CallManager.endCurrentCall()
        
        if (success) {
            // Activity will be finished when call state changes to DISCONNECTED
            Log.d(TAG, "Call ended successfully")
        } else {
            Log.w(TAG, "Failed to end call, finishing activity anyway")
            finish()
        }
    }
    
    /**
     * Updates UI based on current call state from CallManager.
     */
    private fun updateUIFromCallState() {
        val callState = CallManager.getCurrentCall()
        
        if (callState == null) {
            Log.w(TAG, "No current call state available")
            return
        }
        
        // Update call status based on state
        when (callState.state) {
            CallStateEnum.DIALING -> {
                tvCallStatus.text = "Calling..."
                tvCallDuration.visibility = View.GONE
                recordingIndicator.visibility = View.GONE
            }
            CallStateEnum.RINGING -> {
                tvCallStatus.text = "Ringing..."
                tvCallDuration.visibility = View.GONE
                recordingIndicator.visibility = View.GONE
            }
            CallStateEnum.ACTIVE -> {
                tvCallStatus.text = "Connected"
                tvCallDuration.visibility = View.VISIBLE
                
                // Show recording indicator if recording
                if (callState.isRecording) {
                    recordingIndicator.visibility = View.VISIBLE
                }
                
                // Start duration timer if not already started
                if (durationTimer == null && callState.connectTime != null) {
                    callStartTime = callState.connectTime
                    startDurationTimer()
                }
            }
            CallStateEnum.HOLDING -> {
                tvCallStatus.text = "On Hold"
            }
            CallStateEnum.DISCONNECTED -> {
                tvCallStatus.text = "Call Ended"
                stopDurationTimer()
                
                // Finish activity after a short delay
                handler.postDelayed({
                    finish()
                }, 1000)
            }
            else -> {
                tvCallStatus.text = "Unknown"
            }
        }
        
        // Update button states
        isMuted = callState.isMuted
        isSpeakerOn = callState.isSpeakerOn
        updateMuteButton()
        updateSpeakerButton()
    }
    
    /**
     * Starts monitoring call state changes.
     * 
     * Polls CallManager every 500ms to check for state changes.
     */
    private fun startCallStateMonitoring() {
        handler.post(object : Runnable {
            override fun run() {
                val callState = CallManager.getCurrentCall()
                
                if (callState != null) {
                    // Update UI on main thread
                    updateUIFromCallState()
                    
                    // Continue monitoring if call is still active
                    if (callState.state != CallStateEnum.DISCONNECTED) {
                        handler.postDelayed(this, 500)
                    }
                } else {
                    // No call state, finish activity
                    Log.w(TAG, "Call state lost, finishing activity")
                    finish()
                }
            }
        })
    }
    
    /**
     * Starts the call duration timer that updates every second.
     * 
     * Requirement 3.2: Implement call duration timer that updates every second
     */
    private fun startDurationTimer() {
        Log.d(TAG, "Starting duration timer")
        
        durationTimer = Timer()
        durationTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                val duration = (System.currentTimeMillis() - callStartTime) / 1000
                val minutes = (duration / 60).toInt()
                val seconds = (duration % 60).toInt()
                
                handler.post {
                    tvCallDuration.text = String.format("%02d:%02d", minutes, seconds)
                }
            }
        }, 0, 1000) // Update every second
    }
    
    /**
     * Stops the call duration timer.
     */
    private fun stopDurationTimer() {
        Log.d(TAG, "Stopping duration timer")
        
        durationTimer?.cancel()
        durationTimer = null
    }
    
    /**
     * Updates the mute button UI based on current mute state.
     */
    private fun updateMuteButton() {
        if (isMuted) {
            btnMute.setImageResource(R.drawable.ic_mic_off)
            tvMuteLabel.text = getString(R.string.unmute)
            btnMute.alpha = 1.0f
        } else {
            btnMute.setImageResource(R.drawable.ic_mic)
            tvMuteLabel.text = getString(R.string.mute)
            btnMute.alpha = 0.7f
        }
    }
    
    /**
     * Updates the speaker button UI based on current speaker state.
     */
    private fun updateSpeakerButton() {
        if (isSpeakerOn) {
            btnSpeaker.alpha = 1.0f
        } else {
            btnSpeaker.alpha = 0.7f
        }
    }
    
    /**
     * Formats phone number for display.
     * 
     * @param phoneNumber Raw phone number string
     * @return Formatted phone number
     */
    private fun formatPhoneNumber(phoneNumber: String): String {
        // Remove all non-digit characters
        val digits = phoneNumber.replace(Regex("[^0-9]"), "")
        
        // Format based on length
        return when {
            digits.length == 10 -> {
                // US format: (XXX) XXX-XXXX
                "(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}"
            }
            digits.length == 11 && digits.startsWith("1") -> {
                // US format with country code: +1 (XXX) XXX-XXXX
                "+1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}"
            }
            digits.length > 10 -> {
                // International format: +XX XXX XXX XXXX
                "+${digits.substring(0, digits.length - 10)} ${digits.substring(digits.length - 10)}"
            }
            else -> {
                // Return as-is if format is unclear
                phoneNumber
            }
        }
    }
    
    /**
     * Called when activity is paused (goes to background).
     * 
     * Requirement 3.5: Show notification when app goes to background
     */
    override fun onPause() {
        super.onPause()
        
        Log.d(TAG, "onPause - showing notification")
        
        // Show notification when activity goes to background
        val callState = CallManager.getCurrentCall()
        
        if (callState != null && callState.state != CallStateEnum.DISCONNECTED) {
            // Calculate call duration if connected
            val callDuration = if (callState.connectTime != null) {
                val duration = (System.currentTimeMillis() - callState.connectTime) / 1000
                val minutes = (duration / 60).toInt()
                val seconds = (duration % 60).toInt()
                String.format("%02d:%02d", minutes, seconds)
            } else {
                null
            }
            
            InCallNotificationManager.showCallNotification(
                context = this,
                phoneNumber = callState.phoneNumber,
                callDuration = callDuration,
                isRecording = callState.isRecording,
                isMuted = callState.isMuted
            )
        }
    }
    
    /**
     * Called when activity is resumed (comes to foreground).
     * 
     * Cancels the notification since the UI is now visible.
     */
    override fun onResume() {
        super.onResume()
        
        Log.d(TAG, "onResume - canceling notification")
        
        // Cancel notification when activity is in foreground
        InCallNotificationManager.cancelCallNotification(this)
    }
    
    /**
     * Cleanup when activity is destroyed.
     */
    override fun onDestroy() {
        super.onDestroy()
        
        Log.d(TAG, "onDestroy")
        
        // Stop duration timer
        stopDurationTimer()
        
        // Remove all handler callbacks
        handler.removeCallbacksAndMessages(null)
        
        // Cancel notification
        InCallNotificationManager.cancelCallNotification(this)
    }
    
    /**
     * Handle back button press - minimize to notification instead of closing.
     */
    override fun onBackPressed() {
        // Move task to back instead of finishing
        moveTaskToBack(true)
    }
}
