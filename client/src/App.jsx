import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Classes from './pages/Classes';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { api } from './api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [schoolName, setSchoolName] = useState('Tritiya Dance Studio');

  useEffect(() => {
    if (token) {
      api.getSettings().then(s => {
        if (s.school_name) setSchoolName(s.school_name);
      }).catch(() => {});
    }
  }, [token]);

  function handleLogin(t) { setToken(t); }
  function handleLogout() { localStorage.removeItem('auth_token'); setToken(null); }

  if (!token) return <Login onLogin={handleLogin} />;

  return (
    <Layout schoolName={schoolName} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/settings" element={<Settings onNameChange={setSchoolName} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
