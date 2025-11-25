/**
 * Simple event emitter for authentication state changes
 * Used to notify AppNavigator when user logs in or out
 */
class AuthEventEmitter {
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void) {
    console.log('[AuthEvents] Listener subscribed, total listeners:', this.listeners.size + 1);
    this.listeners.add(listener);
    return () => {
      console.log('[AuthEvents] Listener unsubscribed');
      this.listeners.delete(listener);
    };
  }

  emit() {
    console.log('[AuthEvents] Emitting event to', this.listeners.size, 'listeners');
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[AuthEvents] Error in listener:', error);
      }
    });
  }
}

export const authEvents = new AuthEventEmitter();
