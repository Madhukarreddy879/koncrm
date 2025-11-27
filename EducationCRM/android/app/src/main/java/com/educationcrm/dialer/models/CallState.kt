package com.educationcrm.dialer.models

data class CallState(
    val callId: String,
    val phoneNumber: String,
    val leadId: String,
    val state: CallStateEnum,
    val startTime: Long,
    val connectTime: Long? = null,
    val endTime: Long? = null,
    val isRecording: Boolean = false,
    val isMuted: Boolean = false,
    val isSpeakerOn: Boolean = false
)

enum class CallStateEnum {
    IDLE,
    DIALING,
    RINGING,
    ACTIVE,
    HOLDING,
    DISCONNECTED
}
