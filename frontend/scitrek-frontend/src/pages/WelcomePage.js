import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentProfileBanner from '../components/StudentProfileBanner';
import Popup from '../components/Popup';
import { getCurrentUser } from '../services/api';
import './SectionPage.css'; // reuse the SectionPage styles

const WelcomePage = () => {
  const [user, setUser] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(err => console.error(err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  if (!user) return <div className="loading">Loading…</div>;

  return (
    <>
      <StudentProfileBanner user={user} onLogout={() => setPopupVisible(true)} />

      <div className="section-page">
        <div className="section-card">
          <nav className="section-nav">
            <Link to="/sections/what-youll-learn">Next ›</Link>
          </nav>
          <article className="section-content">
            <h2>Welcome to SciTrek!</h2>

            <p>
              Hey there! Welcome to SciTrek—we’re so excited to have you join us! This workbook is your guide to
              all the cool science activities and experiments you'll be doing throughout the program. You'll get
              to dive into some amazing concepts, work in teams, and learn from SciTrek Mentors and Leads who
              are here to help you explore the world of science.
            </p>

            <p>Here’s what to expect:</p>
            <ul>
              <li>
                <strong>Day 1: Gene Regulation</strong><br />
                Start your journey by learning how genes are turned on and off in our cells. SciTrek Leads will guide
                you through interactive activities to explore how gene regulation works—and why it matters.
              </li>
              <li>
                <strong>Day 2: Understanding Cancer</strong><br />
                What makes cancer different from healthy tissue? You’ll dive into real-world examples with SciTrek
                Mentors to discover how cancer develops and why it’s so tricky to treat.
              </li>
              <li>
                <strong>Day 3: How Do We Know Cancer Is There?</strong><br />
                Roll up your sleeves and analyze real data! With your small team and SciTrek Leads, you’ll explore
                how scientists detect cancer by looking at gene expression patterns.
              </li>
              <li>
                <strong>Day 4: Gene Expression Differences Between Cancer and Healthy Cells</strong><br />
                You’ll take a closer look at actual gene expression data, working in small groups with SciTrek Mentors
                to identify key differences between healthy and cancerous cells.
              </li>
              <li>
                <strong>
                  Day 5: Poster Symposium – Identify a Hallmark of Colorectal Cancer
                </strong><br />
                It’s your time to shine! Pull everything together to create a scientific poster with your team,
                presenting your findings on a hallmark of breast cancer. Celebrate your discoveries with the SciTrek
                Leads as the program wraps up!
              </li>
            </ul>

            <p>
              Remember, your teacher and the SciTrek team are here to help you every step of the way, so don’t be
              afraid to ask questions or share your ideas. This is your chance to explore, experiment, and have fun
              with science! Let’s make this an unforgettable experience!
            </p>
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

export default WelcomePage;
