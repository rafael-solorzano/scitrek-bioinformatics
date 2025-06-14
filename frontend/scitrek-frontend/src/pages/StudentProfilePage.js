import React, { useState, useEffect } from 'react';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';
import './StudentProfilePage.css';

const StudentProfilePage = () => {
  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  // Fetch the current user profile on mount
  useEffect(() => {
    (async () => {
      try {
        const profile = await getCurrentUser();
        setUser(profile);
      } catch (err) {
        console.error('Failed to fetch user profile', err);
        // Optionally redirect to login if unauthorized
        // window.location.href = '/login';
      }
    })();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  // Show a loading state until we have the user
  if (!user) {
    return <div className="loading">Loading…</div>;
  }

  const displayName = user.first_name || user.username;

  return (
    <div className="student-profile-page">
      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      <div className="profile-header">
        <h1>Welcome to SciTrek, {displayName}!</h1>
      </div>

      <div className="profile-main">
        <img
          src="/images/bioinformatics_module.gif"
          alt="Bioinformatics Module Animation"
          className="bioinfo-gif"
        />

        <ul className="profile-biography">
          <li>
            <strong>Name:</strong> {displayName} {user.last_name}
          </li>
          <li>
            <strong>Class:</strong> {user.classroom_name || 'N/A'}
          </li>
          <li>
            <strong>Title:</strong> Junior Bioinformatics Scientist
          </li>
        </ul>
      </div>

      {popupVisible && (
        <Popup
          message="Are you sure you want to logout?"
          onCancel={() => setPopupVisible(false)}
          onConfirm={handleLogout}
        />
      )}
    </div>
  );
};

export default StudentProfilePage;
