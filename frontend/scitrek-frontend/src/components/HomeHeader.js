import React from 'react';
import { Link } from 'react-router-dom';
import { Dropdown, Button } from 'antd';
import '../styles/scitrek-ui.css';
import './HomeHeader.css';

const HomeHeader = ({ user, onLogout }) => {
  const userMenu = {
    items: [
      {
        key: 'profile',
        label: <Link to="/student_profile">My Profile</Link>,
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        label: 'Logout',
        onClick: onLogout,
      },
    ],
  };

  return (
    <header className="home-header st-surface">
      <div className="logo-section">
        <Link to="/">
          <img src="/images/scitrek_logo.png" alt="SciTrek Logo" />
        </Link>
      </div>
      <nav className="home-nav">
        {user ? (
          <Dropdown
            menu={userMenu}
            trigger={['hover', 'click']}
            placement="bottomRight"
          >
            <Button type="text" className="user-btn">
              Hello, {user.first_name || user.username}!
            </Button>
          </Dropdown>
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
