import React, { useState, useEffect, useRef } from 'react';
import { Users, Gift, Trophy, Download, Upload, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import { db } from '../firebase';
import { ref, onValue, set, get } from 'firebase/database';
import { addPrize, resetAllData } from '../services/db';
import { saveAs } from 'file-saver';
import { Link } from 'react-router-dom';
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

  const [newPrize, setNewPrize] = useState({
    name: '',
    tier: 'doorprize',
    units: '1',
    image: ''
  });
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    // 1. Listen Participants
    const participantsRef = ref(db, 'participants');
    const unsubParticipants = onValue(participantsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data);
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
      }
    });

    // 2. Listen Prizes
    const prizesRef = ref(db, 'prizes');
    const unsubPrizes = onValue(prizesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        let sisa = 0;
        Object.values(data).forEach(p => {
          sisa += p.units;
        });
        setStats(prev => ({
          ...prev,
          sisaHadiah: sisa,
          totalHadiah: 50 // Mock target
        }));
      }
    });

    return () => {
      unsubParticipants();
      unsubPrizes();
    };
  }, []);

  const handleAddPrize = async (e) => {
    e.preventDefault();
    const parsedUnits = parseInt(newPrize.units);
    if (!newPrize.name || !newPrize.image || isNaN(parsedUnits) || parsedUnits < 1) {
      alert("Mohon lengkapi semua data hadiah dengan benar.");
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
      alert("Hadiah berhasil ditambahkan!");
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
            await set(ref(db, 'participants'), parsedData);
            alert(`Berhasil mengimpor ${Object.keys(parsedData).length} peserta!`);
          } else {
            alert("Gagal membaca file CSV. Pastikan ada header kolom bernama 'Nomor' atau 'nomor'.");
          }
        }
      });
    }
    e.target.value = null; // reset
  };

  const handleExportReport = async () => {
    // We fetch from Firebase and export once using get()
    const snapshot = await get(ref(db, 'participants'));
    if(snapshot.exists()) {
      const data = snapshot.val();
      const csv = Papa.unparse(Object.values(data));
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'laporan_peserta_doorprize.csv');
    } else {
      alert("Tidak ada data untuk diexport");
    }
  };

  const handleResetData = async () => {
    if(window.confirm("PERINGATAN: Apakah Anda yakin ingin mereset semua data pemenang dan stok hadiah? Tindakan ini tidak dapat dibatalkan!")) {
      await resetAllData();
      alert("Data berhasil direset!");
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
          <button className="export-button" style={{backgroundColor: '#ef4444', color: 'white'}} onClick={handleResetData}>
            <Database size={18} />
            Reset Data
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
        <div className="stat-card">
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

        <div className="stat-card">
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

        <div className="stat-card">
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

      <div className="prize-form-card">
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

      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Kehadiran Peserta Berdasarkan Unit</h3>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart layout="vertical" data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 500 }} width={120} />
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
