package com.educationcrm.dialer

import android.content.Context
import android.telecom.Connection
import android.telecom.DisconnectCause
import android.util.Log
import com.educationcrm.dialer.models.CallState
import com.educationcrm.dialer.models.CallStateEnum

/**
 * CrmConnection - Connection implementation for managing individual call lifecycle.
 * 
 * This class extends Android's Connection class to handle:
 * - Call state transitions (DIALING, ACTIVE, DISCONNECTED)
 * - Call control operations (disconnect, hold, DTMF)
 * - Event emission to React Native layer
 * - Recording triggers based on call state
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.7
 */
class CrmConnection(
    private val context: Context,
    private val callId: String,
    private val phoneNumber: String,
    private val leadId: String
) : Connection() {
    
    companion object {
        private const val TAG = "CrmConnection"
    }
    
    private var callState: CallState
    private val startTime: Long = System.currentTimeMillis()
    private var connectTime: Long? = null
    private var endTime: Long? = null
    
    init {
        // Initialize call state
        callState = CallState(
            callId = callId,
            phoneNumber = phoneNumber,
            leadId = leadId,
            state = CallStateEnum.IDLE,
            startTime = startTime
        )
        
        // Set connection capabilities
        setConnectionCapabilities(
            CAPABILITY_SUPPORT_HOLD or
            CAPABILITY_HOLD or
            CAPABILITY_MUTE
        )
        
        // Set audio mode to allow speaker/earpiece switching
        setAudioModeIsVoip(false)
        
        // Register this call with CallManager
        CallManager.setCurrentCall(callState, this)
        
        Log.d(TAG, "CrmConnection initialized - CallId: $callId, Phone: $phoneNumber")
    }
    
    /**
     * Called when the connection state changes.
     * 
     * Tracks state transitions and triggers appropriate actions:
     * - DIALING: Emit CALL_STARTED event
     * - ACTIVE: Emit CALL_CONNECTED event and start recording
     * - DISCONNECTED: Stop recording and emit CALL_ENDED event
     * 
     * Requirement 2.2: Track call state transitions and emit events to React Native
     * Requirement 2.3: Transition to ACTIVE when remote party answers
     * Requirement 2.4: Transition to DISCONNECTED when call ends
     */
    override fun onStateChanged(state: Int) {
        super.onStateChanged(state)
        
        Log.d(TAG, "State changed - CallId: $callId, State: ${getStateString(state)}")
        
        when (state) {
            STATE_DIALING -> {
                handleDialingState()
            }
            STATE_RINGING -> {
                handleRingingState()
            }
            STATE_ACTIVE -> {
                handleActiveState()
            }
            STATE_HOLDING -> {
                handleHoldingState()
            }
            STATE_DISCONNECTED -> {
                handleDisconnectedState()
            }
        }
    }
    
    /**
     * Handles DIALING state - call is being placed.
     * 
     * Requirement 2.2: Emit CALL_STARTED event when dialing begins
     */
    private fun handleDialingState() {
        callState = callState.copy(state = CallStateEnum.DIALING)
        
        // Update CallManager with new state
        CallManager.updateCurrentCall(callState)
        
        Log.d(TAG, "Call dialing - CallId: $callId")
        
        // Emit CALL_STARTED event to React Native
        CrmConnectionEventBus.emitCallStarted(
            callId = callId,
            phoneNumber = phoneNumber,
            leadId = leadId,
            timestamp = startTime
        )
    }
    
    /**
     * Handles RINGING state - remote party's phone is ringing.
     */
    private fun handleRingingState() {
        callState = callState.copy(state = CallStateEnum.RINGING)
        
        // Update CallManager with new state
        CallManager.updateCurrentCall(callState)
        
        Log.d(TAG, "Call ringing - CallId: $callId")
    }
    
    /**
     * Handles ACTIVE state - call is connected and both parties can communicate.
     * 
     * Requirement 2.3: Transition to ACTIVE when remote party answers and trigger recording
     * Requirement 3.1: Display custom in-call Activity when call becomes active
     * Requirement 4.1: Start recording when call becomes active
     */
    private fun handleActiveState() {
        connectTime = System.currentTimeMillis()
        callState = callState.copy(
            state = CallStateEnum.ACTIVE,
            connectTime = connectTime
        )
        
        // Update CallManager with new state
        CallManager.updateCurrentCall(callState)
        
        Log.d(TAG, "Call active - CallId: $callId")
        
        // Emit CALL_CONNECTED event to React Native
        CrmConnectionEventBus.emitCallConnected(
            callId = callId,
            phoneNumber = phoneNumber,
            timestamp = connectTime!!
        )
        
        // Launch InCallActivity
        launchInCallActivity()
        
        // Trigger recording start
        startRecording()
    }
    
    /**
     * Launches the InCallActivity to show custom in-call UI.
     * 
     * Requirement 3.1: Display custom in-call Activity within 300ms when call becomes active
     */
    private fun launchInCallActivity() {
        try {
            val intent = android.content.Intent(context, InCallActivity::class.java).apply {
                flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or 
                        android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra(InCallActivity.EXTRA_CALL_ID, callId)
                putExtra(InCallActivity.EXTRA_PHONE_NUMBER, phoneNumber)
                putExtra(InCallActivity.EXTRA_LEAD_ID, leadId)
            }
            
            context.startActivity(intent)
            
            Log.d(TAG, "InCallActivity launched - CallId: $callId")
        } catch (e: Exception) {
            Log.e(TAG, "Error launching InCallActivity: ${e.message}", e)
        }
    }
    
    /**
     * Handles HOLDING state - call is on hold.
     */
    private fun handleHoldingState() {
        callState = callState.copy(state = CallStateEnum.HOLDING)
        
        // Update CallManager with new state
        CallManager.updateCurrentCall(callState)
        
        Log.d(TAG, "Call holding - CallId: $callId")
    }
    
    /**
     * Handles DISCONNECTED state - call has ended.
     * 
     * Requirement 2.4: Transition to DISCONNECTED when call ends and trigger recording stop
     * Requirement 4.3: Stop recording when call disconnects
     */
    private fun handleDisconnectedState() {
        endTime = System.currentTimeMillis()
        val duration = if (connectTime != null) {
            (endTime!! - connectTime!!) / 1000 // Duration in seconds
        } else {
            0L
        }
        
        callState = callState.copy(
            state = CallStateEnum.DISCONNECTED,
            endTime = endTime
        )
        
        // Update CallManager with new state
        CallManager.updateCurrentCall(callState)
        
        Log.d(TAG, "Call disconnected - CallId: $callId, Duration: ${duration}s")
        
        // Stop recording if it was started
        stopRecording()
        
        // Emit CALL_ENDED event to React Native
        CrmConnectionEventBus.emitCallEnded(
            callId = callId,
            phoneNumber = phoneNumber,
            duration = duration,
            timestamp = endTime!!
        )
        
        // Clear the call from CallManager
        CallManager.clearCurrentCall()
    }
    
    /**
     * Called when the user or system requests to disconnect the call.
     * 
     * Requirement 2.4: Handle call termination
     */
    override fun onDisconnect() {
        Log.d(TAG, "onDisconnect called - CallId: $callId")
        
        setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
        destroy()
    }
    
    /**
     * Called when the call is aborted before connection.
     * 
     * Requirement 2.4: Handle call termination
     */
    override fun onAbort() {
        Log.d(TAG, "onAbort called - CallId: $callId")
        
        setDisconnected(DisconnectCause(DisconnectCause.CANCELED))
        destroy()
    }
    
    /**
     * Called when the user requests to put the call on hold.
     * 
     * Requirement 2.7: Support hold functionality
     */
    override fun onHold() {
        Log.d(TAG, "onHold called - CallId: $callId")
        
        setOnHold()
    }
    
    /**
     * Called when the user requests to resume a held call.
     * 
     * Requirement 2.7: Support hold functionality
     */
    override fun onUnhold() {
        Log.d(TAG, "onUnhold called - CallId: $callId")
        
        setActive()
    }
    
    /**
     * Called when a DTMF tone should be played.
     * 
     * Requirement 2.7: Support DTMF tone playback
     * 
     * @param c The DTMF character to play (0-9, *, #, A-D)
     */
    override fun onPlayDtmfTone(c: Char) {
        Log.d(TAG, "onPlayDtmfTone called - CallId: $callId, Tone: $c")
        
        // DTMF tone playback is handled by the telephony framework
        // We just log it for debugging purposes
    }
    
    /**
     * Called when DTMF tone playback should stop.
     * 
     * Requirement 2.7: Support DTMF tone playback
     */
    override fun onStopDtmfTone() {
        Log.d(TAG, "onStopDtmfTone called - CallId: $callId")
        
        // DTMF tone stop is handled by the telephony framework
    }
    
    /**
     * Starts recording for this call.
     * Delegates to DialerRecordingService through the event bus.
     * 
     * Requirement 4.1: Trigger recording start when call becomes active
     */
    private fun startRecording() {
        Log.d(TAG, "Starting recording - CallId: $callId")
        
        callState = callState.copy(isRecording = true)
        
        // Update CallManager with recording state
        CallManager.updateCurrentCall(callState)
        
        // Emit recording start request to the event bus
        // The DialerRecordingService will handle the actual recording
        CrmConnectionEventBus.requestRecordingStart(
            callId = callId,
            phoneNumber = phoneNumber,
            leadId = leadId
        )
    }
    
    /**
     * Stops recording for this call.
     * Delegates to DialerRecordingService through the event bus.
     * 
     * Requirement 4.3: Trigger recording stop when call disconnects
     */
    private fun stopRecording() {
        if (callState.isRecording) {
            Log.d(TAG, "Stopping recording - CallId: $callId")
            
            callState = callState.copy(isRecording = false)
            
            // Update CallManager with recording state
            CallManager.updateCurrentCall(callState)
            
            // Emit recording stop request to the event bus
            CrmConnectionEventBus.requestRecordingStop(callId = callId)
        }
    }
    
    /**
     * Converts Connection state integer to readable string.
     * 
     * @param state The Connection state constant
     * @return Human-readable state name
     */
    private fun getStateString(state: Int): String {
        return when (state) {
            STATE_INITIALIZING -> "INITIALIZING"
            STATE_NEW -> "NEW"
            STATE_DIALING -> "DIALING"
            STATE_RINGING -> "RINGING"
            STATE_ACTIVE -> "ACTIVE"
            STATE_HOLDING -> "HOLDING"
            STATE_DISCONNECTED -> "DISCONNECTED"
            STATE_PULLING_CALL -> "PULLING_CALL"
            else -> "UNKNOWN($state)"
        }
    }
    
    /**
     * Gets the current call state.
     * 
     * @return Current CallState object
     */
    fun getCallState(): CallState {
        return callState
    }
}
