import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentProfileBanner from './StudentProfileBanner';
import { fetchInbox } from '../services/api';

vi.mock('../services/api', () => ({
  fetchInbox: vi.fn(),
}));

function renderBanner(user = { username: 'student1001', first_name: 'Demo' }, onLogout = vi.fn()) {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <StudentProfileBanner user={user} onLogout={onLogout} />
    </MemoryRouter>
  );
  return { onLogout };
}

describe('StudentProfileBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test('renders student navigation and unread inbox count', async () => {
    fetchInbox.mockResolvedValue([
      { id: 1, is_read: false },
      { id: 2, is_read: true },
      { id: 3, is_read: false },
    ]);

    renderBanner();

    expect(screen.getByRole('img', { name: /scitrek logo/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/student_profile');
    expect(screen.getByRole('link', { name: /inbox/i })).toHaveAttribute('href', '/inbox');
    expect(screen.getByRole('button', { name: /modules/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /module check/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
  });

  test('falls back to zero unread messages when inbox load fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchInbox.mockRejectedValue(new Error('network down'));

    renderBanner();

    await waitFor(() => expect(console.error).toHaveBeenCalledWith(
      'Failed to fetch unread count',
      expect.any(Error)
    ));
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('uses username when first name is missing and triggers logout', async () => {
    fetchInbox.mockResolvedValue([]);
    const { onLogout } = renderBanner({ username: 'student1001', first_name: '' });

    fireEvent.click(screen.getByRole('button', { name: /hello, student1001/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
