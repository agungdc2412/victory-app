/*
 * SCRIPT APLIKASI V.I.C.T.O.R.Y v3.0 (FIREBASE)
 * File ini menangani semua logika aplikasi, termasuk:
 * 1. Impor library Firebase
 * 2. Konfigurasi Firebase (HARUS DIISI)
 * 3. Logika Autentikasi (Login/Register/Logout/Google)
 * 4. Logika Aplikasi Utama (Datalist, Preview Gambar, OCR)
 * 5. Logika Database (Simpan, Ambil, Hapus data dari Firestore)
 * 6. Logika Penyimpanan (Upload file ke Firebase Storage)
 * 7. Logika Ekspor (Excel, PDF, ZIP, Email)
 */

// === 1. IMPORT MODUL FIREBASE ===
// Kita menggunakan 'import' karena di HTML kita sudah set type="module"
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    query,
    onSnapshot,
    doc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// === 2. KONFIGURASI FIREBASE ===
// ---
// --- 
// --- 
// --- PENTING: GANTI KONFIGURASI DI BAWAH INI DENGAN KODE DARI PROYEK FIREBASE ANDA ---
// --- (Lihat penjelasan saya sebelumnya tentang cara mendapatkan ini)
// --- 
// --- 
const firebaseConfig = {
  apiKey: "AIzaSyDbTMK4ihGTmLa3fGAwHXdbMOwueDhEHW8",
  authDomain: "victory-app-isp.firebaseapp.com",
  projectId: "victory-app-isp",
  storageBucket: "victory-app-isp.firebasestorage.app",
  messagingSenderId: "1023135709213",
  appId: "1:1023135709213:web:68dac1fdb975913bb56ef4",
  measurementId: "G-Q1DJ3BG41V"
};
// -----------------------------------------------------------

