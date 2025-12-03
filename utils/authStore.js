import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'supabase_session_v1';

export async function saveSession(session) {
  try {
    if (!session) return;
    // Reduce session to the minimal fields required to restore client-side auth
    const minimal = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      // optionally keep small user id for quick checks
      user: session.user ? { id: session.user.id, email: session.user.email } : undefined,
    };

    const rawFull = JSON.stringify(session);
    const rawMinimal = JSON.stringify(minimal);
    // log sizes to help diagnose large session payloads
    try {
      // eslint-disable-next-line no-console
      //console.log('Saving session: full size', rawFull.length, 'bytes; minimal size', rawMinimal.length, 'bytes');
    } catch (e) {}

    await SecureStore.setItemAsync(SESSION_KEY, rawMinimal);
  } catch (e) {
    console.warn('Failed to save session to secure store', e);
  }
}

export async function getSavedSession() {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read session from secure store', e);
    return null;
  }
}

export async function clearSession() {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch (e) {
    console.warn('Failed to clear session from secure store', e);
  }
}

export default {
  saveSession,
  getSavedSession,
  clearSession,
};
