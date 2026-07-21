import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Prizes.css';

const Prizes = () => {
  const [prizes, setPrizes] = useState([]);
  const [activeTab, setActiveTab] = useState('doorprize');

  useEffect(() => {
    const prizesRef = ref(db, 'prizes');
    const unsubscribe = onValue(prizesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPrizes(Object.values(data));
      } else {
        setPrizes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="prizes-page">
      <div className="prizes-header">
        <Link to="/" className="back-link">
          <ChevronLeft size={24} />
          Kembali ke Dashboard
        </Link>
        <h1 className="page-title text-center">Daftar Hadiah</h1>
        <p className="page-subtitle text-center mx-auto max-w-lg">
          Informasi daftar hadiah yang tersedia beserta sisa stoknya.
        </p>
      </div>

      <div className="prize-tabs">
        <button 
          className={`prize-tab-btn ${activeTab === 'doorprize' ? 'active' : ''}`}
          onClick={() => setActiveTab('doorprize')}
        >
          Doorprize
        </button>
        <button 
          className={`prize-tab-btn ${activeTab === 'grandprize' ? 'active' : ''}`}
          onClick={() => setActiveTab('grandprize')}
        >
          Grand Prize
        </button>
      </div>

      {prizes.filter(p => p.tier === activeTab).length === 0 ? (
        <div className="empty-prizes">Belum ada hadiah untuk kategori ini.</div>
      ) : (
        <div className="prizes-grid">
          {prizes.filter(p => p.tier === activeTab).map((prize) => (
            <div key={prize.id} className="prize-card">
              <div className="prize-image-container">
                <span className="unit-badge">{prize.units} Unit</span>
                <img src={prize.image} alt={prize.name} className="prize-image" />
              </div>
              <div className="prize-info">
                <h3 className="prize-name">{prize.name}</h3>
                <p className="prize-tier" style={{textTransform: 'capitalize'}}>{prize.tier}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Prizes;
