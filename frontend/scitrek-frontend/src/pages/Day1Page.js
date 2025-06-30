// src/pages/Day1Page.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import {
  getCurrentUser,
  getResponseDetail,
  upsertResponse
} from '../services/api';
import './SectionPage.css';

const Day1Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 1;

  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingResponse, setLoadingResponse] = useState(true);
  const [answersData, setAnswersData] = useState({
    worksheet: Array(4).fill(''),
    analogies: Array.from({ length: 4 }, () => ({ analogy: '', why: '' })),
    simOn: '',
    simOff: '',
    simObservations: '',
    simSteps: Array(3).fill(''),
    discussion: Array(3).fill(''),
    exitTicket: Array(3).fill(''),
  });
  const canvasRef = useRef(null);

  // Load current user
  useEffect(() => {
    getCurrentUser().then(setUser).catch(console.error);
  }, []);

  // Load existing answers
  useEffect(() => {
    if (!user) return;
    getResponseDetail(moduleId)
      .then(data => {
        if (data.answers) {
          const payload = data.answers.answers || data.answers;
          setAnswersData(prev => ({ ...prev, ...payload }));
        }
      })
      .catch(() => {
        /* no previous response */
      })
      .finally(() => {
        setLoadingResponse(false);
      });
  }, [user, moduleId]);

  // Compute progress based on state
  useEffect(() => {
    const flat = [
      ...answersData.worksheet,
      ...answersData.analogies.flatMap(a => [a.analogy, a.why]),
      answersData.simOn,
      answersData.simOff,
      answersData.simObservations,
      ...answersData.simSteps,
      ...answersData.discussion,
      ...answersData.exitTicket,
    ];
    const total = flat.length;
    const filled = flat.filter(v => v.trim() !== '').length;
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
            <Link to="/sections/vocabulary">‹ Previous</Link>
            <Link to={`/sections/day-${moduleId + 1}`}>Next ›</Link>
          </nav>

          <article className="section-content">
            <h2 className="day1-title">Day {moduleId}</h2>
            <p className="day1-subtitle">
              Unlocking the Code: How Your Cells Decide What to Do<br/>
              <em>(“Gene Control 101: Why Some Genes Stay Silent”)</em>
            </p>

            <h3 className="section-heading">Objective</h3>
            <p className="objective">
              Today, you’ll explore how cells control which genes are turned on or off, a process called gene regulation.
              You’ll learn why this control is essential for different cell types to do their specific jobs—even though they
              all have the same DNA. By the end of the day, you’ll be able to explain the basics of gene regulation and
              why it plays a key role in health and disease.
            </p>

            <h3 className="intro-centered">Introduction to SciTrek</h3>
            <h4 className="plan-heading">What’s the Plan?</h4>
            <ul>
              <li>Meet the SciTrek Leads.</li>
              <li>Discover what SciTrek is all about.</li>
              <li>
                Learn about gene regulation:
                <ul>
                  <li>What gene regulation is and why it matters</li>
                  <li>How cells with the same DNA do different jobs</li>
                  <li>How genes are turned “on” or “off”</li>
                  <li>Why gene control is important for health and disease</li>
                  <li>Key terms: gene expression, transcription, regulation</li>
                </ul>
              </li>
            </ul>

            <div className="scientist-card">
              <div className="scientist-bio">
                <strong className="scientist-title">
                  The Most Influential Scientist in the Development of Medical Informatics:<br/>
                  Margaret Belle Dayhoff
                </strong>
                <p>
                  Margaret Belle (Oakley) Dayhoff (1925–1983) was an American physical chemist and a pioneer in bioinformatics.
                  She dedicated her career to applying computational technologies to support advances in biology and medicine,
                  most notably creating protein and nucleic acid databases and tools to interrogate them. Dayhoff was known
                  for establishing a large computer database of protein structures and authoring the <em>Atlas of Protein Sequence and Structure</em>.
                </p>
              </div>
              <div className="scientist-photo">
                <img
                  src="/images/Screenshot%202025-06-25%20at%2016.29.43.png"
                  alt="Margaret Belle Dayhoff"
                />
                <div className="photo-caption">Margaret Dayhoff</div>
              </div>
            </div>

            <h4 className="activity-heading">
              6–20 min | Activity: Watch & Learn: Video&nbsp;
              <a
                href="https://phet.colorado.edu/en/simulations/gene-expression-essentials"
                target="_blank"
                rel="noreferrer"
              >
                Gene Expression and Regulation
              </a>
            </h4>
            <p>👉 While watching, complete the worksheet below:</p>
            <ol className="worksheet">
              {[
                'What is gene regulation?',
                'What is the role of a promoter?',
                'What does a repressor do?',
                'Why is gene regulation important?'
              ].map((q, i) => (
                <li key={i}>
                  {q} →{' '}
                  <input
                    type="text"
                    className="worksheet-input"
                    value={answersData.worksheet[i]}
                    onChange={e => {
                      const w = [...answersData.worksheet];
                      w[i] = e.target.value;
                      setAnswersData({ ...answersData, worksheet: w });
                    }}
                  />
                </li>
              ))}
            </ol>

            <h4 className="activity-heading">21–35 min | Activity: Gene Regulation Analogies</h4>
            <p>Match parts of gene regulation to real-life systems:</p>
            <table className="analogy-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Real-Life Analogy</th>
                  <th>Why?</th>
                </tr>
              </thead>
              <tbody>
                {['Promoter', 'Repressor', 'Enhancer', 'Transcription Factor'].map((comp, j) => (
                  <tr key={comp}>
                    <td>{comp}</td>
                    <td>
                      <input
                        type="text"
                        className="analogy-input"
                        value={answersData.analogies[j].analogy}
                        onChange={e => {
                          const a = answersData.analogies.map((row, idx) =>
                            idx === j ? { ...row, analogy: e.target.value } : row
                          );
                          setAnswersData({ ...answersData, analogies: a });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="analogy-input"
                        value={answersData.analogies[j].why}
                        onChange={e => {
                          const a = answersData.analogies.map((row, idx) =>
                            idx === j ? { ...row, why: e.target.value } : row
                          );
                          setAnswersData({ ...answersData, analogies: a });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="bonus">✏️ Bonus: Draw a diagram of your favorite analogy:</p>
            <ReactSketchCanvas
              ref={canvasRef}
              width="100%"
              height="200px"
              strokeWidth={2}
              className="drawing-board"
            />
            <button className="clear-btn" onClick={() => canvasRef.current.clearCanvas()}>
              Clear Drawing
            </button>

            <h4 className="activity-heading">Activity: Exploring Gene Regulation with PhET Simulation</h4>
            <p><strong>Goal:</strong> Use an online simulation to see how genes are turned “on” or “off” and how this affects protein production.</p>
            <ol>
              <li>
                Go to the Simulation:&nbsp;
                <a
                  href="https://phet.colorado.edu/en/simulations/gene-expression-essentials"
                  target="_blank"
                  rel="noreferrer"
                >
                  PhET Gene Expression Essentials
                </a>
              </li>
              <li>
                Explore the Controls:
                <ul>
                  <li>
                    What happens when you turn a gene “on”? →{' '}
                    <input
                      type="text"
                      className="worksheet-input"
                      value={answersData.simOn}
                      onChange={e => setAnswersData({ ...answersData, simOn: e.target.value })}
                    />
                  </li>
                  <li>
                    What changes when you turn it “off”? →{' '}
                    <input
                      type="text"
                      className="worksheet-input"
                      value={answersData.simOff}
                      onChange={e => setAnswersData({ ...answersData, simOff: e.target.value })}
                    />
                  </li>
                </ul>
              </li>
              <li>
                Record your observations →{' '}
                <input
                  type="text"
                  className="worksheet-input"
                  value={answersData.simObservations}
                  onChange={e => setAnswersData({ ...answersData, simObservations: e.target.value })}
                />
              </li>
              <li>
                Answer these questions:
                <ul>
                  {[
                    'What are the steps to turn on a gene?',
                    'What happens if one component is missing?',
                    'Why is gene regulation important?'
                  ].map((q, k) => (
                    <li key={k}>
                      {q} →{' '}
                      <input
                        type="text"
                        className="worksheet-input"
                        value={answersData.simSteps[k]}
                        onChange={e => {
                          const s = [...answersData.simSteps];
                          s[k] = e.target.value;
                          setAnswersData({ ...answersData, simSteps: s });
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            </ol>

            <h4 className="activity-heading">💥 36–50 min | Inquiry Discussion: What Can Go Wrong?</h4>
            <p>What might happen if a repressor or promoter is damaged or missing?</p>
            <ul>
              {answersData.discussion.map((val, k) => (
                <li key={k}>
                  →{' '}
                  <input
                    type="text"
                    className="worksheet-input"
                    value={val}
                    onChange={e => {
                      const d = [...answersData.discussion];
                      d[k] = e.target.value;
                      setAnswersData({ ...answersData, discussion: d });
                    }}
                  />
                </li>
              ))}
            </ul>

            <h4 className="activity-heading">📝 51–60 min | Exit Ticket: Reflection</h4>
            <p>What might cause gene regulation to go wrong? (Consider mutations, chemicals, radiation, or stressors.)</p>
            <ul>
              {answersData.exitTicket.map((val, m) => (
                <li key={m}>
                  ●{' '}
                  <input
                    type="text"
                    className="worksheet-input"
                    value={val}
                    onChange={e => {
                      const x = [...answersData.exitTicket];
                      x[m] = e.target.value;
                      setAnswersData({ ...answersData, exitTicket: x });
                    }}
                  />
                </li>
              ))}
            </ul>

            {/* Save Button */}
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

export default Day1Page;
