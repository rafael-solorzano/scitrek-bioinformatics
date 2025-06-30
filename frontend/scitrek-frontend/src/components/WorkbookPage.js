// src/components/WorkbookPage.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getWorkbookDetail } from '../services/api';
import './WorkbookPage.css';

const WorkbookPage = () => {
  const { id: workbookId } = useParams();
  const [workbook, setWorkbook] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        // pass `true` so we INCLUDE all sections (including the first 8 TOC entries)
        const wb = await getWorkbookDetail(workbookId, true);
        setWorkbook(wb);
      } catch {
        setError('Failed to load workbook.');
      }
    }
    load();
  }, [workbookId]);

  if (error) return <p className="error">{error}</p>;
  if (!workbook) return <div>Loading…</div>;

  return (
    <div className="workbook-page">
      <h2>{workbook.title}</h2>

      {workbook.sections.map(section => (
        <div className="section-block" key={section.id}>
          <h3>{section.heading}</h3>
          <div
            className="section-content"
            dangerouslySetInnerHTML={{ __html: section.content_html }}
          />
          {section.images?.length > 0 && (
            <div className="section-images">
              {section.images.map(img => (
                <figure key={img.id}>
                  <img src={img.image} alt={img.caption} />
                  {img.caption && <figcaption>{img.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WorkbookPage;
