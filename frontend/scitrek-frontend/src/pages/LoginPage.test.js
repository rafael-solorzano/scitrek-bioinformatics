import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';
import { guestLogin, loginUser, signupUser } from '../services/api';

vi.mock('../services/api', () => ({
  guestLogin: vi.fn(),
  loginUser: vi.fn(),
  signupUser: vi.fn(),
}));

const setLocation = () => {
  delete window.location;
  window.location = { href: '' };
};

const submitSignUp = async () => {
  const buttons = screen.getAllByRole('button', { name: /^sign up$/i });
  await userEvent.click(buttons[buttons.length - 1]);
};

const submitSignIn = async () => {
  const buttons = screen.getAllByRole('button', { name: /^sign in$/i });
  await userEvent.click(buttons[buttons.length - 1]);
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setLocation();
  });

  test('renders sign-in form by default without dead forgot-password link', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /sign in to your scitrek account/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /forgot your password/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument();
  });

  test('successful sign-in stores tokens and redirects home', async () => {
    loginUser.mockResolvedValue({ access: 'a', refresh: 'r' });
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'pw');
    await submitSignIn();

    await waitFor(() => expect(loginUser).toHaveBeenCalledWith('alice', 'pw'));
    expect(localStorage.getItem('accessToken')).toBe('a');
    expect(localStorage.getItem('refreshToken')).toBe('r');
    expect(window.location.href).toBe('/');
  });

  test('failed sign-in shows error and does not store tokens', async () => {
    loginUser.mockRejectedValue(new Error('bad credentials'));
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await submitSignIn();

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  test('guest login disables button while starting and redirects on success', async () => {
    guestLogin.mockResolvedValue({ access: 'ga', refresh: 'gr' });
    render(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: /continue as guest/i }));

    expect(screen.getByRole('button', { name: /starting guest session/i })).toBeDisabled();
    await waitFor(() => expect(guestLogin).toHaveBeenCalledWith('1001'));
    expect(window.location.href).toBe('/');
  });

  test('guest login failure re-enables button and shows error', async () => {
    guestLogin.mockRejectedValue(new Error('queue down'));
    render(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: /continue as guest/i }));

    expect(await screen.findByText(/guest login is unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue as guest/i })).not.toBeDisabled();
  });

  test('switches to sign-up form', async () => {
    render(<LoginPage />);

    await submitSignUp();

    expect(screen.getByRole('heading', { name: /create your scitrek account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  test('sign-up rejects mismatched passwords before API call', async () => {
    render(<LoginPage />);

    await submitSignUp();
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password/i), 'pw1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'pw2');
    await userEvent.type(screen.getByLabelText(/first name/i), 'A');
    await userEvent.type(screen.getByLabelText(/last name/i), 'L');
    await submitSignUp();

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(signupUser).not.toHaveBeenCalled();
  });

  test('successful sign-up sends classroom name, stores tokens, and redirects', async () => {
    signupUser.mockResolvedValue({ access: 'sa', refresh: 'sr' });
    render(<LoginPage />);

    await submitSignUp();
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password/i), 'pw');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'pw');
    await userEvent.type(screen.getByLabelText(/first name/i), 'A');
    await userEvent.type(screen.getByLabelText(/last name/i), 'L');
    await userEvent.type(screen.getByLabelText(/classroom name/i), '1001');
    await submitSignUp();

    await waitFor(() =>
      expect(signupUser).toHaveBeenCalledWith({
        username: 'alice',
        password: 'pw',
        first_name: 'A',
        last_name: 'L',
        classroom_name: '1001',
      })
    );
    expect(localStorage.getItem('accessToken')).toBe('sa');
    expect(localStorage.getItem('refreshToken')).toBe('sr');
    expect(window.location.href).toBe('/');
  });

  test('failed sign-up shows a recoverable error', async () => {
    signupUser.mockRejectedValue(new Error('invalid classroom'));
    render(<LoginPage />);

    await submitSignUp();
    await userEvent.type(screen.getByLabelText(/username/i), 'alice');
    await userEvent.type(screen.getByLabelText(/^password/i), 'pw');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'pw');
    await userEvent.type(screen.getByLabelText(/first name/i), 'A');
    await userEvent.type(screen.getByLabelText(/last name/i), 'L');
    await submitSignUp();

    expect(await screen.findByText(/sign up failed/i)).toBeInTheDocument();
  });
});
