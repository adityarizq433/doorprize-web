import React from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const SpinScreen = () => {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Dashboard Spin Doorprize</h1>
      <p style={{ marginTop: '10px', color: 'var(--secondary)' }}>
        Selamat datang! Anda berhasil melewati halaman Login.
      </p>
      
      <button 
        onClick={() => signOut(auth)}
        style={{
          marginTop: '30px',
          padding: '12px 24px',
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default SpinScreen;
