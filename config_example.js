// =====================================================================
// TEMPLATE KONFIGURASI AMAN UNTUK GITHUB
// Salin file ini menjadi "config.js" di komputer lokal Anda dan isi key-nya.
// Jangan pernah mengunggah file "config.js" ke repository publik!
// =====================================================================

window.NUTRIFIND_CONFIG = {
    // Masukkan Gemini API Key Anda dari Google AI Studio (https://aistudio.google.com/)
    GEMINI_API_KEY: "MASUKKAN_GEMINI_API_KEY_ANDA_DI_SINI",

    // (Opsional) Konfigurasi Firebase Firestore jika ingin menyimpan akun secara cloud
    APP_ID: "nutrifind-production",
    FIREBASE_CONFIG: {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: ""
    }
};