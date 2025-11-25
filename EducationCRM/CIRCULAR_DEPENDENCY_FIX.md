# Circular Dependency Fix

## Problem
The error `Cannot read property 'emit' of undefined` occurred because of a circular dependency:
- `AuthService` tried to import `authEvents` from `AppNavigator`
- But `AppNavigator` might import things that depend on `AuthService`
- This created a circular import that broke the module loading

## Solution
Created a separate file for the auth event emitter to break the circular dependency.

## Files Created/Modified

### 1. Created: `src/utils/authEvents.ts`
A standalone file containing only the `AuthEventEmitter` class and exported `authEvents` instance.

### 2. Modified: `src/navigation/AppNavigator.tsx`
- Removed the `AuthEventEmitter` class definition
- Now imports `authEvents` from `../utils/authEvents`

### 3. Modified: `src/services/AuthService.ts`
- Changed import from `../navigation/AppNavigator` to `../utils/authEvents`

## How to Test

### Rebuild the app:
```bash
cd EducationCRM
npx react-native run-android
```

### Or manually:
```bash
cd EducationCRM/android
./gradlew clean
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Or use Metro bundler:
```bash
# Terminal 1
cd EducationCRM
npx react-native start --reset-cache

# Terminal 2
cd EducationCRM
npx react-native run-android
```

## Expected Behavior After Fix

When you login:
1. ✅ Login API call succeeds (HTTP 200)
2. ✅ Tokens are stored in AsyncStorage
3. ✅ `authEvents.emit()` is called successfully (no error)
4. ✅ AppNavigator receives the event
5. ✅ AppNavigator rechecks auth status
6. ✅ Navigation switches from Login screen to Main app (Leads tab)

## Logs to Watch For

Success logs should show:
```
[AuthService] Login successful! Tokens stored.
[AuthService] Auth event emitted
[AppNavigator] Auth event received, rechecking auth status
[AppNavigator] Checking auth status, token exists: true
```

No more errors about `Cannot read property 'emit' of undefined`!
