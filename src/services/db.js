import { db } from '../firebase';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';

// Mengambil semua peserta yang belum menang
export const getEligibleParticipants = async () => {
  const querySnapshot = await getDocs(collection(db, 'participants'));
  const eligible = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.doorprize || data.doorprize === '') {
      eligible.push(data);
    }
  });
  return eligible;
};

// Mengambil data peserta untuk perhitungan kuota divisi
export const getParticipantsData = async () => {
  const querySnapshot = await getDocs(collection(db, 'participants'));
  const all = [];
  const eligible = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    all.push(data);
    if (!data.doorprize || data.doorprize === '') {
      eligible.push(data);
    }
  });
  return { all, eligible };
};

// Mencatat pemenang ke database
export const recordWinners = async (winnersList, prizeInfo) => {
  const batch = writeBatch(db);
  
  // Update status peserta
  winnersList.forEach(winner => {
    const participantRef = doc(db, 'participants', `u${winner.nomor}`);
    batch.update(participantRef, { doorprize: prizeInfo.name });
  });

  // Kurangi stok hadiah
  const prizeRef = doc(db, 'prizes', prizeInfo.id);
  const prizeSnap = await getDoc(prizeRef);
  if(prizeSnap.exists()) {
    const currentUnits = prizeSnap.data().units;
    batch.update(prizeRef, { units: Math.max(0, currentUnits - winnersList.length) });
  }

  // Rekam riwayat undian
  const drawId = Date.now().toString();
  const drawRef = doc(db, 'drawHistory', drawId);
  batch.set(drawRef, {
    id: drawId,
    timestamp: new Date().toISOString(),
    prizeName: prizeInfo.name,
    tier: prizeInfo.tier,
    winners: winnersList
  });

  // Update Game State
  const gameStateRef = doc(db, 'gameState', 'state');
  batch.set(gameStateRef, {
    isSpinning: false,
    currentPrize: prizeInfo.name,
    currentTier: prizeInfo.tier,
    recentWinners: winnersList
  }, { merge: true });

  await batch.commit();
};

// Mencatat pemenang Doorprize dengan hadiah yang berbeda-beda
export const recordMultiPrizeWinners = async (winnersList) => {
  const batch = writeBatch(db);
  
  const prizeCountMap = {};
  const drawId = Date.now().toString();

  winnersList.forEach(winner => {
    // 1. Update status peserta
    const participantRef = doc(db, 'participants', `u${winner.nomor}`);
    batch.update(participantRef, { doorprize: winner.wonPrize.name });

    // Hitung pengurangan stok
    if (!prizeCountMap[winner.wonPrize.id]) {
      prizeCountMap[winner.wonPrize.id] = { ref: doc(db, 'prizes', winner.wonPrize.id), count: 0 };
    }
    prizeCountMap[winner.wonPrize.id].count++;
  });

  // 2. Kurangi stok masing-masing hadiah
  for (const prizeId in prizeCountMap) {
    const { ref, count } = prizeCountMap[prizeId];
    const prizeSnap = await getDoc(ref);
    if(prizeSnap.exists()) {
      const currentUnits = prizeSnap.data().units;
      batch.update(ref, { units: Math.max(0, currentUnits - count) });
    }
  }

  // 3. Rekam riwayat undian
  const drawRef = doc(db, 'drawHistory', drawId);
  batch.set(drawRef, {
    id: drawId,
    timestamp: new Date().toISOString(),
    prizeName: "Doorprize",
    tier: "doorprize",
    winners: winnersList
  });

  // 4. Update Game State
  const gameStateRef = doc(db, 'gameState', 'state');
  batch.set(gameStateRef, {
    isSpinning: false,
    currentPrize: "Doorprize",
    currentTier: "doorprize",
    recentWinners: winnersList
  }, { merge: true });

  await batch.commit();
};

// Reset semua data pemenang dan stok hadiah
export const resetAllData = async () => {
  const batch = writeBatch(db);

  // 1. Hapus drawHistory
  const drawSnap = await getDocs(collection(db, 'drawHistory'));
  drawSnap.forEach(docSnap => {
    batch.delete(docSnap.ref);
  });

  // 2. Reset status doorprize peserta
  const partSnap = await getDocs(collection(db, 'participants'));
  partSnap.forEach(docSnap => {
    batch.update(docSnap.ref, { doorprize: '' });
  });

  // 3. Reset stok hadiah (sementara kita set ke 50 atau kembalikan)
  const prizeSnap = await getDocs(collection(db, 'prizes'));
  prizeSnap.forEach(docSnap => {
    batch.update(docSnap.ref, { units: 50 }); 
  });

  // 4. Reset gameState
  const gameStateRef = doc(db, 'gameState', 'state');
  batch.set(gameStateRef, {
    isSpinning: false,
    currentPrize: '',
    currentTier: '',
    recentWinners: []
  });

  await batch.commit();
  return true;
};

// Set status spinning
export const setSpinningState = async (isSpinning, prizeName = '', prizeTier = '') => {
  const gameStateRef = doc(db, 'gameState', 'state');
  const updates = { isSpinning };
  if (prizeName) updates.currentPrize = prizeName;
  if (prizeTier) updates.currentTier = prizeTier;
  await setDoc(gameStateRef, updates, { merge: true });
};

// Add a new prize to the database
export const addPrize = async (prizeData) => {
  try {
    const prizeRef = doc(db, 'prizes', prizeData.id);
    await setDoc(prizeRef, prizeData);
    return true;
  } catch (error) {
    console.error("Gagal menambahkan hadiah:", error);
    Swal.fire({ icon: 'error', title: 'Gagal', text: "Gagal menambahkan hadiah: " + error.message });
    return false;
  }
};

// Delete a prize from the database
export const deletePrize = async (prizeId) => {
  try {
    const prizeRef = doc(db, 'prizes', prizeId);
    await deleteDoc(prizeRef);
    return true;
  } catch (error) {
    console.error("Gagal menghapus hadiah:", error);
    Swal.fire({ icon: 'error', title: 'Gagal', text: "Gagal menghapus hadiah: " + error.message });
    return false;
  }
};
