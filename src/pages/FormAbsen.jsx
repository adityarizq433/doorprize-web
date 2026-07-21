import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { ref, get, set, child } from 'firebase/database';
import { CheckCircle2, Ticket, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
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

  useEffect(() => {
    const savedTicket = localStorage.getItem('doorprize_ticket');
    if (savedTicket) {
      const parsed = JSON.parse(savedTicket);
      setFormData(prev => ({ ...prev, namaLengkap: parsed.namaLengkap, nik: parsed.nik || '' }));
      setNomorUndian(parsed.nomor);
      setIsSubmitted(true);
    }
  }, []);

  const units = [
    'Airport Operation Center',
    'Branch Communication & CSR Department',
    'Legal & Compliance Department',
    'Asset Management & General Services Department',
    'Airport Quality & Safety Management System Division',
    'Airport Operation & Services Division',
    'Airport Security Division',
    'Airport Technical Division',
    'Airport Commercial Division',
    'General Manager',
    'Deputy General Manager'
  ];

  const statuses = ['Organik', 'Tenaga Ahli Daya', 'Magang'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.namaLengkap || !formData.nik || !formData.unit || !formData.statusPegawai) {
      alert("Mohon lengkapi semua data!");
      return;
    }
    
    setIsLoading(true);

    try {
      // Get current highest number to generate new one
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, 'participants'));
      
      let nextNumber = 10001; // Default starting number
      if (snapshot.exists()) {
        const participants = snapshot.val();
        
        // Cek duplikasi NIK
        const isDuplicate = Object.values(participants).some(p => p.nik === formData.nik);
        if (isDuplicate) {
          alert("Gagal: NIK ini sudah terdaftar! Harap gunakan NIK Anda sendiri.");
          setIsLoading(false);
          return;
        }

        const existingNumbers = Object.values(participants)
          .map(p => parseInt(p.nomor))
          .filter(n => !isNaN(n));
        
        if (existingNumbers.length > 0) {
          nextNumber = Math.max(...existingNumbers) + 1;
        }
      }

      // Format the NIK just to ensure consistency
      const userKey = `u${nextNumber}`;
      
      const newParticipant = {
        nomor: nextNumber.toString(),
        namaLengkap: formData.namaLengkap,
        nik: formData.nik,
        unit: formData.unit,
        statusPegawai: formData.statusPegawai,
        doorprize: '',
        checkInTime: new Date().toISOString()
      };

      await set(ref(db, `participants/${userKey}`), newParticipant);
      
      localStorage.setItem('doorprize_ticket', JSON.stringify({
        nomor: nextNumber.toString(),
        namaLengkap: formData.namaLengkap,
        nik: formData.nik
      }));

      setNomorUndian(nextNumber.toString());
      setIsSubmitted(true);
    } catch (error) {
      console.error("Gagal mengirim absensi:", error);
      alert("Terjadi kesalahan, silakan coba lagi.");
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
        alert("Gagal mendownload tiket. Silakan screenshot manual.");
      }
    }
  };

  const [tapCount, setTapCount] = useState(0);


  const handleReset = () => {
    if (window.confirm("Yakin ingin mendaftarkan peserta lain? Tiket Anda saat ini akan dihapus dari HP ini.")) {
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
    );
  }

  return (
    <div className="form-absen-container">
      <div className="form-card">
        <div className="form-header">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/7/79/Juanda_International_Airport_Logo.png" 
            alt="Logo Juanda" 
            style={{ maxWidth: '200px', height: 'auto', marginBottom: '15px' }} 
          />
          <h1>Form Kehadiran</h1>
          <p>Isi data diri Anda untuk mendapatkan nomor undian acara.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="absen-form">
          <div className="form-group">
            <label>Nama Lengkap</label>
            <input 
              type="text" 
              placeholder="Masukkan nama lengkap" 
              value={formData.namaLengkap}
              onChange={(e) => setFormData({...formData, namaLengkap: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>NIK / ID Karyawan</label>
            <input 
              type="text" 
              placeholder="Masukkan NIK" 
              value={formData.nik}
              onChange={(e) => setFormData({...formData, nik: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Unit / Divisi</label>
            <select 
              value={formData.unit}
              onChange={(e) => setFormData({...formData, unit: e.target.value})}
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
              onChange={(e) => setFormData({...formData, statusPegawai: e.target.value})}
              required
            >
              <option value="" disabled>Pilih Status</option>
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Kirim Absensi & Dapatkan Nomor'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormAbsen;
