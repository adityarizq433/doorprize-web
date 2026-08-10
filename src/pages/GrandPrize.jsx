import React, { useState, useEffect, useRef } from 'react';
import { Star, CheckCircle2, RotateCw, ChevronLeft, ChevronRight, User, PlayCircle, Square, RotateCcw } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { db } from '../firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { getEligibleParticipants, recordWinners, setSpinningState } from '../services/db';
import Swal from 'sweetalert2';
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
  const prevSpinningRef = useRef(false);

  const grandPrize = grandPrizes[currentIndex] || null;

  // Fetch grandprize on load
  useEffect(() => {
    const prizesRef = collection(db, 'prizes');
    const unsubscribe = onSnapshot(prizesRef, (snapshot) => {
      const prizesArr = [];
      snapshot.forEach(docSnap => prizesArr.push(docSnap.data()));
      const gpArr = prizesArr.filter(p => p.tier === 'grandprize');
      setGrandPrizes(gpArr);
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
    const gameStateRef = doc(db, 'gameState', 'state');
    const unsubscribe = onSnapshot(gameStateRef, (snapshot) => {
      if (snapshot.exists()) {
        const state = snapshot.data();
        setGameState(state);

        // Cek jika spin baru saja berhenti untuk men-trigger confetti di semua perangkat
        if (prevSpinningRef.current === true && state.isSpinning === false) {
          if (state.currentTier === 'grandprize' && state.currentPrize === grandPrize?.name && state.recentWinners?.length > 0) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 10000);
          }
        }
        prevSpinningRef.current = state.isSpinning;

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
      Swal.fire({ icon: 'error', title: 'Stok Habis', text: `Stok hadiah ${grandPrize?.name || 'Grand Prize'} tidak mencukupi! Sisa stok: ${grandPrize?.units || 0}` });
      return;
    }

    const eligible = await getEligibleParticipants();
    if (eligible.length < 1) {
      Swal.fire({ icon: 'warning', title: 'Peserta Kurang', text: 'Tidak ada peserta yang memenuhi syarat.' });
      return;
    }

    // Tell all clients we are spinning
    setShowConfetti(false);
    await setSpinningState(true, grandPrize.name, grandPrize.tier);

    // Save eligible participants to state so stopSpin can pick winner
    setCurrentEligible(eligible);
  };

  const handleReset = () => {
    setDisplayWinner({ nomor: '----' });
    setShowConfetti(false);
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
      {showConfetti && <Confetti width={width} height={height} numberOfPieces={500} recycle={false} gravity={0.15} colors={['#ef4444', '#ffffff']} style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }} />}
      <div className="doorprize-header text-center">
        <img src="/HUTRI81_FA_Logo__Main Logo Merah Hitam Latar Putih.png" alt="Logo HUT RI 81" style={{ maxWidth: '280px', margin: '0 auto 5px' }} />
        <h1 className="doorprize-title-split">
          <span className="title-black">UNDIAN</span> <span className="title-red">GRANDPRIZE</span>
        </h1>
        <div className="doorprize-subtitle-ribbon-container">
          <div className="doorprize-subtitle-ribbon">
            <span className="ribbon-fold-left"></span>
            Semarak HUT RI ke-81
            <span className="ribbon-fold-right"></span>
          </div>
        </div>
      </div>

      <div className="gp-main-content">
        <div className="gp-carousel-wrapper">
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

        <div className="gp-spin-card">
          <div className="gp-spin-card-header">
            <span className="line-red"></span> NOMOR UNDIAN <span className="line-red"></span>
          </div>
          
          <div className="flip-clock-container">
            {(displayWinner.nomor === '----' ? ['-', '-', '-', '-', '-'] : displayWinner.nomor.toString().padStart(5, '0').split('')).map((digit, i) => (
              <div key={i} className={`flip-digit ${i === 4 ? 'gold-digit' : ''} ${gameState.isSpinning ? 'spinning' : ''}`}>
                {digit}
              </div>
            ))}
          </div>

          <div className="gp-spin-status">
            {gameState.isSpinning ? (
              <><span className="status-dot pulsing"></span> Mencari pemenang...</>
            ) : (
              <><span className="status-dot"></span> Siap diundi</>
            )}
          </div>

          {!gameState.isSpinning && displayWinner.namaLengkap ? (
            <div className="gp-winner-box">
              <div className="winner-label"><User size={14}/> PEMENANG</div>
              <div className="winner-name">{displayWinner.namaLengkap}</div>
              <div className="winner-unit">{displayWinner.unit}</div>
            </div>
          ) : (
            <div className="gp-winner-box-placeholder"></div>
          )}

          <div className="gp-spin-footer">
            <div className="spin-footer-title">SPIN GRANDPRIZE</div>
            <div className="spin-action-buttons">
              {!gameState.isSpinning ? (
                <button className="btn-mulai-spin-red" onClick={handleSpinClick} disabled={!grandPrize || grandPrize.units < 1}>
                  MULAI SPIN <PlayCircle size={20}/>
                </button>
              ) : (
                <button className="btn-mulai-spin-red" style={{backgroundColor: '#ef4444'}} onClick={handleStopSpin}>
                  STOP SPIN <Square size={20}/>
                </button>
              )}
              <button className="btn-reset-white" onClick={handleReset} disabled={gameState.isSpinning}>
                <RotateCcw size={20}/> RESET
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrandPrize;
