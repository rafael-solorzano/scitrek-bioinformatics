// src/pages/SectionPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { getWorkbookDetail, getCurrentUser } from '../services/api';
import StudentProfileBanner from '../components/StudentProfileBanner';
import './SectionPage.css';

const SectionPage = () => {
  const { id: workbookId, order } = useParams();
  const [workbook, setWorkbook] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [popupVisible, setPopupVisible] = useState(false);

  // load workbook
  useEffect(() => {
    getWorkbookDetail(workbookId, true)
      .then(wb => setWorkbook(wb))
      .catch(() => setError('Failed to load section.'));
  }, [workbookId]);

  // load user
  useEffect(() => {
    getCurrentUser()
      .then(profile => setUser(profile))
      .catch(err => console.error(err));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!workbook || !user) return <div className="loading">Loading…</div>;

  const section = workbook.sections.find(s => String(s.order) === order);
  if (!section) return <Navigate to={`/workbooks/${workbookId}`} replace />;

  const total = workbook.sections.length;
  const idx = section.order;

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  return (
    <>
      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      <div className="section-page">
        <div className="section-card">
          <nav className="section-nav">
            {idx > 1 && (
              <Link to={`/workbooks/${workbookId}/sections/${idx - 1}`}>
                ‹ Previous
              </Link>
            )}
            {idx < total && (
              <Link to={`/workbooks/${workbookId}/sections/${idx + 1}`}>
                Next ›
              </Link>
            )}
          </nav>

          <article className="section-content">
            <h2>{section.heading}</h2>
            <div
              className="content-html"
              dangerouslySetInnerHTML={{ __html: section.content_html }}
            />
            {section.images?.length > 0 && (
              <div className="section-images">
                {section.images.map(img => (
                  <figure key={img.id}>
                    <img src={img.image} alt={img.caption || 'Section image'} />
                    {img.caption && <figcaption>{img.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </article>
        </div>

        
      </div>

      {popupVisible && (
        <div className="popup-overlay" onClick={() => setPopupVisible(false)}>
          <div className="popup">
            <p>Are you sure you want to logout?</p>
            <button onClick={() => setPopupVisible(false)}>Cancel</button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
      )}
    </>
  );
};

export default SectionPage;
