import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// =====================================================================
// 0. INISIALISASI CLOUD DATABASE (FIRESTORE) & PENGATURAN API KEY
// =====================================================================
const ENV_CONFIG = window.NUTRIFIND_CONFIG || {};
const STORAGE_KEY_GEMINI = "nutrifind_custom_gemini_api_key";

function getActiveGeminiKey() {
    const savedLocal = localStorage.getItem(STORAGE_KEY_GEMINI);
    if (savedLocal && savedLocal.trim()) return savedLocal.trim();
    if (ENV_CONFIG.GEMINI_API_KEY && ENV_CONFIG.GEMINI_API_KEY.trim()) return ENV_CONFIG.GEMINI_API_KEY.trim();
    return "";
}

function updateApiKeyBadges() {
    const hasKey = Boolean(getActiveGeminiKey());
    document.querySelectorAll('.api-status-label').forEach(el => {
        el.textContent = hasKey ? "AI AKTIF ✓" : "API KEY";
    });
    const scannerBadge = document.getElementById('scanner-ai-badge');
    if (scannerBadge) {
        scannerBadge.textContent = hasKey ? "GEMINI AI AKTIF ✦" : "MODE SIMULASI ✦";
        scannerBadge.className = hasKey
            ? "absolute -top-3.5 -right-3 bg-[#7BF1C7] hover:bg-[#34D399] border-2 border-[#0B0F17] shadow-[2px_2px_0px_#0B0F17] px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-[#0B0F17] rotate-3 transition-transform hover:scale-105"
            : "absolute -top-3.5 -right-3 bg-[#22D3EE] hover:bg-[#06B6D4] border-2 border-[#0B0F17] shadow-[2px_2px_0px_#0B0F17] px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-[#0B0F17] rotate-3 transition-transform hover:scale-105";
    }
}

function openApiKeyModal() {
    const modal = document.getElementById('apikey-modal');
    const input = document.getElementById('custom-gemini-key-input');
    if (input) input.value = getActiveGeminiKey();
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeApiKeyModal() {
    const modal = document.getElementById('apikey-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function saveCustomApiKey() {
    const input = document.getElementById('custom-gemini-key-input');
    const val = input ? input.value.trim() : "";
    if (!val) {
        showToast("Masukkan Gemini API Key terlebih dahulu.", "error");
        return;
    }
    localStorage.setItem(STORAGE_KEY_GEMINI, val);
    updateApiKeyBadges();
    closeApiKeyModal();
    showToast("Gemini API Key tersimpan! Pemindaian AI nyata kini aktif.", "success");
}

function clearCustomApiKey() {
    localStorage.removeItem(STORAGE_KEY_GEMINI);
    const input = document.getElementById('custom-gemini-key-input');
    if (input) input.value = "";
    updateApiKeyBadges();
    closeApiKeyModal();
    showToast("API Key dihapus. Kembali ke mode simulasi.", "info");
}

const appId = ENV_CONFIG.APP_ID || (typeof __app_id !== 'undefined' ? __app_id : 'nutrifind-default-app');
let db = null;
let auth = null;
let firebaseUser = null;
let isCloudReady = false;

async function initCloudDatabase() {
    updateApiKeyBadges();
    const statusTextEl = document.getElementById('auth-db-status-text');
    const headerDbEl = document.getElementById('header-db-indicator');
    try {
        const rawFirebaseConfig = ENV_CONFIG.FIREBASE_CONFIG || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null);
        if (rawFirebaseConfig && rawFirebaseConfig.apiKey) {
            const app = initializeApp(rawFirebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);

            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                const cred = await signInWithCustomToken(auth, __initial_auth_token);
                firebaseUser = cred.user;
            } else {
                const cred = await signInAnonymously(auth);
                firebaseUser = cred.user;
            }

            if (firebaseUser) {
                isCloudReady = true;
                if (statusTextEl) statusTextEl.textContent = "CLOUD DB TERHUBUNG";
                if (headerDbEl) headerDbEl.textContent = "CLOUD SYNC ●";
            }
        } else {
            if (statusTextEl) statusTextEl.textContent = "MODE MEMORI LOKAL";
            if (headerDbEl) headerDbEl.textContent = "LOCAL SESSION";
        }
    } catch (err) {
        console.warn("Cloud DB fallback ke memori lokal:", err);
        if (statusTextEl) statusTextEl.textContent = "MODE MEMORI LOKAL";
        if (headerDbEl) headerDbEl.textContent = "LOCAL SESSION";
    }
}

function emailToDocId(email) {
    return email.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '_');
}

async function fetchAccountFromCloud(email) {
    if (!isCloudReady || !db || !firebaseUser) return null;
    try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'nutrifind_accounts', emailToDocId(email));
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data() : null;
    } catch (err) {
        return null;
    }
}

async function syncCurrentUserToCloud() {
    const user = getCurrentUser();
    if (!user || !isCloudReady || !db || !firebaseUser) return;
    try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'nutrifind_accounts', emailToDocId(user.email));
        await setDoc(docRef, {
            ...user,
            updatedAt: new Date().toISOString()
        });
    } catch (err) {
        console.warn("Gagal sinkronisasi ke Cloud DB:", err);
    }
}

// =====================================================================
// PENGELOLA TEMA LIGHT & DARK MODE
// =====================================================================
function applyTheme(themeName) {
    const isDark = themeName === 'dark';
    appState.theme = isDark ? 'dark' : 'light';
    document.body.classList.toggle('dark-theme', isDark);

    document.querySelectorAll('.theme-toggle-icon').forEach(el => {
        el.textContent = isDark ? '☀️' : '🌙';
    });
    document.querySelectorAll('.theme-toggle-label').forEach(el => {
        el.textContent = isDark ? 'LIGHT' : 'DARK';
    });

    if (appState.currentUserEmail) {
        renderWeightTracker();
    }
}

function toggleTheme() {
    const nextTheme = appState.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);

    const user = getCurrentUser();
    if (user) {
        user.preferredTheme = nextTheme;
        syncCurrentUserToCloud();
    }
    showToast(`Tema diubah ke ${nextTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}`, 'info');
}

// =====================================================================
// 1. REFERENSI DAILY VALUE (AKG HARIAN) & TANGGAL
// =====================================================================
const GEMINI_MODEL = "gemini-3-flash-preview";

const DAILY_VALUE_STANDARDS = {
    protein: { label: "Protein", unit: "g", dv: 50 },
    carbs: { label: "Karbohidrat", unit: "g", dv: 275 },
    fat: { label: "Lemak Total", unit: "g", dv: 65 },
    fiber: { label: "Serat Pangan", unit: "g", dv: 28 },
    vitaminA: { label: "Vitamin A", unit: "mcg", dv: 900 },
    vitaminC: { label: "Vitamin C", unit: "mg", dv: 90 },
    calcium: { label: "Kalsium", unit: "mg", dv: 1000 },
    iron: { label: "Zat Besi", unit: "mg", dv: 18 },
    sodium: { label: "Natrium (Sodium)", unit: "mg", dv: 2300 },
    potassium: { label: "Kalium", unit: "mg", dv: 3500 }
};

