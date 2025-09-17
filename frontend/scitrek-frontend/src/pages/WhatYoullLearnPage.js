// src/pages/WhatYoullLearnPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';

const WhatYoullLearnPage = () => {
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
        {/* Header */}
        <section className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">What You’ll Learn</h1>
          <h2 className="text-xl md:text-2xl text-gray-600">
            Skills & concepts in the Bioinformatics Module
          </h2>
        </section>

        {/* Learning Outcomes Card */}
        <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <h3 className="text-2xl font-bold mb-4 flex items-center text-primary-700">
            <i className="fa-solid fa-graduation-cap text-primary-500 mr-3" />
            By the end, you’ll be able to…
          </h3>

          <p className="text-gray-700 leading-relaxed mb-6">
            Explore how scientists use computer-based tools to study genes and diseases—especially cancer.
            You’ll work with real data, ask questions like a scientist, and see how bioinformatics reveals
            what’s happening inside our cells.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h4 className="text-xl font-semibold mb-3 flex items-center">
                <i className="fa-solid fa-dna text-primary-500 mr-2" />
                Biology Foundations
              </h4>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <i className="fa-solid fa-circle-check text-primary-500 mt-1 mr-3" />
                  <span>
                    <span className="font-medium">Gene Regulation Basics:</span> how and why genes
                    are turned on or off in different cell types—and why that matters for health and disease.
                  </span>
                </li>
                <li className="flex items-start">
                  <i className="fa-solid fa-circle-check text-primary-500 mt-1 mr-3" />
                  <span>
                    <span className="font-medium">What Is Cancer?</span> how cancer cells differ from
                    healthy ones and how gene expression reveals those differences.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h4 className="text-xl font-semibold mb-3 flex items-center">
                <i className="fa-solid fa-laptop-code text-primary-500 mr-2" />
                Data & Tools
              </h4>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <i className="fa-solid fa-circle-check text-primary-500 mt-1 mr-3" />
                  <span>
                    <span className="font-medium">Data Analysis with Real Tools:</span> use
                    bioinformatics software to analyze gene expression from healthy and cancerous tissue.
                  </span>
                </li>
                <li className="flex items-start">
                  <i className="fa-solid fa-circle-check text-primary-500 mt-1 mr-3" />
                  <span>
                    <span className="font-medium">Identifying Cancer Biomarkers:</span> spot expression
                    patterns that can aid diagnosis and treatment.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h4 className="text-xl font-semibold mb-3 flex items-center">
                <i className="fa-solid fa-lightbulb text-primary-500 mr-2" />
                Scientific Thinking
              </h4>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <i className="fa-solid fa-circle-check text-primary-500 mt-1 mr-3" />
                  <span>
                    <span className="font-medium">Hypothesis Development:</span> ask your own questions
                    about cancer biology and test predictions with real-world data.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h4 className="text-xl font-semibold mb-3 flex items-center">
                <i className="fa-solid fa-chalkboard-user text-primary-500 mr-2" />
                Communicating Science
              </h4>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <i className="fa-solid fa-circle-check text-primary-500 mt-1 mr-3" />
                  <span>
                    <span className="font-medium">Scientific Poster Presentation:</span> create and present
                    a research poster with your team at the final symposium.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h4 className="font-medium mb-2 flex items-center">
              <i className="fa-solid fa-microscope text-primary-500 mr-2" />
              Get ready to analyze, investigate, and present like a bioinformatics researcher!
            </h4>
            <p className="text-gray-700 text-sm">
              Stay curious, collaborate with your team, and save your work as you go—this notebook is your learning journal.
            </p>
          </div>

          <div className="flex justify-between mt-6">
            <Link
              to="/sections/welcome"
              className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
            >
              <i className="fa-solid fa-arrow-left mr-2" />
              Back to Welcome
            </Link>
            <Link
              to="/sections/vocabulary"
              className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
            >
              Important Vocabulary
              <i className="fa-solid fa-arrow-right ml-2" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer nav (matches Day 1 style) */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center">
        <Link to="/sections/welcome" className="text-gray-600 hover:text-primary-500 mr-4">
          
        </Link>
        <Link to="/sections/vocabulary" className="text-primary-600 hover:text-primary-700 ml-4">
          
        </Link>
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

export default WhatYoullLearnPage;
