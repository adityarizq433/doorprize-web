import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';
import './Attendance.css';

const Attendance = () => {
  const formUrl = window.location.origin + '/absen';
  const [pesertaCount, setPesertaCount] = useState(0);
  const qrRef = useRef(null);

  useEffect(() => {
    const participantsRef = collection(db, 'participants');
    const unsubscribe = onSnapshot(participantsRef, (snapshot) => {
      setPesertaCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);

  const handleDownloadQR = async () => {
    if (qrRef.current) {
      try {
        const canvas = await html2canvas(qrRef.current, { backgroundColor: '#ffffff', scale: 4 });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `QRCode_Absensi.png`;
        link.click();
      } catch (err) {
        console.error("Gagal mendownload QR:", err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Gagal mendownload QR Code.' });
      }
    }
  };

  return (
    <div className="attendance-page">
      <div className="attendance-card">
        <h1 className="attendance-title">Scan untuk Absensi</h1>
        <p className="attendance-subtitle">
          Arahkan kamera ke QR code untuk melakukan absensi dan mendapatkan nomor undian.
        </p>

        <div className="qr-box" ref={qrRef}>
          <QRCodeSVG
            value={formUrl}
            size={220}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"M"}
            includeMargin={true}
          />
        </div>

        <button onClick={handleDownloadQR} className="btn-download-qr">
          <Download size={18} />
          Unduh QR Code
        </button>

        <div className="peserta-badge">
          <div className="badge-dot"></div>
          Total Peserta: <span className="badge-count">{pesertaCount}</span>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
