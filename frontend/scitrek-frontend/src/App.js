import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import HomePage from './pages/HomePage';
import StudentProfilePage from './pages/StudentProfilePage';
import LoginPage from './pages/LoginPage';
import Inbox from './pages/Inbox';
import PreModuleQuizPage from './pages/PreModuleQuizPage';
import PostModuleQuizPage from './pages/PostModuleQuizPage';
import WelcomePage from './pages/WelcomePage';
import WhatYoullLearnPage from './pages/WhatYoullLearnPage';
import ImportantVocabularyPage from './pages/ImportantVocabularyPage';
import Day1Page from './pages/Day1Page';
import Day2Page from './pages/Day2Page';
import Day3Page from './pages/Day3Page';
import Day4Page from './pages/Day4Page';
import Day5Page from './pages/Day5Page';
import Footer from './components/Footer';
import WorkbookList from './components/WorkbookList';
import WorkbookPage from './components/WorkbookPage';

import { getCurrentUser } from './services/api';
import { getAccessToken, removeTokens } from './utils/auth';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.error(err);
        removeTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  if (loading) return <div>Loading&hellip;</div>;

  return (
    <Router>
      <div className="app-container">
        <div className="content">
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/" /> : <LoginPage />}
            />
            <Route
              path="/"
              element={user ? <HomePage user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/student_profile"
              element={user ? <StudentProfilePage user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/student_profile/pre_module"
              element={user ? <PreModuleQuizPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/student_profile/post_module"
              element={user ? <PostModuleQuizPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/inbox"
              element={user ? <Inbox user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/workbooks"
              element={user ? <WorkbookList /> : <Navigate to="/login" />}
            />
            <Route
              path="/workbooks/:id"
              element={user ? <WorkbookPage /> : <Navigate to="/login" />}
            />

            <Route
              path="/sections/welcome"
              element={user ? <WelcomePage /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/what-youll-learn"
              element={user ? <WhatYoullLearnPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/vocabulary"
              element={user ? <ImportantVocabularyPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/day-1"
              element={user ? <Day1Page /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/day-2"
              element={user ? <Day2Page /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/day-3"
              element={user ? <Day3Page /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/day-4"
              element={user ? <Day4Page /> : <Navigate to="/login" />}
            />
            <Route
              path="/sections/day-5"
              element={user ? <Day5Page /> : <Navigate to="/login" />}
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
