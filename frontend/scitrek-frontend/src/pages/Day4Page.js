// src/pages/Day4Page.js
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

const Day4Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 4;
  const genes = ['TP53', 'MYC', 'EGFR'];

  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(true);
  const [progress, setProgress] = useState(0);

  const [answersData, setAnswersData] = useState({
    warmup:     '',
    functions:  genes.map(() => ({ fn: '', why: '' })),
    differences: Array(3).fill(''),
    story:      '',
    reflection: ''
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
      answersData.warmup,
      ...answersData.functions.flatMap(f => [f.fn, f.why]),
      ...answersData.differences,
      answersData.story,
      answersData.reflection
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
        alert('Error saving. Please try again.');
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
            <Link to="/sections/day-3">‹ Previous</Link>
            <Link to={`/sections/day-${moduleId + 1}`}>Next ›</Link>
          </nav>

          <article className="section-content">
            <h2 className="day1-title">Day {moduleId}</h2>

            <h3 className="section-heading">Objective</h3>
            <p className="objective">
              Today, you’ll practice how scientists use visual data to compare gene activity between healthy and cancerous cells.
              You’ll learn how gene expression levels can act as clues, showing which genes are behaving differently in cancer.
              By the end of the day, you’ll be able to identify genes that are more or less active in cancer and explain why that
              matters for diagnosis and treatment.
            </p>

            <h3 className="section-heading">What’s the Plan?</h3>
            <ul>
              <li>Recap how gene expression works and why scientists study it.</li>
              <li>Explore gene expression patterns using simplified data visualizations.</li>
              <li>Practice identifying differences between healthy and cancerous cells.</li>
              <li>Build your Gene Data Dictionary using reliable resources like GeneCards and UniProt.</li>
              <li>Connect expression differences to real-world cancer diagnosis.</li>
            </ul>

            <h4 className="activity-heading">0–5 min | Warm-Up Question</h4>
            <p>If a gene is “turned up” in cancer cells, what might that tell you?</p>
            <input
              type="text"
              className="worksheet-input full-width"
              value={answersData.warmup}
              onChange={e =>
                setAnswersData({ ...answersData, warmup: e.target.value })
              }
            />

            <h4 className="activity-heading">6–20 min | Visual Data Practice: Gene Expression Bar Graphs</h4>
            <p>
              For each gene below, explore the datasets with the interactive dashboard. (Placeholder for interactive data viewer.)
            </p>
            <div className="placeholder-image">
              <img
                src="/images/dashboard-placeholder.png"
                alt="Interactive data viewer placeholder"
              />
            </div>

            <h4 className="activity-heading">21–35 min | Gene Function Matching</h4>
            <p>Use GeneCards or UniProt to match gene names to their normal functions.</p>
            <table className="analogy-table">
              <thead>
                <tr>
                  <th>Gene</th>
                  <th>Normal Function</th>
                  <th>Why does it matter?</th>
                </tr>
              </thead>
              <tbody>
                {genes.map((g, i) => (
                  <tr key={g}>
                    <td>{g}</td>
                    <td>
                      <input
                        type="text"
                        className="analogy-input"
                        value={answersData.functions[i].fn}
                        onChange={e => {
                          const arr = [...answersData.functions];
                          arr[i] = { ...arr[i], fn: e.target.value };
                          setAnswersData({ ...answersData, functions: arr });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="analogy-input"
                        value={answersData.functions[i].why}
                        onChange={e => {
                          const arr = [...answersData.functions];
                          arr[i] = { ...arr[i], why: e.target.value };
                          setAnswersData({ ...answersData, functions: arr });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 className="activity-heading">36–45 min | Find the Difference: Healthy vs. Cancer</h4>
            <ol className="worksheet">
              {[
                'This gene is (🟥 higher / 🟦 lower) in cancer.',
                'In normal cells, this gene helps with:',
                'In cancer cells, the problem is:'
              ].map((q, i) => (
                <li key={i}>
                  {q} →{' '}
                  <input
                    type="text"
                    className="worksheet-input"
                    value={answersData.differences[i]}
                    onChange={e => {
                      const arr = [...answersData.differences];
                      arr[i] = e.target.value;
                      setAnswersData({ ...answersData, differences: arr });
                    }}
                  />
                </li>
              ))}
            </ol>

            <h4 className="activity-heading">46–55 min | “Tell the Story” Practice</h4>
            <p>
              Complete the sentence below:
              <br />
              “My gene, __________, normally __________. But in cancer, it __________, which helps doctors understand __________.”
            </p>
            <input
              type="text"
              className="worksheet-input full-width"
              value={answersData.story}
              onChange={e =>
                setAnswersData({ ...answersData, story: e.target.value })
              }
            />

            <h4 className="activity-heading">56–60 min | Reflection</h4>
            <p>What is one new thing you learned about gene expression differences today?</p>
            <input
              type="text"
              className="worksheet-input full-width"
              value={answersData.reflection}
              onChange={e =>
                setAnswersData({ ...answersData, reflection: e.target.value })
              }
            />

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

export default Day4Page;
