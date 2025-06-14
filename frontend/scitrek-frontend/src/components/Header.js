// src/components/Header.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="app-header">
      <div className="logo">
        <Link to="/">
          <img src="/images/scitrek_logo.png" alt="SciTrek Logo" />
        </Link>
      </div>
      <nav className="nav-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/inbox">Inbox</Link>
      </nav>
    </header>
  );
};

export default Header;