// === 3. INISIALISASI LAYANAN FIREBASE ===
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// === 4. DATA UNTUK AUTACOMPLETE (DATALIST) ===
const dataNamaRack = ["Modul", "DWDM", "Rectifier", "Battery", "OTB", "AC", "Lainnya"];
const dataJenisDevice = [
    "DWDM Huawei Module", "DWDM Nokia Module", "OLT C320v2 Module", "OLT C620 Module", "OLT Huawei Module",
    "Router Cisco Module", "Router", "Switch", "OLT", "SWITCH", "Server", "RECTIFIER", "Sys. Controller Rectifier",
    "Module Rectifier", "Battery", "AC", "OTB"
];
const dataModulType = [
    "OTU", "Filter", "Control", "Power", "CrossConnect", "Fan", "Protection", "Amplifier", "Supervisory", "Subrack",
    "Panel", "SFP", "GPON User Card", "Control Card", "XGSPON User Card", "Power Card", "Power Board", "Main Board",
    "Uplink Board", "Service Board - Line Card", "Service Board", "ASR 920 250W AC Power Supply", "8-port Gigabite Ethernet Interface",
    "ASR 9901 Fan Tray", "1600W AC Power Module", "Simulated Power Tray IDPROM", "Modular" /* ...dan seterusnya... */
];
const dataBoardName = [
    "V3T220", "S7N402", "S1EFI", "S1CTU", "U3N402", "V5T402", "S1PIU", "S1UXCS", "S1FAN", "V3T401", "52SCC", "97M48V", "97D48",
    "18PIU", "18FAN", "18EFI", "F1EMR8", "OLPN", "F2LDX", "F2OBU", "F5APIU", "F5FAN", "F5SCC", "F5XCH", "F5STG", "97ITL", "97OPM8",
    "11AST2", "52DAPXF", "13DCP", "13OLP", "97ASE", "51RPC", "51ROP", "51LMU", "97ERPC", "97RPC", "12WSMD9", "55OPM8", "12M40V",
    "13OBU1", "ITL", "13WSMD4", "12D40", "17LTX", "19LSC", "F1AST4", "F1DFIU", "B1OLP", "TMF1AUX", "F2LTX", "F5PIU", "Z8SCC",
    "Z8XCH", "Z8STG", "F6APIU", "G1M520SM", "51AST2", "53DAPXF", "52WSMD9", "G3CXP", "G1EFI", "G2PIU", "G1FAN", "U6N402",
    "TMF1PIU", "TMF1SCC", "G3DAPXF", "G3WSMD9", "G3M48V", "G2DAP", "G2AST2", "G3OPM8", "G3ITL", "G3D48", "G2DCP", "U3SN402",
    "51OLP", "E3CTU", "G4CXP", "G3SRAPXF", "G3M48", "F3AUX", "G2AST4", "S7N404", "V8T404", "G2QCP", "TNM1AUX", "TNV3T210S01",
    "TNG2HSC106", "TNG2OLP04", "B1LTX", "PSS-32 Shelf", "PSS-16II Shelf", "32EC2", "PF", "EC", "130SNX10", "S13X100R",
    "MON-OTDR", "OPSA", "OTDR", "D5X500Q", "AHPHG", "AHPLG", "SS-16.2O", "SL-16.2O", "16FAN2", "USRPNL", "WTOCM-F",
    "FAN32H", "WR8-88AF", "A2325A", "SUL-1.2O", "PSS-16 Shelf", "PSS-8 Shelf", "OPSFLEX", "8EC2", "SHFPNL", "260SCX2",
    "8FAN", "FAN-16", "ITLB", "ITLU", "DCM", "SFD44", "SFD44B", "XI-64.1", "S10GB-LR", "Q28LR4E", "Q28LR4D", "C2CLR4D",
    "SRCP-30", "SRP-50-C", "20P200", "AM2032A", "AM2625A", "WR20-TF", "SEUL1.2O", "Fan", "SRP-30-C-O", "P26F", "11QPA4",
    "SL64TUW", "XL-64TU", "FVOA", "XS-64.2B", "GTGH", "SMXA", "GFGH", "HFTL", "SPUF", "PRSF", "PICB", "MPBB", "NXHC",
    "GPHF", "CIUA", "PISC", "MPSFE", "FLHFE", "ASR-920-PWR-A", "A900-IMA8T", "ASR-9901-Fan", "A9K-1600W-AC",
    "A9K-AC-PEM-V2 IDPROM", "PORT-10G-NIC", "NCS-1100W-ACFW", "A9K-RSP880-LT-SE", "ASR-9006_V2-Fan", "A9K-8HG-FLEX-SE",
    "ASR-9006-AC-V2", "PWR-3kW-AC-V2", "A9K-48X10GE-1G-SE", "A9K-4X100GE", "PWR-C3-750WAC-R", "NCS-1100W-ACRV", "A99-RP-F",
    "ASR-9903-Fan", "A9903-20HG-PEC", "PWR-1.6KW-AC", "ASR-9903-LC", "NC55-2KW-ACFW", "N540-PWR400-A", "NC55-36X100G-S",
    "NC55-SC", "NC55-5504-FC", "NC55-RP-E", "NC55-PWR-3KW-AC", "NC55-MOD-AS 2MPA", "NC55-5504-Fan", "7750 SR12",
    "7750 SR7", "7750 SRa4", "Arista", "ASR 920", "ASR 9901", "ASR 9903", "ASR XRV-9000", "Edgecore"
];
const dataDeviceMerk = [
    "Nokia", "Arista", "Cisco", "Edgecore", "Huawei", "Alcatel", "Mikrotik", "BDCOM", "ZTE", "Alcatel-Lucent Enterprise", "Raisecom", "Siemens", "PAZ"
];


// === 5. VARIABEL GLOBAL & REFERENSI DOM ===
let currentUser = null; // Menyimpan info user yang login
let currentUserId = null; // Menyimpan ID user yang login
let dataKunjungan = []; // Array LOKAL untuk menyimpan data dari database (untuk export)
let unsubscribeFromFirestore = null; // Fungsi untuk berhenti mendengarkan database

// Referensi DOM - Halaman Login
const loginContainer = document.getElementById('login-container');
const googleLoginBtn = document.getElementById('google-login-btn');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginError = document.getElementById('login-error');

// Referensi DOM - Halaman Aplikasi
const appContainer = document.getElementById('app-container');
const userEmailDisplay = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

// Referensi DOM - Form Input
const dataForm = document.getElementById('dataForm');
const formStatus = document.getElementById('form-status');
const btnCreateCard = document.getElementById('btnCreateCard');
const inputTanggal = document.getElementById("inputTanggal");
const siteName = document.getElementById("siteName");
const picName = document.getElementById("picName");
const noRack = document.getElementById("noRack");
const namaRack = document.getElementById("namaRack");
const jenisDevice = document.getElementById("jenisDevice");
const modulType = document.getElementById("modulType");
const boardName = document.getElementById("boardName");
const deviceMerk = document.getElementById("deviceMerk");
const deviceStatus = document.getElementById("deviceStatus");
const remark = document.getElementById("remark");

