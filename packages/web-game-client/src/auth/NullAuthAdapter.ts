// packages/web-game-client/src/auth/NullAuthAdapter.ts

import { AuthAdapter } from './AuthAdapter';

const CLIENT_ID_KEY = 'landgrab_client_id';

export class NullAuthAdapter implements AuthAdapter {
  private clientId: string;

  constructor() {
    let storedClientId = localStorage.getItem(CLIENT_ID_KEY);
    if (!storedClientId) {
      storedClientId = this.generateUniqueId();
      localStorage.setItem(CLIENT_ID_KEY, storedClientId);
    }
    this.clientId = storedClientId;
  }

  getClientId(): string {
    return this.clientId;
  }

  private generateUniqueId(): string {
    // Simple UUID-like generator for demonstration
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
