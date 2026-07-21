import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { Users, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css'; // Reuse dashboard styles for container/card

const Participants = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const participantsRef = ref(db, 'participants');
    const unsubscribe = onValue(participantsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setParticipants(Object.values(data));
      } else {
        setParticipants([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="dashboard-page">
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'none', 
            border: 'none', 
            color: '#64748b', 
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600',
            padding: 0,
            transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#1e293b'}
          onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
        >
          <ChevronLeft size={18} />
          Kembali ke Dashboard
        </button>
      </div>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Daftar Detail Peserta</h1>
          <p className="page-subtitle">Melihat semua data peserta yang sudah mendaftar.</p>
        </div>
        <div className="stat-icon-wrapper bg-orange" style={{ width: '48px', height: '48px' }}>
          <Users size={24} color="#d79f25" />
        </div>
      </div>

      <div className="participants-table-card" style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Memuat data peserta...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: '600' }}>No. Undian</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: '600' }}>Nama Lengkap</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: '600' }}>NIK</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: '600' }}>Unit/Divisi</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: '#64748b', fontWeight: '600' }}>Status Menang</th>
                </tr>
              </thead>
              <tbody>
                {participants.length > 0 ? (
                  participants.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{p.nomor}</td>
                      <td style={{ padding: '12px 16px' }}>{p.namaLengkap}</td>
                      <td style={{ padding: '12px 16px' }}>{p.nik}</td>
                      <td style={{ padding: '12px 16px' }}>{p.unit}</td>
                      <td style={{ padding: '12px 16px' }}>{p.statusPegawai || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {p.doorprize ? (
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' }}>
                            {p.doorprize}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Belum ada data peserta</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Participants;
