// src/pages/HomePage.js
import React, { useState, useEffect } from 'react';
import HomeHeader from '../components/HomeHeader';
import Gallery from '../components/Gallery';
import TeamSection from '../components/TeamSection';
import ResourceSection from '../components/ResourceSection';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';
import '../styles/scitrek-ui.css';
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
    <div className="home-page st-surface">
      <HomeHeader user={user} onLogout={() => setPopupVisible(true)} />

      <main>
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="st-kicker">Science discovery platform</p>
            <h1>Investigate cancer biology through real bioinformatics thinking.</h1>
            <p>
              SciTrek guides students from gene regulation fundamentals to data-driven
              discovery, team discussion, and scientific communication.
            </p>
            <div className="home-hero-actions">
              <a className="st-button st-button-primary" href="/student_profile">
                Open Dashboard
                <i className="fa fa-arrow-right" aria-hidden="true" />
              </a>
              <a className="st-button st-button-ghost" href="/inbox">
                Review Inbox
              </a>
            </div>
          </div>
          <div className="home-hero-visual" aria-label="Genomic variation preview">
            <img
              src="/images/genomic_variation.jpg"
              alt="Illustration of genomic variation across DNA sequences"
            />
            <div className="home-hero-data-card">
              <span>Signal scan</span>
              <div className="data-bars" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="home-hero-note">
              <span>Bioinformatics workflow</span>
              <strong>Compare sequence patterns and ask better questions</strong>
            </div>
          </div>
        </section>

        <section className="home-section home-gallery-section">
          <div className="home-section-header">
            <p className="st-kicker">Current research lens</p>
            <h2>Start with the science students can see.</h2>
          </div>
          <Gallery />
        </section>

        <TeamSection />
        <ResourceSection />
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

export default HomePage;
