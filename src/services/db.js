import { db } from '../firebase';
import { ref, set, get, child, update } from 'firebase/database';

// seed dummy has been removed

// Mengambil semua peserta yang belum menang
export const getEligibleParticipants = async () => {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, 'participants'));
  if (snapshot.exists()) {
    const all = snapshot.val();
    return Object.values(all).filter(p => !p.doorprize || p.doorprize === '');
  }
  return [];
};

// Mencatat pemenang ke database
export const recordWinners = async (winnersList, prizeInfo) => {
  const updates = {};
  
  // Update status peserta
  winnersList.forEach(winner => {
    // Kita simpan nama hadiahnya langsung, bukan cuma "Sudah Menang"
    updates[`participants/u${winner.nomor}/doorprize`] = prizeInfo.name;
  });

  // Kurangi stok hadiah
  const dbRef = ref(db);
  const prizeSnap = await get(child(dbRef, `prizes/${prizeInfo.id}`));
  if(prizeSnap.exists()) {
    const currentUnits = prizeSnap.val().units;
    updates[`prizes/${prizeInfo.id}/units`] = Math.max(0, currentUnits - winnersList.length);
  }

  // Rekam riwayat undian
  const drawId = Date.now().toString();
  updates[`drawHistory/${drawId}`] = {
    id: drawId,
    timestamp: new Date().toISOString(),
    prizeName: prizeInfo.name,
    tier: prizeInfo.tier,
    winners: winnersList
  };

  // Update Game State
  updates['gameState/isSpinning'] = false;
  updates['gameState/currentPrize'] = prizeInfo.name;
  updates['gameState/currentTier'] = prizeInfo.tier;
  updates['gameState/recentWinners'] = winnersList; // simpan object utuh

  await update(ref(db), updates);
};

// Reset semua data pemenang dan stok hadiah
export const resetAllData = async () => {
  const dbRef = ref(db);
  const updates = {};

  // 1. Hapus drawHistory
  updates['drawHistory'] = null;

  // 2. Reset status doorprize peserta
  const partSnap = await get(child(dbRef, 'participants'));
  if (partSnap.exists()) {
    const participants = partSnap.val();
    Object.keys(participants).forEach(key => {
      updates[`participants/${key}/doorprize`] = null;
    });
  }

  // 3. Reset stok hadiah (sementara kita set ke 50 atau kembalikan)
  // idealnya tiap hadiah punya originalUnits, tapi karena belum ada, kita reset ke angka tertentu
  // Mari kita ambil dulu prizes, kalau units nya < 10 kita set jadi 10
  const prizeSnap = await get(child(dbRef, 'prizes'));
  if (prizeSnap.exists()) {
    const prizes = prizeSnap.val();
    Object.keys(prizes).forEach(key => {
      // Sebagai contoh, kita set stok kembali ke 50. 
      // Anda bisa mengganti ini nanti di halaman dashboard
      updates[`prizes/${key}/units`] = 50; 
    });
  }

  // 4. Reset gameState
  updates['gameState'] = null;

  await update(ref(db), updates);
  return true;
};

// Set status spinning
export const setSpinningState = async (isSpinning, prizeName, prizeTier) => {
  const updates = {
    'gameState/isSpinning': isSpinning
  };
  if (prizeName) {
    updates['gameState/currentPrize'] = prizeName;
  }
  if (prizeTier) {
    updates['gameState/currentTier'] = prizeTier;
  }
  await update(ref(db), updates);
};

// Add a new prize to the database
export const addPrize = async (prizeData) => {
  try {
    const newPrizeRef = child(ref(db, 'prizes'), prizeData.id);
    await set(newPrizeRef, prizeData);
    return true;
  } catch (error) {
    console.error("Gagal menambahkan hadiah:", error);
    alert("Gagal menambahkan hadiah: " + error.message);
    return false;
  }
};
