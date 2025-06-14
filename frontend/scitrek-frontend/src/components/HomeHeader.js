import React from 'react';
import { Link } from 'react-router-dom';
import './HomeHeader.css';

const HomeHeader = ({ user, onLogout }) => {
  return (
    <header className="home-header">
      <div className="logo-section">
        <Link to="/">
          <img src="/images/scitrek_logo.png" alt="SciTrek Logo" />
        </Link>
      </div>
      <nav className="home-nav">
        {user ? (
          <div className="user-dropdown">
            <button className="user-btn">
              Hello, {user.first_name || user.username}! {/* fallback to username */}
              <i className="fa fa-caret-down"></i>
            </button>
            <div className="user-dropdown-content">
              <Link to="/student_profile">My Profile</Link>
              <button
                onClick={onLogout}
                className="logout-button"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <Link to="/login" className="login-link">
            Student Login / Sign-Up
          </Link>
        )}
      </nav>
    </header>
  );
};

export default HomeHeader;