// Referensi DOM - Upload & OCR
const fotoUploadSN = document.getElementById("fotoUploadSN");
const imagePreviewSN = document.getElementById("imagePreviewSN");
const btnGenerateSN = document.getElementById("btnGenerateSN");
const hasilSN = document.getElementById("hasilSN");
const ocrStatusSN = document.getElementById("ocrStatusSN");
const fotoUploadPN = document.getElementById("fotoUploadPN");
const imagePreviewPN = document.getElementById("imagePreviewPN");
const btnGeneratePN = document.getElementById("btnGeneratePN");
const hasilPN = document.getElementById("hasilPN");
const ocrStatusPN = document.getElementById("ocrStatusPN");
const fotoUploadGPS = document.getElementById("fotoUploadGPS");
const imagePreviewGPS = document.getElementById("imagePreviewGPS");

// Referensi DOM - Hasil & Aksi Global
const hasilDataContainer = document.getElementById("hasilDataContainer");
const globalActionStatus = document.getElementById("globalActionStatus");
const btnExportExcel = document.getElementById("btnExportExcel");
const btnExportPDF = document.getElementById("btnExportPDF");
const btnDownloadImages = document.getElementById("btnDownloadImages");
const btnSendEmail = document.getElementById("btnSendEmail");


// === 6. FUNGSI HELPER (Alat Bantu) ===

/**
 * Mengisi <datalist> di HTML secara dinamis.
 * @param {string} listId - ID dari elemen <datalist>.
 * @param {string[]} dataArray - Array berisi string untuk opsi.
 */
function populateDatalist(listId, dataArray) {
    const datalist = document.getElementById(listId);
    if (!datalist) return;
    datalist.innerHTML = ''; // Kosongkan dulu
    dataArray.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        datalist.appendChild(option);
    });
}

/**
 * Menampilkan preview gambar saat file dipilih.
 * @param {HTMLInputElement} fileInput - Elemen input file.
 * @param {HTMLImageElement} previewImg - Elemen image untuk preview.
 */
function setupImagePreview(fileInput, previewImg) {
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewImg.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else {
            previewImg.src = "";
            previewImg.style.display = "none";
        }
    });
}

/**
 * Menjalankan OCR (Text Recognition) pada gambar yang dipilih.
 * @param {HTMLInputElement} fileInput - Elemen input file.
 * @param {HTMLElement} statusEl - Elemen untuk menampilkan status OCR.
 * @param {HTMLInputElement} resultEl - Elemen input untuk menampilkan hasil teks.
 * @param {HTMLButtonElement} btnEl - Tombol generate yang memicu OCR.
 */
async function runOCR(fileInput, statusEl, resultEl, btnEl) {
    const file = fileInput.files[0];
    if (!file) {
        statusEl.textContent = "Silakan pilih file gambar terlebih dahulu.";
        statusEl.style.color = "red";
        return;
    }

    statusEl.textContent = "Memulai proses OCR... (Mohon tunggu)";
    statusEl.style.color = "blue";
    btnEl.disabled = true;
    btnEl.textContent = "Processing...";

    try {
        const { data: { text } } = await Tesseract.recognize(
            file, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        statusEl.textContent = `Mengenali teks... (${Math.round(m.progress * 100)}%)`;
                    }
                }
            }
        );
        
        const cleanedText = text.replace(/\s+/g, ' ').trim(); // Bersihkan hasil
        resultEl.value = cleanedText; // Masukkan ke form
        statusEl.textContent = "OCR Berhasil! Silakan verifikasi teks.";
        statusEl.style.color = "green";

    } catch (error) {
        console.error("Error OCR:", error);
        statusEl.textContent = "Gagal melakukan OCR. Coba foto lain.";
        statusEl.style.color = "red";
    } finally {
        btnEl.disabled = false;
        btnEl.textContent = btnEl.id === 'btnGenerateSN' ? "Generate SN (OCR)" : "Generate PN (OCR)";
    }
}

/**
 * Meng-upload file ke Firebase Storage dan mengembalikan URL download.
 * @param {File} file - File yang akan di-upload.
 * @param {string} path - Path di Storage (misal: 'sn', 'pn').
 * @returns {Promise<string>} URL download file.
 */
async function uploadFile(file, path) {
    if (!file || !currentUserId) {
        throw new Error("File atau User ID tidak ditemukan untuk upload.");
    }
    // Membuat nama file unik (misal: R1-SN-167888888.png)
    const fileName = `${noRack.value || 'N-A'}-${path}-${Date.now()}-${file.name}`;
    // Path lengkap di Firebase Storage: uploads/USER_ID/NAMA_FILE
    const fileRef = ref(storage, `uploads/${currentUserId}/${fileName}`);
    
    // Upload file
    await uploadBytes(fileRef, file);
    
    // Dapatkan URL download
    const url = await getDownloadURL(fileRef);
    return url;
}


// === 7. LOGIKA AUTENTIKASI (LOGIN, REGISTER, LOGOUT)