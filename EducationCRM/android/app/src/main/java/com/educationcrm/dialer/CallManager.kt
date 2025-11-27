package com.educationcrm.dialer

import android.telecom.Connection
import android.util.Log
import com.educationcrm.dialer.models.CallState
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

/**
 * CallManager - Singleton for managing current call state and call control operations.
 * 
 * This object provides centralized management of:
 * - Current active call state
 * - Call control operations (end, mute, speaker, hold)
 * - Thread-safe access to call state
 * 
 * The CallManager acts as a bridge between the UI layer (InCallActivity) and the
 * Connection layer (CrmConnection), providing a simple API for call control.
 * 
 * Requirements: 2.2, 3.3, 3.4
 */
object CallManager {
    
    private const val TAG = "CallManager"
    
    // Thread-safe lock for concurrent access
    private val lock = ReentrantReadWriteLock()
    
    // Current active call state
    private var currentCall: CallState? = null
    
    // Reference to the active CrmConnection for call control
    private var currentConnection: CrmConnection? = null
    
    /**
     * Gets the current active call state.
     * 
     * Requirement 2.2: Maintain current call state
     * 
     * @return Current CallState or null if no active call
     */
    fun getCurrentCall(): CallState? = lock.read {
        return currentCall
    }
    
    /**
     * Sets the current active call state and connection reference.
     * 
     * This should be called by CrmConnection when a call is created.
     * 
     * Requirement 2.2: Maintain current call state
     * 
     * @param callState The CallState to set as current
     * @param connection The CrmConnection instance managing this call
     */
    fun setCurrentCall(callState: CallState, connection: CrmConnection) = lock.write {
        currentCall = callState
        currentConnection = connection
        
        Log.d(TAG, "Current call set - CallId: ${callState.callId}, State: ${callState.state}")
    }
    
    /**
     * Updates the current call state.
     * 
     * This should be called by CrmConnection when call state changes.
     * 
     * Requirement 2.2: Maintain current call state
     * 
     * @param callState The updated CallState
     */
    fun updateCurrentCall(callState: CallState) = lock.write {
        if (currentCall?.callId == callState.callId) {
            currentCall = callState
            Log.d(TAG, "Current call updated - CallId: ${callState.callId}, State: ${callState.state}")
        } else {
            Log.w(TAG, "Attempted to update call that is not current - CallId: ${callState.callId}")
        }
    }
    
    /**
     * Clears the current call state.
     * 
     * This should be called when a call ends or is disconnected.
     * 
     * Requirement 2.2: Maintain current call state
     */
    fun clearCurrentCall() = lock.write {
        val callId = currentCall?.callId
        currentCall = null
        currentConnection = null
        
        Log.d(TAG, "Current call cleared - CallId: $callId")
    }
    
    /**
     * Checks if there is an active call.
     * 
     * @return true if there is an active call, false otherwise
     */
    fun hasActiveCall(): Boolean = lock.read {
        return currentCall != null
    }
    
    /**
     * Ends the current active call.
     * 
     * This method disconnects the current call by calling disconnect() on the
     * CrmConnection instance. The connection will handle cleanup and event emission.
     * 
     * Requirement 3.3: Provide end call functionality
     * 
     * @return true if call was ended successfully, false if no active call
     */
    fun endCurrentCall(): Boolean = lock.read {
        val connection = currentConnection
        val call = currentCall
        
        if (connection == null || call == null) {
            Log.w(TAG, "No active call to end")
            return false
        }
        
        Log.d(TAG, "Ending current call - CallId: ${call.callId}")
        
        try {
            connection.onDisconnect()
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error ending call: ${e.message}", e)
            return false
        }
    }
    
    /**
     * Toggles mute state for the current call.
     * 
     * Mutes or unmutes the microphone based on current state.
     * 
     * Requirement 3.4: Provide mute functionality
     * 
     * @return true if mute was toggled successfully, false if no active call
     */
    fun toggleMute(): Boolean = lock.write {
        val connection = currentConnection
        val call = currentCall
        
        if (connection == null || call == null) {
            Log.w(TAG, "No active call to toggle mute")
            return false
        }
        
        val newMuteState = !call.isMuted
        
        Log.d(TAG, "Toggling mute - CallId: ${call.callId}, NewState: $newMuteState")
        
        try {
            // Update the connection's audio state
            connection.setAudioModeIsVoip(false)
            
            // Note: Android's Connection class doesn't have a direct mute API.
            // Muting is typically handled by the AudioManager at the system level.
            // The InCallActivity should use AudioManager.setMicrophoneMute() directly.
            // We track the state here for UI purposes.
            
            currentCall = call.copy(isMuted = newMuteState)
            
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error toggling mute: ${e.message}", e)
            return false
        }
    }
    
    /**
     * Toggles speaker state for the current call.
     * 
     * Switches between speaker and earpiece audio output.
     * 
     * Requirement 3.4: Provide speaker functionality
     * 
     * @return true if speaker was toggled successfully, false if no active call
     */
    fun toggleSpeaker(): Boolean = lock.write {
        val connection = currentConnection
        val call = currentCall
        
        if (connection == null || call == null) {
            Log.w(TAG, "No active call to toggle speaker")
            return false
        }
        
        val newSpeakerState = !call.isSpeakerOn
        
        Log.d(TAG, "Toggling speaker - CallId: ${call.callId}, NewState: $newSpeakerState")
        
        try {
            // Note: Android's Connection class doesn't have a direct speaker API.
            // Speaker routing is typically handled by the AudioManager at the system level.
            // The InCallActivity should use AudioManager.setSpeakerphoneOn() directly.
            // We track the state here for UI purposes.
            
            currentCall = call.copy(isSpeakerOn = newSpeakerState)
            
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error toggling speaker: ${e.message}", e)
            return false
        }
    }
    
    /**
     * Puts the current call on hold.
     * 
     * Requirement 3.4: Provide hold functionality
     * 
     * @return true if call was put on hold successfully, false if no active call
     */
    fun holdCall(): Boolean = lock.read {
        val connection = currentConnection
        val call = currentCall
        
        if (connection == null || call == null) {
            Log.w(TAG, "No active call to hold")
            return false
        }
        
        Log.d(TAG, "Holding call - CallId: ${call.callId}")
        
        try {
            connection.onHold()
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error holding call: ${e.message}", e)
            return false
        }
    }
    
    /**
     * Resumes a held call.
     * 
     * Requirement 3.4: Provide hold functionality
     * 
     * @return true if call was resumed successfully, false if no active call
     */
    fun unholdCall(): Boolean = lock.read {
        val connection = currentConnection
        val call = currentCall
        
        if (connection == null || call == null) {
            Log.w(TAG, "No active call to unhold")
            return false
        }
        
        Log.d(TAG, "Unholding call - CallId: ${call.callId}")
        
        try {
            connection.onUnhold()
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error unholding call: ${e.message}", e)
            return false
        }
    }
    
    /**
     * Gets the current mute state.
     * 
     * @return true if microphone is muted, false otherwise
     */
    fun isMuted(): Boolean = lock.read {
        return currentCall?.isMuted ?: false
    }
    
    /**
     * Gets the current speaker state.
     * 
     * @return true if speaker is on, false otherwise
     */
    fun isSpeakerOn(): Boolean = lock.read {
        return currentCall?.isSpeakerOn ?: false
    }
}
