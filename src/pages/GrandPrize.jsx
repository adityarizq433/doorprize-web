import React, { useState, useEffect, useRef } from 'react';
import { Star, CheckCircle2, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { getEligibleParticipants, recordWinners, setSpinningState } from '../services/db';
import './GrandPrize.css';

const GrandPrize = () => {
  const [grandPrizes, setGrandPrizes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameState, setGameState] = useState({ isSpinning: false, currentPrize: '', recentWinners: [] });
  const [displayWinner, setDisplayWinner] = useState({ nomor: '----' });
  const [currentEligible, setCurrentEligible] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();
  const intervalRef = useRef(null);

  const grandPrize = grandPrizes[currentIndex] || null;

  // Fetch grandprize on load
  useEffect(() => {
    const prizesRef = ref(db, 'prizes');
    const unsubscribe = onValue(prizesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const prizesArr = Object.values(data);
        const gpArr = prizesArr.filter(p => p.tier === 'grandprize');
        setGrandPrizes(gpArr);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleNext = () => {
    if (!gameState.isSpinning && grandPrizes.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % grandPrizes.length);
    }
  };

  const handlePrev = () => {
    if (!gameState.isSpinning && grandPrizes.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + grandPrizes.length) % grandPrizes.length);
    }
  };

  // Listen to game state for sync
  useEffect(() => {
    const gameStateRef = ref(db, 'gameState');
    const unsubscribe = onValue(gameStateRef, (snapshot) => {
      if (snapshot.exists()) {
        const state = snapshot.val();
        setGameState(state);

        // Handle sync animation
        if (state.isSpinning) {
          if (state.currentTier === 'grandprize' && state.currentPrize === grandPrize?.name) {
            startShuffleAnimation();
          } else {
            stopShuffleAnimation();
          }
        } else {
          stopShuffleAnimation();
          if (state.recentWinners && state.recentWinners.length > 0 && state.currentTier === 'grandprize' && state.currentPrize === grandPrize?.name) {
            setDisplayWinner(state.recentWinners[0]);
          } else {
            setDisplayWinner({ nomor: '----' }); // Reset if it's not the correct prize or no winners
          }
        }
      }
    });
    return () => unsubscribe();
  }, [grandPrize]);

  const startShuffleAnimation = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayWinner({ nomor: Math.floor(10000 + Math.random() * 90000).toString(), isSpinning: true });
    }, 50);
  };

  const stopShuffleAnimation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleSpinClick = async () => {
    if (gameState.isSpinning) return;

    if (!grandPrize || grandPrize.units < 1) {
      alert(`Stok hadiah ${grandPrize?.name || 'Grand Prize'} tidak mencukupi! Sisa stok: ${grandPrize?.units || 0}`);
      return;
    }

    const eligible = await getEligibleParticipants();
    if (eligible.length < 1) {
      alert(`Tidak ada peserta yang memenuhi syarat.`);
      return;
    }

    // Tell all clients we are spinning
    setShowConfetti(false);
    await setSpinningState(true, grandPrize.name, grandPrize.tier);

    // Save eligible participants to state so stopSpin can pick winner
    setCurrentEligible(eligible);
  };

  const handleStopSpin = async () => {
    if (!gameState.isSpinning) return;

    // Pick 1 winner randomly from currentEligible
    const shuffled = [...currentEligible].sort(() => 0.5 - Math.random());
    const pickedWinner = shuffled.slice(0, 1);

    // Save to database, stop spinning state, and broadcast winner
    await recordWinners(pickedWinner, grandPrize);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 10000); // Stop confetti after 10s
  };

  return (
    <div className="grandprize-page">
      {showConfetti && <Confetti width={width} height={height} numberOfPieces={500} recycle={false} gravity={0.15} />}
      <div className="grandprize-header">
        <div className="badge-ultimate">
          <Star size={16} /> ULTIMATE REWARD
        </div>
        <h1 className="gp-title">Hadiah Utama Menanti</h1>
        <p className="gp-subtitle">
          Tiba saatnya untuk pengundian hadiah puncak. Bersiaplah menjadi saksi siapa yang paling beruntung hari ini.
        </p>
      </div>

      <div className="gp-carousel-container">
        {grandPrizes.length > 1 && (
          <button className="gp-nav-btn outside" onClick={handlePrev} disabled={gameState.isSpinning}>
            <ChevronLeft size={36} />
          </button>
        )}

        <div className="gp-card">
          <div className={`gp-image-section ${grandPrize && grandPrize.units <= 0 ? 'sold-out' : ''}`}>
            <div className="gp-label">{grandPrize ? grandPrize.name : 'Belum Ada Grand Prize'}</div>

            {grandPrize && grandPrize.units <= 0 && (
              <div className="sold-out-overlay">SOLD OUT</div>
            )}

            {grandPrize && (
              <img
                src={grandPrize.image}
                alt={grandPrize.name}
                className="gp-image"
              />
            )}
          </div>

          <div className="gp-info-section">
            <p className="gp-tier">GRAND PRIZE</p>
            <h2 className="gp-name">{grandPrize ? grandPrize.name : '-'}</h2>

            <ul className="gp-features">
              <li>
                <CheckCircle2 size={18} color="#d79f25" />
                <span>Sisa Stok: {grandPrize ? grandPrize.units : 0}</span>
              </li>
            </ul>
          </div>
        </div>

        {grandPrizes.length > 1 && (
          <button className="gp-nav-btn outside" onClick={handleNext} disabled={gameState.isSpinning}>
            <ChevronRight size={36} />
          </button>
        )}
      </div>

      <div className="gp-action-area">
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2 style={{ color: '#0f172a', fontSize: '1.2rem', marginBottom: '8px' }}>Nomor Pemenang</h2>
          <div className={`gp-number-display ${gameState.isSpinning ? 'spinning' : ''} ${showConfetti ? 'winner-glow' : ''}`}>
            {displayWinner.nomor}
          </div>
          {!displayWinner.isSpinning && displayWinner.namaLengkap && (
            <div className="gp-winner-details" style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: '0' }}>{displayWinner.namaLengkap}</h3>
              <p style={{ fontSize: '1.1rem', color: '#64748b', margin: '4px 0 0 0' }}>{displayWinner.unit}</p>
            </div>
          )}
        </div>

        {!gameState.isSpinning ? (
          <button
            className="btn-mulai-spin-gp"
            onClick={handleSpinClick}
            disabled={!grandPrize || grandPrize.units < 1}
            style={{ opacity: (!grandPrize || grandPrize.units < 1) ? 0.7 : 1 }}
          >
            <RotateCw size={24} className="spin-icon-gp" />
            MULAI SPIN
          </button>
        ) : (
          <button
            className="btn-mulai-spin-gp"
            onClick={handleStopSpin}
            style={{ backgroundColor: '#ef4444', color: 'white' }}
          >
            STOP SPIN
          </button>
        )}
        <p className="gp-footer-note">PASTIKAN SEMUA PESERTA SIAP</p>
      </div>
    </div>
  );
};

export default GrandPrize;
