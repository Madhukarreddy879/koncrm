import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, StyleSheet, AppState } from 'react-native';
import { authEvents } from '../utils/authEvents';
import { TOKEN_KEY } from '../services/ApiService';

// Placeholder screens - will be implemented in later tasks
import LoginScreen from '../screens/LoginScreen';
import LeadListScreen from '../screens/LeadListScreen';
import LeadDetailScreen from '../screens/LeadDetailScreen';
import FollowUpListScreen from '../screens/FollowUpListScreen';
import StatsScreen from '../screens/StatsScreen';

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Leads"
        component={LeadListScreen}
        options={{
          title: 'My Leads',
          tabBarLabel: 'Leads',
        }}
      />
      <Tab.Screen
        name="FollowUps"
        component={FollowUpListScreen}
        options={{
          title: 'Follow-ups',
          tabBarLabel: 'Follow-ups',
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: 'My Stats',
          tabBarLabel: 'Stats',
        }}
      />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator>
      <MainStack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="LeadDetail"
        component={LeadDetailScreen}
        options={{ title: 'Lead Details' }}
      />
    </MainStack.Navigator>
  );
}

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      // Use the same token key as ApiService
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      console.log('[AppNavigator] Checking auth status, token exists:', !!token);
      console.log('[AppNavigator] Token key used:', TOKEN_KEY);
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('[AppNavigator] Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();

    // Subscribe to auth events (login/logout)
    const unsubscribe = authEvents.subscribe(() => {
      console.log('[AppNavigator] Auth event received, rechecking auth status');
      checkAuthStatus();
    });

    // Listen to app state changes to recheck auth when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkAuthStatus();
      }
    });

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, [checkAuthStatus]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
