package com.educationcrm.dialer

import android.util.Log
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * CrmConnectionEventBus - Event bus for communication between Connection layer and Bridge layer.
 * 
 * This singleton object provides a mechanism for:
 * - Emitting call state change events from CrmConnection to DialerBridgeModule
 * - Requesting recording operations from CrmConnection to DialerRecordingService
 * - Decoupling the Connection layer from React Native bridge dependencies
 * 
 * The event bus uses a listener pattern to allow multiple subscribers to receive events.
 * 
 * Requirements: 2.2, 2.3, 2.4, 4.1, 4.3
 */
object CrmConnectionEventBus {
    
    private const val TAG = "CrmConnectionEventBus"
    
    // Event listener interface
    interface EventListener {
        fun onCallStarted(callId: String, phoneNumber: String, leadId: String, timestamp: Long)
        fun onCallConnected(callId: String, phoneNumber: String, timestamp: Long)
        fun onCallEnded(callId: String, phoneNumber: String, duration: Long, timestamp: Long)
        fun onConnectionFailed(callId: String, phoneNumber: String, leadId: String, errorCode: String, errorMessage: String)
        fun onRecordingStartRequested(callId: String, phoneNumber: String, leadId: String)
        fun onRecordingStopRequested(callId: String)
    }
    
    // Thread-safe list of event listeners
    private val listeners = CopyOnWriteArrayList<EventListener>()
    
    /**
     * Registers an event listener to receive call events.
     * 
     * @param listener The EventListener to register
     */
    fun registerListener(listener: EventListener) {
        if (!listeners.contains(listener)) {
            listeners.add(listener)
            Log.d(TAG, "Listener registered. Total listeners: ${listeners.size}")
        }
    }
    
    /**
     * Unregisters an event listener.
     * 
     * @param listener The EventListener to unregister
     */
    fun unregisterListener(listener: EventListener) {
        if (listeners.remove(listener)) {
            Log.d(TAG, "Listener unregistered. Total listeners: ${listeners.size}")
        }
    }
    
    /**
     * Emits a CALL_STARTED event when a call begins dialing.
     * 
     * Requirement 2.2: Emit call state changes to React Native
     * 
     * @param callId Unique identifier for the call
     * @param phoneNumber Phone number being called
     * @param leadId Associated lead ID from CRM
     * @param timestamp Unix timestamp when call started
     */
    fun emitCallStarted(callId: String, phoneNumber: String, leadId: String, timestamp: Long) {
        Log.d(TAG, "Emitting CALL_STARTED - CallId: $callId, Phone: $phoneNumber")
        
        listeners.forEach { listener ->
            try {
                listener.onCallStarted(callId, phoneNumber, leadId, timestamp)
            } catch (e: Exception) {
                Log.e(TAG, "Error in listener.onCallStarted: ${e.message}", e)
            }
        }
    }
    
    /**
     * Emits a CALL_CONNECTED event when a call becomes active.
     * 
     * Requirement 2.3: Emit event when remote party answers
     * 
     * @param callId Unique identifier for the call
     * @param phoneNumber Phone number of the call
     * @param timestamp Unix timestamp when call connected
     */
    fun emitCallConnected(callId: String, phoneNumber: String, timestamp: Long) {
        Log.d(TAG, "Emitting CALL_CONNECTED - CallId: $callId, Phone: $phoneNumber")
        
        listeners.forEach { listener ->
            try {
                listener.onCallConnected(callId, phoneNumber, timestamp)
            } catch (e: Exception) {
                Log.e(TAG, "Error in listener.onCallConnected: ${e.message}", e)
            }
        }
    }
    
    /**
     * Emits a CALL_ENDED event when a call disconnects.
     * 
     * Requirement 2.4: Emit event when call ends
     * 
     * @param callId Unique identifier for the call
     * @param phoneNumber Phone number of the call
     * @param duration Call duration in seconds
     * @param timestamp Unix timestamp when call ended
     */
    fun emitCallEnded(callId: String, phoneNumber: String, duration: Long, timestamp: Long) {
        Log.d(TAG, "Emitting CALL_ENDED - CallId: $callId, Duration: ${duration}s")
        
        listeners.forEach { listener ->
            try {
                listener.onCallEnded(callId, phoneNumber, duration, timestamp)
            } catch (e: Exception) {
                Log.e(TAG, "Error in listener.onCallEnded: ${e.message}", e)
            }
        }
    }
    
    /**
     * Emits a CONNECTION_FAILED event when call creation fails.
     * 
     * Requirement 2.5: Report failure to React Native
     * 
     * @param callId Unique identifier for the call
     * @param phoneNumber Phone number that failed to connect
     * @param leadId Associated lead ID from CRM
     * @param errorCode Error code constant from DialerErrorCodes
     * @param errorMessage Human-readable error message
     */
    fun emitConnectionFailed(
        callId: String,
        phoneNumber: String,
        leadId: String,
        errorCode: String,
        errorMessage: String
    ) {
        Log.e(TAG, "Emitting CONNECTION_FAILED - CallId: $callId, Error: $errorCode - $errorMessage")
        
        listeners.forEach { listener ->
            try {
                listener.onConnectionFailed(callId, phoneNumber, leadId, errorCode, errorMessage)
            } catch (e: Exception) {
                Log.e(TAG, "Error in listener.onConnectionFailed: ${e.message}", e)
            }
        }
    }
    
    /**
     * Requests recording start for a call.
     * 
     * This is called by CrmConnection when the call becomes active.
     * The DialerRecordingService should listen for this event and start recording.
     * 
     * Requirement 4.1: Trigger recording start when state becomes ACTIVE
     * 
     * @param callId Unique identifier for the call
     * @param phoneNumber Phone number being recorded
     * @param leadId Associated lead ID from CRM
     */
    fun requestRecordingStart(callId: String, phoneNumber: String, leadId: String) {
        Log.d(TAG, "Requesting recording start - CallId: $callId")
        
        listeners.forEach { listener ->
            try {
                listener.onRecordingStartRequested(callId, phoneNumber, leadId)
            } catch (e: Exception) {
                Log.e(TAG, "Error in listener.onRecordingStartRequested: ${e.message}", e)
            }
        }
    }
    
    /**
     * Requests recording stop for a call.
     * 
     * This is called by CrmConnection when the call disconnects.
     * The DialerRecordingService should listen for this event and stop recording.
     * 
     * Requirement 4.3: Trigger recording stop when state becomes DISCONNECTED
     * 
     * @param callId Unique identifier for the call
     */
    fun requestRecordingStop(callId: String) {
        Log.d(TAG, "Requesting recording stop - CallId: $callId")
        
        listeners.forEach { listener ->
            try {
                listener.onRecordingStopRequested(callId)
            } catch (e: Exception) {
                Log.e(TAG, "Error in listener.onRecordingStopRequested: ${e.message}", e)
            }
        }
    }
    
    /**
     * Clears all registered listeners.
     * Should be called during cleanup or testing.
     */
    fun clearListeners() {
        listeners.clear()
        Log.d(TAG, "All listeners cleared")
    }
    
    /**
     * Gets the current number of registered listeners.
     * Useful for debugging and testing.
     * 
     * @return Number of registered listeners
     */
    fun getListenerCount(): Int {
        return listeners.size
    }
}
