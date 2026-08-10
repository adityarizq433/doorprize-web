import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACw70zpMg3BssmWjNEdN0EIeBHoBOCIDg",
  authDomain: "doorprize-c7d82.firebaseapp.com",
  projectId: "doorprize-c7d82",
  storageBucket: "doorprize-c7d82.firebasestorage.app",
  messagingSenderId: "247462830367",
  appId: "1:247462830367:web:153b3d26a9d3a1fe1b102a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanup() {
  console.log("Mencari data simulasi untuk dihapus...");
  let countParticipant = 0;
  let countNik = 0;
  
  const promises = [];

  // Hapus dari koleksi participants
  const participantsQuery = query(collection(db, 'participants'), where('statusPegawai', '==', 'Simulasi'));
  const participantsSnapshot = await getDocs(participantsQuery);
  
  participantsSnapshot.forEach((docSnap) => {
    promises.push(deleteDoc(docSnap.ref));
    countParticipant++;
  });
  
  // Hapus dari koleksi registered_niks
  const niksSnapshot = await getDocs(collection(db, 'registered_niks'));
  niksSnapshot.forEach((docSnap) => {
    if (docSnap.id.startsWith('SIMULATOR-')) {
      promises.push(deleteDoc(docSnap.ref));
      countNik++;
    }
  });

  console.log(`Ditemukan ${countParticipant} data peserta dan ${countNik} riwayat NIK. Sedang menghapus...`);
  
  await Promise.all(promises);
  
  console.log(`✅ Berhasil membersihkan seluruh data simulasi dari database Anda!`);
  process.exit(0);
}

cleanup();
