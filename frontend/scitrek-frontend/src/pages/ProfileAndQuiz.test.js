import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentProfilePage from './StudentProfilePage';
import PreModuleQuizPage from './PreModuleQuizPage';
import PostModuleQuizPage from './PostModuleQuizPage';
import { getCurrentUser } from '../services/api';

vi.mock('../components/StudentProfileBanner', () => ({
  default: function MockStudentProfileBanner({ user, onLogout }) {
    return (
      <header>
        <span>Hello, {user.first_name || user.username}</span>
        <button type="button" onClick={onLogout}>Logout</button>
      </header>
    );
  },
}));

vi.mock('../components/Popup', () => ({
  default: function MockPopup({ message, onConfirm, onCancel }) {
    return (
      <div role="dialog">
        <p>{message}</p>
        <button type="button" onClick={onConfirm}>Confirm</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    );
  },
}));

vi.mock('../services/api', () => ({
  getCurrentUser: vi.fn(),
}));

const profile = {
  username: 'student1001',
  first_name: 'Demo',
  last_name: 'Student',
  classroom_name: '1001',
};

function renderWithRouter(ui) {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>
  );
}

describe('Student profile and quiz pages', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test('student profile renders loaded profile details', async () => {
    getCurrentUser.mockResolvedValue(profile);

    renderWithRouter(<StudentProfilePage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Welcome to SciTrek, Demo/i })).toBeInTheDocument();
    expect(screen.getByText(/Demo Student/i)).toBeInTheDocument();
    expect(screen.getByText(/1001/i)).toBeInTheDocument();
    expect(screen.getByText(/Junior Bioinformatics Scientist/i)).toBeInTheDocument();
  });

  test('student profile shows recoverable error state', async () => {
    getCurrentUser.mockRejectedValue(new Error('profile failed'));

    renderWithRouter(<StudentProfilePage />);

    expect(await screen.findByText(/Unable to load profile/i)).toBeInTheDocument();
  });

  test('student profile opens and cancels logout dialog', async () => {
    getCurrentUser.mockResolvedValue(profile);

    renderWithRouter(<StudentProfilePage />);

    fireEvent.click(await screen.findByRole('button', { name: /logout/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/Are you sure/i);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('pre-module quiz renders the expected iframe after profile load', async () => {
    getCurrentUser.mockResolvedValue(profile);

    renderWithRouter(<PreModuleQuizPage />);

    const frame = await screen.findByTitle('Pre-Module Quiz');
    expect(frame).toHaveAttribute('src', expect.stringContaining('docs.google.com/forms'));
  });

  test('post-module quiz renders the expected iframe after profile load', async () => {
    getCurrentUser.mockResolvedValue(profile);

    renderWithRouter(<PostModuleQuizPage />);

    const frame = await screen.findByTitle('Post-Module Quiz');
    expect(frame).toHaveAttribute('src', expect.stringContaining('docs.google.com/forms'));
  });

  test('quiz pages stay in loading state if profile lookup fails', async () => {
    getCurrentUser.mockRejectedValue(new Error('auth failed'));

    renderWithRouter(<PreModuleQuizPage />);

    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
