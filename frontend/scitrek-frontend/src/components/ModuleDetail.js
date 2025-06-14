// src/components/ModuleDetail.js

import React, { useState, useEffect } from 'react';
import { getModule } from '../services/api';
import { useParams, Link } from 'react-router-dom';
import './ModuleDetail.css';

const ModuleDetail = () => {
  const { id } = useParams();
  const [module, setModule] = useState(null);
  const [error, setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getModule(id);
        setModule(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load module.');
      }
    })();
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!module) return <div className="loading">Loading…</div>;

  return (
    <div className="module-detail">
      <Link to="/modules" className="back-link">
        ← Back to Modules
      </Link>
      <h2>
        Day {module.day}: {module.title}
      </h2>
      <div
        className="module-content"
        // If your backend returns safe HTML:
        dangerouslySetInnerHTML={{ __html: module.content }}
      />
    </div>
  );
};

export default ModuleDetail;
