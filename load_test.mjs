import { initializeApp } from "firebase/app";
import { getFirestore, doc, runTransaction } from "firebase/firestore";

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

// Ubah angka ini untuk mencoba jumlah yang berbeda (misal 50, 100, atau 500)
const CONCURRENT_USERS = 800;

async function simulateSubmit(index, maxRetries = 3) {
  const nik = `SIMULATOR-${Date.now()}-${index}`;
  const namaLengkap = `Peserta Simulasi ${index}`;

  let assignedNumber = '';

  const generateRandomTicket = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await runTransaction(db, async (transaction) => {
        const nikRef = doc(db, 'registered_niks', nik);
        const nikDoc = await transaction.get(nikRef);
        if (nikDoc.exists()) {
          throw new Error('DUPLICATE_NIK');
        }

        let nextNumber = generateRandomTicket();
        let userKey = `u${nextNumber}`;
        let participantRef = doc(db, 'participants', userKey);
        let participantDoc = await transaction.get(participantRef);
        
        let attempts = 0;
        while (participantDoc.exists() && attempts < 5) {
          nextNumber = generateRandomTicket();
          userKey = `u${nextNumber}`;
          participantRef = doc(db, 'participants', userKey);
          participantDoc = await transaction.get(participantRef);
          attempts++;
        }
        
        if (attempts >= 5) {
          throw new Error('SYSTEM_BUSY');
        }

        transaction.set(nikRef, {
          namaLengkap: namaLengkap,
          timestamp: new Date().toISOString()
        });

        transaction.set(participantRef, {
          nomor: nextNumber,
          namaLengkap: namaLengkap,
          nik: nik,
          unit: 'Simulasi Load Test',
          statusPegawai: 'Simulasi',
          doorprize: '',
          checkInTime: new Date().toISOString()
        });

        assignedNumber = nextNumber;
      });

      console.log(`[BERHASIL] Peserta ${index} mendapat nomor undian: ${assignedNumber}`);
      return true;
    } catch (error) {
      if (error.message === 'DUPLICATE_NIK') {
        console.error(`[GAGAL] Peserta ${index}: NIK sudah terdaftar.`);
        return false;
      }

      if (attempt === maxRetries) {
        console.error(`[GAGAL PERMANEN] Peserta ${index}:`, error.message);
        return false;
      }

      const delay = Math.floor(Math.random() * 2000) + 1000; // 1000ms - 3000ms delay
      console.warn(`[RETRY ${attempt}/${maxRetries}] Peserta ${index} menunda ${delay}ms karena: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function runLoadTest() {
  console.log(`🚀 Memulai Load Test dengan ${CONCURRENT_USERS} peserta secara serentak...`);
  const startTime = Date.now();

  const promises = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    // Jeda acak 0 - 5 detik (5000 ms) layaknya antrean manusia
    const randomDelay = Math.floor(Math.random() * 5000); 
    
    const promise = new Promise((resolve) => {
      setTimeout(async () => {
        const result = await simulateSubmit(i);
        resolve(result);
      }, randomDelay);
    });
    
    promises.push(promise);
  }

  // Tunggu hingga semua 100 peserta selesai mengantre dan menyimpan
  const results = await Promise.all(promises);

  const endTime = Date.now();
  const successCount = results.filter(r => r).length;

  console.log(`\n✅ Selesai dalam ${endTime - startTime} ms!`);
  console.log(`📊 Statistik: ${successCount} Berhasil, ${CONCURRENT_USERS - successCount} Gagal.`);
  console.log(`Silakan cek halaman daftar peserta Anda untuk melihat ${successCount} peserta simulasi.`);
  process.exit(0);
}

runLoadTest();
