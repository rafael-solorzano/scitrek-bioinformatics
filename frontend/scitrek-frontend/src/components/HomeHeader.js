import React from 'react';
import { Link } from 'react-router-dom';
import { Dropdown, Menu, Button } from 'antd';
import './HomeHeader.css';

const HomeHeader = ({ user, onLogout }) => {
  const userMenu = (
    <Menu>
      <Menu.Item key="profile">
        <Link to="/student_profile">My Profile</Link>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" onClick={onLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <header className="home-header">
      <div className="logo-section">
        <Link to="/">
          <img src="/images/scitrek_logo.png" alt="SciTrek Logo" />
        </Link>
      </div>
      <nav className="home-nav">
        {user ? (
          <Dropdown
            overlay={userMenu}
            trigger={['hover', 'click']}
            placement="bottomRight"
          >
            <Button type="text" className="user-btn">
              Hello, {user.first_name || user.username}!
            </Button>
          </Dropdown>
        ) : (
          <Link to="/login" className="login-link">
            Student Login / Sign‑Up
          </Link>
        )}
      </nav>
    </header>
  );
};

export default HomeHeader;
