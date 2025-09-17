// src/pages/ImportantVocabularyPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';

const ImportantVocabularyPage = () => {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Important Vocabulary</h1>
          <h2 className="text-xl md:text-2xl text-gray-600">
            Key terms for the Bioinformatics module
          </h2>
        </section>

        {/* Vocabulary Card */}
        <section className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          {/* Top nav inside card */}
          {/* <div className="flex items-center justify-between mb-6">
            <Link
              to="/sections/what-youll-learn"
              className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
            >
              <i className="fa-solid fa-arrow-left mr-2" />
              Back
            </Link>
            <div className="text-primary-700 font-semibold flex items-center">
              <i className="fa-solid fa-book-open text-primary-500 mr-2" />
              Glossary
            </div>
            <Link
              to="/sections/day-1"
              className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
            >
              Day 1 • Start
              <i className="fa-solid fa-arrow-right ml-2" />
            </Link>
          </div> */}

          {/* Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { term: 'Gene Expression', def: 'How much a gene is “turned on” or “off” in a cell, often measured by how much mRNA is made from that gene.' },
              { term: 'Regulation', def: 'The control of when, where, and how much a gene is expressed in a cell.' },
              { term: 'DNA (Deoxyribonucleic Acid)', def: 'The molecule that carries genetic instructions used in growth, development, and function.' },
              { term: 'RNA (Ribonucleic Acid)', def: 'A molecule made from DNA that helps produce proteins; RNA levels indicate which genes are active.' },
              { term: 'Protein', def: 'A molecule built using RNA instructions that performs many functions, like building cells or sending signals.' },
              { term: 'Bioinformatics', def: 'Combines biology, computer science, and math to analyze biological data such as DNA/RNA sequences.' },
              { term: 'mRNA (Messenger RNA)', def: 'Carries the code from DNA to make proteins; commonly measured to study gene activity.' },
              { term: 'Biomarker', def: 'A biological sign (e.g., a gene or protein) that can indicate a condition or disease such as cancer.' },
              { term: 'Cancer', def: 'A disease where cells grow uncontrollably and may spread; often shows altered gene expression.' },
              { term: 'Hypothesis', def: 'A testable scientific prediction you can evaluate with experiments or data analysis.' },
              { term: 'Data Analysis', def: 'Examining data to find patterns or differences; here, analyzing gene expression data.' },
              { term: 'Heat Map', def: 'A color-coded chart showing differences in gene expression between samples.' },
              { term: 'Differential Expression', def: 'A gene being expressed at different levels between sample types (e.g., cancer vs. healthy cells).' },
              { term: 'Hallmark of Cancer', def: 'A key trait of cancer cells (e.g., rapid growth or immune evasion).' },
              { term: 'Scientific Poster', def: 'A visual summary of question, methods, results, and conclusions; you’ll present one at the end.' },
            ].map(({ term, def }) => (
              <div key={term} className="bg-white rounded-2xl shadow p-6 border border-gray-100">
                <h4 className="text-lg font-semibold mb-2 flex items-start">
                  <i className="fa-solid fa-tag text-primary-500 mr-2 mt-0.5" />
                  {term}
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">{def}</p>
              </div>
            ))}
          </div>

          {/* Bottom actions */}
          <div className="flex justify-between mt-8">
            <Link
              to="/sections/what-youll-learn"
              className="inline-flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg"
            >
              <i className="fa-solid fa-arrow-left mr-2" />
              Back to What You’ll Learn
            </Link>
            <Link
              to="/sections/day-1"
              className="inline-flex items-center bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg"
            >
              Go to Day 1
              <i className="fa-solid fa-arrow-right ml-2" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer nav (matches Day 1 style) */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center">
        {/* <Link to="/sections/what-youll-learn" className="text-gray-600 hover:text-primary-500 mr-4">
          <i className="fa-solid fa-arrow-left" />
        </Link>
        <Link to="/sections/day-1" className="text-primary-600 hover:text-primary-700 ml-4">
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

export default ImportantVocabularyPage;
