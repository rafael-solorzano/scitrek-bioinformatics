// src/App.js
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
import Footer from './components/Footer';

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

  if (loading) return <div>Loading…</div>;

  return (
    <Router>
      <div className="app-container">
        {/* This div grows to push the footer down */}
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
              element={
                user ? <StudentProfilePage user={user} /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/student_profile/pre_module"
              element={
                user ? <PreModuleQuizPage /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/student_profile/post_module"
              element={
                user ? <PostModuleQuizPage /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/inbox"
              element={user ? <Inbox user={user} /> : <Navigate to="/login" />}
            />
          </Routes>
        </div>

        {/* Footer now stays at the bottom */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
