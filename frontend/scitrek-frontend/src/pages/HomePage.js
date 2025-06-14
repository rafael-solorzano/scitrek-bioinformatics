// src/pages/HomePage.js
import React, { useState, useEffect } from 'react';
import HomeHeader from '../components/HomeHeader';
import Gallery from '../components/Gallery';
import TeamSection from '../components/TeamSection';
import ResourceSection from '../components/ResourceSection';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';
import './HomePage.css';

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  // Fetch the current user's profile on mount
  useEffect(() => {
    (async () => {
      try {
        const profile = await getCurrentUser();
        setUser(profile);
      } catch (err) {
        console.error('Failed to fetch user profile', err);
        // optionally redirect to login if unauthorized
        // window.location.href = '/login';
      }
    })();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  // If user isn’t loaded yet, you can show a loading state:
  if (user === null) {
    return <div>Loading…</div>;
  }

  return (
    <div className="home-page">
      <HomeHeader user={user} onLogout={() => setPopupVisible(true)} />
      <Gallery />
      <TeamSection />
      <ResourceSection />

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

export default HomePage;
