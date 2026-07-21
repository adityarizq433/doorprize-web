import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Doorprize from './pages/Doorprize';
import GrandPrize from './pages/GrandPrize';
import Prizes from './pages/Prizes';
import History from './pages/History';
import Participants from './pages/Participants';
import FormAbsen from './pages/FormAbsen';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div style={{ fontSize: '1.2rem', fontWeight: '600', letterSpacing: '1px' }}>Memuat Aplikasi...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/absen" element={<FormAbsen />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute user={user}>
              <DashboardLayout />
            </ProtectedRoute>
          } 
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="doorprize" element={<Doorprize />} />
          <Route path="grandprize" element={<GrandPrize />} />
          <Route path="prizes" element={<Prizes />} />
          <Route path="participants" element={<Participants />} />
          <Route path="history" element={<History />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
