import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, QrCode, Dices, Gift, History, HelpCircle, Shield, LogOut, Menu, X, ChevronLeft } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isSpinBgPage = ['/dashboard', '/doorprize', '/grandprize', '/history', '/participants', '/prizes'].some(path => location.pathname.includes(path));
  const isAttendancePage = location.pathname.includes('/attendance');

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {!isSidebarOpen && (
        <button 
          className="floating-toggle-btn"
          onClick={() => setIsSidebarOpen(true)}
          title="Buka Sidebar"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${!isSidebarOpen ? 'closed' : ''}`}>
        <div className="sidebar-header">
          <button 
            className="close-sidebar-btn"
            onClick={() => setIsSidebarOpen(false)}
            title="Tutup Sidebar"
          >
            <Menu size={24} />
          </button>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Flag_of_Indonesia.svg/500px-Flag_of_Indonesia.svg.png" 
            alt="Bendera Indonesia"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #1e293b',
              flexShrink: 0
            }}
          />
          <div>
            <h2 className="brand-title">HUT Kemerdekaan</h2>
            <p className="brand-subtitle">17 Agustus</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <LayoutDashboard size={18} />
            <span>Dasbor</span>
          </NavLink>
          
          <NavLink to="/attendance" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <QrCode size={18} />
            <span>Kehadiran</span>
          </NavLink>
          
          <NavLink to="/doorprize" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Dices size={18} />
            <span>Doorprize</span>
          </NavLink>
          
          <NavLink to="/grandprize" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Gift size={18} />
            <span>Grand Prize</span>
          </NavLink>
          
          <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <History size={18} />
            <span>Riwayat</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <button className="logout-button" onClick={handleLogout}>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${isSpinBgPage ? 'spin-layout-bg' : ''} ${isAttendancePage ? 'login-layout-bg' : ''}`}>
        <div className="dashboard-logos-header">
          <img src="/assets.png" alt="Injourney Logo" className="dashboard-logo-injourney" />
          <img src="/Juanda_International_Airport_Logo.png" alt="Juanda Airport Logo" className="dashboard-logo-juanda" />
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
