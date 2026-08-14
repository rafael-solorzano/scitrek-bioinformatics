import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Inbox from './Inbox';
import { fetchInbox, getCurrentUser, toggleReadMessage } from '../services/api';

vi.mock('../services/api', () => ({
  fetchInbox: vi.fn(),
  getCurrentUser: vi.fn(),
  toggleReadMessage: vi.fn(),
}));

vi.mock('../components/StudentProfileBanner', () => ({
  default: ({ user, onLogout }) => (
    <header>
      <span>{user.username}</span>
      <button type="button" onClick={onLogout}>Logout</button>
    </header>
  ),
}));

const message = {
  id: 1,
  subject: 'Welcome',
  body: 'Hello scientist',
  is_read: false,
  timestamp: '2026-08-13T15:00:00Z',
};

describe('Inbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete window.location;
    window.location = { href: '' };
    getCurrentUser.mockResolvedValue({ username: 'student' });
    fetchInbox.mockResolvedValue([message]);
    toggleReadMessage.mockResolvedValue({ ...message, is_read: true });
  });

  test('loads profile and inbox messages with unread count', async () => {
    render(<Inbox />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /scitrek inbox \(1 unread\)/i })).toBeInTheDocument();
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  test('empty inbox shows empty state instead of bare headers', async () => {
    fetchInbox.mockResolvedValue([]);

    render(<Inbox />);

    expect(await screen.findByText(/no messages yet/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /0 unread/i })).toBeInTheDocument();
  });

  test('opening unread message marks it read and updates count', async () => {
    render(<Inbox />);

    await userEvent.click(await screen.findByRole('button', { name: /welcome unread/i }));

    await waitFor(() => expect(toggleReadMessage).toHaveBeenCalledWith(1, true));
    expect(await screen.findByRole('heading', { name: /0 unread/i })).toBeInTheDocument();
    expect(await screen.findByText('Hello scientist')).toBeInTheDocument();
  });

  test('message row opens with keyboard activation', async () => {
    render(<Inbox />);

    const row = await screen.findByRole('button', { name: /welcome unread/i });
    row.focus();
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText('Hello scientist')).toBeInTheDocument();
  });

  test('close button hides selected message detail', async () => {
    render(<Inbox />);

    await userEvent.click(await screen.findByRole('button', { name: /welcome unread/i }));
    expect(await screen.findByText('Hello scientist')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /close message/i }));

    await waitFor(() => expect(screen.queryByText('Hello scientist')).not.toBeInTheDocument());
  });

  test('logout confirmation clears tokens and redirects', async () => {
    localStorage.setItem('accessToken', 'a');
    localStorage.setItem('refreshToken', 'r');
    render(<Inbox />);

    await userEvent.click(await screen.findByRole('button', { name: /logout/i }));
    const dialog = screen.getByRole('dialog', { name: /are you sure/i });
    await userEvent.click(within(dialog).getByRole('button', { name: /^logout$/i }));

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  test('load failure stays in loading state and logs the error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchInbox.mockRejectedValue(new Error('api down'));

    render(<Inbox />);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
