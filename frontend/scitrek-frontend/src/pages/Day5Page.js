// src/pages/Day5Page.js
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

const Day5Page = () => {
  const { day } = useParams();
  const moduleId = Number(day) || 5;

  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(true);
  const [progress, setProgress] = useState(0);

  const [answersData, setAnswersData] = useState({
    warmup:     '',
    poster:     Array(3).fill(''),
    peer:       Array(2).fill(''),
    reflections:Array(2).fill('')
  });

  // load current user
  useEffect(() => {
    getCurrentUser().then(setUser).catch(console.error);
  }, []);

  // load existing response
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

  // compute progress
  useEffect(() => {
    const all = [
      answersData.warmup,
      ...answersData.poster,
      ...answersData.peer,
      ...answersData.reflections
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
            <Link to="/sections/day-4">‹ Previous</Link>
          </nav>

          <article className="section-content">
            <h2 className="day1-title">Day {moduleId}</h2>
            <p className="day1-subtitle">Telling the Story of a Gene: From Data to Diagnosis</p>

            <h3 className="section-heading">Objective</h3>
            <p className="objective">
              Today, you’ll synthesize everything you’ve learned into a scientific poster that explains how a specific gene behaves
              differently in breast cancer. You’ll practice communicating scientific findings clearly and effectively, just like real
              researchers do. By the end of the day, you’ll have created a poster that showcases your gene’s role in cancer, with visuals
              and evidence to support your explanation.
            </p>

            <h3 className="section-heading">What’s the Plan?</h3>
            <ul>
              <li>Learn how to communicate scientific data through posters.</li>
              <li>Use your Gene Data Dictionary and dashboard findings to build your poster.</li>
              <li>Include visual elements like bar graphs or heatmaps to illustrate gene expression differences.</li>
              <li>Practice presenting your poster to peers and receive feedback.</li>
              <li>Participate in a mini-poster symposium to share your findings with the class.</li>
            </ul>

            <h4 className="activity-heading">Warm-Up: Prepare Your Message</h4>
            <p>📝 If you had to explain your gene in 1 sentence to a family member, what would you say?</p>
            <input
              type="text"
              className="worksheet-input full-width"
              value={answersData.warmup}
              onChange={e => setAnswersData({ ...answersData, warmup: e.target.value })}
            />

            <h4 className="activity-heading">21–35 min | Visual &amp; Data Storytelling</h4>
            <p>Draw or paste your gene’s expression difference (bar graph, heatmap). Label which samples are healthy and which are cancerous. Then write 1–2 sentences explaining what your visual shows.</p>
            {answersData.poster.map((val, i) => (
              <div key={i} className="poster-input">
                <input
                  type="text"
                  className="worksheet-input full-width"
                  placeholder={`Sentence ${i + 1}`}
                  value={val}
                  onChange={e => {
                    const arr = [...answersData.poster];
                    arr[i] = e.target.value;
                    setAnswersData({ ...answersData, poster: arr });
                  }}
                />
              </div>
            ))}

            <h4 className="activity-heading">36–45 min | Team Collaboration: Peer Feedback</h4>
            <p>Work in pairs to give “Glow &amp; Grow” feedback:</p>
            {answersData.peer.map((val, i) => (
              <div key={i} className="peer-input">
                <input
                  type="text"
                  className="worksheet-input full-width"
                  placeholder={i === 0 ? '🌟 One thing they did well' : '🔧 One thing they could explain more clearly'}
                  value={val}
                  onChange={e => {
                    const arr = [...answersData.peer];
                    arr[i] = e.target.value;
                    setAnswersData({ ...answersData, peer: arr });
                  }}
                />
              </div>
            ))}

            <h4 className="activity-heading">56–60 min | Final Reflection</h4>
            {['What was your favorite discovery during this module?', 'How has your understanding of gene expression and cancer changed?'].map((q, i) => (
              <div key={i}>
                <p>📝 {q}</p>
                <input
                  type="text"
                  className="worksheet-input full-width"
                  value={answersData.reflections[i]}
                  onChange={e => {
                    const arr = [...answersData.reflections];
                    arr[i] = e.target.value;
                    setAnswersData({ ...answersData, reflections: arr });
                  }}
                />
              </div>
            ))}

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

export default Day5Page;
