// =====================================================================
// 0. INISIALISASI SUPABASE EDGE FUNCTION & DATABASE
// =====================================================================
window.NUTRIFIND_CONFIG = window.NUTRIFIND_CONFIG || {
    SCAN_FUNCTION_URL: "https://ouqhentfvjebrvialsti.supabase.co/functions/v1/scan-food",
    SUPABASE_ANON_KEY: "sb_publishable_yFKyMT_mn78ZYJWkloma5A_rkRCyEJx",
    SUPABASE_URL: "https://ouqhentfvjebrvialsti.supabase.co"
};

let supabaseClient = null;
let isSupabaseReady = false;

async function initSupabaseDatabase() {
    const statusTextEl = document.getElementById('auth-db-status-text');
    const headerDbEl = document.getElementById('header-db-indicator');
    const cfg = window.NUTRIFIND_CONFIG || {};

    try {
        if (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_URL.startsWith("https://") && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("TEMPEL")) {
            supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
            const { error } = await supabaseClient.from('nutrifind_users').select('email').limit(1);
            if (!error) {
                isSupabaseReady = true;
                if (statusTextEl) statusTextEl.textContent = "SUPABASE DB TERHUBUNG";
                if (headerDbEl) headerDbEl.textContent = "SUPABASE ●";
                return;
            }
        }
        if (statusTextEl) statusTextEl.textContent = "AI CLOUD SIAP (LOCAL LOG)";
        if (headerDbEl) headerDbEl.textContent = "LOCAL SESSION";
    } catch (err) {
        if (statusTextEl) statusTextEl.textContent = "AI CLOUD SIAP (LOCAL LOG)";
        if (headerDbEl) headerDbEl.textContent = "LOCAL SESSION";
    }
}

async function fetchAccountFromSupabase(email) {
    if (!isSupabaseReady || !supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('nutrifind_users')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();

        if (error || !data) return null;
        return {
            email: data.email,
            password: data.password,
            name: data.name,
            calorieTarget: data.calorie_target || 2000,
            bmiProfile: data.bmi_profile || null,
            foodLogs: data.food_logs || {},
            weightHistory: data.weight_history || [],
            targetWeight: Number(data.target_weight) || 60.0
        };
    } catch (err) {
        return null;
    }
}

async function syncCurrentUserToSupabase() {
    const user = getCurrentUser();
    if (!user || !isSupabaseReady || !supabaseClient) return;
    try {
        await supabaseClient
            .from('nutrifind_users')
            .upsert({
                email: user.email,
                password: user.password,
                name: user.name,
                calorie_target: user.calorieTarget,
                bmi_profile: user.bmiProfile,
                food_logs: user.foodLogs,
                weight_history: user.weightHistory,
                target_weight: user.targetWeight,
                updated_at: new Date().toISOString()
            }, { onConflict: 'email' });
    } catch (err) {
        console.warn("Gagal sinkronisasi ke Supabase:", err);
    }
}

// =====================================================================
// 1. REFERENSI DAILY VALUE (AKG HARIAN) & TANGGAL
// =====================================================================
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
                }
            ]
        },
        weightHistory: [
            { date: shiftDateStr(TODAY_STR, -14), weight: 71.0, note: "Awal mulai program" },
            { date: shiftDateStr(TODAY_STR, -7), weight: 69.8, note: "Rutin jalan pagi 30 menit" },
            { date: TODAY_STR, weight: 68.5, note: "Turun stabil!" }
        ],
        targetWeight: 64.0
    }
};

let appState = {
    currentUserEmail: null,
    authMode: 'login',
    activeView: 'scanner',
    activeScanDate: TODAY_STR,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),
    selectedCalendarDate: TODAY_STR,
    lastScanResult: null,
    lastPreviewUrl: null,
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
// 4. LOGIN & DAFTAR AKUN (SUPABASE SYNC)
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
    submitBtn.textContent = "MEMPROSES...";

    try {
        const dbAccount = await fetchAccountFromSupabase(email);
        if (dbAccount) {
            inMemoryUsers[email] = dbAccount;
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
                bmiProfile: null,
                foodLogs: {},
                weightHistory: [],
                targetWeight: 60.0
            };
            appState.currentUserEmail = email;
            await syncCurrentUserToSupabase();
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

    const dbDemo = await fetchAccountFromSupabase(demoEmail);
    if (dbDemo) {
        inMemoryUsers[demoEmail] = dbDemo;
    } else {
        appState.currentUserEmail = demoEmail;
        await syncCurrentUserToSupabase();
    }
    completeLogin(demoEmail, false);
}

