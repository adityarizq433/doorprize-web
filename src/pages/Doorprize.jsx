import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, Gift, PlayCircle, Square } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { db } from '../firebase';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { getEligibleParticipants, getParticipantsData, recordMultiPrizeWinners, setSpinningState } from '../services/db';
import Swal from 'sweetalert2';
import './Doorprize.css';

const Doorprize = () => {
  const [prizes, setPrizes] = useState([]);
  const [winnerCount, setWinnerCount] = useState(5);
  const [gameState, setGameState] = useState({ isSpinning: false, currentPrize: '', recentWinners: [] });

  const [displayWinners, setDisplayWinners] = useState([]);
  const [displayPrize, setDisplayPrize] = useState(null);

  const [showConfetti, setShowConfetti] = useState(false);
  const [hideOverlay, setHideOverlay] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const { width, height } = useWindowSize();
  const intervalRef = useRef(null);
  const prevSpinningRef = useRef(false);

  const [currentEligible, setCurrentEligible] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [validPrizesForSpin, setValidPrizesForSpin] = useState([]);

  // Fetch prizes on load
  useEffect(() => {
    const prizesRef = collection(db, 'prizes');
    const unsubscribe = onSnapshot(prizesRef, (snapshot) => {
      const prizesArr = [];
      snapshot.forEach(docSnap => prizesArr.push(docSnap.data()));
      const filteredPrizes = prizesArr.filter(p => p.tier === 'doorprize');
      setPrizes(filteredPrizes);

      // Default display prize if not spinning
      if (!gameState.isSpinning && filteredPrizes.length > 0 && !gameState.currentPrize) {
        setDisplayPrize({ name: '-', image: 'icon-gift', units: '-' });
      }
    });
    return () => unsubscribe();
  }, [gameState.isSpinning, gameState.currentPrize]);


  // Listen to game state for sync
  useEffect(() => {
    const gameStateRef = doc(db, 'gameState', 'state');
    const unsubscribe = onSnapshot(gameStateRef, (snapshot) => {
      if (snapshot.exists()) {
        const state = snapshot.data();
        setGameState(state);

        // Cek jika spin baru saja berhenti untuk men-trigger confetti di semua perangkat
        if (prevSpinningRef.current === true && state.isSpinning === false) {
          if (state.currentTier === 'doorprize' && state.recentWinners?.length > 0) {
            setShowConfetti(true);
            setHideOverlay(false);
            setTimeout(() => setShowConfetti(false), 8000);
          }
        }
        prevSpinningRef.current = state.isSpinning;

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
            // Cari hadiah dari data prizes jika ada
            if (state.currentPrize === 'Doorprize' || state.currentPrize === 'Multi Hadiah') {
              setDisplayPrize({ name: '-', image: 'icon-gift', units: '-' });
            } else {
              const wonPrize = prizes.find(p => p.name === state.currentPrize);
              if (wonPrize) {
                setDisplayPrize(wonPrize);
              } else {
                setDisplayPrize({ name: state.currentPrize, image: '/assets.png', units: '-' });
              }
            }
          } else {
            // Default placeholder numbers
            setDisplayWinners(Array(winnerCount).fill({ nomor: '----' }));
            if (!state.currentPrize) {
              setDisplayPrize({ name: '-', image: 'icon-gift', units: '-' });
            }
          }
        }
      }
    });
    return () => unsubscribe();
  }, [winnerCount, prizes]);

  const startShuffleAnimation = (count) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      // Generate random 5 digit numbers for visual effect
      const randoms = Array.from({ length: count }, () => ({ nomor: Math.floor(10000 + Math.random() * 90000).toString(), isSpinning: true }));
      setDisplayWinners(randoms);

      // Shuffle prize visually if we have prizes
      if (prizes.length > 0) {
        const randomPrizeIndex = Math.floor(Math.random() * prizes.length);
        setDisplayPrize(prizes[randomPrizeIndex]);
      }
    }, 50);
  };

  const stopShuffleAnimation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };


  const handleSpinClick = async () => {
    if (gameState.isSpinning || isStarting) return;

    setHideOverlay(true); // Sembunyikan pop-up yang masih terbuka saat spin baru dimulai
    setIsStarting(true);

    try {
      // 1. Filter prizes that have > 0 stock
      const availablePrizes = prizes.filter(p => p.units > 0);
      const totalAvailableUnits = availablePrizes.reduce((sum, p) => sum + p.units, 0);

      if (totalAvailableUnits < winnerCount) {
        Swal.fire({ icon: 'error', title: 'Stok Kurang', text: `Total sisa stok hadiah (${totalAvailableUnits}) tidak mencukupi untuk ${winnerCount} pemenang!` });
        return;
      }

      const { all, eligible } = await getParticipantsData();
      if (eligible.length < winnerCount) {
        Swal.fire({ icon: 'warning', title: 'Peserta Kurang', text: `Hanya ada ${eligible.length} peserta yang memenuhi syarat belum menang.` });
        return;
      }

      // 1. Tell all clients we are spinning
      setShowConfetti(false);
      await setSpinningState(true, 'Mengundi...', 'doorprize');

      // Save state so stopSpin can pick winners fairly
      setCurrentEligible(eligible);
      setAllParticipants(all);
      setValidPrizesForSpin(availablePrizes);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopSpin = async () => {
    if (!gameState.isSpinning || isStopping) return;
    setIsStopping(true);

    try {
      // 1. Persiapkan copy dari hadiah yang tersedia untuk dilacak stoknya secara lokal
      let localPrizes = JSON.parse(JSON.stringify(validPrizesForSpin));

    // 2. Pick winners fairly (Round-Robin by Unit)
    const unitWins = {};
    allParticipants.forEach(p => {
      if (!unitWins[p.unit]) unitWins[p.unit] = 0;
      if (p.doorprize && p.doorprize !== '') {
        unitWins[p.unit]++;
      }
    });

    let availableEligible = [...currentEligible];
    const pickedWinners = [];

    for (let i = 0; i < winnerCount; i++) {
      if (availableEligible.length === 0) break;

      const unitsWithEligible = [...new Set(availableEligible.map(p => p.unit))];

      let minWins = Infinity;
      unitsWithEligible.forEach(unit => {
        if (unitWins[unit] < minWins) {
          minWins = unitWins[unit];
        }
      });

      const lowestWinUnits = unitsWithEligible.filter(unit => unitWins[unit] === minWins);
      const selectedUnit = lowestWinUnits[Math.floor(Math.random() * lowestWinUnits.length)];
      const eligibleInUnit = availableEligible.filter(p => p.unit === selectedUnit);

      const winnerIndex = Math.floor(Math.random() * eligibleInUnit.length);
      const winner = eligibleInUnit[winnerIndex];

      // Assign random prize
      const prizesWithStock = localPrizes.filter(p => p.units > 0);
      const chosenPrize = prizesWithStock[Math.floor(Math.random() * prizesWithStock.length)];
      winner.wonPrize = chosenPrize;
      // Decrement local stock
      chosenPrize.units--;

      pickedWinners.push(winner);
      availableEligible = availableEligible.filter(p => p.nomor !== winner.nomor);
      unitWins[selectedUnit]++;
    }

    const finalShuffledWinners = pickedWinners.sort(() => 0.5 - Math.random());

    // 3. Save to database, stop spinning state, and broadcast winners
      await recordMultiPrizeWinners(finalShuffledWinners);
      setShowConfetti(true);
      setHideOverlay(false); // Pastikan kotak muncul langsung untuk pemencet tombol
      setTimeout(() => setShowConfetti(false), 8000);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <div className="doorprize-page">
      {showConfetti && <Confetti width={width} height={height} numberOfPieces={600} recycle={false} gravity={0.15} colors={['#E4232B', '#ffffff']} style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999999, pointerEvents: 'none' }} />}
      <div className="doorprize-header text-center">
        <img src="/HUTRI81_FA_Logo__Main Logo Merah Hitam Latar Putih.png" alt="Logo HUT RI 81" style={{ maxWidth: '280px', margin: '0 auto 5px' }} />
        <h1 className="doorprize-title-split">
          <span className="title-black">UNDIAN</span> <span className="title-red">DOORPRIZE</span>
        </h1>
        <div className="doorprize-subtitle-ribbon-container">
          <div className="doorprize-subtitle-ribbon">
            <span className="ribbon-fold-left"></span>
            Semarak HUT RI ke-81
            <span className="ribbon-fold-right"></span>
          </div>
        </div>
      </div>

      <div className="dual-spin-container">
        {/* Roulette Spin Box */}
        <div className="roulette-wrapper">
          <div className="roulette-stand"></div>
          
          <div className="roulette-bulbs">
            {Array.from({ length: 24 }).map((_, i) => (
              <div 
                key={i} 
                className="bulb" 
                style={{ transform: `rotate(${i * 15}deg)` }}
              ></div>
            ))}
          </div>
          
          <div className="roulette-pointer"></div>

          <div
            className={`roulette-wheel ${(gameState.isSpinning && !isStopping) ? 'is-spinning' : ''} ${(!gameState.isSpinning || isStopping) && gameState.recentWinners?.length > 0 && gameState.currentTier === 'doorprize' ? 'stopped' : ''}`}
            style={{
              background: prizes.length > 0 ? (() => {
                const angle = 360 / prizes.length;
                const colors = ['#dc2626', '#ffffff']; // Merah Putih
                let gradientParts = [];
                for (let i = 0; i < prizes.length; i++) {
                  gradientParts.push(`${colors[i % colors.length]} ${i * angle}deg ${(i + 1) * angle}deg`);
                }
                return `conic-gradient(${gradientParts.join(', ')})`;
              })() : '#ccc'
            }}
          >
            {prizes.map((prize, i) => {
              const angle = 360 / prizes.length;
              const rotateAngle = (i * angle) + (angle / 2);
              const isWhiteBg = (i % 2 !== 0);
              return (
                <div className="roulette-item" key={i} style={{ transform: `rotate(${rotateAngle}deg)` }}>
                  <div className="roulette-item-content" style={{ color: isWhiteBg ? '#dc2626' : '#ffffff', textShadow: isWhiteBg ? 'none' : '1px 1px 4px rgba(0,0,0,0.8)' }}>
                    {prize.image && prize.image !== 'icon-gift' && (
                      <img src={prize.image} alt={prize.name} className="slice-img" />
                    )}
                    <span className="slice-text">{prize.name}</span>
                  </div>
                </div>
              );
            })}

            {/* Center Logo */}
            <div className="roulette-center-logo">
              <img src="/logo-81.png" alt="Logo 81" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
            </div>
          </div>


        </div>
      </div>

      <div className="new-control-panel">
        <div className="ncp-left">
          <label className="ncp-label">JUMLAH PEMENANG</label>
          <div className="ncp-input-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="number"
              className="ncp-num-input"
              value={winnerCount}
              onChange={(e) => setWinnerCount(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              disabled={gameState.isSpinning}
              style={{
                width: '120px',
                padding: '12px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'bold' }}>ORANG</span>
          </div>
        </div>

        <div className="ncp-right">
          {!gameState.isSpinning ? (
            <button
              className="ncp-spin-btn"
              onClick={handleSpinClick}
              disabled={prizes.length < 1 || isStarting}
            >
              {isStarting ? 'MEMUAT...' : 'MULAI SPIN'} {!isStarting && <PlayCircle size={24} />}
            </button>
          ) : (
            <button
              className="ncp-spin-btn stop"
              onClick={handleStopSpin}
              disabled={isStopping}
            >
              {isStopping ? 'MEMPROSES...' : 'STOP SPIN'} {!isStopping && <Square size={24} fill="currentColor" />}
            </button>
          )}
        </div>
      </div>

      <div className="section-header mt-40">
        <div className="flex-align">
          <div className="star-icon">★</div>
          <h2 className="section-title mb-0">Nomor Pemenang</h2>
        </div>
      </div>

      <div className="winners-grid">
        {displayWinners.map((winner, i) => (
          <div key={i} className="winner-card">
            <span className="ticket-label">Nomor Undian</span>
            <span className="ticket-number">{winner.nomor}</span>
            {!winner.isSpinning && winner.namaLengkap && (
              <div className="winner-details" style={{ marginTop: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1A1A1A' }}>{winner.namaLengkap}</div>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '8px' }}>{winner.unit}</div>
                {winner.wonPrize && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#E4232B', padding: '4px 8px' }}>
                    {winner.wonPrize.name}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* OVERLAY SELAMAT DENGAN BACKDROP */}
      {!gameState.isSpinning && !hideOverlay && gameState.recentWinners?.length > 0 && gameState.currentTier === 'doorprize' && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 999999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}
        >
          <div
            className="roulette-winner-overlay fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img src="/HUTRI81_FA_Logo__Main Logo Merah Hitam Latar Putih.png" alt="Logo HUT RI 81" style={{ width: '280px', maxWidth: '90%', height: 'auto', marginTop: '-15px', marginBottom: '5px' }} />
            <h2 className="winner-overlay-title">SELAMAT!</h2>
            <p className="winner-overlay-subtitle">Kepada Para Pemenang</p>
            
            <button 
              onClick={() => setHideOverlay(true)}
              style={{
                marginTop: '25px',
                padding: '14px 35px',
                fontSize: '1.1rem',
                fontWeight: '900',
                color: 'white',
                backgroundColor: '#E4232B',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                boxShadow: '0 5px 15px rgba(228, 35, 43, 0.4)',
                textTransform: 'uppercase',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              LIHAT PARA PEMENANG
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doorprize;
