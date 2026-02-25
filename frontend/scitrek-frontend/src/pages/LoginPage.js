import React, { useState } from 'react';
import { loginUser, signupUser } from '../services/api';
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
      <header className="login-header">
        <img src="/images/scitrek_logo.png" alt="SciTrek Logo" className="login-logo" />
        <h1>Welcome to SciTrek</h1>
      </header>

      <main className="login-main">
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
            <div className="form-field">
              <label htmlFor="login-username">Username:</label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="login-password">Password:</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="forgot-link">
              <a href="/forgot-password">Forgot Your Password?</a>
            </div>
            <button type="submit">Sign In</button>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            <h2>Create Your SciTrek Account</h2>
            <div className="form-field">
              <label htmlFor="signup-username">Username:</label>
              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="signup-password">Password:</label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="signup-confirm-password">Confirm Password:</label>
              <input
                id="signup-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="signup-first-name">First Name:</label>
              <input
                id="signup-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="signup-last-name">Last Name:</label>
              <input
                id="signup-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="signup-classroom-name">Classroom Name:</label>
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
      </main>
    </div>
  );
};

export default LoginPage;
