import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { deletePrize } from '../services/db';
import Swal from 'sweetalert2';
import './Prizes.css';

const Prizes = () => {
  const [prizes, setPrizes] = useState([]);
  const [activeTab, setActiveTab] = useState('doorprize');

  useEffect(() => {
    const prizesRef = collection(db, 'prizes');
    const unsubscribe = onSnapshot(prizesRef, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      setPrizes(list);
    });
    return () => unsubscribe();
  }, []);

  const handleDeletePrize = async (prize) => {
    const result = await Swal.fire({
      title: 'Hapus Hadiah?',
      text: `Anda yakin ingin menghapus hadiah "${prize.name}"? Stok tersisa: ${prize.units}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      const success = await deletePrize(prize.id);
      if (success) {
        Swal.fire('Terhapus!', 'Hadiah berhasil dihapus.', 'success');
      }
    }
  };

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
                <button 
                  className="delete-prize-btn" 
                  onClick={() => handleDeletePrize(prize)}
                  title="Hapus Hadiah"
                >
                  <Trash2 size={16} />
                </button>
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
