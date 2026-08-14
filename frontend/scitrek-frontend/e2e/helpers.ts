import { Page } from '@playwright/test';

export const studentProfile = {
  username: 'student1001',
  first_name: 'Demo',
  last_name: 'Student',
  classroom_name: '1001',
};

export async function mockApi(page: Page, options: { inboxRead?: boolean; savedDay1?: string } = {}) {
  await page.route(/.*(youtube|ytimg|googlevideo|google-analytics|googletagmanager|phet\.colorado)\..*/, async (route) => {
    await route.abort('blockedbyclient');
  });

  page.on('console', (message) => {
    const text = message.text();
    const expectedMockedHttpError =
      text.includes('Failed to load resource') &&
      (text.includes('status of 401') || text.includes('status of 404'));
    if (message.type() === 'error' && !expectedMockedHttpError) {
      throw new Error(`Unexpected browser console error: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    throw error;
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    const isThirdPartyMediaNoise =
      url.includes('youtube.com/') ||
      url.includes('ytimg.com/') ||
      url.includes('googlevideo.com/') ||
      url.includes('google-analytics.com/') ||
      url.includes('googletagmanager.com/') ||
      url.includes('phet.colorado.edu/');
    if (!['image', 'media', 'font'].includes(request.resourceType()) && !isThirdPartyMediaNoise) {
      throw new Error(`Unexpected request failure: ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`);
    }
  });

  const inboxMessage = {
    id: 1,
    subject: 'Welcome to SciTrek',
    body: 'Your SciTrek inbox is ready.',
    timestamp: '2026-08-13T12:00:00Z',
    is_read: Boolean(options.inboxRead),
  };

  await page.route('**/api/token/', async (route) => {
    const body = route.request().postDataJSON() as { username?: string; password?: string };
    if (body.username === 'student1001' && body.password === 'student1001') {
      await route.fulfill({ json: { access: 'student-access', refresh: 'student-refresh' } });
    } else {
      await route.fulfill({ status: 401, json: { detail: 'No active account found with the given credentials' } });
    }
  });

  await page.route('**/api/student/guest-login/', async (route) => {
    await route.fulfill({
      json: {
        access: 'guest-access',
        refresh: 'guest-refresh',
        username: 'guest_e2e',
        classroom_name: '1001',
        is_guest: true,
      },
    });
  });

  await page.route('**/api/student/profile/', async (route) => {
    const auth = route.request().headers().authorization;
    if (!auth) {
      await route.fulfill({ status: 401, json: { detail: 'Authentication credentials were not provided.' } });
      return;
    }
    await route.fulfill({ json: studentProfile });
  });

  await page.route('**/api/student/inbox/', async (route) => {
    await route.fulfill({ json: { results: [inboxMessage] } });
  });

  await page.route('**/api/student/inbox/1/read/', async (route) => {
    await route.fulfill({ json: { ...inboxMessage, is_read: true } });
  });

  await page.route('**/api/student/modules/1/response/detail/', async (route) => {
    if (options.savedDay1) {
      await route.fulfill({ json: { answers: { geneQ1: options.savedDay1 } } });
      return;
    }
    await route.fulfill({ status: 404, json: { detail: 'Not found.' } });
  });

  await page.route('**/api/student/modules/1/response/', async (route) => {
    await route.fulfill({ json: { id: 1, answers: route.request().postDataJSON()?.answers || {} } });
  });
}

export async function loginWithStoredTokens(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('accessToken', 'student-access');
      window.localStorage.setItem('refreshToken', 'student-refresh');
    } catch {
      // Cross-origin/sandboxed iframes cannot access localStorage.
    }
  });
}
