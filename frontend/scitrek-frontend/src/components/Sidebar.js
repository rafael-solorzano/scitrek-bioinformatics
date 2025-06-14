import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const toggleSidebar = () => setCollapsed(!collapsed);
  const toggleSubmenu = (menuId) =>
    setOpenSubmenu(prev => (prev === menuId ? null : menuId));

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <ul>
        <li className="menu-item">
          <Link to="/dashboard">
            <i className="fas fa-home"></i>
            {!collapsed && <span className="label">Home</span>}
          </Link>
        </li>

        <li className="menu-item has-submenu">
          <div onClick={() => toggleSubmenu('modules')}>
            <i className="fas fa-calendar-day"></i>
            {!collapsed && <span className="label">Modules</span>}
            {!collapsed && <i className="fas fa-caret-down submenu-icon"></i>}
          </div>
          {openSubmenu === 'modules' && !collapsed && (
            <ul className="submenu">
              <li className="submenu-item">
                <Link to="/student_profile/bioinformatics-day-1">Day 1</Link>
              </li>
              <li className="submenu-item">
                <Link to="/student_profile/bioinformatics-day-2">Day 2</Link>
              </li>
              <li className="submenu-item">
                <Link to="/student_profile/bioinformatics-day-3">Day 3</Link>
              </li>
              <li className="submenu-item">
                <Link to="/student_profile/bioinformatics-day-4">Day 4</Link>
              </li>
              <li className="submenu-item">
                <Link to="/student_profile/bioinformatics-day-5">Day 5</Link>
              </li>
              <li className="submenu-item">
                <Link to="/student_profile/pre_module">Pre‑Module Quiz</Link>
              </li>
              <li className="submenu-item">
                <Link to="/student_profile/post_module">Post‑Module Quiz</Link>
              </li>
            </ul>
          )}
        </li>

        <li className="menu-item">
          <Link to="/inbox">
            <i className="fas fa-envelope"></i>
            {!collapsed && <span className="label">Inbox</span>}
          </Link>
        </li>
      </ul>

      <button className="toggle-sidebar-btn" onClick={toggleSidebar}>
        {collapsed ? 'Expand' : 'Collapse'}
      </button>
    </div>
  );
};

export default Sidebar;
