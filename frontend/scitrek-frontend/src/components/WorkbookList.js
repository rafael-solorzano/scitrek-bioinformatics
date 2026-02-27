// src/components/WorkbookList.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getWorkbooks } from '../services/api';
import './WorkbookList.css';

const WorkbookList = () => {
  const [workbooks, setWorkbooks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getWorkbooks()
      .then(data => setWorkbooks(data))
      .catch(() => setError('Failed to load workbooks.'));
  }, []);

  return (
    <main className="workbook-list">
      <h2>Available Workbooks</h2>
      {error && <p className="error">{error}</p>}
      <ul>
        {workbooks.map(wb => (
          <li key={wb.id}>
            <div className="wb-info">
              <strong>{wb.title}</strong>
              <p className="wb-desc">{wb.description}</p>
            </div>
            <Link
              to={`/workbooks/${wb.id}`}
              className="start-btn"
              aria-label={wb.sections && wb.sections.length ? `Continue ${wb.title}` : `Start ${wb.title}`}
            >
              {wb.sections && wb.sections.length ? 'Continue' : 'Start'}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default WorkbookList;