function getLocalDateStr(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function shiftDateStr(baseDateStr, deltaDays) {
    const [y, m, d] = baseDateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + deltaDays);
    return getLocalDateStr(dt);
}

function formatIndoDate(dateStr) {
    const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${d} ${bulan[m - 1]} ${y}`;
}

const TODAY_STR = getLocalDateStr(new Date());

// =====================================================================
// 2. DATA AKUN DEMO & STATE APLIKASI
// =====================================================================
const inMemoryUsers = {
    "demo@nutrifind.id": {
        email: "demo@nutrifind.id",
        password: "demo123",
        name: "Raka Pratama (Demo)",
        calorieTarget: 1950,
        preferredTheme: "light",
        bmiProfile: {
            gender: "male",
            age: 26,
            height: 172,
            weight: 68.5,
            targetWeight: 64.0,
            activity: 1.375,
            goal: "lose",
            bmi: 23.2,
            category: "Normal"
        },
        foodLogs: {
            [TODAY_STR]: [
                {
                    id: "f-today-1",
                    name: "Oatmeal Pisang & Kacang Almond",
                    portion: "1 Mangkuk (280g)",
                    time: "07:30",
                    calories: 410,
                    protein: 14,
                    carbs: 58,
                    fat: 13,
                    fiber: 8.5,
                    micros: { vitaminA: 45, vitaminC: 12, calcium: 180, iron: 3.4, sodium: 120, potassium: 540 }
                },
                {
                    id: "f-today-2",
                    name: "Dada Ayam Panggang & Nasi Merah",
                    portion: "1 Porsi (360g)",
                    time: "12:15",
                    calories: 560,
                    protein: 44,
                    carbs: 62,
                    fat: 12,
                    fiber: 5.2,
                    micros: { vitaminA: 190, vitaminC: 24, calcium: 85, iron: 2.8, sodium: 480, potassium: 690 }
                }
            ],
            [shiftDateStr(TODAY_STR, -1)]: [
                {
                    id: "f-yest-1",
                    name: "Nasi Goreng Spesial Telur",
                    portion: "1 Piring (350g)",
                    time: "08:00",
                    calories: 620,
                    protein: 24,
                    carbs: 68,
                    fat: 24,
                    fiber: 4.5,
                    micros: { vitaminA: 210, vitaminC: 14, calcium: 95, iron: 3.1, sodium: 980, potassium: 420 }
                },
                {
                    id: "f-yest-2",
                    name: "Gado-Gado Lontong Lengkap",
                    portion: "1 Porsi (400g)",
                    time: "13:00",
                    calories: 580,
                    protein: 22,
                    carbs: 64,
                    fat: 26,
                    fiber: 9.0,
                    micros: { vitaminA: 340, vitaminC: 38, calcium: 210, iron: 4.2, sodium: 610, potassium: 780 }
                }
            ]
        },
        weightHistory: [
            { date: shiftDateStr(TODAY_STR, -14), weight: 71.0, note: "Awal mulai program" },
            { date: shiftDateStr(TODAY_STR, -10), weight: 70.3, note: "Kurangi minuman manis" },
            { date: shiftDateStr(TODAY_STR, -7), weight: 69.8, note: "Rutin jalan pagi 30 menit" },
            { date: shiftDateStr(TODAY_STR, -3), weight: 69.1, note: "Pagi setelah bangun" },
            { date: TODAY_STR, weight: 68.5, note: "Turun stabil!" }
        ],
        targetWeight: 64.0
    }
};

let appState = {
    currentUserEmail: null,
    authMode: 'login',
    activeView: 'scanner',
    theme: 'light',
    activeScanDate: TODAY_STR,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),
    selectedCalendarDate: TODAY_STR,
    lastScanResult: null,
    cameraStream: null
};

function getCurrentUser() {
    return appState.currentUserEmail ? inMemoryUsers[appState.currentUserEmail] : null;
}

// =====================================================================
// 3. SISTEM NOTIFIKASI TOAST
// =====================================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    
    const styles = {
        success: 'bg-[#6EE7B7] text-[#0F172A] border-[#0F172A]',
        error: 'bg-rose-500 text-white border-[#0F172A]',
        info: 'bg-[#CFFAFE] text-[#0F172A] border-[#0F172A]'
    };
    const icons = { success: '✨', error: '⚠️', info: '💡' };

    toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-[4px_4px_0px_#0F172A] border-2 text-xs sm:text-sm font-extrabold animate-fade-in ${styles[type] || styles.success}`;
    toast.innerHTML = `<span>${icons[type] || '✨'}</span><span class="flex-1">${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 260);
    }, 3400);
}

// =====================================================================
// 4. LOGIN & DAFTAR AKUN
// =====================================================================
function switchAuthTab(mode) {
    appState.authMode = mode;
    const loginBtn = document.getElementById('tab-login-btn');
    const regBtn = document.getElementById('tab-register-btn');
    const nameGroup = document.getElementById('register-name-group');
    const submitBtn = document.getElementById('auth-submit-btn');
    const errBox = document.getElementById('auth-error');

    errBox.classList.add('hidden');

    if (mode === 'login') {
        loginBtn.className = "py-2 text-xs font-extrabold uppercase tracking-wider rounded-full bg-[#7BF1C7] text-[#0B0F17] border-2 border-[#0B0F17] transition-all";
        regBtn.className = "py-2 text-xs font-extrabold uppercase tracking-wider rounded-full text-[#0B0F17]/70 hover:text-[#0B0F17] transition-all";
        nameGroup.classList.add('hidden');
        submitBtn.textContent = "SIAP MULAI? MASUK SEKARANG! →";
    } else {
        regBtn.className = "py-2 text-xs font-extrabold uppercase tracking-wider rounded-full bg-[#7BF1C7] text-[#0B0F17] border-2 border-[#0B0F17] transition-all";
        loginBtn.className = "py-2 text-xs font-extrabold uppercase tracking-wider rounded-full text-[#0B0F17]/70 hover:text-[#0B0F17] transition-all";
        nameGroup.classList.remove('hidden');
        submitBtn.textContent = "BUAT AKUN & LANJUTKAN 🚀";
    }
}

function togglePasswordVisibility() {
    const pwdInput = document.getElementById('auth-password');
    pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = document.getElementById('auth-password').value;
    const nameInput = document.getElementById('auth-name').value.trim();
    const errBox = document.getElementById('auth-error');
    const errText = document.getElementById('auth-error-text');
    const submitBtn = document.getElementById('auth-submit-btn');

    errBox.classList.add('hidden');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "MEMPROSES AKUN...";

    try {
        const cloudAccount = await fetchAccountFromCloud(email);
        if (cloudAccount) {
            inMemoryUsers[email] = cloudAccount;
        }

        if (appState.authMode === 'login') {
            const user = inMemoryUsers[email];
            if (!user || user.password !== password) {
                errText.textContent = "Email tidak ditemukan atau kata sandi salah.";
                errBox.classList.remove('hidden');
                return;
            }
            completeLogin(email, false);
        } else {
            if (inMemoryUsers[email]) {
                errText.textContent = "Email ini sudah terdaftar. Silakan masuk (Login).";
                errBox.classList.remove('hidden');
                return;
            }
            const displayName = nameInput || email.split('@')[0];
            inMemoryUsers[email] = {
                email,
                password,
                name: displayName,
                calorieTarget: 2000,
                preferredTheme: appState.theme,
                bmiProfile: null,
                foodLogs: {},
                weightHistory: [],
                targetWeight: 60.0
            };
            appState.currentUserEmail = email;
            await syncCurrentUserToCloud();
            completeLogin(email, true);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

async function loginWithDemoAccount() {
    const demoEmail = "demo@nutrifind.id";
    document.getElementById('auth-email').value = demoEmail;
    document.getElementById('auth-password').value = "demo123";

    const cloudDemo = await fetchAccountFromCloud(demoEmail);
    if (cloudDemo) {
        inMemoryUsers[demoEmail] = cloudDemo;
    } else {
        appState.currentUserEmail = demoEmail;
        await syncCurrentUserToCloud();
    }
    completeLogin(demoEmail, false);
}

function completeLogin(email, isNewUser) {
    appState.currentUserEmail = email;
    appState.activeScanDate = TODAY_STR;
    appState.selectedCalendarDate = TODAY_STR;

    const user = getCurrentUser();
    if (user && user.preferredTheme) {
        applyTheme(user.preferredTheme);
    }

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('wt-input-date').value = TODAY_STR;

    refreshAllUI();
    showToast(`Selamat datang, ${user.name}!`, 'success');

    if (isNewUser) {
        openBmiModal();
    }
}

function handleLogout() {
    stopCamera();
    appState.currentUserEmail = null;
    appState.lastScanResult = null;
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    showToast("Anda telah keluar dari akun.", "info");
}

// =====================================================================
// 5. KALKULATOR BMI & TARGET KALORI
// =====================================================================
function openBmiModal() {
    const user = getCurrentUser();
    if (user && user.bmiProfile) {
        document.getElementById('bmi-gender').value = user.bmiProfile.gender;
        document.getElementById('bmi-age').value = user.bmiProfile.age;
        document.getElementById('bmi-height').value = user.bmiProfile.height;
        document.getElementById('bmi-weight').value = user.bmiProfile.weight;
        document.getElementById('bmi-target-weight').value = user.bmiProfile.targetWeight || user.targetWeight;
        document.getElementById('bmi-activity').value = user.bmiProfile.activity;
        document.getElementById('bmi-goal').value = user.bmiProfile.goal;
    }
    recalculateBmiPreview();
    const modal = document.getElementById('bmi-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function skipOrCloseBmiModal() {
    const modal = document.getElementById('bmi-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    refreshHeaderSummary();
    showToast("Menggunakan target standar 2.000 kkal/hari.", "info");
}

function computeBmiAndCalories() {
    const gender = document.getElementById('bmi-gender').value;
    const age = parseFloat(document.getElementById('bmi-age').value) || 25;
    const heightCm = parseFloat(document.getElementById('bmi-height').value) || 170;
    const weightKg = parseFloat(document.getElementById('bmi-weight').value) || 65;
    const targetWeight = parseFloat(document.getElementById('bmi-target-weight').value) || weightKg;
    const activity = parseFloat(document.getElementById('bmi-activity').value) || 1.375;
    const goal = document.getElementById('bmi-goal').value;

    const heightM = heightCm / 100;
    const bmi = +(weightKg / (heightM * heightM)).toFixed(1);

    let category = "Normal";
    let badgeClass = "bg-emerald-100 text-emerald-800";
    if (bmi < 18.5) {
        category = "Kurus (Underweight)";
        badgeClass = "bg-amber-100 text-amber-800";
    } else if (bmi >= 25 && bmi < 30) {
        category = "Gemuk (Overweight)";
        badgeClass = "bg-orange-100 text-orange-800";
    } else if (bmi >= 30) {
        category = "Obesitas";
        badgeClass = "bg-rose-100 text-rose-800";
    }

    let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    bmr += (gender === 'male') ? 5 : -161;

    let tdee = bmr * activity;
    if (goal === 'lose') tdee -= 400;
    if (goal === 'gain') tdee += 350;

    const recommendedCalories = Math.max(1200, Math.round(tdee / 10) * 10);

    return {
        gender, age, height: heightCm, weight: weightKg, targetWeight,
        activity, goal, bmi, category, badgeClass, recommendedCalories
    };
}

function recalculateBmiPreview() {
    const calc = computeBmiAndCalories();
    document.getElementById('preview-bmi-score').textContent = calc.bmi;
    const badge = document.getElementById('preview-bmi-badge');
    badge.textContent = calc.category;
    badge.className = `px-2 py-0.5 rounded-full text-xs font-semibold ${calc.badgeClass}`;
    document.getElementById('preview-kcal-target').textContent = calc.recommendedCalories.toLocaleString('id-ID');
}

async function saveBmiProfile() {
    const user = getCurrentUser();
    if (!user) return;

    const calc = computeBmiAndCalories();
    user.bmiProfile = calc;
    user.calorieTarget = calc.recommendedCalories;
    user.targetWeight = calc.targetWeight;

    const hasTodayWeight = user.weightHistory.some(w => w.date === TODAY_STR);
    if (!hasTodayWeight) {
        user.weightHistory.push({
            date: TODAY_STR,
            weight: calc.weight,
            note: "Data awal profil BMI"
        });
    }

    const modal = document.getElementById('bmi-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    await syncCurrentUserToCloud();
    refreshAllUI();
    showToast(`Target disesuaikan ke ${calc.recommendedCalories.toLocaleString('id-ID')} kkal/hari (BMI ${calc.bmi})!`, 'success');
}

// =====================================================================
// 6. NAVIGASI TAB & SINKRONISASI UI
// =====================================================================
function switchMainView(viewName) {
    appState.activeView = viewName;
    ['scanner', 'weight', 'calendar'].forEach(v => {
        const viewEl = document.getElementById(`view-${v}`);
        const tabEl = document.getElementById(`nav-tab-${v}`);
        if (v === viewName) {
            viewEl.classList.remove('hidden');
            tabEl.className = "nav-tab-btn px-5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#7BF1C7] text-[#0B0F17] border-2 border-[#0B0F17] shadow-[3px_3px_0px_#0B0F17] flex items-center gap-2 whitespace-nowrap transition-all";
        } else {
            viewEl.classList.add('hidden');
            tabEl.className = "nav-tab-btn px-5 py-2 rounded-full text-xs font-extrabold uppercase tracking-wider bg-white text-[#0B0F17] border-2 border-transparent hover:border-[#0B0F17] flex items-center gap-2 whitespace-nowrap transition-all";
        }
    });

    if (viewName === 'weight') renderWeightTracker();
    if (viewName === 'calendar') renderCalendarView();
}

function refreshAllUI() {
    refreshHeaderSummary();
    updateActiveDateDisplay();
    renderDailyFoodLog();
    renderWeightTracker();
    renderCalendarView();
}

function refreshHeaderSummary() {
    const user = getCurrentUser();
    if (!user) return;

    document.getElementById('header-user-name').textContent = user.name;
    const todayLogs = user.foodLogs[TODAY_STR] || [];
    const consumedToday = todayLogs.reduce((sum, item) => sum + (item.calories || 0), 0);
    const target = user.calorieTarget || 2000;

    document.getElementById('header-cal-consumed').textContent = consumedToday.toLocaleString('id-ID');
    document.getElementById('header-cal-target').textContent = target.toLocaleString('id-ID');

    const pct = Math.min(100, Math.round((consumedToday / target) * 100));
    const bar = document.getElementById('header-cal-bar');
    bar.style.width = `${pct}%`;
    bar.className = consumedToday > target ? "h-full bg-amber-400 transition-all duration-500" : "h-full bg-gradient-to-r from-[#6EE7B7] to-[#22D3EE] transition-all duration-500";

    const bmiPill = document.getElementById('header-bmi-pill');
    bmiPill.textContent = user.bmiProfile ? `BMI ${user.bmiProfile.bmi}` : `Atur BMI`;
}

function updateActiveDateDisplay() {
    const picker = document.getElementById('active-date-picker');
    const label = document.getElementById('active-date-label');
    const subLabel = document.getElementById('log-subtitle-date');
    picker.value = appState.activeScanDate;

    const isToday = appState.activeScanDate === TODAY_STR;
    const formatted = formatIndoDate(appState.activeScanDate);
    label.textContent = isToday ? `Hari Ini (${formatted})` : formatted;
    subLabel.textContent = `Daftar makanan & mikronutrisi pada ${formatted}`;
}

function changeActiveDate(newDateStr) {
    if (!newDateStr) return;
    appState.activeScanDate = newDateStr;
    updateActiveDateDisplay();
    renderDailyFoodLog();
}

function resetToToday() {
    appState.activeScanDate = TODAY_STR;
    updateActiveDateDisplay();
    renderDailyFoodLog();
}

// =====================================================================
// 7. KAMERA, UNGGAH FOTO & GEMINI VISION API
// =====================================================================
function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('dropzone').classList.add('border-emerald-500', 'bg-emerald-50/50');
}

function handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('dropzone').classList.remove('border-emerald-500', 'bg-emerald-50/50');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('dropzone').classList.remove('border-emerald-500', 'bg-emerald-50/50');
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
        processUploadedImageFile(file);
    } else {
        showToast("Harap unggah file gambar (JPG/PNG/WebP).", "error");
    }
}

function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
        processUploadedImageFile(file);
    }
}

function processUploadedImageFile(file) {
    stopCamera();
    const reader = new FileReader();
    reader.onload = function(evt) {
        const dataUrl = evt.target.result;
        displayPreviewImage(dataUrl);
        const base64Data = dataUrl.split(',')[1];
        analyzeFoodImageWithGemini(base64Data, file.type || 'image/jpeg', null);
    };
    reader.readAsDataURL(file);
}

function displayPreviewImage(dataUrl) {
    const img = document.getElementById('food-preview-img');
    const placeholder = document.getElementById('scanner-placeholder');
    const video = document.getElementById('camera-video');

    video.classList.add('hidden');
    placeholder.classList.add('hidden');
    img.src = dataUrl;
    img.classList.remove('hidden');
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        appState.cameraStream = stream;
        const video = document.getElementById('camera-video');
        video.srcObject = stream;

        document.getElementById('scanner-placeholder').classList.add('hidden');
        document.getElementById('food-preview-img').classList.add('hidden');
        video.classList.remove('hidden');

        document.getElementById('default-scan-controls').classList.add('hidden');
        document.getElementById('camera-active-controls').classList.remove('hidden');
    } catch (err) {
        showToast("Kamera tidak dapat diakses. Gunakan Unggah Foto atau Contoh Makanan.", "error");
    }
}

function stopCamera() {
    if (appState.cameraStream) {
        appState.cameraStream.getTracks().forEach(t => t.stop());
        appState.cameraStream = null;
    }
    document.getElementById('camera-video').classList.add('hidden');
    document.getElementById('camera-active-controls').classList.add('hidden');
    document.getElementById('default-scan-controls').classList.remove('hidden');
}

function capturePhotoFromCamera() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('helper-canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    displayPreviewImage(dataUrl);
    analyzeFoodImageWithGemini(dataUrl.split(',')[1], 'image/jpeg', null);
}

const PRESET_FOOD_DATA = {
    nasgor: {
        name: "Nasi Goreng Spesial Telur & Ayam",
        portion: "1 Piring (350g)",
        calories: 620,
        protein: 24,
        carbs: 68,
        fat: 24,
        fiber: 4.5,
        micros: { vitaminA: 210, vitaminC: 14, calcium: 95, iron: 3.1, sodium: 980, potassium: 420 },
        ingredients: ["Nasi Putih", "Telur Mata Sapi", "Suwiran Ayam", "Kecap Manis", "Mentimun & Tomat"],
        advice: "Kaya energi dan protein, namun kandungan natrium cukup tinggi (43% DV). Imbangi dengan minum air putih cukup dan tambah sayuran segar."
    },
    salad: {
        name: "Salad Dada Ayam Panggang & Alpukat",
        portion: "1 Mangkuk Besar (310g)",
        calories: 380,
        protein: 34,
        carbs: 18,
        fat: 19,
        fiber: 8.2,
        micros: { vitaminA: 420, vitaminC: 48, calcium: 115, iron: 2.9, sodium: 340, potassium: 890 },
        ingredients: ["Dada Ayam Panggang", "Alpukat Segar", "Selada Romaine", "Tomat Ceri", "Minyak Zaitun"],
        advice: "Pilihan tinggi protein dan serat dengan lemak sehat tak jenuh tunggal. Sangat ideal untuk mendukung program penurunan berat badan."
    },
    salmon: {
        name: "Salmon Teriyaki Rice Bowl & Edamame",
        portion: "1 Mangkuk (380g)",
        calories: 510,
        protein: 35,
        carbs: 54,
        fat: 16,
        fiber: 5.6,
        micros: { vitaminA: 260, vitaminC: 22, calcium: 130, iron: 2.7, sodium: 640, potassium: 840 },
        ingredients: ["Fillet Salmon", "Nasi Hangat", "Kacang Edamame", "Biji Wijen", "Saus Teriyaki"],
        advice: "Sumber asam lemak Omega-3, kalium, dan protein berkualitas tinggi yang baik untuk pemulihan otot dan kesehatan jantung."
    }
};

function runSampleFoodScan(presetKey) {
    stopCamera();
    const canvas = document.getElementById('helper-canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 480, 360);
    if (presetKey === 'nasgor') {
        grad.addColorStop(0, '#fef3c7');
        grad.addColorStop(1, '#fde68a');
    } else if (presetKey === 'salad') {
        grad.addColorStop(0, '#dcfce7');
        grad.addColorStop(1, '#bbf7d0');
    } else {
        grad.addColorStop(0, '#ffe4e6');
        grad.addColorStop(1, '#fecdd3');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 480, 360);

    ctx.beginPath();
    ctx.arc(240, 180, 125, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = '96px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const emoji = presetKey === 'nasgor' ? '🍳' : (presetKey === 'salad' ? '🥗' : '🍣');
    ctx.fillText(emoji, 240, 175);

    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(PRESET_FOOD_DATA[presetKey].name, 240, 332);

    const dataUrl = canvas.toDataURL('image/png');
    displayPreviewImage(dataUrl);
    analyzeFoodImageWithGemini(dataUrl.split(',')[1], 'image/png', PRESET_FOOD_DATA[presetKey]);
}

async function analyzeFoodImageWithGemini(base64Data, mimeType, fallbackPreset) {
    const overlay = document.getElementById('scanning-overlay');
    overlay.classList.remove('hidden');

    const currentApiKey = getActiveGeminiKey();
    const promptText = `Analisis gambar makanan ini sebagai ahli gizi profesional dalam Bahasa Indonesia. Identifikasi nama makanan, estimasi porsi, kalori, makronutrisi (protein, carbs, fat, fiber dalam gram), serta mikronutrisi (vitaminA dalam mcg, vitaminC dalam mg, calcium dalam mg, iron dalam mg, sodium dalam mg, potassium dalam mg). Berikan juga daftar bahan dan saran nutrisi singkat.`;

    const payload = {
        contents: [{
            role: "user",
            parts: [
                { text: promptText },
                { inlineData: { mimeType, data: base64Data } }
            ]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING" },
                    portion: { type: "STRING" },
                    calories: { type: "NUMBER" },
                    protein: { type: "NUMBER" },
                    carbs: { type: "NUMBER" },
                    fat: { type: "NUMBER" },
                    fiber: { type: "NUMBER" },
                    micros: {
                        type: "OBJECT",
                        properties: {
                            vitaminA: { type: "NUMBER" },
                            vitaminC: { type: "NUMBER" },
                            calcium: { type: "NUMBER" },
                            iron: { type: "NUMBER" },
                            sodium: { type: "NUMBER" },
                            potassium: { type: "NUMBER" }
                        },
                        required: ["vitaminA", "vitaminC", "calcium", "iron", "sodium", "potassium"]
                    },
                    ingredients: { type: "ARRAY", items: { type: "STRING" } },
                    advice: { type: "STRING" }
                },
                required: ["name", "portion", "calories", "protein", "carbs", "fat", "fiber", "micros", "ingredients", "advice"]
            }
        }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${currentApiKey}`;

    let parsedResult = null;
    let apiFailed = false;
    const delays = [1000, 2000];

    if (currentApiKey) {
        for (let attempt = 0; attempt <= delays.length; attempt++) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (rawText) {
                    parsedResult = JSON.parse(rawText);
                    apiFailed = false;
                    break;
                }
            } catch (err) {
                apiFailed = true;
                if (attempt < delays.length) {
                    await new Promise(res => setTimeout(res, delays[attempt]));
                }
            }
        }
    } else {
        await new Promise(res => setTimeout(res, 1100));
    }

    overlay.classList.add('hidden');

    const finalData = parsedResult || fallbackPreset || {
        name: "Hidangan Sehat Seimbang (Mode Simulasi)",
        portion: "1 Porsi (320g)",
        calories: 485,
        protein: 28,
        carbs: 52,
        fat: 16,
        fiber: 6.0,
        micros: { vitaminA: 240, vitaminC: 26, calcium: 135, iron: 3.2, sodium: 520, potassium: 610 },
        ingredients: ["Sumber Protein", "Karbohidrat Kompleks", "Sayuran Hijau", "Rempah Alami"],
        advice: "Klik tombol 🔑 API KEY di atas untuk memasukkan Gemini API Key agar foto Anda dianalisis secara nyata oleh AI."
    };

    appState.lastScanResult = finalData;
    renderScanResultCard(finalData);

    if (!currentApiKey && !fallbackPreset) {
        showToast("Mode simulasi aktif. Klik 🔑 API KEY di atas untuk analisis foto nyata.", "info");
    } else if (apiFailed) {
        showToast("Koneksi Gemini API gagal/key tidak valid, menampilkan data simulasi.", "error");
    } else {
        showToast(`Berhasil memindai: ${finalData.name}`, 'success');
    }
}

