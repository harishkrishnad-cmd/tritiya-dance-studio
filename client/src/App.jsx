import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Classes from './pages/Classes';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Import from './pages/Import';
import LessonPlanner from './pages/LessonPlanner';
import Login from './pages/Login';
import ParentLogin from './pages/parent/ParentLogin';
import ParentDashboard from './pages/parent/ParentDashboard';
import InstallPrompt from './components/InstallPrompt';
import { api } from './api';

function parseToken(token) {
  try { return JSON.parse(atob(token.split('.')[0])); }
  catch { return null; }
}

function ParentPortal() {
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const payload = token ? parseToken(token) : null;
  const isParent = payload?.role === 'parent';

  function handleLogin(t) { localStorage.setItem('auth_token', t); setToken(t); }
  function handleLogout() { localStorage.removeItem('auth_token'); setToken(null); }

  if (!token || !isParent) return <ParentLogin onLogin={handleLogin} />;
  return <ParentDashboard studentId={payload.student_id} onLogout={handleLogout} />;
}

export default function App() {
  const location = useLocation();
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [schoolName, setSchoolName] = useState('Tritiya Dance Studio');

  const payload = token ? parseToken(token) : null;
  const isAdmin = payload?.role === 'admin';

  useEffect(() => {
    if (token && isAdmin) {
      api.getSettings().then(s => { if (s.school_name) setSchoolName(s.school_name); }).catch(() => {});
    }
  }, [token, isAdmin]);

  function handleAdminLogin(t) { setToken(t); }
  function handleLogout() { localStorage.removeItem('auth_token'); setToken(null); }

  // Parent portal lives at /parent
  if (location.pathname.startsWith('/parent')) {
    return (
      <>
        <ParentPortal />
        <InstallPrompt />
      </>
    );
  }

  // Admin portal
  if (!token || !isAdmin) return <Login onLogin={handleAdminLogin} />;

  return (
    <>
      <Layout schoolName={schoolName} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/import" element={<Import />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/lesson-planner" element={<LessonPlanner />} />
          <Route path="/settings" element={<Settings onNameChange={setSchoolName} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <InstallPrompt />
    </>
  );
}
