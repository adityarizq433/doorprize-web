import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import './Attendance.css';

const Attendance = () => {
  const formUrl = window.location.origin + '/absen';
  const [pesertaCount, setPesertaCount] = useState(0);

  useEffect(() => {
    const participantsRef = ref(db, 'participants');
    const unsubscribe = onValue(participantsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPesertaCount(Object.keys(data).length);
      } else {
        setPesertaCount(0);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="attendance-page">
      <div className="attendance-card">
        <h1 className="attendance-title">Scan untuk Absensi</h1>
        <p className="attendance-subtitle">
          Arahkan kamera ke QR code untuk melakukan absensi dan mendapatkan nomor undian.
        </p>

        <div className="qr-box">
          <QRCodeSVG
            value={formUrl}
            size={220}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"M"}
            includeMargin={true}
          />
        </div>

        <div className="peserta-badge">
          <div className="badge-dot"></div>
          Total Peserta: <span className="badge-count">{pesertaCount}</span>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
