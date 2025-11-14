/*
 * SCRIPT APLIKASI V.I.C.T.O.R.Y v3.4 (Perbaikan Scan)
 *
 * PERUBAHAN v3.4:
 * - Memperbaiki bug di runQRScan() di mana tombol bisa 'tersangkut'
 * jika inisialisasi Html5Qrcode gagal.
 * - Memindahkan konstruktor Html5Qrcode ke DALAM blok try...catch.
 */

// === 1. IMPORT MODUL FIREBASE ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    deleteDoc,
    query,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// === PEMBUNGKUS UTAMA: DOMContentLoaded ===
document.addEventListener('DOMContentLoaded', () => {

    // === 2. KONFIGURASI FIREBASE ===
    // --- 
    // --- Config Anda sudah benar (kesalahan '----' telah dihapus) ---
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
    // KESALAHAN FATAL (----) TELAH DIHAPUS DARI ATAS BARIS INI

    // === 3. INISIALISASI LAYANAN FIREBASE ===
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    const provider = new GoogleAuthProvider();

    // === 4. DATA UNTUK AUTACOMPLETE (DATALIST) ===
    
    // Ini adalah 'Master List' yang berisi SEMUA kemungkinan
    const dataNamaRack = ["Modul", "DWDM", "Rectifier", "Battery", "OTB", "AC", "Lainnya"];
    const dataJenisDevice = [
        "DWDM Huawei Module", "DWDM Nokia Module", "OLT C320v2 Module", "OLT C620 Module", "OLT Huawei Module",
        "Router Cisco Module", "Router", "Switch", "OLT", "SWITCH", "Server", "RECTIFIER", "Sys. Controller Rectifier",
        "Module Rectifier", "Battery", "AC", "OTB"
    ];
    // MASTER LISTS (Nama diubah menjadi 'all...')
    const allModulTypes = [
        "OTU", "Filter", "Control", "Power", "CrossConnect", "Fan", "Protection", "Amplifier", "Supervisory", "Subrack",
        "Panel", "SFP", "GPON User Card", "Control Card", "XGSPON User Card", "Power Card", "Power Board", "Main Board",
        "Uplink Board", "Service Board - Line Card", "Service Board", "ASR 920 250W AC Power Supply", "8-port Gigabite Ethernet Interface",
        "ASR 9901 Fan Tray", "1600W AC Power Module", "Simulated Power Tray IDPROM", "Modular" /* ...dan seterusnya... */
    ];
    const allBoardNames = [
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
    const allDeviceMerks = [
        "Nokia", "Arista", "Cisco", "Edgecore", "Huawei", "Alcatel", "Mikrotik", "BDCOM", "ZTE", "Alcatel-Lucent Enterprise", "Raisecom", "Siemens", "PAZ"
    ];

    
    // ---
    // === 4b. OTAK RELASI DATA (Knowledge Base) ===
    // ---
    // FITUR INI DINONAKTIFKAN SEMENTARA UNTUK DEBUGGING
    // const deviceKnowledgeBase = { ... };
    // ---


    // === 5. VARIABEL GLOBAL & REFERENSI DOM ===
    let currentUser = null;
    let currentUserId = null;
    let dataKunjungan = [];
    let unsubscribeFromFirestore = null;

    // Referensi Halaman
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginError = document.getElementById('login-error');
    const userEmailDisplay = document.getElementById('user-email');

    // Referensi Tombol Login/Logout
    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Referensi Form Aplikasi
    const dataForm = document.getElementById("dataForm");
    const inputTanggal = document.getElementById("inputTanggal");
    const siteName = document.getElementById("siteName");
    const picName = document.getElementById("picName");
    const noRack = document.getElementById("noRack");
    const namaRack = document.
