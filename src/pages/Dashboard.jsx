import React, { useState, useEffect, useRef } from 'react';
import { Users, Gift, Trophy, Download, Upload, Database, Power } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import { db } from '../firebase';
import { collection, doc, onSnapshot, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { addPrize, resetAllData } from '../services/db';
import { saveAs } from 'file-saver';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import './Dashboard.css';

const Dashboard = () => {
  const [chartData, setChartData] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [stats, setStats] = useState({
    totalPeserta: 0,
    totalHadiah: 0,
    sisaHadiah: 0,
    totalPemenang: 0
  });
  const [isFormOpen, setIsFormOpen] = useState(true);

  const [newPrize, setNewPrize] = useState({
    name: '',
    tier: 'doorprize',
    units: '1',
    image: ''
  });
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    // 1. Listen Participants
    const participantsRef = collection(db, 'participants');
    const unsubParticipants = onSnapshot(participantsRef, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => list.push(docSnap.data()));
      const winners = list.filter(p => p.doorprize && p.doorprize !== '').length;
      
      // Simpan list peserta
      setParticipants(list);
      
      // Calculate units for chart
      const unitCounts = {};
      list.forEach(p => {
        const unit = p.unit || 'Lainnya';
        unitCounts[unit] = (unitCounts[unit] || 0) + 1;
      });
      
      const formattedChartData = Object.keys(unitCounts).map(unit => ({
        name: unit,
        value: unitCounts[unit]
      })).sort((a, b) => b.value - a.value); // Sort descending

      setChartData(formattedChartData);
      
      setStats(prev => ({
        ...prev,
        totalPeserta: list.length,
        totalPemenang: winners
      }));
    });

    // 2. Listen Prizes
    const prizesRef = collection(db, 'prizes');
    const unsubPrizes = onSnapshot(prizesRef, (snapshot) => {
      let sisa = 0;
      snapshot.forEach(docSnap => {
        sisa += docSnap.data().units;
      });
      setStats(prev => ({
        ...prev,
        sisaHadiah: sisa,
        totalHadiah: 50 // Mock target
      }));
    });

    // 3. Listen Form Settings
    const settingsRef = doc(db, 'settings', 'general');
    const unsubSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setIsFormOpen(snapshot.data().isFormOpen);
      } else {
        // If not set, default is true
        setIsFormOpen(true);
      }
    });

    return () => {
      unsubParticipants();
      unsubPrizes();
      unsubSettings();
    };
  }, []);

  const handleAddPrize = async (e) => {
    e.preventDefault();
    const parsedUnits = parseInt(newPrize.units);
    if (!newPrize.name || !newPrize.image || isNaN(parsedUnits) || parsedUnits < 1) {
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Mohon lengkapi semua data hadiah dengan benar.' });
      return;
    }
    const prizeId = 'p' + Date.now();
    const prizeData = {
      id: prizeId,
      ...newPrize,
      units: parsedUnits
    };
    const success = await addPrize(prizeData);
    if (success) {
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Hadiah berhasil ditambahkan!' });
      setNewPrize({ name: '', tier: 'doorprize', units: '1', image: '' });
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const rawData = results.data;
          let parsedData = {};
          
          rawData.forEach(row => {
            if(row.Nomor || row.nomor || row.NOMOR) {
              const nomor = row.Nomor || row.nomor || row.NOMOR;
              parsedData[`u${nomor}`] = {
                nomor: nomor.toString(),
                namaLengkap: row['Nama Lengkap'] || row.namaLengkap || row.NAMA || 'Tanpa Nama',
                nik: row.NIK || row.nik || '-',
                unit: row.Unit || row.unit || row.UNIT || '-',
                statusPegawai: row['Status Pegawai'] || row.statusPegawai || row.Status || row.statusKepegawaian || row.STATUS || '-',
                doorprize: row.Doorprize || row.doorprize || row.DOORPRIZE || ''
              };
            }
          });
          
          if(Object.keys(parsedData).length > 0) {
            const batch = writeBatch(db);
            let opCount = 0;
            
            Object.keys(parsedData).forEach(key => {
              const pRef = doc(db, 'participants', key);
              batch.set(pRef, parsedData[key]);
              opCount++;
            });
            
            await batch.commit();
            Swal.fire({ icon: 'success', title: 'Berhasil', text: `Berhasil mengimpor ${opCount} peserta!` });
          } else {
            Swal.fire({ icon: 'error', title: 'Gagal', text: "Gagal membaca file CSV. Pastikan ada header kolom bernama 'Nomor' atau 'nomor'." });
          }
        }
      });
    }
    e.target.value = null; // reset
  };

  const handleExportReport = async () => {
    // We fetch from Firebase and export once using getDocs()
    const snapshot = await getDocs(collection(db, 'participants'));
    if(!snapshot.empty) {
      const data = [];
      snapshot.forEach(docSnap => data.push(docSnap.data()));
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'laporan_peserta_doorprize.csv');
    } else {
      Swal.fire({ icon: 'info', title: 'Info', text: 'Tidak ada data untuk diexport' });
    }
  };

  const handleResetData = async () => {
    const result = await Swal.fire({
      title: 'PERINGATAN',
      text: "Apakah Anda yakin ingin mereset semua data pemenang dan stok hadiah? Tindakan ini tidak dapat dibatalkan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Reset Data!',
      cancelButtonText: 'Batal'
    });
    
    if(result.isConfirmed) {
      await resetAllData();
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data berhasil direset!' });
    }
  };

  const handleClearParticipants = async () => {
    const result = await Swal.fire({
      title: 'PERINGATAN',
      text: "Apakah Anda yakin ingin menghapus SELURUH data peserta? Data tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus Semua!',
      cancelButtonText: 'Batal'
    });
    
    if(result.isConfirmed) {
      const snapshot = await getDocs(collection(db, 'participants'));
      const batch = writeBatch(db);
      snapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Seluruh data peserta berhasil dihapus!' });
    }
  };

  const handleToggleForm = async () => {
    const newState = !isFormOpen;
    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: `Apakah Anda yakin ingin ${newState ? 'MEMBUKA' : 'MENUTUP'} form absensi?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newState ? '#22c55e' : '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Lanjutkan',
      cancelButtonText: 'Batal'
    });
    
    if(result.isConfirmed) {
      await setDoc(doc(db, 'settings', 'general'), { isFormOpen: newState }, { merge: true });
    }
  };


  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Ringkasan</h1>
          <p className="page-subtitle">Status langsung (real-time) acara pengundian.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="file" 
            accept=".csv" 
            style={{display: 'none'}} 
            ref={fileInputRef}
            onChange={handleImportCSV}
          />
          <button 
            className="export-button" 
            style={{ backgroundColor: isFormOpen ? '#22c55e' : '#ef4444', color: 'white' }} 
            onClick={handleToggleForm}
          >
            <Power size={18} />
            {isFormOpen ? 'Tutup Absen' : 'Buka Absen'}
          </button>
          <button className="export-button" style={{backgroundColor: '#ef4444', color: 'white'}} onClick={handleResetData}>
            <Database size={18} />
            Reset Riwayat
          </button>
          <button className="export-button" style={{backgroundColor: '#b91c1c', color: 'white'}} onClick={handleClearParticipants}>
            <Users size={18} />
            Hapus Peserta
          </button>
          <button className="export-button" style={{backgroundColor: '#e2e8f0'}} onClick={() => fileInputRef.current.click()}>
            <Upload size={18} />
            Impor CSV
          </button>
          <button className="export-button" onClick={handleExportReport}>
            <Download size={18} />
            Ekspor Laporan
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card theme-card">
          <div className="stat-header">
            <div>
              <p className="stat-title">TOTAL PESERTA</p>
              <h2 className="stat-value">{stats.totalPeserta}</h2>
            </div>
            <div className="stat-icon-wrapper bg-orange">
              <Users size={24} color="#d79f25" />
            </div>
          </div>
          <p className="stat-footer">
            <Link to="/participants" style={{ color: '#d79f25', fontWeight: '600', textDecoration: 'none' }}>
              Lihat Daftar Peserta →
            </Link>
          </p>
        </div>

        <div className="stat-card theme-card">
          <div className="stat-header">
            <div>
              <p className="stat-title">SISA HADIAH</p>
              <h2 className="stat-value">{stats.sisaHadiah}</h2>
            </div>
            <div className="stat-icon-wrapper bg-yellow">
              <Gift size={24} color="#d79f25" />
            </div>
          </div>
          <p className="stat-footer">
            <Link to="/prizes" style={{ color: '#d79f25', fontWeight: '600', textDecoration: 'none' }}>
              Lihat Daftar Hadiah →
            </Link>
          </p>
        </div>

        <div className="stat-card theme-card">
          <div className="stat-header">
            <div>
              <p className="stat-title">TOTAL PEMENANG</p>
              <h2 className="stat-value">{stats.totalPemenang}</h2>
            </div>
            <div className="stat-icon-wrapper bg-yellow">
              <Trophy size={24} color="#d79f25" />
            </div>
          </div>
          <p className="stat-footer">
            <Link to="/history" style={{ color: '#d79f25', fontWeight: '600', textDecoration: 'none' }}>
              Lihat History Undian →
            </Link>
          </p>
        </div>
      </div>

      <div className="prize-form-card theme-card">
        <h3 className="chart-title mb-4">Input Hadiah Baru</h3>
        <form onSubmit={handleAddPrize} className="prize-form">
          <div className="form-group">
            <label>Nama Hadiah</label>
            <input type="text" value={newPrize.name} onChange={e => setNewPrize({...newPrize, name: e.target.value})} placeholder="Misal: TV 55 Inch" />
          </div>
          <div className="form-group">
            <label>Kategori (Tier)</label>
            <select value={newPrize.tier} onChange={e => setNewPrize({...newPrize, tier: e.target.value})}>
              <option value="doorprize">Doorprize</option>
              <option value="grandprize">Grandprize</option>
            </select>
          </div>
          <div className="form-group">
            <label>Jumlah (Units)</label>
            <input 
              type="number" 
              min="1" 
              value={newPrize.units} 
              onChange={e => setNewPrize({...newPrize, units: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>URL Gambar</label>
            <input type="text" value={newPrize.image} onChange={e => setNewPrize({...newPrize, image: e.target.value})} placeholder="https://..." />
          </div>
          <button type="submit" className="export-button" style={{ backgroundColor: '#fbbf24', color: '#0f172a', border: 'none', marginTop: '24px' }}>
            <Gift size={18} />
            Tambah
          </button>
        </form>
      </div>

      <div className="chart-card theme-card">
        <div className="chart-header">
          <h3 className="chart-title">Kehadiran Peserta Berdasarkan Unit</h3>
        </div>
        <div className="chart-container" style={{ overflowY: 'auto', maxHeight: '600px', overflowX: 'hidden' }}>
          <ResponsiveContainer width="100%" height={Math.max(350, chartData.length * 45)}>
            <BarChart layout="vertical" data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 500 }} width={250} interval={0} />
              <Tooltip cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }} />
              <Bar dataKey="value" fill="#e2e8f0" radius={[0, 4, 4, 0]} activeBar={{ fill: '#fbc638' }} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
