import React, { useState, useEffect, useRef } from 'react';
import { RotateCw } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { getEligibleParticipants, recordWinners, setSpinningState } from '../services/db';
import './Doorprize.css';

const Doorprize = () => {
  const [prizes, setPrizes] = useState([]);
  const [selectedPrize, setSelectedPrize] = useState(null);
  const [winnerCount, setWinnerCount] = useState(5);
  const [gameState, setGameState] = useState({ isSpinning: false, currentPrize: '', recentWinners: [] });
  const [displayWinners, setDisplayWinners] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();
  const intervalRef = useRef(null);

  // Fetch prizes on load
  useEffect(() => {
    const prizesRef = ref(db, 'prizes');
    const unsubscribe = onValue(prizesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const prizesArr = Object.values(data).filter(p => p.tier === 'doorprize');
        setPrizes(prizesArr);
        setSelectedPrize(prev => {
          if (!prev && prizesArr.length > 0) return prizesArr[0];
          if (prev) {
            // Tetap pilih yang sebelumnya, tapi update datanya (seperti sisa stok) dari database
            const updated = prizesArr.find(p => p.id === prev.id);
            return updated || prev;
          }
          return prev;
        });
      }
    });
    return () => unsubscribe();
  }, []); // Intentionally leaving selectedPrize out so it only defaults once

  // Listen to game state for sync
  useEffect(() => {
    const gameStateRef = ref(db, 'gameState');
    const unsubscribe = onValue(gameStateRef, (snapshot) => {
      if (snapshot.exists()) {
        const state = snapshot.val();
        setGameState(state);
        
        // Handle sync animation
        if (state.isSpinning) {
          if (state.currentTier === 'doorprize') {
            startShuffleAnimation(winnerCount);
          } else {
            stopShuffleAnimation();
          }
        } else {
          stopShuffleAnimation();
          if (state.recentWinners && state.recentWinners.length > 0 && state.currentTier === 'doorprize') {
            setDisplayWinners(state.recentWinners);
          } else {
            // Default placeholder numbers
            setDisplayWinners(Array(winnerCount).fill({ nomor: '----' }));
          }
        }
      }
    });
    return () => unsubscribe();
  }, [winnerCount]);

  const startShuffleAnimation = (count) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      // Generate random 5 digit numbers for visual effect
      const randoms = Array.from({length: count}, () => ({ nomor: Math.floor(10000 + Math.random() * 90000).toString(), isSpinning: true }));
      setDisplayWinners(randoms);
    }, 50);
  };

  const stopShuffleAnimation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // We need a local state to hold the eligible participants and winners for when stop is clicked
  const [currentEligible, setCurrentEligible] = useState([]);


  const handleSpinClick = async () => {
    if (gameState.isSpinning) return;
    
    if (!selectedPrize || selectedPrize.units < winnerCount) {
      alert(`Stok hadiah ${selectedPrize?.name} tidak mencukupi untuk ${winnerCount} pemenang! Sisa stok: ${selectedPrize?.units}`);
      return;
    }

    const eligible = await getEligibleParticipants();
    if (eligible.length < winnerCount) {
      alert(`Hanya ada ${eligible.length} peserta yang memenuhi syarat belum menang.`);
      return;
    }

    // 1. Tell all clients we are spinning
    setShowConfetti(false);
    await setSpinningState(true, selectedPrize.name, selectedPrize.tier);

    // Save eligible participants to state so stopSpin can pick winners
    setCurrentEligible(eligible);
  };

  const handleStopSpin = async () => {
    if (!gameState.isSpinning) return;

    // 2. Pick winners randomly from currentEligible
    const shuffled = [...currentEligible].sort(() => 0.5 - Math.random());
    const pickedWinners = shuffled.slice(0, winnerCount);

    // 3. Save to database, stop spinning state, and broadcast winners
    await recordWinners(pickedWinners, selectedPrize);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 8000); // Stop confetti after 8s
  };

  return (
    <div className="doorprize-page">
      {showConfetti && <Confetti width={width} height={height} numberOfPieces={300} recycle={false} />}
      <div className="doorprize-header">
        <h1 className="page-title text-center">Undian Doorprize</h1>
        <p className="page-subtitle text-center mx-auto max-w-lg">
          Pilih hadiah, atur jumlah pemenang, dan mulai putaran untuk menentukan peserta yang beruntung.
        </p>
      </div>

      <div className="section-header">
        <h2 className="section-title">Daftar Hadiah Tersedia</h2>
      </div>

      <div className="prizes-grid-container">
        <div className="prizes-grid">
        {/* Render prizes 10 kali untuk memastikan layar sebesar apapun tetap penuh dan loopingnya mulus tanpa ruang kosong */}
        {Array(10).fill(prizes).flat().map((prize, index) => {
          const isSoldOut = prize.units <= 0;
          return (
            <div 
              key={`${prize.id}-${index}`} 
              className={`prize-card ${selectedPrize?.id === prize.id ? 'selected' : ''} ${isSoldOut ? 'sold-out' : ''}`}
              onClick={() => {
                if (!gameState.isSpinning && !isSoldOut) {
                  setSelectedPrize(prize);
                }
              }}
            >
              <div className="prize-image-container">
                <span className={`unit-badge ${isSoldOut ? 'sold-out-badge' : ''}`}>{prize.units} Unit</span>
                {selectedPrize?.id === prize.id && !isSoldOut && <div className="selected-overlay">Dipilih</div>}
                {isSoldOut && <div className="sold-out-overlay">SOLD OUT</div>}
                <img src={prize.image} alt={prize.name} className="prize-image" />
              </div>
              <div className="prize-info">
                <h3 className="prize-name">{prize.name}</h3>
                <p className="prize-tier" style={{textTransform: 'capitalize'}}>{prize.tier}</p>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      <div className="control-panel">
        <div className="control-left">
          <label className="control-label">JUMLAH PEMENANG</label>
          <select 
            className="winner-select" 
            value={winnerCount}
            onChange={(e) => setWinnerCount(Number(e.target.value))}
            disabled={gameState.isSpinning}
          >
            {[1, 5, 10, 20, 50].map(num => (
              <option key={num} value={num}>{num} Pemenang</option>
            ))}
          </select>
          <p className="drawing-for">Mengundi: {selectedPrize?.name || '-'}</p>
        </div>
        
        {!gameState.isSpinning ? (
          <button 
            className="btn-mulai-spin" 
            onClick={handleSpinClick}
            disabled={!selectedPrize || prizes.length === 0}
            style={{ opacity: (!selectedPrize || prizes.length === 0) ? 0.7 : 1, cursor: (!selectedPrize || prizes.length === 0) ? 'not-allowed' : 'pointer' }}
          >
            <RotateCw size={20} className="spin-icon" />
            Mulai Spin
          </button>
        ) : (
          <button 
            className="btn-mulai-spin" 
            onClick={handleStopSpin}
            style={{ backgroundColor: '#ef4444', color: 'white' }}
          >
            Hentikan Putaran
          </button>
        )}
      </div>

      <div className="section-header mt-40">
        <div className="flex-align">
          <div className="star-icon">★</div>
          <h2 className="section-title mb-0">Nomor Pemenang</h2>
        </div>
        {gameState.currentPrize && <span className="recent-draw-badge">{gameState.currentPrize}</span>}
      </div>

      <div className="winners-grid">
        {displayWinners.map((winner, i) => (
          <div key={i} className="winner-card">
            <span className="ticket-label">Nomor Undian</span>
            <span className="ticket-number">{winner.nomor}</span>
            {!winner.isSpinning && winner.namaLengkap && (
              <div className="winner-details" style={{ marginTop: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e293b' }}>{winner.namaLengkap}</div>
                <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{winner.unit}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Doorprize;
