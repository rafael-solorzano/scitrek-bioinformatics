import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';
import './SectionPage.css';

const WhatYoullLearnPage = () => {
  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(err => console.error(err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  if (!user) return <div className="loading">Loading…</div>;

  return (
    <>
      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      <div className="section-page">
        <div className="section-card">
          <nav className="section-nav">
            <Link to="/sections/welcome">‹ Previous</Link>
            <Link to="/sections/vocabulary">Next ›</Link>
          </nav>

          <article className="section-content">
            <h2>What You’ll Learn in the Bioinformatics Module</h2>

            <p>
              In this module, you’ll explore how scientists use computer-based tools to study genes and diseases—especially cancer! You’ll work with real data, ask important scientific questions, and uncover how bioinformatics helps us understand what’s happening inside our cells. By the end of the program, here’s what you’ll be able to do:
            </p>

            <ul>
              <li>
                <strong>Gene Regulation Basics:</strong><br />
                You’ll discover how and why certain genes are turned on or off in different cell types—and why that matters for health and disease.
              </li>
              <li>
                <strong>What Is Cancer?:</strong><br />
                You’ll explore what makes cancer cells different from healthy ones and how gene expression can reveal those differences.
              </li>
              <li>
                <strong>Data Analysis with Real Tools:</strong><br />
                You’ll learn to use bioinformatics software (just like real scientists!) to analyze gene expression data from healthy and cancerous tissue.
              </li>
              <li>
                <strong>Hypothesis Development:</strong><br />
                You’ll ask your own scientific questions about cancer biology and use real-world data to test your predictions.
              </li>
              <li>
                <strong>Identifying Cancer Biomarkers:</strong><br />
                You’ll search for gene expression patterns that could help identify cancer—and learn how scientists use this information to improve diagnosis and treatment.
              </li>
              <li>
                <strong>Scientific Poster Presentation:</strong><br />
                You’ll create and present a scientific research poster with your team, sharing your discoveries with peers and SciTrek Leads in a final symposium.
              </li>
            </ul>

            <p>
              Get ready to analyze, investigate, and present like a real bioinformatics researcher!
            </p>
          </article>
        </div>
      </div>

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

export default WhatYoullLearnPage;
