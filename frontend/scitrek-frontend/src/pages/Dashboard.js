// src/pages/Dashboard.js
import React from 'react';
import Classrooms from '../components/Classrooms';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-page">
      <h2>Dashboard</h2>
      <Classrooms />
      {/* You can add more components here (like Gallery, TeamSection, etc.) */}
    </div>
  );
};

export default Dashboard;