function completeLogin(email, isNewUser) {
    appState.currentUserEmail = email;
    appState.activeScanDate = TODAY_STR;
    appState.selectedCalendarDate = TODAY_STR;

    const user = getCurrentUser();

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

    await syncCurrentUserToSupabase();
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
// 7. KAMERA, UNGGAH FOTO & SUPABASE EDGE FUNCTION AI
// =====================================================================
function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('dropzone').classList.add('is-dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('dropzone').classList.remove('is-dragover');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('dropzone').classList.remove('is-dragover');
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
        e.target.value = "";
    }
}

function processUploadedImageFile(file) {
    stopCamera();
    const reader = new FileReader();
    reader.onload = function(evt) {
        const dataUrl = evt.target.result;
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('helper-canvas');
            const maxDim = 900;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                else { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.85);
            displayPreviewImage(compressedUrl);
            analyzeFoodImageWithSupabase(compressedUrl, null);
        };
        img.onerror = function() {
            showToast("Gagal membaca gambar. Coba file gambar lain.", "error");
        };
        img.src = dataUrl;
    };
    reader.readAsDataURL(file);
}

function displayPreviewImage(dataUrl) {
    appState.lastPreviewUrl = dataUrl;
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

    if (appState.lastPreviewUrl) {
        document.getElementById('food-preview-img').classList.remove('hidden');
        document.getElementById('scanner-placeholder').classList.add('hidden');
    } else {
        document.getElementById('scanner-placeholder').classList.remove('hidden');
    }
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
    analyzeFoodImageWithSupabase(dataUrl, null);
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
    document.getElementById('api-error-banner').classList.add('hidden');
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

    ctx.font = 'bold 16px Plus Jakarta Sans, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(PRESET_FOOD_DATA[presetKey].name, 240, 332);

    const dataUrl = canvas.toDataURL('image/png');
    displayPreviewImage(dataUrl);
    analyzeFoodImageWithSupabase(dataUrl, PRESET_FOOD_DATA[presetKey]);
}

