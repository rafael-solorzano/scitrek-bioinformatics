// src/pages/WelcomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';

const WelcomePage = () => {
  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading…</div>;
  }

  return (
    <div className="font-sans bg-gray-50 text-gray-800 min-h-screen flex flex-col">
      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      <main className="container mx-auto px-4 py-8 space-y-16 flex-1">
        {/* Hero / Welcome */}
        <section className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Welcome to SciTrek!</h1>
          <h2 className="text-xl md:text-2xl text-gray-800">
            Your interactive workbook for a week of discovery
          </h2>
        </section>

        {/* Intro Card */}
        <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-bold mb-4 flex items-center text-primary-800">
            <i className="fa-solid fa-compass text-primary-500 mr-3" />
            What this workbook is about
          </h3>
          <p className="text-gray-800 leading-relaxed mb-6">
            We’re excited to have you here! This workbook will guide you through hands-on activities,
            team discussions, and real science investigations with support from SciTrek Mentors and Leads.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h4 className="text-xl font-semibold mb-3 flex items-center">
                <i className="fa-solid fa-rocket text-primary-500 mr-2" />
                What to expect
              </h4>
              <ul className="space-y-3 text-gray-800">
                <li className="flex items-start">
                  <i className="fa-solid fa-circle-check text-primary-500 mt-1 mr-3" />
                  Explore core biology concepts with interactive tools and guided prompts.
                </li>
                <li className="flex items-start">
                  <i className="fa-solid fa-circle-check text-primary-500 mt-1 mr-3" />
                  Work in small teams and learn how scientists ask and answer questions.
                </li>
                <li className="flex items-start">
                  <i className="fa-solid fa-circle-check text-primary-500 mt-1 mr-3" />
                  Save your responses as you go—this is your learning journal.
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h4 className="text-xl font-semibold mb-3 flex items-center">
                <i className="fa-solid fa-calendar-days text-primary-500 mr-2" />
                The week at a glance
              </h4>
              <ul className="space-y-4">
                <li>
                  <span className="font-medium">Day 1: Gene Regulation</span>
                  <p className="text-gray-800 text-sm">
                    Learn how cells turn genes on and off—and why it matters.
                  </p>
                </li>
                <li>
                  <span className="font-medium">Day 2: Understanding Cancer</span>
                  <p className="text-gray-800 text-sm">
                    Compare healthy and cancer cells to see what’s different.
                  </p>
                </li>
                <li>
                  <span className="font-medium">Day 3: How Do We Detect Cancer?</span>
                  <p className="text-gray-800 text-sm">
                    Analyze data and explore how gene expression reveals patterns.
                  </p>
                </li>
                <li>
                  <span className="font-medium">Day 4: Expression Differences</span>
                  <p className="text-gray-800 text-sm">
                    Investigate real gene expression differences between healthy and cancer cells.
                  </p>
                </li>
                <li>
                  <span className="font-medium">Day 5: Poster Symposium</span>
                  <p className="text-gray-800 text-sm">
                    Team up to present a hallmark of colorectal cancer and share your findings.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h4 className="font-medium mb-2 flex items-center">
              <i className="fa-solid fa-hand-holding-heart text-primary-500 mr-2" />
              You’ve got a team behind you
            </h4>
            <p className="text-gray-800 text-sm">
              Your teacher and the SciTrek team are here to help. Ask questions, share ideas, and have fun—this is your space to explore!
            </p>
          </div>

          <div className="flex justify-end mt-6">
            <Link
              to="/sections/what-youll-learn"
              className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
            >
              What You’ll Learn
              <i className="fa-solid fa-arrow-right ml-2" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer nav (matches Day 1 style) */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center">
        {/* No previous page here; show only Next
        <Link to="/sections/what-youll-learn" className="text-primary-600 hover:text-primary-800 ml-4">
          <i className="fa-solid fa-arrow-right" />
        </Link> */}
      </footer>

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

export default WelcomePage;
