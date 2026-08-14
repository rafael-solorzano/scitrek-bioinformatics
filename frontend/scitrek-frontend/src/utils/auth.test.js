import { getAccessToken, getRefreshToken, removeTokens } from './auth';

describe('auth token utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('reads access token from localStorage', () => {
    localStorage.setItem('accessToken', 'access-123');

    expect(getAccessToken()).toBe('access-123');
  });

  test('reads refresh token from localStorage', () => {
    localStorage.setItem('refreshToken', 'refresh-123');

    expect(getRefreshToken()).toBe('refresh-123');
  });

  test('returns null when tokens are missing', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  test('removeTokens clears both token keys and leaves unrelated storage', () => {
    localStorage.setItem('accessToken', 'access-123');
    localStorage.setItem('refreshToken', 'refresh-123');
    localStorage.setItem('theme', 'dark');

    removeTokens();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
