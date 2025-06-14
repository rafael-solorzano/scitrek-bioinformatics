// src/components/ModuleList.js

import React, { useState, useEffect } from 'react';
import { getModules } from '../services/api';
import { Link } from 'react-router-dom';
import './ModuleList.css';

const ModuleList = () => {
  const [modules, setModules] = useState([]);
  const [error, setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getModules();
        setModules(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load modules.');
      }
    })();
  }, []);

  return (
    <div className="module-list">
      <h2>Modules</h2>
      {error && <p className="error">{error}</p>}
      <ul>
        {modules.map(mod => (
          <li key={mod.id}>
            <Link to={`/modules/${mod.id}`}>
              Day {mod.day}: {mod.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ModuleList;
