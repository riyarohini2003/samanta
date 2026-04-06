import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'samanta_access_token',
  REFRESH_TOKEN: 'samanta_refresh_token',
  USER: 'samanta_user',
} as const;

export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, access);
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refresh);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function saveUser(user: object) {
  await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
}

export async function getSavedUser(): Promise<object | null> {
  const raw = await SecureStore.getItemAsync(KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearAuth() {
  await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.USER);
}