// =====================================================================
// 8. RENDER HASIL SCAN & MIKRONUTRISI (% DV)
// =====================================================================
function calcDvPct(key, amount) {
    const std = DAILY_VALUE_STANDARDS[key];
    if (!std) return 0;
    return Math.round(((amount || 0) / std.dv) * 100);
}

function renderScanResultCard(item) {
    document.getElementById('result-empty-state').classList.add('hidden');
    document.getElementById('result-content').classList.remove('hidden');

    document.getElementById('res-food-name').textContent = item.name;
    document.getElementById('res-portion').textContent = item.portion;
    document.getElementById('res-calories').textContent = Math.round(item.calories).toLocaleString('id-ID');

    const proDv = calcDvPct('protein', item.protein);
    const carbDv = calcDvPct('carbs', item.carbs);
    const fatDv = calcDvPct('fat', item.fat);
    const fibDv = calcDvPct('fiber', item.fiber);

    document.getElementById('res-protein').textContent = item.protein;
    document.getElementById('res-protein-dv').textContent = `${proDv}% DV`;
    document.getElementById('bar-protein').style.width = `${Math.min(100, proDv)}%`;

    document.getElementById('res-carbs').textContent = item.carbs;
    document.getElementById('res-carbs-dv').textContent = `${carbDv}% DV`;
    document.getElementById('bar-carbs').style.width = `${Math.min(100, carbDv)}%`;

    document.getElementById('res-fat').textContent = item.fat;
    document.getElementById('res-fat-dv').textContent = `${fatDv}% DV`;
    document.getElementById('bar-fat').style.width = `${Math.min(100, fatDv)}%`;

    document.getElementById('res-fiber').textContent = item.fiber;
    document.getElementById('res-fiber-dv').textContent = `${fibDv}% DV`;
    document.getElementById('bar-fiber').style.width = `${Math.min(100, fibDv)}%`;

    const microKeys = ['vitaminA', 'vitaminC', 'calcium', 'iron', 'sodium', 'potassium'];
    const microGrid = document.getElementById('micronutrients-grid');
    microGrid.innerHTML = microKeys.map(k => {
        const meta = DAILY_VALUE_STANDARDS[k];
        const val = item.micros?.[k] || 0;
        const dv = calcDvPct(k, val);
        const isHighSodium = (k === 'sodium' && dv >= 40);
        const barColor = isHighSodium ? 'bg-amber-400' : 'bg-[#10B981]';
        const badgeColor = isHighSodium ? 'text-[#0F172A] bg-amber-300 border-[#0F172A]' : 'text-[#0F172A] bg-[#CFFAFE] border-[#0F172A]';

        return `
            <div class="bg-white p-2.5 rounded-xl border-2 border-[#0F172A]">
                <div class="flex justify-between items-center text-xs mb-1">
                    <span class="font-extrabold text-[#0F172A]">${meta.label}</span>
                    <span class="px-1.5 py-0.5 rounded border text-[10px] font-extrabold ${badgeColor}">${dv}% DV</span>
                </div>
                <div class="flex justify-between items-center text-[11px] text-slate-600 font-semibold mb-1.5">
                    <span>${val} ${meta.unit}</span>
                    <span>Target: ${meta.dv} ${meta.unit}</span>
                </div>
                <div class="w-full h-2 bg-[#ECFDF5] border border-[#0F172A] rounded-full overflow-hidden">
                    <div class="h-full ${barColor} rounded-full transition-all" style="width: ${Math.min(100, dv)}%"></div>
                </div>
            </div>
        `;
    }).join('');

    const ingContainer = document.getElementById('res-ingredients');
    ingContainer.innerHTML = (item.ingredients || []).map(ing => `
        <span class="px-2.5 py-1 rounded-lg bg-[#ECFDF5] border border-[#0F172A] text-[#0F172A] text-xs font-bold">${ing}</span>
    `).join('');

    document.getElementById('res-advice').textContent = item.advice || "";
}