async function analyzeFoodImageWithSupabase(imageDataUrl, fallbackPreset) {
    const overlay = document.getElementById('scanning-overlay');
    const errBanner = document.getElementById('api-error-banner');
    const errDetail = document.getElementById('api-error-detail');
    overlay.classList.remove('hidden');
    errBanner.classList.add('hidden');

    const cfg = window.NUTRIFIND_CONFIG || {};
    const scanUrl = cfg.SCAN_FUNCTION_URL || "https://ouqhentfvjebrvialsti.supabase.co/functions/v1/scan-food";
    const anonKey = (cfg.SUPABASE_ANON_KEY || "").trim();

    let parsedResult = null;
    let lastError = "";

    try {
        const parts = imageDataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const imageBase64 = parts[1] || "";

        const headers = {
            "Content-Type": "application/json"
        };
        if (anonKey && !anonKey.includes("TEMPEL")) {
            headers["apikey"] = anonKey;
            headers["Authorization"] = `Bearer ${anonKey}`;
        }

        const response = await fetch(scanUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
                imageBase64,
                base64Data: imageBase64,
                mimeType
            })
        });

        const data = await response.json();
        if (!response.ok) {
            const rawErr = data?.error?.error?.message || data?.error?.message || data?.message || data?.error || data;
            lastError = typeof rawErr === 'object' ? JSON.stringify(rawErr) : String(rawErr);
        } else if (data && data.name) {
            parsedResult = data;
        } else {
            lastError = "Format respons AI tidak valid: " + JSON.stringify(data);
        }
    } catch (err) {
        lastError = err.message || "Gagal terhubung ke Supabase Edge Function.";
    }

    overlay.classList.add('hidden');

    if (parsedResult) {
        appState.lastScanResult = parsedResult;
        renderScanResultCard(parsedResult);
        showToast(`AI mendeteksi: ${parsedResult.name}`, 'success');
        return;
    }

    if (fallbackPreset) {
        appState.lastScanResult = fallbackPreset;
        renderScanResultCard(fallbackPreset);
        showToast(`Simulasi menu: ${fallbackPreset.name}`, 'info');
        return;
    }

    errBanner.classList.remove('hidden');
    errDetail.textContent = `${lastError}. Pastikan Supabase Edge Function scan-food aktif dan GEMINI_API_KEY sudah diatur di Secrets Supabase.`;
    showToast("Gagal memindai gambar via Supabase.", "error");
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
    document.getElementById('res-portion').textContent = item.portion || "1 Porsi";
    document.getElementById('res-calories').textContent = Math.round(item.calories || 0).toLocaleString('id-ID');

    const proDv = calcDvPct('protein', item.protein);
    const carbDv = calcDvPct('carbs', item.carbs);
    const fatDv = calcDvPct('fat', item.fat);
    const fibDv = calcDvPct('fiber', item.fiber);

    document.getElementById('res-protein').textContent = item.protein ?? 0;
    document.getElementById('res-protein-dv').textContent = `${proDv}% DV`;
    document.getElementById('bar-protein').style.width = `${Math.min(100, proDv)}%`;

    document.getElementById('res-carbs').textContent = item.carbs ?? 0;
    document.getElementById('res-carbs-dv').textContent = `${carbDv}% DV`;
    document.getElementById('bar-carbs').style.width = `${Math.min(100, carbDv)}%`;

    document.getElementById('res-fat').textContent = item.fat ?? 0;
    document.getElementById('res-fat-dv').textContent = `${fatDv}% DV`;
    document.getElementById('bar-fat').style.width = `${Math.min(100, fatDv)}%`;

    document.getElementById('res-fiber').textContent = item.fiber ?? 0;
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

    syncCurrentUserToSupabase();
    refreshAllUI();
    showToast(`"${appState.lastScanResult.name}" ditambahkan ke catatan!`, 'success');
}

function deleteFoodLogItem(dateKey, itemId) {
    const user = getCurrentUser();
    if (!user || !user.foodLogs[dateKey]) return;

    user.foodLogs[dateKey] = user.foodLogs[dateKey].filter(item => item.id !== itemId);
    syncCurrentUserToSupabase();
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
                <svg width="16" height="16" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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

    syncCurrentUserToSupabase();
    renderWeightTracker();
    showToast(`Berat badan ${kgVal} kg tersimpan!`, 'success');
}

function deleteWeightEntry(dateStr) {
    const user = getCurrentUser();
    if (!user) return;
    user.weightHistory = user.weightHistory.filter(w => w.date !== dateStr);
    syncCurrentUserToSupabase();
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
                    <svg width="16" height="16" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"></path></svg>
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

    const circlesHtml = history.map((d, i) => {
        const cx = getX(i);
        const cy = getY(d.weight);
        const shortDate = d.date.slice(5);
        return `
            <circle cx="${cx}" cy="${cy}" r="6" fill="#6EE7B7" stroke="#0F172A" stroke-width="2.5" />
            <text x="${cx}" y="${cy - 11}" text-anchor="middle" font-size="11" font-weight="800" fill="#0F172A">${d.weight}</text>
            <text x="${cx}" y="${h - 6}" text-anchor="middle" font-size="10" font-weight="700" fill="#64748b">${shortDate}</text>
        `;
    }).join('');

    container.innerHTML = `
        <svg viewBox="0 0 ${w} ${h}" class="w-full h-full overflow-visible">
            <line x1="${padX}" y1="${targetY}" x2="${w - padX}" y2="${targetY}" stroke="#22D3EE" stroke-width="2.2" stroke-dasharray="6,5" />
            <text x="${w - padX}" y="${targetY - 6}" text-anchor="end" font-size="11" font-weight="800" fill="#0891b2">Target: ${targetWt} kg</text>
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

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(initSupabaseDatabase, 250);
});
