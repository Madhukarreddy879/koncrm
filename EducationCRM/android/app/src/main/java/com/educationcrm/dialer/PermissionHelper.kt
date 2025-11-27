package com.educationcrm.dialer

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

object PermissionHelper {
    const val REQUEST_CALL_PHONE = 1001
    const val REQUEST_RECORD_AUDIO = 1002
    const val REQUEST_READ_PHONE_STATE = 1003
    const val REQUEST_ALL_PERMISSIONS = 1004

    private val REQUIRED_PERMISSIONS = arrayOf(
        Manifest.permission.CALL_PHONE,
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.READ_PHONE_STATE
    )

    /**
     * Check if CALL_PHONE permission is granted
     */
    fun hasCallPhonePermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Check if RECORD_AUDIO permission is granted
     */
    fun hasRecordAudioPermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Check if READ_PHONE_STATE permission is granted
     */
    fun hasReadPhoneStatePermission(context: Context): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_PHONE_STATE
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Check if all required permissions are granted
     */
    fun hasAllRequiredPermissions(context: Context): Boolean {
        return REQUIRED_PERMISSIONS.all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }

    /**
     * Request CALL_PHONE permission with rationale
     */
    fun requestCallPhonePermission(activity: Activity) {
        if (ActivityCompat.shouldShowRequestPermissionRationale(
                activity,
                Manifest.permission.CALL_PHONE
            )
        ) {
            showRationaleDialog(
                activity,
                "Phone Permission Required",
                "This app needs permission to make phone calls to enable the dialer functionality.",
                Manifest.permission.CALL_PHONE,
                REQUEST_CALL_PHONE
            )
        } else {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.CALL_PHONE),
                REQUEST_CALL_PHONE
            )
        }
    }

    /**
     * Request RECORD_AUDIO permission with rationale
     */
    fun requestRecordAudioPermission(activity: Activity) {
        if (ActivityCompat.shouldShowRequestPermissionRationale(
                activity,
                Manifest.permission.RECORD_AUDIO
            )
        ) {
            showRationaleDialog(
                activity,
                "Microphone Permission Required",
                "This app needs permission to record audio to enable automatic call recording.",
                Manifest.permission.RECORD_AUDIO,
                REQUEST_RECORD_AUDIO
            )
        } else {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                REQUEST_RECORD_AUDIO
            )
        }
    }

    /**
     * Request READ_PHONE_STATE permission with rationale
     */
    fun requestReadPhoneStatePermission(activity: Activity) {
        if (ActivityCompat.shouldShowRequestPermissionRationale(
                activity,
                Manifest.permission.READ_PHONE_STATE
            )
        ) {
            showRationaleDialog(
                activity,
                "Phone State Permission Required",
                "This app needs permission to read phone state to detect call status and manage recordings.",
                Manifest.permission.READ_PHONE_STATE,
                REQUEST_READ_PHONE_STATE
            )
        } else {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.READ_PHONE_STATE),
                REQUEST_READ_PHONE_STATE
            )
        }
    }

    /**
     * Request all required permissions at once
     */
    fun requestAllPermissions(activity: Activity) {
        val missingPermissions = REQUIRED_PERMISSIONS.filter { permission ->
            ContextCompat.checkSelfPermission(activity, permission) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()

        if (missingPermissions.isNotEmpty()) {
            val shouldShowRationale = missingPermissions.any { permission ->
                ActivityCompat.shouldShowRequestPermissionRationale(activity, permission)
            }

            if (shouldShowRationale) {
                showRationaleDialog(
                    activity,
                    "Permissions Required",
                    "This app needs phone, microphone, and phone state permissions to make calls and record them automatically.",
                    null,
                    REQUEST_ALL_PERMISSIONS,
                    missingPermissions
                )
            } else {
                ActivityCompat.requestPermissions(
                    activity,
                    missingPermissions,
                    REQUEST_ALL_PERMISSIONS
                )
            }
        }
    }

    /**
     * Show rationale dialog explaining why permission is needed
     */
    private fun showRationaleDialog(
        activity: Activity,
        title: String,
        message: String,
        permission: String?,
        requestCode: Int,
        permissions: Array<String>? = null
    ) {
        AlertDialog.Builder(activity)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("Grant") { dialog, _ ->
                dialog.dismiss()
                if (permissions != null) {
                    ActivityCompat.requestPermissions(activity, permissions, requestCode)
                } else if (permission != null) {
                    ActivityCompat.requestPermissions(activity, arrayOf(permission), requestCode)
                }
            }
            .setNegativeButton("Cancel") { dialog, _ ->
                dialog.dismiss()
            }
            .create()
            .show()
    }

    /**
     * Get list of missing permissions
     */
    fun getMissingPermissions(context: Context): List<String> {
        return REQUIRED_PERMISSIONS.filter { permission ->
            ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED
        }
    }
}
