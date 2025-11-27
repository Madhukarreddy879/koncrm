package com.educationcrm.dialer.models

data class RecordingResult(
    val callId: String,
    val filePath: String,
    val duration: Long,      // milliseconds
    val fileSize: Long,      // bytes
    val phoneNumber: String,
    val leadId: String,
    val timestamp: Long
)
