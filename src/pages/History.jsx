import React, { useState, useEffect } from 'react';
import { Search, Download, Award, Printer } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import './History.css';

const getDisplayPrizeName = (name, tier) => {
  if (tier === 'grandprize') return 'Grandprize';
  if (name === 'Multi Hadiah') return 'Doorprize';
  if (name?.toLowerCase() === 'mobil') return 'Grandprize';
  return name;
};

const History = () => {
  const [draws, setDraws] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const drawsRef = collection(db, 'drawHistory');
    const unsubscribe = onSnapshot(drawsRef, (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setDraws(list);
    });
    return () => unsubscribe();
  }, []);

  const handleExportCSV = (draw) => {
    if(!draw.winners || draw.winners.length === 0) return;
    
    // If draw.winners is an object (due to firebase), convert it to array
    const winnersArray = Array.isArray(draw.winners) ? draw.winners : Object.values(draw.winners);
    
    // Map the array to ensure 'doorprize' column has the correct prize name
    const csvData = winnersArray.map(w => ({
      ...w,
      doorprize: w.wonPrize ? w.wonPrize.name : draw.prizeName
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `pemenang_${getDisplayPrizeName(draw.prizeName, draw.tier)}_${new Date(draw.timestamp).getTime()}.csv`);
  };

  const handleExportPDF = (draw) => {
    try {
      if(!draw.winners || draw.winners.length === 0) {
        Swal.fire({ icon: 'info', title: 'Info', text: 'Tidak ada pemenang dalam sesi ini.' });
        return;
      }
      
      const doc = new jsPDF();
      
      // Add simple title
      doc.setFontSize(16);
      doc.text(`Daftar Pemenang - ${getDisplayPrizeName(draw.prizeName, draw.tier)}`, 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Waktu Undian: ${new Date(draw.timestamp).toLocaleString()}`, 14, 28);
      
      const tableColumn = ["Nomor Undian", "Nama", "Unit", "Status", "Hadiah", "Tanda Tangan"];
      const tableRows = [];

      // If draw.winners is an object (due to firebase), convert it to array
      const winnersArray = Array.isArray(draw.winners) ? draw.winners : Object.values(draw.winners);

      winnersArray.forEach(w => {
        tableRows.push([
          w.nomor, 
          w.namaLengkap || 'Tanpa Nama', 
          w.unit || '-', 
          w.statusPegawai || w.statusKepegawaian || '-',
          w.wonPrize ? getDisplayPrizeName(w.wonPrize.name, w.wonPrize.tier || draw.tier) : getDisplayPrizeName(draw.prizeName, draw.tier),
          "" // Kosong untuk tanda tangan
        ]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [215, 159, 37] } // Match yellow-ish theme
      });

      doc.save(`pemenang_${getDisplayPrizeName(draw.prizeName, draw.tier)}_${new Date(draw.timestamp).getTime()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan saat membuat PDF: ' + error.message });
    }
  };

  const filteredDraws = draws.filter(d => {
    const winnersArray = d.winners ? (Array.isArray(d.winners) ? d.winners : Object.values(d.winners)) : [];
    const searchLower = search.toLowerCase();
    
    return d.prizeName?.toLowerCase().includes(searchLower) ||
      winnersArray.some(w => 
        w.namaLengkap?.toLowerCase().includes(searchLower) || 
        w.nomor?.includes(search) ||
        w.wonPrize?.name?.toLowerCase().includes(searchLower)
      );
  });

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h1 className="page-title">Riwayat Pemenang</h1>
          <p className="page-subtitle">Daftar peserta yang telah memenangkan undian, dikelompokkan per sesi.</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Cari hadiah, nama, atau nomor..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="draws-list">
        {filteredDraws.map((draw, index) => (
          <div key={draw.id || index} className="draw-card">
            <div className="draw-card-header">
              <div className="draw-info">
                <h3 className="draw-prize-name">
                  <Award size={20} color="#d79f25" style={{marginRight: '8px'}} /> 
                  {getDisplayPrizeName(draw.prizeName, draw.tier)}
                </h3>
                <span className="draw-time">{new Date(draw.timestamp).toLocaleString()}</span>
              </div>
              <div className="draw-actions">
                <button className="btn-export-small" onClick={() => handleExportCSV(draw)}>
                  <Download size={16} /> CSV
                </button>
                <button className="btn-print-small" onClick={() => handleExportPDF(draw)}>
                  <Printer size={16} /> PDF
                </button>
              </div>
            </div>
            
            <div className="table-container" style={{boxShadow: 'none', border: '1px solid #e2e8f0'}}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>NOMOR UNDIAN</th>
                    <th>NAMA</th>
                    <th>UNIT</th>
                    <th>STATUS</th>
                    <th>HADIAH</th>
                  </tr>
                </thead>
                <tbody>
                  {draw.winners && (Array.isArray(draw.winners) ? draw.winners : Object.values(draw.winners)).map((row, idx) => (
                    <tr key={idx}>
                      <td className="font-bold">{row.nomor}</td>
                      <td className="font-semibold">{row.namaLengkap || 'Tanpa Nama'}</td>
                      <td className="text-gray">{row.unit || '-'}</td>
                      <td className="text-gray">{row.statusPegawai || row.statusKepegawaian || '-'}</td>
                      <td className="font-semibold">{row.wonPrize ? getDisplayPrizeName(row.wonPrize.name, row.wonPrize.tier || draw.tier) : getDisplayPrizeName(draw.prizeName, draw.tier)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {filteredDraws.length === 0 && (
          <div className="empty-draws" style={{textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', color: '#64748b'}}>
            Belum ada riwayat undian yang tersimpan.
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
