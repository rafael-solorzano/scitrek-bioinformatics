import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';
import './SectionPage.css'; // reuse SectionPage styles

const ImportantVocabularyPage = () => {
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
            <Link to="/sections/what-youll-learn">‹ Previous</Link>
            <Link to="/sections/day-1">Next ›</Link>
          </nav>
          <article className="section-content">
            <h2>Important Vocabulary</h2>

            <ul>
              <li><strong>Gene Expression:</strong> How much a gene is “turned on” or “off” in a cell, often measured by how much mRNA is made from that gene.</li>
              <li><strong>Regulation:</strong> The control of when, where, and how much a gene is expressed in a cell.</li>
              <li><strong>DNA (Deoxyribonucleic Acid):</strong> The molecule that carries genetic instructions used in the growth, development, and function of living organisms.</li>
              <li><strong>RNA (Ribonucleic Acid):</strong> A molecule made from DNA that helps produce proteins. In gene expression studies, RNA levels tell us which genes are active.</li>
              <li><strong>Protein:</strong> A molecule made from RNA instructions that performs many functions in the body, such as building cells or sending signals.</li>
              <li><strong>Bioinformatics:</strong> A field that combines biology, computer science, and math to analyze biological data like DNA or RNA sequences.</li>
              <li><strong>mRNA (Messenger RNA):</strong> A type of RNA that carries the code from DNA to make proteins. Scientists often measure mRNA to study gene activity.</li>
              <li><strong>Biomarker:</strong> A biological sign (like a gene or protein) that can indicate a disease, such as cancer.</li>
              <li><strong>Cancer:</strong> A disease where cells grow uncontrollably and may spread. Cancer cells often show changes in gene expression.</li>
              <li><strong>Hypothesis:</strong> A scientific guess or prediction that you can test through experiments or data analysis.</li>
              <li><strong>Data Analysis:</strong> Looking at collected data to find patterns, differences, or trends. In this module, you’ll analyze gene expression data.</li>
              <li><strong>Heat Map:</strong> A colorful chart used to show differences in gene expression levels between samples, such as healthy and cancerous tissue.</li>
              <li><strong>Differential Expression:</strong> When a gene is expressed at different levels between two or more sample types (e.g., cancer vs. healthy cells).</li>
              <li><strong>Hallmark of Cancer:</strong> A key trait or behavior of cancer cells, like growing too fast or avoiding the immune system.</li>
              <li><strong>Scientific Poster:</strong> A visual presentation of your research question, methods, results, and conclusion. You’ll create one to share your work!</li>
            </ul>
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

export default ImportantVocabularyPage;
