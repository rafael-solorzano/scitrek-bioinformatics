// src/components/StudentProfileBanner.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchInbox } from '../services/api';
import './StudentProfileBanner.css';

const StudentProfileBanner = ({ user, onLogout }) => {
  const displayName = user.first_name || user.username;
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadUnread() {
      try {
        const msgs = await fetchInbox();
        setUnreadCount(msgs.filter(m => !m.is_read).length);
      } catch (err) {
        console.error('Failed to fetch unread count', err);
      }
    }
    loadUnread();
  }, []);

  return (
    <header className="profile-header">
      <div className="logo">
        <Link to="/" aria-label="SciTrek home">
          <img
            src="/images/scitrek_logo.png"
            alt="SciTrek Logo"
            title="SciTrek Logo"
            style={{ height: 50 }}
          />
        </Link>
      </div>

      <nav className="profile-nav">
        <Link to="/student_profile" className="nav-item">
          Home
        </Link>

        <Link to="/inbox" className="nav-item inbox-link">
          Inbox
          <span className="badge">{unreadCount}</span>
        </Link>

        {/* Removed <i className="fa fa-caret-down" /> to avoid double caret;
            caret is provided via CSS ::after on .dropdown-toggle */}
        <div className="nav-item dropdown">
          <button className="dropdown-toggle">
            Modules
          </button>
          <div className="dropdown-menu">
            <Link to="/sections/welcome">Welcome to SciTrek!</Link>
            <Link to="/sections/what-youll-learn">What You’ll Learn</Link>
            <Link to="/sections/vocabulary">Important Vocabulary</Link>
            <Link to="/sections/day-1">Day 1</Link>
            <Link to="/sections/day-2">Day 2</Link>
            <Link to="/sections/day-3">Day 3</Link>
            <Link to="/sections/day-4">Day 4</Link>
            <Link to="/sections/day-5">Day 5</Link>
          </div>
        </div>

        <div className="nav-item dropdown">
          <button className="dropdown-toggle">
            Module Check
          </button>
          <div className="dropdown-menu">
            <Link to="/student_profile/pre_module">Pre-Module Quiz</Link>
            <Link to="/student_profile/post_module">Post-Module Quiz</Link>
          </div>
        </div>
      </nav>

      <div className="user-dropdown dropdown">
        <button className="drop_button" onClick={onLogout}>
          Hello, {displayName}! <i className="fa fa-caret-down" />
        </button>
        <div className="dropdown-menu user-menu">
          <Link to="/student_profile">My Profile</Link>
          <button
            onClick={onLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default StudentProfileBanner;
