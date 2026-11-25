# 🍗🌿 NutriFind AI — Smart Food Scanner & Nutrition Tracker

**NutriFind AI** adalah aplikasi web pelacak gizi dan pemindai makanan berbasis kecerdasan buatan (**Google Gemini Vision API**) dengan tampilan editorial modern bergaya *neo-brutalism* dalam balutan palet warna **Mint Green** & **Aqua Cyan**.

Cukup unggah foto atau jepret makanan langsung dari kamera untuk mendapatkan estimasi kalori, makronutrisi, persentase kebutuhan harian (**% Daily Value** mikronutrisi), hingga memantau progres berat badan dan kalender gizi harian.

---

## ✨ Fitur Utama

1. **🤖 AI Food Scanner (Vision Analysis)**
   - Deteksi otomatis nama hidangan, estimasi porsi, total kalori, dan daftar bahan makanan dari foto (unggah file, *drag-and-drop*, atau kamera langsung).
   - Dilengkapi **3 Contoh Menu Uji Cepat** (*Nasi Goreng Spesial*, *Salad Ayam Alpukat*, dan *Salmon Bowl*) untuk simulasi instan tanpa perlu kunci API.
2. **🔬 Rincian Makronutrisi & Mikronutrisi (% Daily Value)**
   - Menghitung **Protein, Karbohidrat, Lemak, dan Serat** beserta persentase Angka Kecukupan Gizi (**% DV**).
   - Melacak 6 mikronutrisi penting (**Vitamin A, Vitamin C, Kalsium, Zat Besi, Natrium, dan Kalium**) lengkap dengan indikator peringatan untuk kadar natrium tinggi.
3. **⚖️ Kalkulator BMI & Penyesuaian Kalori (Opsional)**
   - Menghitung skor **BMI** dan kebutuhan kalori harian (**TDEE**) berdasarkan usia, tinggi, berat badan, tingkat aktivitas, serta tujuan (*turunkan berat*, *pertahankan*, atau *naikkan massa otot*), dengan opsi **Lewati (Skip)** ke standar 2.000 kkal/hari.
4. **📈 Pelacak Berat Badan & Grafik Tren**
   - Mencatat perubahan berat badan harian, menampilkan persentase progres menuju target berat ideal, serta memvisualisasikannya dalam grafik garis interaktif.
5. **📅 Kalender Gizi Bulanan**
   - Menampilkan ringkasan pencapaian kalori di setiap tanggal dengan kode warna status target (*tercapai*, *di bawah target*, atau *melebihi target*).
6. **🌓 Light Mode & Dark Mode + Autentikasi**
   - Dilengkapi pengalih tema **Light Mode** dan **Dark Mode**, sistem login/daftar akun email, dukungan sinkronisasi **Firebase Firestore**, serta **Akun Demo** (`demo@nutrifind.id` / `demo123`).

---

## 🛠️ Teknologi yang Digunakan

- **Frontend:** HTML5, CSS3 (Custom Neo-Brutalism & Animasi), Tailwind CSS (CDN)
- **Tipografi:** Google Fonts (*Fredoka*, *Syne*, & *Plus Jakarta Sans*)
- **AI Engine:** Google Gemini API (`gemini-3-flash-preview`)
- **Database & Auth (Opsional):** Firebase Authentication & Cloud Firestore (dengan *fallback* penyimpanan sesi lokal)

---

## 📂 Struktur Proyek

```text
Nutrifind/
├── index.html          # Kerangka utama halaman web & modal interaktif
├── style.css           # Gaya kustom, tema Light/Dark Mode, dan animasi
├── app.js              # Logika kamera, Gemini API, BMI, grafik & kalender
├── config.example.js   # Template konfigurasi API (aman untuk publik)
├── .gitignore          # Mencegah file sensitif ikut terunggah ke GitHub
└── README.md           # Dokumentasi proyek
```

---

## 🚀 Cara Menjalankan Secara Lokal

1. **Clone repository ini:**
   ```bash
   git clone https://github.com/Seathhh/Nutrifind.git
   cd Nutrifind
   ```
2. **Siapkan file konfigurasi rahasia:**
   - Salin file `config.example.js` menjadi `config.js`.
   - Buka `config.js` dan masukkan **Gemini API Key** Anda dari [Google AI Studio](https://aistudio.google.com/):
     ```javascript
     window.NUTRIFIND_CONFIG = {
         GEMINI_API_KEY: "MASUKKAN_API_KEY_ANDA_DI_SINI",
         APP_ID: "nutrifind-local",
         FIREBASE_CONFIG: null
     };
     ```
   - *(File `config.js` sudah otomatis diabaikan oleh `.gitignore` sehingga aman dan tidak akan ikut ter-push ke GitHub).*
3. **Jalankan di browser:**
   - Buka `index.html` menggunakan ekstensi **Live Server** di VS Code atau server lokal lainnya (`npx serve .`).
   - Klik tombol **"Masuk dengan Akun Demo"** untuk langsung mencoba seluruh fitur dengan data contoh yang sudah tersedia.

---

## 📄 Lisensi

Proyek ini dibuat untuk tujuan edukasi, eksplorasi AI Vision, dan pengembangan portofolio aplikasi web kesehatan.