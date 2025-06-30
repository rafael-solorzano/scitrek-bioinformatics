// src/pages/Day3Page.js
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import {
  getCurrentUser,
  getResponseDetail,
  upsertResponse
} from '../services/api';
import './SectionPage.css';

const Day3Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 3;

  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(true);
  const [progress, setProgress] = useState(0);

  const [answersData, setAnswersData] = useState({
    discussion: Array(2).fill(''),
    patterns:   Array(2).fill(''),
    detective:  Array(3).fill(''),
    experiment: [''],
    exit:       ['']
  });

  // Load current user
  useEffect(() => {
    getCurrentUser().then(setUser).catch(console.error);
  }, []);

  // Load existing response
  useEffect(() => {
    if (!user) return;
    getResponseDetail(moduleId)
      .then(data => {
        if (data.answers) {
          const payload = data.answers.answers || data.answers;
          setAnswersData(prev => ({ ...prev, ...payload }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingResponse(false));
  }, [user, moduleId]);

  // Compute progress
  useEffect(() => {
    const all = [
      ...answersData.discussion,
      ...answersData.patterns,
      ...answersData.detective,
      ...answersData.experiment,
      ...answersData.exit
    ];
    const total  = all.length;
    const filled = all.filter(v => v.trim() !== '').length;
    setProgress(total ? Math.round((filled / total) * 100) : 0);
  }, [answersData]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  const handleSave = () => {
    upsertResponse(moduleId, answersData)
      .then(() => alert('Your work has been saved!'))
      .catch(err => {
        console.error(err);
        alert('There was an error saving. Please try again.');
      });
  };

  if (!user || loadingResponse) {
    return <div className="loading">Loading…</div>;
  }

  return (
    <>
      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      <div className="section-page">
        <div className="section-card">
          {/* Progress Bar */}
          <div className="progress-container">
            <div
              className="progress"
              style={{ width: `${progress}%`, backgroundColor: '#e49c04' }}
            />
          </div>

          <nav className="section-nav">
            <Link to="/sections/day-2">‹ Previous</Link>
            <Link to={`/sections/day-${moduleId + 1}`}>Next ›</Link>
          </nav>

          <article className="section-content">
            <h2 className="day1-title">Day {moduleId}</h2>

            <h3 className="section-heading">Objective</h3>
            <p className="objective">
              Today, you’ll explore how scientists figure out if a person might have cancer by looking at gene expression.
              Genes can act like “volume dials”, either by being too loud or too quiet, which may signal that something is wrong.
              By the end of today, you’ll understand how gene expression clues can point to cancer, and begin thinking like a diagnostic scientist.
            </p>

            <h4 className="activity-heading">0–5 min | Warm-Up Discussion</h4>
            <p>👉 Prompt: If a gene is too “loud” (high expression) or too “quiet” (low expression), what might that mean?</p>
            <ul className="worksheet">
              {answersData.discussion.map((val, i) => (
                <li key={i}>
                  →{' '}
                  <input
                    type="text"
                    className="worksheet-input"
                    value={val}
                    onChange={e => {
                      const arr = [...answersData.discussion];
                      arr[i] = e.target.value;
                      setAnswersData({ ...answersData, discussion: arr });
                    }}
                  />
                </li>
              ))}
            </ul>

            <h4 className="activity-heading">6–20 min | Activity: What Does Gene Expression Look Like?</h4>
            <p>
              <strong>Goal:</strong> Use a simplified activity to compare expression levels in different genes.
              You’ll examine how “housekeeping” genes (always on) differ from genes that may be linked to cancer.
            </p>
            <ol className="worksheet">
              <li>Look at the example gene charts or data cards.</li>
              <li>Compare the expression of genes in healthy and cancerous cells.</li>
              <li>
                What patterns do you notice?
                <br />
                {answersData.patterns.map((val, i) => (
                  <React.Fragment key={i}>
                    →{' '}
                    <input
                      type="text"
                      className="worksheet-input"
                      value={val}
                      onChange={e => {
                        const arr = [...answersData.patterns];
                        arr[i] = e.target.value;
                        setAnswersData({ ...answersData, patterns: arr });
                      }}
                    />
                    <br />
                  </React.Fragment>
                ))}
              </li>
            </ol>

            {/* Sample Cards */}
            <h4 className="activity-heading">Sample Cards</h4>
            <div className="sample-cards">
              {['A','B','C','D'].map(letter => (
                <div key={letter} className="card sample-card">
                  <h5>Tissue {letter}</h5>
                  <ul>
                    <li>MP1: {letter === 'A' || letter === 'C' ? 'High' : 'Normal'}</li>
                    <li>CEACAM5: {letter === 'A' ? 'High' : 'Normal'}</li>
                    <li>CXCL8: {['A','C'].includes(letter) ? 'High' : 'Normal'}</li>
                    <li>SMAD4: {letter === 'A' || letter === 'D' ? 'Low' : 'Normal'}</li>
                    <li>TP53: {letter === 'A' || letter === 'D' ? 'Low' : 'Normal'}</li>
                    <li>APC: {letter === 'A' || letter === 'D' ? 'Low' : 'Normal'}</li>
                  </ul>
                </div>
              ))}
            </div>

            <h4 className="activity-heading">21–40 min | Activity: Gene Detective – Create a Hypothesis</h4>
            <p>Use these Suspect Cards:</p>
            <div className="suspect-cards">
              {[
                {
                  gene:    'MMP1',
                  pattern: 'Upregulated',
                  red:     'If this gene is highly expressed, it could be a cancer clue',
                  fn:      'Helps cancer cells break through tissue barriers.'
                },
                {
                  gene:    'CEACAM5',
                  pattern: 'Upregulated',
                  red:     'If this gene is highly expressed, it could be a cancer clue',
                  fn:      'Involved in cell adhesion. Too much could indicate colorectal cancer.'
                },
                {
                  gene:    'CXCL8',
                  pattern: 'Upregulated',
                  red:     'If this gene is highly expressed, it could be a cancer clue',
                  fn:      'Attracts immune cells. Often overproduced in tumors.'
                },
                {
                  gene:    'SMAD4',
                  pattern: 'Downregulated',
                  red:     'If this gene has low expression, it could be a cancer clue',
                  fn:      'Key tumor suppressor in colon cells.'
                },
                {
                  gene:    'TP53',
                  pattern: 'Downregulated',
                  red:     'If this gene has low expression, it could be a cancer clue',
                  fn:      'Stops damaged cells from growing. Protects the body from cancer.'
                },
                {
                  gene:    'APC',
                  pattern: 'Downregulated',
                  red:     'If this gene has low expression, it could be a cancer clue',
                  fn:      'Prevents excessive cell division.'
                }
              ].map(card => (
                <div key={card.gene} className="card suspect-card">
                  <h5>{card.gene}</h5>
                  <p><strong>Cancer Pattern:</strong> {card.pattern}</p>
                  <p><strong>Red Flag:</strong> {card.red}</p>
                  <p><strong>Function:</strong> {card.fn}</p>
                </div>
              ))}
            </div>

            <ol className="worksheet">
              {[
                'Create a hypothesis: What kind of gene behavior might help you identify if someone has cancer?',
                'Pick your “suspect” genes: Which ones look suspicious, and why?',
                'Think like a scientist: What kind of experiment would you design to test this?'
              ].map((q, i) => (
                <li key={i}>
                  {q}
                  <br />
                  →{' '}
                  <input
                    type="text"
                    className="worksheet-input"
                    value={answersData.detective[i]}
                    onChange={e => {
                      const arr = [...answersData.detective];
                      arr[i] = e.target.value;
                      setAnswersData({ ...answersData, detective: arr });
                    }}
                  />
                </li>
              ))}
            </ol>

            <h4 className="activity-heading">41–50 min | Guided Inquiry: Design an Experiment</h4>
            <p>
              Work in groups to describe your experiment plan. Questions to consider:
            </p>
            <ul>
              <li>What would you compare (healthy vs cancer)?</li>
              <li>What kind of data would you collect (expression levels)?</li>
              <li>How would you know if a gene is a good cancer marker?</li>
            </ul>
            <p className="bonus">✏️ Describe your experiment:</p>
            <input
              type="text"
              className="worksheet-input full-width"
              value={answersData.experiment[0]}
              onChange={e => {
                setAnswersData({ ...answersData, experiment: [e.target.value] });
              }}
            />

            <h4 className="activity-heading">51–60 min | Exit Ticket: Reflection</h4>
            <p>Prompt: If you could investigate one gene for cancer, which would you choose and why?</p>
            <ul className="worksheet">
              <li>
                →{' '}
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.exit[0]}
                  onChange={e => {
                    setAnswersData({ ...answersData, exit: [e.target.value] });
                  }}
                />
              </li>
            </ul>

            <button className="save-btn" onClick={handleSave}>
              Save
            </button>
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

export default Day3Page;
