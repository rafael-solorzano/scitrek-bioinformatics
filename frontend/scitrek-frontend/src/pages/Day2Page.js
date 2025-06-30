// src/pages/Day2Page.js
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

const Day2Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 2;

  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(true);
  const [progress, setProgress] = useState(0);

  const [answersData, setAnswersData] = useState({
    // 0–5 min brainstorm: 4 inputs (last li has two)
    brainstorm: Array(4).fill(''),
    // Watch video: 4 inputs
    video: Array(4).fill(''),
    // p53 case study: 6 inputs (last li has two)
    p53: Array(6).fill(''),
    // Cell cycle activity: 3 inputs
    cycle: Array(3).fill(''),
    // Metaphor exit ticket: 2 inputs
    metaphor: Array(2).fill(''),
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

  // Compute progress from state
  useEffect(() => {
    const all = [
      ...answersData.brainstorm,
      ...answersData.video,
      ...answersData.p53,
      ...answersData.cycle,
      ...answersData.metaphor,
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
          {/* Dynamic progress bar */}
          <div className="progress-container">
            <div
              className="progress"
              style={{ width: `${progress}%`, backgroundColor: '#e49c04' }}
            />
          </div>

          <nav className="section-nav">
            <Link to="/sections/day-1">‹ Previous</Link>
            <Link to={`/sections/day-${moduleId + 1}`}>Next ›</Link>
          </nav>

          <article className="section-content">
            <h2 className="day1-title">Day {moduleId}</h2>

            <h3 className="section-heading">Objective</h3>
            <p className="objective">
              Today, you’ll investigate what happens when the “instructions” inside a cell go away, leading to uncontrolled growth,
              known as cancer. By the end of the day, you’ll be able to describe the hallmarks of cancer, explain how key molecules
              like p53 work to prevent tumor formation, and articulate why cancer is fundamentally a problem of cell-cycle regulation
              gone wrong.
            </p>

            <h3 className="section-heading">What’s the timeline?</h3>
            <ul>
              <li>Brainstorm what cancer is and why it arises</li>
              <li>Watch a foundational video on cancer biology</li>
              <li>Explore the role of tumor suppressors through a case study of p53</li>
            </ul>

            <h4 className="activity-heading">0–5 min | Warm-Up Brainstorm</h4>
            <p>👉 Prompt: Using your own knowledge, answer the questions below:</p>
            <ol className="worksheet">
              <li>
                What is Cancer? →{' '}
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.brainstorm[0]}
                  onChange={e => {
                    const arr = [...answersData.brainstorm];
                    arr[0] = e.target.value;
                    setAnswersData({ ...answersData, brainstorm: arr });
                  }}
                />
              </li>
              <li>
                Why does cancer happen? →{' '}
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.brainstorm[1]}
                  onChange={e => {
                    const arr = [...answersData.brainstorm];
                    arr[1] = e.target.value;
                    setAnswersData({ ...answersData, brainstorm: arr });
                  }}
                />
              </li>
              <li>
                Two questions I have about cancer:
                <br />
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.brainstorm[2]}
                  onChange={e => {
                    const arr = [...answersData.brainstorm];
                    arr[2] = e.target.value;
                    setAnswersData({ ...answersData, brainstorm: arr });
                  }}
                />
                <br />
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.brainstorm[3]}
                  onChange={e => {
                    const arr = [...answersData.brainstorm];
                    arr[3] = e.target.value;
                    setAnswersData({ ...answersData, brainstorm: arr });
                  }}
                />
              </li>
            </ol>

            <h4 className="activity-heading">6–20 min | Activity: Watch & Learn Video “What Is Cancer?”</h4>
            <p>
              Watch:&nbsp;
              <a
                href="https://www.youtube.com/watch?v=tsXnVu3kUnM"
                target="_blank"
                rel="noreferrer"
              >
                What Is Cancer?
              </a>
            </p>
            <ol className="worksheet">
              {[
                'How does cancer differ from normal cell growth?',
                'Name two hallmarks of cancer you saw in the video.',
                'What role do mutations play in cancer development?',
                'Why is early detection important?'
              ].map((q, i) => (
                <li key={i}>
                  {q} →{' '}
                  <input
                    type="text"
                    className="worksheet-input"
                    value={answersData.video[i]}
                    onChange={e => {
                      const arr = [...answersData.video];
                      arr[i] = e.target.value;
                      setAnswersData({ ...answersData, video: arr });
                    }}
                  />
                </li>
              ))}
            </ol>

            <h4 className="activity-heading">21–40 min | Activity: p53 Gene and Cancer</h4>
            <p>
              Explore tumor suppressors through this case study:&nbsp;
              <a
                href="https://www.biointeractive.org/classroom-resources/p53-gene-and-cancer"
                target="_blank"
                rel="noreferrer"
              >
                p53 Gene and Cancer
              </a>
            </p>
            <ol className="worksheet">
              <li>
                What are Oncogenes? →{' '}
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.p53[0]}
                  onChange={e => {
                    const arr = [...answersData.p53];
                    arr[0] = e.target.value;
                    setAnswersData({ ...answersData, p53: arr });
                  }}
                />
              </li>
              <li>
                What are Tumor suppressor genes? →{' '}
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.p53[1]}
                  onChange={e => {
                    const arr = [...answersData.p53];
                    arr[1] = e.target.value;
                    setAnswersData({ ...answersData, p53: arr });
                  }}
                />
              </li>
              <li>
                What are DNA repair genes? →{' '}
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.p53[2]}
                  onChange={e => {
                    const arr = [...answersData.p53];
                    arr[2] = e.target.value;
                    setAnswersData({ ...answersData, p53: arr });
                  }}
                />
              </li>
              <li>
                What is the normal function of p53 in a healthy cell? →{' '}
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.p53[3]}
                  onChange={e => {
                    const arr = [...answersData.p53];
                    arr[3] = e.target.value;
                    setAnswersData({ ...answersData, p53: arr });
                  }}
                />
              </li>
              <li>
                In two sentences, describe how p53 works:
                <br />
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.p53[4]}
                  onChange={e => {
                    const arr = [...answersData.p53];
                    arr[4] = e.target.value;
                    setAnswersData({ ...answersData, p53: arr });
                  }}
                />
                <br />
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.p53[5]}
                  onChange={e => {
                    const arr = [...answersData.p53];
                    arr[5] = e.target.value;
                    setAnswersData({ ...answersData, p53: arr });
                  }}
                />
              </li>
            </ol>

            <h4 className="activity-heading">41–50 min | Activity: Eukaryotic Cell Cycle and Cancer</h4>
            <p>
              Explore checkpoints:&nbsp;
              <a
                href="https://www.biointeractive.org/classroom-resources/eukaryotic-cell-cycle-and-cancer"
                target="_blank"
                rel="noreferrer"
              >
                Eukaryotic Cell Cycle and Cancer
              </a>
            </p>
            <ol className="worksheet">
              {[
                'Which checkpoint did you explore in your activity?',
                'Describe one “what-if” scenario you tested (e.g., turning p53 off, overexpressing cyclin D, disabling the G2/M arrest). What did you observe?',
                'How did the simulation reinforce your understanding of cancer development?'
              ].map((q, i) => (
                <li key={i}>
                  {q} →{' '}
                  <input
                    type="text"
                    className="worksheet-input"
                    value={answersData.cycle[i]}
                    onChange={e => {
                      const arr = [...answersData.cycle];
                      arr[i] = e.target.value;
                      setAnswersData({ ...answersData, cycle: arr });
                    }}
                  />
                </li>
              ))}
            </ol>

            <h4 className="activity-heading">51–60 min | Exit Ticket: Create a Metaphor for Cancer</h4>
            <p>Prompt: “Cancer is like [ ____ ] because …”</p>
            <ul className="worksheet">
              {answersData.metaphor.map((val, i) => (
                <li key={i}>
                  ●{' '}
                  <input
                    type="text"
                    className="worksheet-input"
                    value={val}
                    onChange={e => {
                      const arr = [...answersData.metaphor];
                      arr[i] = e.target.value;
                      setAnswersData({ ...answersData, metaphor: arr });
                    }}
                  />
                </li>
              ))}
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

export default Day2Page;