function saveCurrentScanToLog() {
    const user = getCurrentUser();
    if (!user || !appState.lastScanResult) return;

    const dateKey = appState.activeScanDate;
    if (!user.foodLogs[dateKey]) {
        user.foodLogs[dateKey] = [];
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    user.foodLogs[dateKey].push({
        id: `food-${Date.now()}`,
        time: timeStr,
        ...JSON.parse(JSON.stringify(appState.lastScanResult))
    });

    syncCurrentUserToCloud();
    refreshAllUI();
    showToast(`"${appState.lastScanResult.name}" tersimpan!`, 'success');
}

function deleteFoodLogItem(dateKey, itemId) {
    const user = getCurrentUser();
    if (!user || !user.foodLogs[dateKey]) return;

    user.foodLogs[dateKey] = user.foodLogs[dateKey].filter(item => item.id !== itemId);
    syncCurrentUserToCloud();
    refreshAllUI();
    showToast("Item makanan dihapus dari catatan.", "info");
}

function renderDailyFoodLog() {
    const user = getCurrentUser();
    if (!user) return;

    const dateKey = appState.activeScanDate;
    const logs = user.foodLogs[dateKey] || [];
    document.getElementById('log-count-badge').textContent = `${logs.length} Item`;

    const totalMicros = { vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0, sodium: 0, potassium: 0 };
    logs.forEach(item => {
        if (item.micros) {
            Object.keys(totalMicros).forEach(k => {
                totalMicros[k] += (item.micros[k] || 0);
            });
        }
    });

    const microBarsContainer = document.getElementById('daily-micro-bars');
    microBarsContainer.innerHTML = Object.keys(totalMicros).map(k => {
        const meta = DAILY_VALUE_STANDARDS[k];
        const dv = calcDvPct(k, totalMicros[k]);
        return `
            <div class="bg-white p-2 rounded-xl border-2 border-[#0F172A]">
                <div class="flex justify-between text-[11px] font-extrabold text-[#0F172A] mb-1">
                    <span>${meta.label}</span>
                    <span class="text-[#10B981]">${dv}% DV</span>
                </div>
                <div class="w-full h-2 bg-[#ECFDF5] border border-[#0F172A] rounded-full overflow-hidden">
                    <div class="h-full bg-[#22D3EE] rounded-full" style="width: ${Math.min(100, dv)}%"></div>
                </div>
            </div>
        `;
    }).join('');

    const listContainer = document.getElementById('daily-food-list');
    if (logs.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-6 bg-[#F2FDF9] rounded-2xl border-2 border-dashed border-[#10B981]">
                <p class="text-xs font-bold text-[#0F172A]">Belum ada makanan yang dicatat pada tanggal ini.</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = logs.map(item => `
        <div class="p-3.5 rounded-2xl border-2 border-[#0F172A] hover:bg-[#F2FDF9] bg-white flex items-center justify-between gap-3 transition-all">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded bg-[#CFFAFE] border border-[#0F172A] text-[10px] font-extrabold text-[#0F172A]">${item.time || '--:--'}</span>
                    <h4 class="text-sm font-extrabold text-[#0F172A] truncate">${item.name}</h4>
                </div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-600 mt-1.5">
                    <span class="text-[#10B981] font-extrabold">${item.calories} kkal</span>
                    <span>P: ${item.protein}g</span>
                    <span>K: ${item.carbs}g</span>
                    <span>L: ${item.fat}g</span>
                    <span class="text-cyan-700">• Vit C: ${calcDvPct('vitaminC', item.micros?.vitaminC)}% DV</span>
                </div>
            </div>
            <button type="button" onclick="deleteFoodLogItem('${dateKey}', '${item.id}')" class="p-2 rounded-xl bg-rose-100 hover:bg-rose-500 hover:text-white text-[#0F172A] border border-[#0F172A] transition-colors" title="Hapus Item">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>
    `).join('');
}

// =====================================================================
// 9. TRACKING BERAT BADAN PER HARI
// =====================================================================
function handleAddWeightEntry(event) {
    event.preventDefault();
    const user = getCurrentUser();
    if (!user) return;

    const dateVal = document.getElementById('wt-input-date').value;
    const kgVal = parseFloat(document.getElementById('wt-input-kg').value);
    const targetVal = parseFloat(document.getElementById('wt-input-target').value);
    const noteVal = document.getElementById('wt-input-note').value.trim();

    if (!dateVal || isNaN(kgVal)) return;

    if (!isNaN(targetVal) && targetVal > 25) {
        user.targetWeight = targetVal;
    }

    const existingIdx = user.weightHistory.findIndex(w => w.date === dateVal);
    if (existingIdx >= 0) {
        user.weightHistory[existingIdx] = { date: dateVal, weight: kgVal, note: noteVal || "Diperbarui" };
    } else {
        user.weightHistory.push({ date: dateVal, weight: kgVal, note: noteVal || "Catatan harian" });
    }

    user.weightHistory.sort((a, b) => a.date.localeCompare(b.date));
    document.getElementById('wt-input-kg').value = '';
    document.getElementById('wt-input-note').value = '';

    syncCurrentUserToCloud();
    renderWeightTracker();
    showToast(`Berat badan ${kgVal} kg tersimpan!`, 'success');
}

function deleteWeightEntry(dateStr) {
    const user = getCurrentUser();
    if (!user) return;
    user.weightHistory = user.weightHistory.filter(w => w.date !== dateStr);
    syncCurrentUserToCloud();
    renderWeightTracker();
    showToast("Catatan berat badan dihapus.", "info");
}

function renderWeightTracker() {
    const user = getCurrentUser();
    if (!user) return;

    const history = [...user.weightHistory].sort((a, b) => a.date.localeCompare(b.date));
    const targetWt = user.targetWeight || 60.0;
    document.getElementById('wt-target').textContent = targetWt.toFixed(1);

    if (history.length === 0) {
        document.getElementById('wt-start').textContent = "--";
        document.getElementById('wt-current').textContent = "--";
        document.getElementById('wt-progress-pct').textContent = "0";
        document.getElementById('wt-remaining-text').textContent = "Belum ada data";
        document.getElementById('wt-progress-bar').style.width = "0%";
        document.getElementById('weight-chart-container').innerHTML = `<p class="text-xs text-slate-400">Catat berat badan pertama Anda untuk melihat grafik tren.</p>`;
        document.getElementById('weight-history-list').innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Belum ada riwayat pencatatan berat.</p>`;
        return;
    }

    const startWt = history[0].weight;
    const currentWt = history[history.length - 1].weight;
    document.getElementById('wt-start').textContent = startWt.toFixed(1);
    document.getElementById('wt-current').textContent = currentWt.toFixed(1);

    const totalDiff = Math.abs(startWt - targetWt);
    const achievedDiff = Math.abs(startWt - currentWt);
    const remaining = Math.abs(currentWt - targetWt);

    let pct = 0;
    if (remaining <= 0.1) {
        pct = 100;
    } else if (totalDiff > 0) {
        const movingRightWay = (startWt > targetWt && currentWt <= startWt) || (startWt < targetWt && currentWt >= startWt);
        pct = movingRightWay ? Math.min(100, Math.round((achievedDiff / totalDiff) * 100)) : 0;
    }

    document.getElementById('wt-progress-pct').textContent = pct;
    document.getElementById('wt-progress-bar').style.width = `${pct}%`;
    document.getElementById('wt-remaining-text').textContent = remaining <= 0.1 ? "🎉 Target Tercapai!" : `Sisa ${remaining.toFixed(1)} kg lagi`;

    renderWeightSvgChart(history, targetWt);

    const listEl = document.getElementById('weight-history-list');
    const reversed = [...history].reverse();
    listEl.innerHTML = reversed.map((entry, idx) => {
        const prevEntry = reversed[idx + 1];
        let deltaBadge = `<span class="px-2 py-0.5 rounded-full bg-slate-100 border border-[#0F172A] text-[10px] font-extrabold text-[#0F172A]">Awal</span>`;
        if (prevEntry) {
            const diff = +(entry.weight - prevEntry.weight).toFixed(1);
            if (diff < 0) deltaBadge = `<span class="px-2 py-0.5 rounded-full bg-[#6EE7B7] border border-[#0F172A] text-[#0F172A] text-[11px] font-extrabold">${diff} kg</span>`;
            else if (diff > 0) deltaBadge = `<span class="px-2 py-0.5 rounded-full bg-amber-300 border border-[#0F172A] text-[#0F172A] text-[11px] font-extrabold">+${diff} kg</span>`;
            else deltaBadge = `<span class="px-2 py-0.5 rounded-full bg-slate-100 border border-[#0F172A] text-[#0F172A] text-[11px] font-extrabold">0.0 kg</span>`;
        }

        return `
            <div class="p-3 rounded-2xl border-2 border-[#0F172A] bg-white hover:bg-[#F2FDF9] flex items-center justify-between gap-3">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="text-base font-poppy font-bold text-[#0F172A]">${entry.weight.toFixed(1)} kg</span>
                        ${deltaBadge}
                    </div>
                    <p class="text-xs font-semibold text-slate-600 mt-0.5">${formatIndoDate(entry.date)} • <span class="text-[#10B981]">${entry.note}</span></p>
                </div>
                <button type="button" onclick="deleteWeightEntry('${entry.date}')" class="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-500 hover:text-white text-[#0F172A] border border-[#0F172A]" title="Hapus">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `;
    }).join('');
}

function renderWeightSvgChart(history, targetWt) {
    const container = document.getElementById('weight-chart-container');
    const w = 600;
    const h = 200;
    const padX = 42;
    const padY = 26;

    const allValues = [...history.map(d => d.weight), targetWt];
    const minVal = Math.min(...allValues) - 1.5;
    const maxVal = Math.max(...allValues) + 1.5;
    const rangeY = maxVal - minVal || 1;

    const getY = (val) => h - padY - ((val - minVal) / rangeY) * (h - padY * 2);
    const getX = (idx) => history.length === 1 ? w / 2 : padX + (idx / (history.length - 1)) * (w - padX * 2);

    const targetY = getY(targetWt);
    const points = history.map((d, i) => `${getX(i)},${getY(d.weight)}`).join(' ');
    const isDark = appState.theme === 'dark';
    const valueFill = isDark ? '#F8FAFC' : '#0F172A';
    const dateFill = isDark ? '#94A3B8' : '#64748b';

    const circlesHtml = history.map((d, i) => {
        const cx = getX(i);
        const cy = getY(d.weight);
        const shortDate = d.date.slice(5);
        return `
            <circle cx="${cx}" cy="${cy}" r="6" fill="#6EE7B7" stroke="#0F172A" stroke-width="2.5" />
            <text x="${cx}" y="${cy - 11}" text-anchor="middle" font-size="11" font-weight="800" fill="${valueFill}">${d.weight}</text>
            <text x="${cx}" y="${h - 6}" text-anchor="middle" font-size="10" font-weight="700" fill="${dateFill}">${shortDate}</text>
        `;
    }).join('');

    container.innerHTML = `
        <svg viewBox="0 0 ${w} ${h}" class="w-full h-full overflow-visible">
            <line x1="${padX}" y1="${targetY}" x2="${w - padX}" y2="${targetY}" stroke="#22D3EE" stroke-width="2.2" stroke-dasharray="6,5" />
            <text x="${w - padX}" y="${targetY - 6}" text-anchor="end" font-size="11" font-weight="800" fill="#22D3EE">Target: ${targetWt} kg</text>
            ${history.length > 1 ? `<polyline fill="none" stroke="#10B981" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" />` : ''}
            ${circlesHtml}
        </svg>
    `;
}

// =====================================================================
// 10. KALENDER NUTRISI BULANAN
// =====================================================================
function changeCalendarMonth(delta) {
    let m = appState.calendarMonth + delta;
    let y = appState.calendarYear;
    if (m < 0) { m = 11; y -= 1; }
    else if (m > 11) { m = 0; y += 1; }
    appState.calendarMonth = m;
    appState.calendarYear = y;
    renderCalendarView();
}

function jumpCalendarToToday() {
    const now = new Date();
    appState.calendarYear = now.getFullYear();
    appState.calendarMonth = now.getMonth();
    appState.selectedCalendarDate = TODAY_STR;
    renderCalendarView();
}

function selectCalendarDate(dateStr) {
    appState.selectedCalendarDate = dateStr;
    renderCalendarView();
}

function scanForSelectedCalendarDate() {
    appState.activeScanDate = appState.selectedCalendarDate;
    updateActiveDateDisplay();
    renderDailyFoodLog();
    switchMainView('scanner');
    showToast(`Mode catat disetel ke ${formatIndoDate(appState.selectedCalendarDate)}`, "info");
}

function renderCalendarView() {
    const user = getCurrentUser();
    if (!user) return;

    const bulanNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const y = appState.calendarYear;
    const m = appState.calendarMonth;
    document.getElementById('cal-month-year').textContent = `${bulanNames[m]} ${y}`;

    const firstDayOfWeek = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const target = user.calorieTarget || 2000;

    const grid = document.getElementById('calendar-days-grid');
    let cellsHtml = '';

    for (let i = 0; i < firstDayOfWeek; i++) {
        cellsHtml += `<div class="h-16 sm:h-20 rounded-2xl bg-slate-50/40"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const logs = user.foodLogs[dateStr] || [];
        const totalKcal = logs.reduce((s, item) => s + (item.calories || 0), 0);
        const isSelected = dateStr === appState.selectedCalendarDate;
        const isToday = dateStr === TODAY_STR;

        let dotHtml = '';
        let kcalLabel = '';
        if (totalKcal > 0) {
            const ratio = totalKcal / target;
            let dotColor = 'bg-[#6EE7B7]';
            let textColor = 'text-emerald-800';
            if (ratio < 0.8) {
                dotColor = 'bg-[#22D3EE]';
                textColor = 'text-cyan-800';
            } else if (ratio > 1.1) {
                dotColor = 'bg-amber-400';
                textColor = 'text-amber-800';
            }
            dotHtml = `<span class="w-2.5 h-2.5 rounded-full border border-[#0F172A] ${dotColor}"></span>`;
            kcalLabel = `<span class="text-[10px] sm:text-[11px] font-extrabold ${textColor} truncate block mt-1">${totalKcal} <span class="hidden sm:inline font-bold">kkal</span></span>`;
        }

        const borderClass = isSelected
            ? 'border-2 border-[#0F172A] bg-[#6EE7B7] shadow-[2px_2px_0px_#0F172A]'
            : (isToday ? 'border-2 border-[#22D3EE] bg-[#ECFEFF]' : 'border-2 border-slate-200 hover:border-[#0F172A] bg-white');

        cellsHtml += `
            <button type="button" onclick="selectCalendarDate('${dateStr}')" class="h-16 sm:h-20 p-1.5 sm:p-2 rounded-2xl ${borderClass} flex flex-col justify-between text-left transition-all">
                <div class="w-full flex items-center justify-between">
                    <span class="text-xs font-extrabold text-[#0F172A]">${day}</span>
                    ${dotHtml}
                </div>
                ${kcalLabel || '<span class="text-[10px] font-bold text-slate-300">-</span>'}
            </button>
        `;
    }

    grid.innerHTML = cellsHtml;
    renderCalendarDetailPanel();
}

function renderCalendarDetailPanel() {
    const user = getCurrentUser();
    if (!user) return;

    const dateStr = appState.selectedCalendarDate;
    const logs = user.foodLogs[dateStr] || [];
    const target = user.calorieTarget || 2000;

    document.getElementById('cal-detail-date').textContent = formatIndoDate(dateStr);

    const totalKcal = logs.reduce((s, i) => s + (i.calories || 0), 0);
    const totalPro = logs.reduce((s, i) => s + (i.protein || 0), 0);
    const totalCarb = logs.reduce((s, i) => s + (i.carbs || 0), 0);
    const totalFat = logs.reduce((s, i) => s + (i.fat || 0), 0);

    document.getElementById('cal-detail-kcal').textContent = totalKcal.toLocaleString('id-ID');
    document.getElementById('cal-detail-target').textContent = target.toLocaleString('id-ID');
    document.getElementById('cal-detail-pro').textContent = `${Math.round(totalPro)}g`;
    document.getElementById('cal-detail-carb').textContent = `${Math.round(totalCarb)}g`;
    document.getElementById('cal-detail-fat').textContent = `${Math.round(totalFat)}g`;

    const pct = Math.min(100, Math.round((totalKcal / target) * 100));
    const barEl = document.getElementById('cal-detail-bar');
    const statusBadge = document.getElementById('cal-detail-status-badge');
    barEl.style.width = `${pct}%`;

    if (totalKcal === 0) {
        barEl.className = "h-full bg-slate-300 rounded-full";
        statusBadge.textContent = "Kosong";
        statusBadge.className = "px-3 py-1 rounded-full text-xs font-extrabold border border-[#0F172A] bg-slate-100 text-[#0F172A]";
    } else if (totalKcal / target < 0.8) {
        barEl.className = "h-full bg-[#22D3EE] rounded-full";
        statusBadge.textContent = `Kurang (${pct}%)`;
        statusBadge.className = "px-3 py-1 rounded-full text-xs font-extrabold border border-[#0F172A] bg-[#CFFAFE] text-[#0F172A]";
    } else if (totalKcal / target <= 1.1) {
        barEl.className = "h-full bg-[#6EE7B7] rounded-full";
        statusBadge.textContent = `Tercapai (${pct}%) ✨`;
        statusBadge.className = "px-3 py-1 rounded-full text-xs font-extrabold border border-[#0F172A] bg-[#6EE7B7] text-[#0F172A]";
    } else {
        barEl.className = "h-full bg-amber-400 rounded-full";
        statusBadge.textContent = `Melebihi (${pct}%)`;
        statusBadge.className = "px-3 py-1 rounded-full text-xs font-extrabold border border-[#0F172A] bg-amber-300 text-[#0F172A]";
    }

    const foodListEl = document.getElementById('cal-detail-food-list');
    if (logs.length === 0) {
        foodListEl.innerHTML = `<p class="text-xs font-bold text-slate-500 text-center py-6 bg-[#F2FDF9] border-2 border-dashed border-emerald-200 rounded-2xl">Tidak ada catatan makanan pada tanggal ini.</p>`;
    } else {
        foodListEl.innerHTML = logs.map(item => `
            <div class="p-3 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <p class="text-xs font-extrabold text-[#0F172A] truncate">${item.name}</p>
                    <p class="text-[11px] font-semibold text-slate-500">${item.time || '--:--'} • P: ${item.protein}g • K: ${item.carbs}g • L: ${item.fat}g</p>
                </div>
                <span class="text-xs font-extrabold text-[#10B981] shrink-0">${item.calories} kkal</span>
            </div>
        `).join('');
    }
}

Object.assign(window, {
    openApiKeyModal,
    closeApiKeyModal,
    saveCustomApiKey,
    clearCustomApiKey,
    toggleTheme,
    switchAuthTab,
    togglePasswordVisibility,
    handleAuthSubmit,
    loginWithDemoAccount,
    handleLogout,
    openBmiModal,
    skipOrCloseBmiModal,
    recalculateBmiPreview,
    saveBmiProfile,
    switchMainView,
    changeActiveDate,
    resetToToday,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    startCamera,
    stopCamera,
    capturePhotoFromCamera,
    runSampleFoodScan,
    saveCurrentScanToLog,
    deleteFoodLogItem,
    handleAddWeightEntry,
    deleteWeightEntry,
    changeCalendarMonth,
    jumpCalendarToToday,
    selectCalendarDate,
    scanForSelectedCalendarDate
});

initCloudDatabase();