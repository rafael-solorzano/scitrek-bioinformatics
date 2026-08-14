import React, { useState } from 'react';
import { guestLogin, loginUser, signupUser } from '../services/api';
import '../styles/scitrek-ui.css';
import './LoginPage.css';

const LoginPage = () => {
  // Toggle state: false = Sign In, true = Sign Up
  const [isSignUp, setIsSignUp] = useState(false);

  // Shared form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Sign up–specific states
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [classroomName, setClassroomName] = useState('');

  const [error, setError] = useState('');
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sign in handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      const data = await loginUser(username, password);
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      window.location.href = '/'; // Reload app after successful login
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setIsGuestLoading(true);
    try {
      await guestLogin('1001');
      window.location.href = '/';
    } catch (err) {
      setError('Guest login is unavailable right now. Please try again.');
      setIsGuestLoading(false);
    }
  };

  // Sign up handler
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      const userData = {
        username,
        password,
        first_name: firstName,     // send snake_case to backend
        last_name: lastName,       // send snake_case to backend
        classroom_name: classroomName, // optional
      };
      const data = await signupUser(userData);
      localStorage.setItem('accessToken', data.access || '');
      localStorage.setItem('refreshToken', data.refresh || '');
      window.location.href = '/'; // Reload app after successful signup
    } catch (err) {
      setError('Sign up failed. Please check your details and try again.');
    }
  };

  return (
    <div className="login-page">
      <section className="login-brand-panel" aria-label="SciTrek introduction">
        <div className="login-brand-content">
          <img src="/images/scitrek_logo.png" alt="SciTrek Logo" className="login-logo" />
          <p className="st-kicker">Bioinformatics learning lab</p>
          <h1>Welcome to SciTrek</h1>
          <p>
            Step into a guided research experience where students investigate genes,
            cancer biology, and real scientific data.
          </p>
          <div className="science-metrics" aria-label="SciTrek module highlights">
            <span><strong>5</strong> guided days</span>
            <span><strong>6</strong> starter messages</span>
            <span><strong>1001</strong> demo class</span>
          </div>
        </div>
        <div className="science-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <div className="login-container">
        <div className="toggle-container">
          <button
            onClick={() => setIsSignUp(false)}
            className={!isSignUp ? 'active' : ''}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={isSignUp ? 'active' : ''}
          >
            Sign Up
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {!isSignUp ? (
          <form onSubmit={handleSignIn}>
            <h2>Sign In to Your SciTrek Account</h2>
            <p className="login-form-copy">
              Continue your workbook, review messages, and track your module progress.
            </p>
            <div className="form-field">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-field password-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? 'Hide secret' : 'Show secret'}
              >
                <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
              </button>
            </div>
            <button type="submit">Sign In</button>
            <div className="guest-login-divider">
              <span>or</span>
            </div>
            <button
              type="button"
              className="guest-login-button"
              onClick={handleGuestLogin}
              disabled={isGuestLoading}
            >
              {isGuestLoading ? 'Starting Guest Session...' : 'Continue as Guest'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            <h2>Create Your SciTrek Account</h2>
            <p className="login-form-copy">
              Join your classroom and unlock the full bioinformatics workbook.
            </p>
            <div className="form-field">
              <label htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-field password-field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? 'Hide secret' : 'Show secret'}
              >
                <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
              </button>
            </div>
            <div className="form-field password-field">
              <label htmlFor="signup-confirm-password">Confirm Password</label>
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(value => !value)}
                aria-label={showConfirmPassword ? 'Hide confirmation' : 'Show confirmation'}
              >
                <i className={`fa ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
              </button>
            </div>
            <div className="form-field">
              <label htmlFor="signup-first-name">First Name</label>
              <input
                id="signup-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="signup-last-name">Last Name</label>
              <input
                id="signup-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="signup-classroom-name">Classroom Name</label>
              <input
                id="signup-classroom-name"
                type="text"
                value={classroomName}
                onChange={(e) => setClassroomName(e.target.value)}
              />
            </div>
            <button type="submit">Sign Up</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
