import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, getDocs, setDoc, runTransaction } from 'firebase/firestore';
import { CheckCircle2, Ticket, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';
import './FormAbsen.css';

const FormAbsen = () => {
  const [formData, setFormData] = useState({
    namaLengkap: '',
    nik: '',
    unit: '',
    statusPegawai: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [nomorUndian, setNomorUndian] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const ticketRef = useRef(null);

  const [isFormOpen, setIsFormOpen] = useState(true);

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'general');
    const unsub = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsFormOpen(data.isFormOpen !== undefined ? data.isFormOpen : true);
      }
    });

    const savedTicket = localStorage.getItem('doorprize_ticket');
    if (savedTicket) {
      const parsed = JSON.parse(savedTicket);
      setFormData(prev => ({ ...prev, namaLengkap: parsed.namaLengkap, nik: parsed.nik || '' }));
      setNomorUndian(parsed.nomor);
      setIsSubmitted(true);
    }

    return () => unsub();
  }, []);

  const units = [
    'General Manager',
    'Deputy General Manager',
    'Airport Operation Center',
    'Branch Communication & CSR Department',
    'Legal & Compliance Department',
    'Asset Management & General Services Department',
    'Airport Quality & Safety Management System Division',
    'Airport Operation & Services Division',
    'Airport Security Division',
    'Airport Technical Division',
    'Airport Commercial Division',
    'Safety Management System & OHS Department',
    'Airport Quality Control Department',
    'Airport Operation Airside Department',
    'Airport Operation Landside & Terminal Department',
    'Airport Services Improvement Department',
    'Airport Rescue & Fire Fighting Department',
    'Airport Security Protection Department',
    'Airport Security Screening Department',
    'Airport Airside Facilities Department',
    'Airport Landside Facilities Department',
    'Airport Equipment Department',
    'Airport Technology Department',
    'Airport Environment Department',
    'Aero Commercial Department',
    'Non-Aero Commercial Terminal 1 Department',
    'Non-Aero Commercial Terminal 2 Department'
  ];


  const statuses = ['Organik', 'Tenaga Ahli Daya', 'Magang'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.namaLengkap || !formData.nik || !formData.unit || !formData.statusPegawai) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Mohon lengkapi semua data!' });
      return;
    }

    setIsLoading(true);

    try {
      let assignedNumber = '';
      
      const generateRandomTicket = () => {
        // Menghasilkan angka acak antara 10000 dan 99999
        return Math.floor(10000 + Math.random() * 90000).toString();
      };

      const maxRetries = 3;
      let transactionSuccess = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await runTransaction(db, async (transaction) => {
            // 1. Cek duplikasi NIK terlebih dahulu
            const nikRef = doc(db, 'registered_niks', formData.nik);
            const nikDoc = await transaction.get(nikRef);
            if (nikDoc.exists()) {
              throw new Error('DUPLICATE_NIK');
            }

            // 2. Buat nomor tiket acak yang belum terpakai
            let nextNumber = generateRandomTicket();
            let userKey = `u${nextNumber}`;
            let participantRef = doc(db, 'participants', userKey);
            let participantDoc = await transaction.get(participantRef);
            
            let attempts = 0;
            // Jika kebetulan nomor tiket sudah ada (sangat jarang), kita buat ulang
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

            // 3. Set/Blokir data NIK agar tidak bisa mendaftar lagi
            transaction.set(nikRef, {
              namaLengkap: formData.namaLengkap,
              timestamp: new Date().toISOString()
            });

            // 4. Simpan data peserta dengan nomor tiket yang baru dibuat
            const newParticipant = {
              nomor: nextNumber,
              namaLengkap: formData.namaLengkap,
              nik: formData.nik,
              unit: formData.unit,
              statusPegawai: formData.statusPegawai,
              doorprize: '',
              checkInTime: new Date().toISOString()
            };

            transaction.set(participantRef, newParticipant);
            
            // Simpan nomor untuk ditampilkan ke pengguna
            assignedNumber = nextNumber;
          });
          
          transactionSuccess = true;
          break; // Keluar dari loop jika berhasil
        } catch (err) {
          if (err.message === 'DUPLICATE_NIK') {
            throw err; // Lempar ke catch block luar jika duplikat
          }
          if (attempt === maxRetries) {
            throw err; // Gagal total, lempar ke catch block luar
          }
          // Delay acak sebelum mencoba lagi
          const delay = Math.floor(Math.random() * 2000) + 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Proses berhasil, simpan ke localStorage
      localStorage.setItem('doorprize_ticket', JSON.stringify({
        nomor: assignedNumber,
        namaLengkap: formData.namaLengkap,
        nik: formData.nik
      }));

      setNomorUndian(assignedNumber);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Gagal mengirim absensi:", error);
      if (error.message === 'DUPLICATE_NIK') {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'NIK ini sudah terdaftar! Harap gunakan NIK Anda sendiri.' });
      } else {
        Swal.fire({ 
          icon: 'warning', 
          title: 'Server Sedang Sibuk', 
          text: 'Mohon maaf, saat ini sedang terjadi antrean. Silakan tunggu beberapa detik dan coba tekan tombol kirim lagi.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTicket = async () => {
    if (ticketRef.current) {
      try {
        const canvas = await html2canvas(ticketRef.current, { backgroundColor: '#ffffff', scale: 2 });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `Tiket_Doorprize_${nomorUndian}.png`;
        link.click();
      } catch (err) {
        console.error("Gagal mendownload tiket:", err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal mendownload tiket. Silakan screenshot manual.' });
      }
    }
  };

  const [tapCount, setTapCount] = useState(0);

  const handleReset = async () => {
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: 'Yakin ingin mendaftarkan peserta lain? Tiket Anda saat ini akan dihapus dari HP ini.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Daftar Lainnya',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      localStorage.removeItem('doorprize_ticket');
      setFormData({ namaLengkap: '', nik: '', unit: '', statusPegawai: '' });
      setNomorUndian('');
      setIsSubmitted(false);
      setTapCount(0);
    }
  };

  const handleSecretReset = () => {
    setTapCount(prev => prev + 1);
    if (tapCount >= 4) {
      handleReset();
    }
  };

  if (isSubmitted) {
    return (
      <div className="form-absen-container success-state">
        <div className="form-logos-header">
          <img src="/assets.png" alt="Injourney Logo" className="form-logo-injourney" />
          <img src="/Juanda_International_Airport_Logo.png" alt="Juanda Airport Logo" className="form-logo-juanda" />
        </div>
        <div className="form-content-wrapper">
          <img
            src="/HUTRI81_FA_Logo__Main Logo Merah Hitam Latar Putih.png"
            alt="Logo HUT RI 81"
            className="hut81-logo"
          />
          <div className="success-card">
            <div className="success-icon-wrapper" onClick={handleSecretReset} style={{ cursor: 'pointer' }}>
            <CheckCircle2 size={60} color="#22c55e" />
          </div>
          <h2>Kehadiran Berhasil Dicatat!</h2>
          <p>Terima kasih <strong>{formData.namaLengkap}</strong>, Anda telah resmi terdaftar untuk mengikuti undian doorprize.</p>

          <div className="ticket-box" ref={ticketRef}>
            <div className="ticket-header">
              <Ticket size={20} />
              <span>NOMOR UNDIAN ANDA</span>
            </div>
            <div className="ticket-number">{nomorUndian}</div>
          </div>

          <button onClick={handleDownloadTicket} className="btn-download-ticket">
            <Download size={20} />
            Simpan Tiket ke HP
          </button>

          <p className="screenshot-hint">Simpan nomor ini. Jika tertutup, Anda bisa scan ulang QR Code untuk melihat tiket ini kembali.</p>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-absen-container">
      <div className="form-logos-header">
        <img src="/assets.png" alt="Injourney Logo" className="form-logo-injourney" />
        <img src="/Juanda_International_Airport_Logo.png" alt="Juanda Airport Logo" className="form-logo-juanda" />
      </div>
      <div className="form-content-wrapper">
        <img
          src="/HUTRI81_FA_Logo__Main Logo Merah Hitam Latar Putih.png"
          alt="Logo HUT RI 81"
          className="hut81-logo"
        />
        <div className="form-card">
          <div className="form-header">
            {isFormOpen && (
              <>
              <h1>Form Kehadiran</h1>
              <p>Isi data diri Anda untuk mendapatkan nomor undian acara.</p>
            </>
          )}
        </div>

        {!isFormOpen ? (
          <div style={{
            textAlign: 'center',
            padding: '50px 30px',
            background: 'linear-gradient(145deg, #fffafa, #fff0f0)',
            borderRadius: '16px',
            border: '1px solid #fee2e2',
            boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 4px 12px rgba(239, 68, 68, 0.05)',
            marginTop: '20px'
          }}>
            <h2 style={{
              color: '#dc2626',
              marginBottom: '16px',
              fontSize: '1.75rem',
              fontWeight: '700',
              letterSpacing: '-0.5px'
            }}>
              Formulir Ditutup
            </h2>
            <p style={{
              color: '#64748b',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              maxWidth: '80%',
              margin: '0 auto'
            }}>
              Pengisian data kehadiran untuk acara ini telah dihentikan oleh pihak penyelenggara. Terima kasih atas partisipasi Anda.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="absen-form">
            <div className="form-group">
              <label>Nama Lengkap</label>
              <input
                type="text"
                placeholder="Masukkan nama lengkap"
                value={formData.namaLengkap}
                onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>NIK / ID Karyawan</label>
              <input
                type="text"
                placeholder="Masukkan NIK"
                value={formData.nik}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Unit / Divisi</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                required
              >
                <option value="" disabled>Pilih Unit</option>
                {units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status Pegawai</label>
              <select
                value={formData.statusPegawai}
                onChange={(e) => setFormData({ ...formData, statusPegawai: e.target.value })}
                required
              >
                <option value="" disabled>Pilih Status</option>
                {statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Memproses Data...' : 'Kirim Absensi & Dapatkan Nomor'}
            </button>
            {isLoading && (
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', marginTop: '12px', lineHeight: '1.4' }}>
                Mohon tunggu sebentar, data sedang diproses.<br/>
                <span style={{ color: '#ef4444', fontWeight: '500' }}>Jangan tutup halaman ini.</span> (Bisa memakan waktu hingga 10 detik jika antrean ramai)
              </p>
            )}
          </form>
        )}
        </div>
      </div>
    </div>
  );
};

export default FormAbsen;
