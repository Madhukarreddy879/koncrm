package com.educationcrm.dialer

import android.net.Uri
import android.os.Bundle
import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.DisconnectCause
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.util.Log
import com.educationcrm.dialer.models.DialerErrorCodes

/**
 * CrmConnectionService - ConnectionService implementation for handling outgoing calls
 * through the CRM dialer system.
 * 
 * This service manages the lifecycle of outgoing calls by:
 * - Creating CrmConnection instances for each outgoing call
 * - Handling connection failures and reporting them
 * - Integrating with Android's Telecom framework
 * 
 * Requirements: 2.1, 2.5
 */
class CrmConnectionService : ConnectionService() {
    
    companion object {
        private const val TAG = "CrmConnectionService"
        const val EXTRA_PHONE_NUMBER = "extra_phone_number"
        const val EXTRA_LEAD_ID = "extra_lead_id"
        const val EXTRA_CALL_ID = "extra_call_id"
    }
    
    /**
     * Creates an outgoing connection for a call request.
     * 
     * This method is called by the Telecom framework when an outgoing call is initiated.
     * It extracts the phone number and lead ID from the request extras and creates
     * a CrmConnection instance to manage the call.
     * 
     * Requirement 2.1: Create Connection object and notify TelecomManager within 500ms
     * 
     * @param connectionManagerPhoneAccount The PhoneAccountHandle for the connection manager
     * @param request The ConnectionRequest containing call details
     * @return CrmConnection instance or null if creation fails
     */
    override fun onCreateOutgoingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection? {
        Log.d(TAG, "onCreateOutgoingConnection called")
        
        if (request == null) {
            Log.e(TAG, "ConnectionRequest is null")
            return Connection.createFailedConnection(
                DisconnectCause(DisconnectCause.ERROR, "Invalid connection request")
            )
        }
        
        try {
            // Extract phone number from URI
            val phoneNumber = request.address?.schemeSpecificPart
            if (phoneNumber.isNullOrBlank()) {
                Log.e(TAG, "Phone number is null or empty")
                return Connection.createFailedConnection(
                    DisconnectCause(DisconnectCause.ERROR, "Invalid phone number")
                )
            }
            
            // Extract extras
            val extras = request.extras
            val leadId = extras?.getString(EXTRA_LEAD_ID) ?: ""
            val callId = extras?.getString(EXTRA_CALL_ID) ?: generateCallId()
            
            Log.d(TAG, "Creating connection - Phone: $phoneNumber, LeadId: $leadId, CallId: $callId")
            
            // Create and configure the connection
            val connection = CrmConnection(
                context = applicationContext,
                callId = callId,
                phoneNumber = phoneNumber,
                leadId = leadId
            )
            
            // Set the address for the connection
            connection.setAddress(request.address, TelecomManager.PRESENTATION_ALLOWED)
            
            // Set caller display name if available
            connection.setCallerDisplayName(phoneNumber, TelecomManager.PRESENTATION_ALLOWED)
            
            Log.d(TAG, "Connection created successfully: $callId")
            return connection
            
        } catch (e: Exception) {
            Log.e(TAG, "Error creating outgoing connection: ${e.message}", e)
            return Connection.createFailedConnection(
                DisconnectCause(DisconnectCause.ERROR, "Failed to create connection: ${e.message}")
            )
        }
    }
    
    /**
     * Handles outgoing connection creation failures.
     * 
     * This method is called when the Telecom framework fails to create an outgoing connection.
     * It logs the failure and emits an error event to React Native.
     * 
     * Requirement 2.5: Report failure reason to React Native within 1 second
     * 
     * @param connectionManagerPhoneAccount The PhoneAccountHandle for the connection manager
     * @param request The ConnectionRequest that failed
     */
    override fun onCreateOutgoingConnectionFailed(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ) {
        Log.e(TAG, "onCreateOutgoingConnectionFailed called")
        
        val phoneNumber = request?.address?.schemeSpecificPart ?: "unknown"
        val extras = request?.extras
        val callId = extras?.getString(EXTRA_CALL_ID) ?: "unknown"
        val leadId = extras?.getString(EXTRA_LEAD_ID) ?: ""
        
        Log.e(TAG, "Connection failed - Phone: $phoneNumber, CallId: $callId")
        
        // Emit error event to React Native through the event bus
        CrmConnectionEventBus.emitConnectionFailed(
            callId = callId,
            phoneNumber = phoneNumber,
            leadId = leadId,
            errorCode = DialerErrorCodes.CONNECTION_FAILED,
            errorMessage = "Failed to create outgoing connection"
        )
    }
    
    /**
     * Generates a unique call ID using timestamp and random component.
     * 
     * @return Unique call ID string
     */
    private fun generateCallId(): String {
        return "call_${System.currentTimeMillis()}_${(1000..9999).random()}"
    }
}
