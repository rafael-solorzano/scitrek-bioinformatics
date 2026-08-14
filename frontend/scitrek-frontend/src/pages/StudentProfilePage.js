// src/pages/StudentProfilePage.js
import React, { useState, useEffect } from 'react';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';
import '../styles/scitrek-ui.css';
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
      <div className="loading">
        Unable to load profile. Please try logging in again.
      </div>
    );
  }

  if (!user) {
    return <div className="loading">Loading…</div>;
  }

  const displayName = user.first_name || user.username;
  const classroomName =
    user.classroom_name ||
    (user.classroom && user.classroom.name) ||
    (Array.isArray(user.classrooms) && user.classrooms[0]?.name) ||
    'N/A';

  return (
    <div className="student-profile-page">
      <StudentProfileBanner
        user={user}
        onLogout={() => setPopupVisible(true)}
        variant="modern"
      />

      <main className="profile-shell st-surface">
        <section className="profile-hero">
          <p className="st-kicker">Student dashboard</p>
          <h1>Welcome to SciTrek, {displayName}!</h1>
          <p>
            Your bioinformatics workspace is ready. Check messages, review the module path,
            and keep building your scientific notebook.
          </p>
        </section>

        <section className="profile-main">
          <div className="profile-media-card">
            <img
              src="/images/bioinformatics_module.gif"
              alt="Bioinformatics Module Animation"
              className="bioinfo-gif"
            />
          </div>

          <div className="profile-info-card st-card">
            <h2>Research Identity</h2>
            <ul className="profile-biography">
              <li>
                <span>Name</span>
                <strong>{displayName} {user.last_name}</strong>
              </li>
              <li>
                <span>Class</span>
                <strong>{classroomName}</strong>
              </li>
              <li>
                <span>Title</span>
                <strong>Junior Bioinformatics Scientist</strong>
              </li>
            </ul>
          </div>
        </section>
      </main>

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
