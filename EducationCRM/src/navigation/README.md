# Navigation Structure

This directory contains the navigation configuration for the Education CRM mobile app.

## AppNavigator.tsx

The main navigation component that handles routing between authenticated and unauthenticated states.

### Features

- **Auth State Management**: Checks for stored authentication token on app launch
- **Conditional Rendering**: Shows AuthStack (login) or MainStack (tabs) based on auth state
- **Loading State**: Displays activity indicator while checking authentication

### Navigation Stacks

#### AuthStack (Unauthenticated)
- **LoginScreen**: User authentication screen

#### MainStack (Authenticated - Bottom Tabs)
- **Leads Tab**: Lead list and management
- **Follow-ups Tab**: Scheduled follow-up activities
- **Stats Tab**: Personal performance metrics

### Auth Flow

1. App launches → Check AsyncStorage for `auth_token`
2. If token exists → Show MainStack (bottom tabs)
3. If no token → Show AuthStack (login screen)
4. After successful login → Token stored → Navigate to MainStack
5. After logout → Token removed → Navigate back to AuthStack

### Usage

The AppNavigator is imported and used in the root `App.tsx`:

```tsx
import AppNavigator from './src/navigation/AppNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
```

### Future Enhancements

- Add deep linking support
- Implement navigation guards for role-based access
- Add screen transition animations
- Support for nested navigation in lead details
