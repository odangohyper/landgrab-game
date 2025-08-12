// packages/web-game-client/src/auth/AuthAdapter.ts

export interface AuthAdapter {
  getClientId(): string;
  // Potentially other methods for future authentication, e-g., signIn, signOut
}
