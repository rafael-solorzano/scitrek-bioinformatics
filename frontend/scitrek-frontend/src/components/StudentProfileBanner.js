// src/components/StudentProfileBanner.js

import React from 'react';
import { Link } from 'react-router-dom';
import './StudentProfileBanner.css';

const StudentProfileBanner = ({ user, onLogout }) => {
  const displayName = user.first_name || user.username;

  return (
    <header className="profile-header">
      {/* SciTrek Logo now links to the HomePage ("/") */}
      <div className="logo">
        <Link to="/">
          <img
            src="/images/scitrek_logo.png"
            alt="SciTrek Logo"
            style={{ height: '50px' }}
          />
        </Link>
      </div>

      {/* Main navigation */}
      <nav className="profile-nav">
        <Link to="/student_profile" className="nav-item">
          Home
        </Link>
        <Link to="/inbox" className="nav-item">
          Inbox
        </Link>

        {/* Modules dropdown */}
        <div className="nav-item dropdown">
          <button className="dropdown-toggle">
            Modules <i className="fa fa-caret-down"></i>
          </button>
          <div className="dropdown-menu">
            <Link to="/student_profile/bioinformatics-day-1">Day 1</Link>
            <Link to="/student_profile/bioinformatics-day-2">Day 2</Link>
            <Link to="/student_profile/bioinformatics-day-3">Day 3</Link>
            <Link to="/student_profile/bioinformatics-day-4">Day 4</Link>
            <Link to="/student_profile/bioinformatics-day-5">Day 5</Link>
          </div>
        </div>

        {/* Module Check dropdown */}
        <div className="nav-item dropdown">
          <button className="dropdown-toggle">
            Module Check <i className="fa fa-caret-down"></i>
          </button>
          <div className="dropdown-menu">
            <Link to="/student_profile/pre_module">Pre‑Module Quiz</Link>
            <Link to="/student_profile/post_module">Post‑Module Quiz</Link>
          </div>
        </div>
      </nav>

      {/* User dropdown */}
      <div className="user-dropdown dropdown">
        <button className="drop_button">
          Hello, {displayName}! <i className="fa fa-caret-down"></i>
        </button>
        <div className="dropdown-menu user-menu">
          <Link to="/student_profile">My Profile</Link>
          <button
            onClick={onLogout}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default StudentProfileBanner;
