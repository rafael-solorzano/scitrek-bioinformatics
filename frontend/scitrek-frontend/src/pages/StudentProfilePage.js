// src/pages/StudentProfilePage.js
import React, { useState, useEffect } from 'react';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';
import './StudentProfilePage.css';

const StudentProfilePage = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(profile => {
        console.log('getCurrentUser response:', profile);
        setUser(profile);
      })
      .catch(err => {
        console.error('Failed to fetch user profile', err);
        setError(true);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  if (error) {
    return (
      <main className="student-profile-page" aria-busy="true">
        <div className="loading">
          Unable to load profile. Please try logging in again.
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="student-profile-page" aria-busy="true">
        <div className="loading">Loading…</div>
      </main>
    );
  }

  const displayName = user.first_name || user.username;
  const classroomName =
    user.classroom_name ||
    (user.classroom && user.classroom.name) ||
    (Array.isArray(user.classrooms) && user.classrooms[0]?.name) ||
    'N/A';

  return (
    <>
      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      <main className="student-profile-page">
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
            <strong>Class:</strong> {classroomName}
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
    </main>
    </>
  );
};

export default StudentProfilePage;
