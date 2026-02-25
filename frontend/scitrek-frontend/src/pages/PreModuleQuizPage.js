import React, { useState, useEffect } from 'react';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';
import './QuizPage.css';

const PreModuleQuizPage = () => {
  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getCurrentUser();
        setUser(profile);
      } catch {
        // redirect or handle error
      }
    })();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  if (!user) return (
    <main className="quiz-page-content" aria-busy="true">
      <div className="loading">Loading…</div>
    </main>
  );

  return (
    <>
      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      <main className="quiz-page-content">
        <iframe
          className="quiz-iframe"
          title="Pre-Module Quiz"
          src="https://docs.google.com/forms/d/e/1FAIpQLSf0iPuX7GHQkCP8fQgLxj5WDE-1C62VLC18wQMw5qciD2oSAA/viewform?embedded=true"
        >
          Loading…
        </iframe>
      </main>

      {popupVisible && (
        <Popup
          message="Are you sure you want to logout?"
          onCancel={() => setPopupVisible(false)}
          onConfirm={handleLogout}
        />
      )}
    </>
  );
};

export default PreModuleQuizPage;
