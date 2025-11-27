package com.educationcrm.dialer

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * DialerPackage - React Native package for registering the DialerBridgeModule.
 * 
 * This package exposes the custom dialer functionality to React Native by
 * registering the DialerBridgeModule as a native module.
 * 
 * Requirement 6.1: Expose native dialer functionality to React Native
 */
class DialerPackage : ReactPackage {
    
    /**
     * Creates and returns the list of native modules to register.
     * 
     * @param reactContext The React Native application context
     * @return List containing DialerBridgeModule
     */
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(DialerBridgeModule(reactContext))
    }
    
    /**
     * Creates and returns the list of view managers.
     * This package does not provide any custom views.
     * 
     * @param reactContext The React Native application context
     * @return Empty list
     */
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
