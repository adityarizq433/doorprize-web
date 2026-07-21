# Doorprize Web Application 🎉

Aplikasi web interaktif untuk memanajemen kehadiran peserta dan sistem pengundian (*lucky draw*) acara. Dirancang dengan antarmuka yang modern, reaktif, dan terintegrasi langsung dengan **Firebase Realtime Database**.

## 🌟 Fitur Utama
1. **Form Kehadiran (Absensi)**
   - Peserta mengisi data diri (Nama, NIK, Unit, Status Pegawai).
   - Generate Nomor Undian secara otomatis.
   - Fitur simpan/download e-Ticket ke HP peserta.
2. **Sistem Pengundian (Spin)**
   - Roda putar (Spin Wheel) animasi interaktif untuk Doorprize reguler.
   - Animasi *slot machine* mewah khusus untuk Grand Prize.
3. **Dashboard Admin Real-time**
   - Statistik jumlah kehadiran secara *real-time*.
   - Grafik kehadiran peserta per Unit/Divisi.
   - Manajemen stok hadiah (Import/Export data hadiah via CSV).
4. **Riwayat Pemenang**
   - Daftar pemenang dikelompokkan berdasarkan setiap sesi putaran.
   - Export laporan data pemenang ke format **PDF** dan **CSV**.

## 💻 Teknologi yang Digunakan
- **Frontend Framework:** [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Database & Auth:** [Firebase Realtime Database](https://firebase.google.com/) & Firebase Authentication
- **Routing:** React Router DOM
- **Grafik:** Recharts
- **PDF Generation:** jsPDF & jsPDF-AutoTable
- **Styling:** CSS3 (Custom Design System + Glassmorphism)

## 🚀 Cara Menjalankan Project (Lokal)

Pastikan Anda sudah menginstal **Node.js** di komputer Anda.

1. **Install dependensi / library:**
   ```bash
   npm install
   ```

2. **Jalankan server *development*:**
   ```bash
   npm run dev
   ```
   *Buka link (biasanya `http://localhost:5173`) di browser Anda.*

3. **Build untuk produksi (Deploy):**
   ```bash
   npm run build
   ```

## 📦 Panduan Deploy ke Firebase Hosting
Aplikasi ini sudah dikonfigurasi untuk Firebase Hosting.
```bash
# Pastikan Anda sudah login ke Firebase CLI
firebase login

# Lakukan Build
npm run build

# Deploy khusus halaman web
firebase deploy --only hosting
```

---
*Dikembangkan secara khusus untuk menyukseskan jalannya acara pengundian dengan lancar, cepat, dan transparan.*
