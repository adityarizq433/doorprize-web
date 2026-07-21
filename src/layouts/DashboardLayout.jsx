import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, QrCode, Dices, Gift, History, HelpCircle, Shield, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
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
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
