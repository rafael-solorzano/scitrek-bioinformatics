import { normalizeApiBaseUrl } from './apiConfig';

describe('normalizeApiBaseUrl', () => {
  test('defaults to same-origin and trims trailing slashes', () => {
    expect(normalizeApiBaseUrl()).toBe('');
    expect(normalizeApiBaseUrl('   ')).toBe('');
    expect(normalizeApiBaseUrl('https://api.example.test///')).toBe('https://api.example.test');
  });

  test.each([
    'https://api.example.test/api',
    'https://api.example.test/api/',
    '/api',
  ])('rejects a duplicated API path prefix in %s', value => {
    expect(() => normalizeApiBaseUrl(value)).toThrow(/must not end in \/api/i);
  });
});
