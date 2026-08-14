const mocks = vi.hoisted(() => {
  const state = {
    createOptions: null,
    requestFulfilled: null,
    responseRejected: null,
  };
  const requestUse = vi.fn(fulfilled => {
    state.requestFulfilled = fulfilled;
  });
  const responseUse = vi.fn((_fulfilled, rejected) => {
    state.responseRejected = rejected;
  });
  const client = vi.fn();
  Object.assign(client, {
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  });
  const axios = {
    create: vi.fn(options => {
      state.createOptions = options;
      return client;
    }),
    post: vi.fn(),
  };

  return { state, axios, client };
});

vi.mock('axios', () => ({ default: mocks.axios }));

import {
  fetchInbox,
  fetchModules,
  guestLogin,
  loginUser,
  toggleReadMessage,
} from './api';

describe('API client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  test('uses same-origin requests by default', () => {
    expect(mocks.state.createOptions).toEqual({ baseURL: '' });
  });

  test('request interceptor attaches bearer token when present', () => {
    localStorage.setItem('accessToken', 'abc');

    const config = mocks.state.requestFulfilled({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer abc');
  });

  test('request interceptor leaves headers unchanged without token', () => {
    const config = mocks.state.requestFulfilled({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  test('response interceptor refreshes token and retries original request on 401', async () => {
    localStorage.setItem('refreshToken', 'refresh');
    mocks.axios.post.mockResolvedValue({ data: { access: 'new-access' } });
    mocks.client.mockResolvedValue({ data: 'retried' });

    const result = await mocks.state.responseRejected({
      response: { status: 401 },
      config: { headers: {} },
    });

    expect(mocks.axios.post).toHaveBeenCalledWith('/api/token/refresh/', { refresh: 'refresh' });
    expect(localStorage.getItem('accessToken')).toBe('new-access');
    expect(result).toEqual({ data: 'retried' });
  });

  test('response interceptor clears tokens when refresh fails', async () => {
    localStorage.setItem('accessToken', 'old');
    localStorage.setItem('refreshToken', 'refresh');
    mocks.axios.post.mockRejectedValue(new Error('bad refresh'));

    await expect(
      mocks.state.responseRejected({ response: { status: 401 }, config: { headers: {} } })
    ).rejects.toThrow('bad refresh');

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  test('response interceptor does not crash when 401 has no original config', async () => {
    const error = { response: { status: 401 } };

    await expect(mocks.state.responseRejected(error)).rejects.toBe(error);
  });

  test('loginUser stores tokens and returns data', async () => {
    mocks.axios.post.mockResolvedValue({ data: { access: 'a', refresh: 'r', username: 'u' } });

    const data = await loginUser('u', 'p');

    expect(mocks.axios.post).toHaveBeenCalledWith('/api/token/', { username: 'u', password: 'p' });
    expect(data.username).toBe('u');
    expect(localStorage.getItem('accessToken')).toBe('a');
    expect(localStorage.getItem('refreshToken')).toBe('r');
  });

  test('guestLogin stores tokens and passes classroom name', async () => {
    mocks.axios.post.mockResolvedValue({ data: { access: 'ga', refresh: 'gr', is_guest: true } });

    const data = await guestLogin('1001');

    expect(mocks.axios.post).toHaveBeenCalledWith('/api/student/guest-login/', { classroom_name: '1001' });
    expect(data.is_guest).toBe(true);
    expect(localStorage.getItem('accessToken')).toBe('ga');
  });

  test('fetchInbox accepts paginated responses', async () => {
    mocks.client.get.mockResolvedValue({ data: { results: [{ id: 1 }] } });

    await expect(fetchInbox()).resolves.toEqual([{ id: 1 }]);
  });

  test('fetchInbox accepts array responses', async () => {
    mocks.client.get.mockResolvedValue({ data: [{ id: 1 }] });

    await expect(fetchInbox()).resolves.toEqual([{ id: 1 }]);
  });

  test('fetchModules accepts paginated and array responses', async () => {
    mocks.client.get.mockResolvedValueOnce({ data: { results: [{ day: 1 }] } });
    await expect(fetchModules()).resolves.toEqual([{ day: 1 }]);

    mocks.client.get.mockResolvedValueOnce({ data: [{ day: 2 }] });
    await expect(fetchModules()).resolves.toEqual([{ day: 2 }]);
  });

  test('toggleReadMessage patches expected endpoint', async () => {
    mocks.client.patch.mockResolvedValue({ data: { id: 7, is_read: true } });

    await expect(toggleReadMessage(7, true)).resolves.toEqual({ id: 7, is_read: true });
    expect(mocks.client.patch).toHaveBeenCalledWith('/api/student/inbox/7/read/', { is_read: true });
  });
});
