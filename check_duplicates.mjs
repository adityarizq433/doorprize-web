import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function checkDuplicates() {
  console.log("Sedang mengambil data peserta dari Firestore...");
  const snapshot = await getDocs(collection(db, "participants"));
  
  const numbers = new Set();
  const niks = new Set();
  let duplicateNumbers = 0;
  let duplicateNiks = 0;
  let total = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    total++;
    
    // Cek Duplikat Nomor
    if (numbers.has(data.nomor)) {
      console.log(`[DUPLIKAT NOMOR] Nomor tiket ${data.nomor} terdaftar lebih dari sekali! (NIK: ${data.nik})`);
      duplicateNumbers++;
    } else {
      numbers.add(data.nomor);
    }
    
    // Cek Duplikat NIK
    if (niks.has(data.nik)) {
      console.log(`[DUPLIKAT NIK] NIK ${data.nik} terdaftar lebih dari sekali!`);
      duplicateNiks++;
    } else {
      niks.add(data.nik);
    }
  });

  console.log(`\n=== HASIL PENGECEKAN ===`);
  console.log(`Total Peserta Dicek: ${total}`);
  console.log(`Total Nomor Undian Dobel: ${duplicateNumbers}`);
  console.log(`Total NIK Dobel: ${duplicateNiks}`);
  
  if (duplicateNumbers === 0 && duplicateNiks === 0) {
    console.log("✅ AMAN! Tidak ada data yang dobel sama sekali.");
  } else {
    console.log("❌ PERINGATAN! Ditemukan data ganda.");
  }
  
  process.exit(0);
}

checkDuplicates();
