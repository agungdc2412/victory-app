
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
    const firebaseConfig = {
      apiKey: "AIzaSyDbTMK4ihGTmLa3fGAwHXdbMOwueDhEHW8",
      authDomain: "victory-app-isp.firebaseapp.com",
      projectId: "victory-app-isp",
      storageBucket: "victory-app-isp.firebasestorage.app",
      messagingSenderId: "1023135709213",
      appId: "1:1023135709213:web:68dac1fdb975913bb56ef4",
      measurementId: "G-Q1DJ3BG41V"
    };

    // === 3. INISIALISASI LAYANAN FIREBASE ===
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    const provider = new GoogleAuthProvider();

    // === 4. DATA UNTUK AUTACOMPLETE (DATALIST) ===
    
    // Ini adalah 'Master List' yang berisi SEMUA kemungkinan
    const dataNamaRack = ["DWDM", "OLT", "Rectifier", "Battery", "OTB", "AC", "Lainnya"];
    const dataJenisDevice = [
        "DWDM","OLT", "SWITCH", "ROUTER", "RECTIFIER", "INVERTER", "UPS", "Sys. Controller Rectifier",
        "Module Rectifier","Module DWDM", "Battery", "AC", "OTB","MC"
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

    
    // === 5. VARIABEL GLOBAL & REFERENSI DOM ===
    let currentUser = null;
    let currentGpsLocation = null;   // { latitude, longitude } kalau berhasil
    let liveScanTarget = null;       // "SN" atau "PN"
    let liveTorchOn = false;         // status torch
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
    const namaRack = document.getElementById("namaRack");
    const jenisDevice = document.getElementById("jenisDevice");
    const modulType = document.getElementById("modulType");
    const boardName = document.getElementById("boardName");
    const deviceMerk = document.getElementById("deviceMerk");
    const deviceStatus = document.getElementById("deviceStatus");
    const remark = document.getElementById("remark");
    const btnCreateCard = document.getElementById("btnCreateCard");
    const formStatus = document.getElementById("form-status"); 

    // Referensi DOM - Upload & Scan
    const fotoUploadSN = document.getElementById("fotoUploadSN");
    const imagePreviewSN = document.getElementById("imagePreviewSN");
    const btnScanSN = document.getElementById("btnScanSN"); 
    const hasilSN = document.getElementById("hasilSN");
    const ocrStatusSN = document.getElementById("ocrStatusSN");

    const fotoUploadPN = document.getElementById("fotoUploadPN");
    const imagePreviewPN = document.getElementById("imagePreviewPN");
    const btnScanPN = document.getElementById("btnScanPN"); 
    const hasilPN = document.getElementById("hasilPN");
    const ocrStatusPN = document.getElementById("ocrStatusPN");
    // Tombol kamera & modal
    const btnCameraSN = document.getElementById("btnCameraSN");
    const btnCameraPN = document.getElementById("btnCameraPN");
    const btnCloseCamera = document.getElementById("btnCloseCamera");
    const chkBrightness = document.getElementById("chkBrightnessBoost");
    const btnUseBack = document.getElementById("btnUseBack");
    const btnUseFront = document.getElementById("btnUseFront");

    const fotoUploadGPS = document.getElementById("fotoUploadGPS");
    const imagePreviewGPS = document.getElementById("imagePreviewGPS");

    // Referensi DOM - Hasil & Aksi Global
    const hasilDataContainer = document.getElementById("hasilDataContainer");
    const globalActionStatus = document.getElementById("globalActionStatus");
    const btnExportExcel = document.getElementById("btnExportExcel");
    const btnExportPDF = document.getElementById("btnExportPDF");
    const btnDownloadImages = document.getElementById("btnDownloadImages");
    const btnSendEmail = document.getElementById("btnSendEmail");

        // === Dashboard Admin ===
    const adminTableBody      = document.getElementById("adminTableBody");
    const adminFilterSite     = document.getElementById("adminFilterSite");
    const adminFilterVendor   = document.getElementById("adminFilterVendor");
    const adminFilterJenis    = document.getElementById("adminFilterJenis");
    const adminFilterDateFrom = document.getElementById("adminFilterDateFrom");
    const adminFilterDateTo   = document.getElementById("adminFilterDateTo");
    const adminSearchText     = document.getElementById("adminSearchText");
    const adminRowsPerPageSel = document.getElementById("adminRowsPerPage");
    const adminPrevPageBtn    = document.getElementById("adminPrevPage");
    const adminNextPageBtn    = document.getElementById("adminNextPage");
    const adminPaginationInfo = document.getElementById("adminPaginationInfo");
    const adminExportExcelBtn = document.getElementById("adminExportExcel");
    const adminExportPDFBtn   = document.getElementById("adminExportPDF");
    const adminApiUrl         = document.getElementById("adminApiUrl");
    const adminApiJson        = document.getElementById("adminApiJson");

    let adminCurrentPage = 1;
    let adminRowsPerPage = 10;
    let adminFilteredData = [];

        // ========== NAVIGASI SIDEBAR: FORM VISIT vs DASHBOARD ==========
    const navLinks = document.querySelectorAll(".nav-link[data-page-target]");
    const pages = document.querySelectorAll(".app-page");
    const sidebarGroup = document.getElementById("menuData");
    const sidebarList = document.querySelector(".sidebar-group-list");

    function showPage(pageId) {
        pages.forEach(p => {
            p.classList.toggle("app-page-active", p.id === pageId);
        });
        navLinks.forEach(a => {
            a.classList.toggle("nav-link-active", a.dataset.pageTarget === pageId);
        });
        // simpan pilihan terakhir
        localStorage.setItem("victory_active_page", pageId);
    }

    navLinks.forEach(a => {
        a.addEventListener("click", (e) => {
            e.preventDefault();
            const target = a.dataset.pageTarget;
            showPage(target);
        });
    });

    // Dropdown menu "Menu Data"
    if (sidebarGroup && sidebarList) {
        sidebarGroup.addEventListener("click", () => {
            sidebarList.classList.toggle("open");
        });
    }

    // restore page terakhir atau default ke Form Visit
    const savedPage = localStorage.getItem("victory_active_page") || "page-visit";
    showPage(savedPage);


    // === 6. FUNGSI HELPER (Alat Bantu) ===
    // === HELPER: GPS otomatis + preview link Maps ===
function initAutoGps() {
    const gpsInfo = document.getElementById("gpsInfo");
    if (!gpsInfo) return;

    if (!navigator.geolocation) {
        gpsInfo.textContent = "GPS tidak didukung di browser ini.";
        gpsInfo.style.color = "red";
        return;
    }

    gpsInfo.textContent = "Mengambil lokasi GPS...";
    gpsInfo.style.color = "#007bff";

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            currentGpsLocation = { latitude, longitude };

            const link = document.createElement("a");
            link.href = `https://www.google.com/maps?q=${latitude},${longitude}`;
            link.target = "_blank";
            link.textContent = `Lokasi: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (buka di Maps)`;

            gpsInfo.innerHTML = "";
            gpsInfo.appendChild(link);
            gpsInfo.style.color = "green";
        },
        (err) => {
            gpsInfo.textContent = "Gagal mendapatkan GPS: " + err.message;
            gpsInfo.style.color = "red";
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 600000 // 10 menit cache
        }
    );
}

    /**
     * Mengisi <datalist> di HTML secara dinamis.
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
    // === HELPER: Auto-save hasil scan ke Firestore ===
async function autoSaveScanResult(targetField, decodedText, source) {
    // targetField: "SN" / "PN"
    // source: "file" / "camera"
    if (!currentUserId || !decodedText) return;

    try {
        const scanRef = collection(db, 'users', currentUserId, 'scanLogs');
        await addDoc(scanRef, {
            type: targetField,
            value: decodedText,
            source,
            gpsLat: currentGpsLocation ? currentGpsLocation.latitude : null,
            gpsLng: currentGpsLocation ? currentGpsLocation.longitude : null,
            createdAt: new Date().toISOString()
        });
        console.log("Auto-save scan OK:", targetField, decodedText);
    } catch (err) {
        console.warn("Gagal auto-save scan:", err);
    }
}

    /**
     * Menampilkan preview gambar saat file dipilih.
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
     * FUNGSI runOCR() DIHAPUS di v3.5
     */

    // ---
    // === 6b. FUNGSI HELPER (QR SCAN) ===
    // ---
    /**
     * Memindai QR Code / Barcode dari file gambar yang dipilih.
     * Menggunakan library html5-qrcode
     */
    // === Scan QR/Barcode dari FILE (upload gambar) ===
    async function runQRScan(fileInput, statusEl, resultEl, btnEl) {
    const file = fileInput.files[0];
    if (!file) {
        statusEl.textContent = "Silakan pilih file gambar terlebih dahulu.";
        statusEl.style.color = "red";
        return;
    }

    if (!window.Html5Qrcode) {
        statusEl.textContent = "Library QR belum ter-load. Cek koneksi atau tag <script> html5-qrcode.";
        statusEl.style.color = "red";
        console.error("Html5Qrcode global not found on window");
        return;
    }

    statusEl.textContent = "Memulai proses Scan... (Mohon tunggu)";
    statusEl.style.color = "blue";
    btnEl.disabled = true;
    const originalBtnText = btnEl.textContent;
    btnEl.textContent = "Scanning...";

    let html5QrCode = null;

    try {
        html5QrCode = new window.Html5Qrcode("qr-reader");
        const decodedText = await html5QrCode.scanFile(file, false);

        let finalText = decodedText || "";

        // ✅ KHUSUS FIELD SN: rapikan jadi 1 baris = 1 SN
        if (resultEl && resultEl.id === "hasilSN") {
            // 1. Pecah berdasarkan baris
            const lines = (decodedText || "")
                .split(/\r?\n/)
                .map(l => l.trim())
                .filter(l => l.length > 0);

            // 2. Kalau cuma 1 baris tapi panjang, pecah lagi per spasi/koma
            let tokens = lines;
            if (lines.length <= 1) {
                tokens = (decodedText || "")
                    .split(/[\s,;]+/)
                    .map(t => t.trim())
                    .filter(t => t.length > 0);
            }

            // 3. Buang duplikat & yang terlalu pendek
            const uniqueSN = [...new Set(tokens)].filter(t => t.length >= 4);

            // 4. Susun ulang: 1 baris = 1 SN
            if (uniqueSN.length > 0) {
                finalText = uniqueSN.join("\n");
            }
        }

        // PN & field lain tetap apa adanya
        resultEl.value = finalText;
        statusEl.textContent = "Scan Berhasil!";
        statusEl.style.color = "green";
    } catch (error) {
        console.error("Error QR Scan:", error);
        statusEl.textContent = "Gagal memindai. Pastikan gambar jelas & merupakan Barcode/QR.";
        statusEl.style.color = "red";
    } finally {
        // bersihkan instance & aktifkan lagi tombol
        if (html5QrCode) {
            try {
                await html5QrCode.clear();
            } catch (e) {
                console.warn("Gagal clear Html5Qrcode:", e);
            }
        }
        btnEl.disabled = false;
        btnEl.textContent = originalBtnText || "Scan QR/Barcode (File)";
    }
}


// === Scan QR/Barcode LANGSUNG dari KAMERA ===
// === Scan QR/Barcode LANGSUNG dari KAMERA (bisa pilih depan/belakang) ===
let liveQrCode = null;
//let liveScanTarget = null;   // "SN" atau "PN"
let frontCameraId = null;
let backCameraId = null;
let currentCameraId = null;

// Fungsi bantuan untuk memulai kamera dengan ID tertentu
async function startCameraWithId(cameraId) {
    const statusEl = document.getElementById("camera-status");
    const cameraDivId = "qr-reader-camera";

    if (!window.Html5Qrcode) {
        statusEl.textContent = "Library QR belum ter-load.";
        statusEl.style.color = "red";
        return;
    }

    // Matikan instance lama (kalau ada)
    if (liveQrCode) {
        try { await liveQrCode.stop(); } catch (e) { console.warn(e); }
        try { await liveQrCode.clear(); } catch (e) { console.warn(e); }
    }

    liveQrCode = new window.Html5Qrcode(cameraDivId);
    currentCameraId = cameraId;

    statusEl.textContent = "Membuka kamera...";
    statusEl.style.color = "#007bff";

    await liveQrCode.start(
        cameraId,
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        (decodedText, decodedResult) => {
            // Callback ketika berhasil scan
            if (liveScanTarget === "SN") {
                const hasil = document.getElementById("hasilSN");
                const st = document.getElementById("ocrStatusSN");
                hasil.value = decodedText;
                st.textContent = "Scan Berhasil (kamera)";
                st.style.color = "green";
            } else if (liveScanTarget === "PN") {
                const hasil = document.getElementById("hasilPN");
                const st = document.getElementById("ocrStatusPN");
                hasil.value = decodedText;
                st.textContent = "Scan Berhasil (kamera)";
                st.style.color = "green";
            }

            // Setelah dapat 1 hasil, langsung tutup kamera
            stopCameraScan();
        },
        (errorMessage) => {
            // Dipanggil berkali-kali kalau belum nemu kode, ini normal
            statusEl.textContent = "Mencari kode QR/Barcode...";
            statusEl.style.color = "#007bff";
        }
    );
}

// === Scan QR/Barcode lewat KAMERA (continuous + auto-focus + brightness) ===
async function openCameraScan(targetField) {
    const modal = document.getElementById("camera-modal");
    const statusEl = document.getElementById("camera-status");
    const facingSelect = document.getElementById("cameraFacingSelect");
    const chkContinuous = document.getElementById("chkContinuousScan");
    const chkBrightness = document.getElementById("chkBrightnessBoost");

    if (!window.Html5Qrcode) {
        modal.style.display = "flex";
        statusEl.textContent = "Library QR belum ter-load. Cek koneksi / script html5-qrcode.";
        statusEl.style.color = "red";
        console.error("Html5Qrcode global not found on window");
        return;
    }

    modal.style.display = "flex";
    statusEl.textContent = "Menginisialisasi kamera...";
    statusEl.style.color = "#007bff";

    liveScanTarget = targetField;

    const cameraDivId = "qr-reader-camera";

    // Bersihkan instance lama jika ada
    if (liveQrCode) {
        try { await liveQrCode.stop(); } catch (e) { console.warn(e); }
        try { await liveQrCode.clear(); } catch (e) { console.warn(e); }
    }
    liveQrCode = new window.Html5Qrcode(cameraDivId);

    // Gunakan facingMode agar bisa pilih depan/belakang
  // Tanpa 'exact' supaya tidak OverconstrainedError di beberapa device
    const facingMode = facingSelect.value || "environment";
    const constraints = { facingMode };

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
    };

    const onSuccess = async (decodedText, decodedResult) => {
        // 1) Tampilkan hasil di input SN/PN
        if (liveScanTarget === "SN") {
            hasilSN.value = decodedText;
            ocrStatusSN.textContent = "Scan Berhasil (kamera)";
            ocrStatusSN.style.color = "green";
            await autoSaveScanResult("SN", decodedText, "camera");
        } else if (liveScanTarget === "PN") {
            hasilPN.value = decodedText;
            ocrStatusPN.textContent = "Scan Berhasil (kamera)";
            ocrStatusPN.style.color = "green";
            await autoSaveScanResult("PN", decodedText, "camera");
        }

        // 2) Kalau continuous TIDAK dicentang -> tutup kamera setelah 1 scan
        if (!chkContinuous.checked) {
            await stopCameraScan();
        } else {
            // kalau continuous, tetap scanning, cuma update status
            statusEl.textContent = "Scan berhasil, siap membaca kode berikutnya...";
            statusEl.style.color = "green";
        }
    };

    const onError = (errMsg) => {
        // Error per-frame, normal saat belum dapat kode
        statusEl.textContent = "Mencari kode QR/Barcode...";
        statusEl.style.color = "#007bff";
    };

    try {
        await liveQrCode.start(constraints, config, onSuccess, onError);

        statusEl.textContent = "Arahkan kamera ke barcode/QR.";
        statusEl.style.color = "#007bff";

        // === AUTO-FOCUS (selama device dukung) ===
        try {
            const caps = liveQrCode.getRunningTrackCapabilities
                ? liveQrCode.getRunningTrackCapabilities()
                : null;

        // Cek dulu apakah track-nya punya properti focusMode
            if (caps && "focusMode" in caps) {
                await liveQrCode.applyVideoConstraints({
                    advanced: [{ focusMode: "continuous" }]
                });
                console.log("Auto-focus constraints applied");
            } else {
                console.log("Auto-focus tidak didukung di device ini.");
            }
        } catch (e) {
            console.log("Auto-focus tidak didukung / gagal:", e);
        }

        // === BRIGHTNESS BOOST / TORCH (opsional) ===
        if (chkBrightness.checked) {
            await setTorchIfSupported(true);
        }

    } catch (err) {
        console.error("Gagal membuka kamera:", err);
        statusEl.textContent = "Gagal membuka kamera: " + err;
        statusEl.style.color = "red";
    }
}

// Fungsi untuk switch ke kamera depan
async function switchToFrontCamera() {
    if (frontCameraId && frontCameraId !== currentCameraId) {
        await startCameraWithId(frontCameraId);
    }
}

// Fungsi untuk switch ke kamera belakang
async function switchToBackCamera() {
    if (backCameraId && backCameraId !== currentCameraId) {
        await startCameraWithId(backCameraId);
    }
}

async function stopCameraScan() {
    const modal = document.getElementById("camera-modal");
    const statusEl = document.getElementById("camera-status");

    if (liveQrCode) {
        try { await liveQrCode.stop(); } catch (e) { console.warn(e); }
        try { await liveQrCode.clear(); } catch (e) { console.warn(e); }
    }

    modal.style.display = "none";
    if (statusEl) statusEl.textContent = "";
    liveTorchOn = false;
}

    // === TORCH / FLASH (BRIGHTNESS BOOST) ===
async function setTorchIfSupported(powerOn) {
    if (!liveQrCode) return;

    try {
        const capabilities = liveQrCode.getRunningTrackCapabilities();
        if (!capabilities || !("torch" in capabilities)) {
            console.log("Torch tidak didukung di device ini.");
            return;
        }

        await liveQrCode.applyVideoConstraints({
            advanced: [{ torch: powerOn }]
        });

        liveTorchOn = powerOn;
        console.log("Torch set to:", powerOn);
    } catch (err) {
        console.warn("Gagal mengatur torch:", err);
    }
}

    
    /**
     * Meng-upload file ke Firebase Storage dan mengembalikan URL download.
     */
    async function uploadFile(file, path) {
        if (!file || !currentUserId) {
            // Jika tidak ada file atau user, kembalikan null (bukan error)
            return null;
        }
        
        // Buat nama file yang lebih deskriptif
        const fileName = `${siteName.value || 'NoSite'}-${noRack.value || 'NoRack'}-${path}-${Date.now()}-${file.name}`;
        const fileRef = ref(storage, `uploads/${currentUserId}/${fileName}`);
        
        try {
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            return url;
        } catch (error) {
            console.error(`Gagal upload file (${path}):`, error);
            formStatus.textContent = `Gagal mengupload ${path}. Cek aturan Storage.`;
            formStatus.style.color = 'red';
            // Melempar error agar proses submit berhenti
            throw new Error(`Upload gagal: ${path}`);
        }
    }


    // === 7. LOGIKA AUTENTIKASI (LOGIN, REGISTER, LOGOUT) ===
    
    // 7a. Listener Status Autentikasi (Fungsi Utama)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Pengguna berhasil login
            initAutoGps();   // ambil koordinat GPS begitu user login
            currentUser = user;
            currentUserId = user.uid;
            appContainer.style.display = 'block'; // Tampilkan aplikasi
            loginContainer.style.display = 'none'; // Sembunyikan login
            userEmailDisplay.textContent = user.email; // Tampilkan email di header
            
            
            // Mulai "mendengarkan" data dari database
            setupFirestoreListener(currentUserId);

        } else {
            // Pengguna logout
            currentUser = null;
            currentUserId = null;
            appContainer.style.display = 'none'; // Sembunyikan aplikasi
            loginContainer.style.display = 'flex'; // Tampilkan login
            
            // Hentikan "mendengarkan" database
            if (unsubscribeFromFirestore) {
                unsubscribeFromFirestore();
            }
            dataKunjungan = []; // Kosongkan data
            hasilDataContainer.innerHTML = '<p>Silakan login untuk melihat data.</p>';
        }
    });
    
    // 7b. Event listener untuk form login (mencegah submit default)
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
    });

    // 7c. Tombol Login Email/Password
    loginBtn.addEventListener('click', async () => {
        loginError.textContent = '';
        try {
            await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
            // onAuthStateChanged akan menangani sisanya
        } catch (error) {
            console.error("Error login:", error.message);
            loginError.textContent = "Email atau password salah.";
        }
    });

    // 7d. Tombol Register Akun Baru
    registerBtn.addEventListener('click', async () => {
        loginError.textContent = '';
        try {
            await createUserWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
            // onAuthStateChanged akan menangani sisanya
        } catch (error) {
            console.error("Error register:", error.message);
            if (error.code === 'auth/weak-password') {
                loginError.textContent = 'Password minimal 6 karakter.';
            } else if (error.code === 'auth/email-already-in-use') {
                loginError.textContent = 'Email ini sudah terdaftar.';
            } else {
                loginError.textContent = 'Gagal mendaftar. Cek email/password.';
            }
        }
    });

    // 7e. Tombol Login Google
    googleLoginBtn.addEventListener('click', async () => {
        loginError.textContent = '';
        try {
            await signInWithPopup(auth, provider);
            // onAuthStateChanged akan menangani sisanya
        } catch (error) {
            console.error("Error Google login:", error.message);
            loginError.textContent = 'Gagal login dengan Google.';
        }
    });

    // 7f. Tombol Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // onAuthStateChanged akan menangani sisanya
        } catch (error) {
            console.error("Error logout:", error.message);
        }
    });


    // === 8. LOGIKA APLIKASI UTAMA (Form, Database, Storage) ===

    // 8a. Setup Awal (sudah di dalam DOMContentLoaded)
    
    // Isi semua datalist (autocomplete) dengan 'MASTER LIST'
    populateDatalist('listNamaRack', dataNamaRack);
    populateDatalist('listJenisDevice', dataJenisDevice);
    populateDatalist('listModulType', allModulTypes); 
    populateDatalist('listBoardName', allBoardNames); 
    populateDatalist('listDeviceMerk', allDeviceMerks); 

    // Setup semua preview gambar
    setupImagePreview(fotoUploadSN, imagePreviewSN);
    setupImagePreview(fotoUploadPN, imagePreviewPN);
    setupImagePreview(fotoUploadGPS, imagePreviewGPS);

    // --- Setup tombol QR Scan ---
    btnScanSN.addEventListener("click", () => {
    runQRScan(fotoUploadSN, ocrStatusSN, hasilSN, btnScanSN);
    });
    btnScanPN.addEventListener("click", () => {
        runQRScan(fotoUploadPN, ocrStatusPN, hasilPN, btnScanPN);
    });
    
    // Tombol scan kamera
    btnCameraSN.addEventListener("click", () => {
        openCameraScan("SN");
    });
    btnCameraPN.addEventListener("click", () => {
        openCameraScan("PN");
    });
    
    // Tombol tutup kamera
    btnCloseCamera.addEventListener("click", () => {
        stopCameraScan();
    });

    chkBrightness.addEventListener("change", async (e) => {
    // kalau kamera lagi jalan, toggle torch
    if (liveQrCode) {
        await setTorchIfSupported(e.target.checked);
    }
    });
    
    // 8b. Listener Tombol Submit Form (Simpan Data)
    dataForm.addEventListener('submit', handleFormSubmit);

    async function handleFormSubmit(e) {
        e.preventDefault(); 
        if (!currentUserId) {
            formStatus.textContent = "Error: Anda tidak login.";
            formStatus.style.color = 'red';
            return;
        }
        // Validasi form
        if (!siteName.value || !picName.value || !jenisDevice.value) {
            formStatus.textContent = "Error: Harap isi Nama Site, Nama PIC, dan Jenis Device.";
            formStatus.style.color = 'red';
            return;
        }

        const fileSN = fotoUploadSN.files[0];
        const filePN = fotoUploadPN.files[0];
        const fileGPS = fotoUploadGPS.files[0];

        if (!fileSN && !filePN && !fileGPS) {
            formStatus.textContent = "Error: Harap upload minimal 1 foto (SN, PN, atau GPS).";
            formStatus.style.color = 'red';
            return;
        }

        formStatus.textContent = "Menyimpan data... mohon tunggu...";
        formStatus.style.color = 'blue';
        btnCreateCard.disabled = true;

        try {
            // 1. Upload semua file secara paralel
            formStatus.textContent = "Mengupload foto...";
            const [snUrl, pnUrl, gpsUrl] = await Promise.all([
                uploadFile(fileSN, 'sn'),
                uploadFile(filePN, 'pn'),
                uploadFile(fileGPS, 'gps')
            ]);

            // 2. Siapkan objek data untuk Firestore
            const dataBaru = {
                tanggal: inputTanggal.value,
                site: siteName.value,
                pic: picName.value,
                noRack: noRack.value,
                namaRack: namaRack.value,
                jenisDevice: jenisDevice.value,
                modulType: modulType.value,
                boardName: boardName.value,
                merk: deviceMerk.value,
                status: deviceStatus.value,
                remark: remark.value,
                serialNumber: hasilSN.value,
                partNumber: hasilPN.value,
                fotoUrlSN: snUrl,      // Hasil dari upload (bisa null)
                fotoUrlPN: pnUrl,      // Hasil dari upload (bisa null)
                fotoUrlGPS: gpsUrl,     // Hasil dari upload (bisa null)
                userId: currentUserId,
                createdAt: new Date().toISOString()
            };

            // 3. Simpan data teks ke Firestore
            formStatus.textContent = "Menyimpan data ke database...";
            const collectionRef = collection(db, 'users', currentUserId, 'devices');
            await addDoc(collectionRef, dataBaru);

            // 4. Berhasil! Reset form
            formStatus.textContent = "Data berhasil disimpan!";
            formStatus.style.color = 'green';
            dataForm.reset();
            imagePreviewSN.style.display = "none";
            imagePreviewPN.style.display = "none";
            imagePreviewGPS.style.display = "none";
            ocrStatusSN.textContent = "";
            ocrStatusPN.textContent = "";

        } catch (error) {
            console.error("Error simpan data:", error);
            formStatus.textContent = "Gagal menyimpan data. Coba lagi.";
            formStatus.style.color = 'red';
        } finally {
            // Apapun hasilnya, aktifkan lagi tombolnya
            btnCreateCard.disabled = false;
            // Hilangkan status setelah 3 detik
            setTimeout(() => { 
                if (formStatus) {
                    formStatus.textContent = ''; 
                }
            }, 3000);
        }
    }
        // Format SN multiline -> kumpulan badge
    function formatSnBadges(snText) {
        if (!snText) return '<span>-</span>';

        const parts = snText
            .split(/\r?\n/)
            .map(t => t.trim())
            .filter(Boolean);

        if (parts.length === 0) return '<span>-</span>';

        const html = parts
            .map(sn => `<span class="sn-badge">${sn}</span>`)
            .join(" ");

        return `<span class="sn-badges">${html}</span>`;
    }

    // 8c. Listener Database (Mengambil Data Real-time)
    function setupFirestoreListener(userId) {
        if (unsubscribeFromFirestore) {
            unsubscribeFromFirestore(); // Hentikan listener lama jika ada
        }

        const collectionRef = collection(db, 'users', userId, 'devices');
        const q = query(collectionRef); // Anda bisa menambah orderBy di sini nanti

        unsubscribeFromFirestore = onSnapshot(q, (snapshot) => {
            dataKunjungan = []; // Kosongkan data lokal
            if (snapshot.empty) {
                hasilDataContainer.innerHTML = '<p>Belum ada data. Silakan isi form.</p>';
                return;
            }
            
            hasilDataContainer.innerHTML = ''; // Kosongkan container kartu
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                data.id = doc.id; // Simpan ID dokumen
                dataKunjungan.push(data);
                buatKartuDOM(data); // Buat kartu untuk setiap data
            });
            // Update Dashboard Admin
            refreshAdminDashboard();
            
        }, (error) => {
            console.error("Error mengambil data:", error);
            hasilDataContainer.innerHTML = '<p style="color:red;">Gagal memuat data dari database.</p>';
        });
    }

        // === DASHBOARD ADMIN: FILTER & TABEL ===
    function getAdminFilteredData() {
        let filtered = dataKunjungan.slice();

        const site = (adminFilterSite?.value || "").trim().toLowerCase();
        const vendor = (adminFilterVendor?.value || "").trim().toLowerCase();
        const jenis = (adminFilterJenis?.value || "").trim().toLowerCase();
        const from = adminFilterDateFrom?.value || "";
        const to   = adminFilterDateTo?.value || "";
        const search = (adminSearchText?.value || "").trim().toLowerCase();

        if (site) {
            filtered = filtered.filter(d =>
                (d.site || "").toLowerCase().includes(site)
            );
        }
        if (vendor) {
            filtered = filtered.filter(d =>
                (d.merk || "").toLowerCase().includes(vendor)
            );
        }
        if (jenis) {
            filtered = filtered.filter(d =>
                (d.jenisDevice || "").toLowerCase().includes(jenis)
            );
        }
        if (from) {
            filtered = filtered.filter(d => d.tanggal && d.tanggal >= from);
        }
        if (to) {
            filtered = filtered.filter(d => d.tanggal && d.tanggal <= to);
        }

        if (search) {
            filtered = filtered.filter(d => {
                const fields = [
                    d.site,
                    d.pic,
                    d.serialNumber,
                    d.partNumber,
                    d.noRack,
                    d.namaRack
                ];
                return fields.some(val =>
                    val && String(val).toLowerCase().includes(search)
                );
            });
        }

        return filtered;
    }

    function renderAdminTable() {
        if (!adminTableBody) return;

        const filtered = getAdminFilteredData();
        adminFilteredData = filtered;

        const total = filtered.length;
        const rows = adminRowsPerPage || 10;
        const maxPage = total === 0 ? 1 : Math.ceil(total / rows);

        if (adminCurrentPage > maxPage) adminCurrentPage = maxPage;
        if (adminCurrentPage < 1) adminCurrentPage = 1;

        const start = (adminCurrentPage - 1) * rows;
        const end = start + rows;
        const pageItems = filtered.slice(start, end);

        adminTableBody.innerHTML = "";

        pageItems.forEach((item, idx) => {
            const globalIndex = start + idx;
            const tr = document.createElement("tr");
            tr.dataset.index = String(globalIndex);

            const gpsCell = item.fotoUrlGPS
                ? `<a href="${item.fotoUrlGPS}" target="_blank">Foto GPS</a>`
                : "-";

            tr.innerHTML = `
                <td>${globalIndex + 1}</td>
                <td>${item.tanggal || ""}</td>
                <td>${item.site || ""}</td>
                <td>${item.pic || ""}</td>
                <td>${item.merk || ""}</td>
                <td>${item.jenisDevice || ""}</td>
                <td>${item.noRack || ""}</td>
                <td>${formatSnBadges(item.serialNumber)}</td>
                <td>${item.partNumber || ""}</td>
                <td>${gpsCell}</td>
            `;
            adminTableBody.appendChild(tr);
        });

        if (adminPaginationInfo) {
            adminPaginationInfo.textContent = total === 0
                ? "0 data"
                : `Menampilkan ${start + 1}–${Math.min(end, total)} dari ${total} data`;
        }

        if (adminPrevPageBtn)  adminPrevPageBtn.disabled  = adminCurrentPage <= 1;
        if (adminNextPageBtn)  adminNextPageBtn.disabled  = adminCurrentPage >= maxPage;
    }

    function refreshAdminDashboard() {
        adminCurrentPage = 1;
        renderAdminTable();
    }


    // 8d. Fungsi Membuat Kartu di HTML
    function buatKartuDOM(data) {
    const card = document.createElement("div");
    card.className = "data-card";
    card.setAttribute('data-id', data.id); 
    
    // Helper kecil untuk render image atau placeholder
    const renderImage = (url, alt) => {
        if (url) {
            // Target _blank agar gambar dibuka di tab baru
            return `<a href="${url}" target="_blank" rel="noopener noreferrer"><img src="${url}" alt="${alt}"></a>`;
        }
        return `<div class="img-placeholder">(${alt})</div>`;
    };

    // Helper untuk ubah SN multi-baris menjadi badge list
    const renderSerialBadges = (serialText) => {
        const raw = (serialText || "").replace(/\r/g, "");
        const items = raw
            .split("\n")           // 1 baris = 1 SN
            .map(s => s.trim())
            .filter(Boolean);

        if (!items.length) {
            return '<span class="sn-badge sn-badge-empty">-</span>';
        }

        return items
            .map(sn => `<span class="sn-badge">${sn}</span>`)
            .join("");
    };

    const serialBadgesHtml = renderSerialBadges(data.serialNumber);

    card.innerHTML = `
        <button class="btn-delete-card" data-doc-id="${data.id}">X</button>
        <h3>Data Visit Site: ${data.site} (Tgl: ${data.tanggal || 'N/A'})</h3>
        <div class="card-content-grid">
            <div>
                <p><strong>PIC:</strong> ${data.pic}</p>
                <p><strong>No. Rack:</strong> ${data.noRack || '-'}</p>
                <p><strong>Nama Rack:</strong> ${data.namaRack || '-'}</p>
                <p><strong>Jenis Device:</strong> ${data.jenisDevice}</p>
                <p><strong>Merk/Vendor:</strong> ${data.merk}</p>
                <p><strong>Status:</strong> ${data.status}</p>
            </div>
            <div>
                <p><strong>Modul Type:</strong> ${data.modulType || '-'}</p>
                <p><strong>Board Name:</strong> ${data.boardName || '-'}</p>

                <div class="sn-block">
                    <p><strong>Serial Number (SN):</strong> ${formatSnBadges(data.serialNumber)}</p>
                    <div class="sn-badge-list">
                        ${serialBadgesHtml}
                    </div>
                    <small class="sn-help-text">
                        1 badge = 1 Serial Number (diambil per baris dari kolom SN)
                    </small>
                </div>

                <p><strong>Part Number (PN):</strong> ${data.partNumber || '-'}</p>
                <p><strong>Remark:</strong> ${data.remark || '-'}</p>
            </div>
        </div>
        <hr>
        <div class="card-images-grid">
            <div><p>Foto SN:</p>${renderImage(data.fotoUrlSN, 'Foto SN')}</div>
            <div><p>Foto PN:</p>${renderImage(data.fotoUrlPN, 'Foto PN')}</div>
            <div><p>Foto GPS:</p>${renderImage(data.fotoUrlGPS, 'Foto GPS')}</div>
        </div>
    `;
    hasilDataContainer.appendChild(card);
}
    
    // 8e. Fungsi Hapus Data (Event Delegation)
    hasilDataContainer.addEventListener('click', async (e) => {
        // Cek apakah yang diklik adalah tombol hapus
        if (e.target && e.target.classList.contains('btn-delete-card')) {
            const docId = e.target.getAttribute('data-doc-id');
            if (!docId) return;

            // Konfirmasi sebelum menghapus
            // Ganti confirm() dengan UI custom jika perlu
            if (!confirm(`Apakah Anda yakin ingin menghapus data ini?`)) {
                return;
            }
            
            try {
                // Buat referensi ke dokumen
                const docRef = doc(db, 'users', currentUserId, 'devices', docId);
                // Hapus dokumen
                await deleteDoc(docRef);
                // (onSnapshot akan otomatis mengupdate UI)
                
                // TODO: Hapus juga file dari Storage (fitur lanjutan)
                
            } catch (error) {
                console.error("Error hapus data:", error);
                alert("Gagal menghapus data.");
            }
        }
    });
        // Event filter & search
    [
        adminFilterSite,
        adminFilterVendor,
        adminFilterJenis,
        adminFilterDateFrom,
        adminFilterDateTo,
        adminSearchText
    ].forEach(el => {
        if (!el) return;
        el.addEventListener("input", () => {
            adminCurrentPage = 1;
            renderAdminTable();
        });
    });

    // Pagination control
    if (adminRowsPerPageSel) {
        adminRowsPerPageSel.addEventListener("change", () => {
            adminRowsPerPage = parseInt(adminRowsPerPageSel.value, 10) || 10;
            adminCurrentPage = 1;
            renderAdminTable();
        });
    }

    if (adminPrevPageBtn) {
        adminPrevPageBtn.addEventListener("click", () => {
            adminCurrentPage--;
            renderAdminTable();
        });
    }
    if (adminNextPageBtn) {
        adminNextPageBtn.addEventListener("click", () => {
            adminCurrentPage++;
            renderAdminTable();
        });
    }

    // Klik baris -> REST API viewer
    if (adminTableBody) {
        adminTableBody.addEventListener("click", (e) => {
            const tr = e.target.closest("tr");
            if (!tr) return;

            const idx = parseInt(tr.dataset.index, 10);
            const item = adminFilteredData[idx];
            if (!item) return;

            const userIdForUrl = item.userId || currentUserId || "<userId>";
            const docIdForUrl  = item.id || "<docId>";

            const apiUrl = `https://firestore.googleapis.com/v1/projects/victory-app-isp/databases/(default)/documents/users/${encodeURIComponent(userIdForUrl)}/devices/${encodeURIComponent(docIdForUrl)}`;

            if (adminApiUrl)  adminApiUrl.textContent  = apiUrl;
            if (adminApiJson) adminApiJson.textContent = JSON.stringify(item, null, 2);
        });
    }

    // Export Excel (by filter)
    if (adminExportExcelBtn) {
        adminExportExcelBtn.addEventListener("click", () => {
            const data = getAdminFilteredData();
            if (data.length === 0) {
                alert("Tidak ada data (hasil filter) untuk diekspor.");
                return;
            }

            const rows = data.map(item => ({
                "Tanggal": item.tanggal || "",
                "Site": item.site || "",
                "PIC": item.pic || "",
                "Merk": item.merk || "",
                "Jenis Device": item.jenisDevice || "",
                "Rack": item.noRack || "",
                "SN": (item.serialNumber || "").replace(/\r?\n/g, " | "),
                "PN": item.partNumber || "",
                "Foto GPS": item.fotoUrlGPS || ""
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "AdminFilter");
            XLSX.writeFile(wb, "Admin_Filter_Rekap.xlsx");
        });
    }

    // Export PDF (by filter – simple text layout)
    if (adminExportPDFBtn) {
        adminExportPDFBtn.addEventListener("click", () => {
            const data = getAdminFilteredData();
            if (data.length === 0) {
                alert("Tidak ada data (hasil filter) untuk diekspor.");
                return;
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            let y = 12;
            pdf.setFontSize(12);
            pdf.text("Rekap Data Aset (Dashboard Admin – Hasil Filter)", 10, y);
            y += 6;
            pdf.setFontSize(9);

            data.forEach((item, i) => {
                if (y > 270) {
                    pdf.addPage();
                    y = 12;
                }
                pdf.text(`${i + 1}. ${item.tanggal || ""} | ${item.site || ""} | ${item.pic || ""}`, 10, y); y += 4;
                pdf.text(`    Merk: ${item.merk || ""} | Jenis: ${item.jenisDevice || ""} | Rack: ${item.noRack || ""}`, 10, y); y += 4;
                pdf.text(`    SN: ${(item.serialNumber || "").replace(/\r?\n/g, " | ")}`, 10, y); y += 4;
                pdf.text(`    PN: ${item.partNumber || ""}`, 10, y); y += 5;
            });

            pdf.save("Admin_Filter_Rekap.pdf");
        });
    }


    // === 9. LOGIKA AKSI GLOBAL (EXPORT, ZIP, EMAIL) ===
    
    // 9a. Export to Excel
    btnExportExcel.addEventListener("click", () => {
        if (dataKunjungan.length === 0) {
            alert("Tidak ada data untuk diekspor.");
            return;
        }
        
        // Menyiapkan data untuk Excel
        const dataUntukExcel = dataKunjungan.map(item => ({
            "Tanggal": item.tanggal,
            "Nama Site": item.site,
            "Nama PIC": item.pic,
            "No Rack": item.noRack,
            "Nama Rack": item.namaRack,
            "Jenis Device": item.jenisDevice,
            "Modul Type": item.modulType,
            "Board Name": item.boardName,
            "Merk/Vendor": item.merk,
            "Status": item.status,
            "Serial Number": item.serialNumber,
            "Part Number": item.partNumber,
            "Remark": item.remark,
            "Link Foto SN": item.fotoUrlSN,
            "Link Foto PN": item.fotoUrlPN,
            "Link Foto GPS": item.fotoUrlGPS
        }));

        const ws = XLSX.utils.json_to_sheet(dataUntukExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Perangkat");
        // 'XLSX' di-load dari <head>
        XLSX.writeFile(wb, "RekapDataPerangkat.xlsx");
    });

    // 9b. Export to PDF
    btnExportPDF.addEventListener("click", () => {
        if (dataKunjungan.length === 0) {
            alert("Tidak ada data untuk diekspor.");
            return;
        }

        globalActionStatus.textContent = "Membuat PDF... mohon tunggu...";
        
        // Menggunakan jsPDF (di-load dari <head>)
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const container = hasilDataContainer;

        // Menggunakan html2canvas (di-load dari <head>)
        html2canvas(container, { scale: 2 })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 210; // Lebar A4 (mm)
                const pageHeight = 295; // Tinggi A4 (mm)
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                // Jika konten lebih panjang dari 1 halaman
                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                
                pdf.save('RekapDataPerangkat.pdf');
                globalActionStatus.textContent = "";
            });
    });

    // 9c. Download Semua Gambar (ZIP)
    btnDownloadImages.addEventListener("click", async () => {
        if (dataKunjungan.length === 0) {
            alert("Tidak ada data (kartu) untuk diunduh gambarnya.");
            return;
        }

        globalActionStatus.textContent = "Mempersiapkan file ZIP... (Ini bisa lambat jika banyak foto)";
        
        try {
            // JSZip dan FileSaver di-load dari <head>
            const zip = new JSZip();

            // Fungsi untuk mengambil blob gambar dari URL
            // Perlu penanganan CORS jika storage tidak di domain yg sama
            const fetchImage = async (url) => {
                // Menggunakan 'cors-anywhere' proxy untuk bypass CORS
                // Ganti dengan proxy Anda sendiri jika diperlukan
                // PERINGATAN: 'cors-anywhere' adalah layanan publik demo.
                // Untuk produksi, Anda harus mengaturnya sendiri atau mengkonfigurasi
                // Aturan CORS di Firebase Storage Anda.
                const proxyUrl = 'https://api.allorigins.win/raw?url=';
                const response = await fetch(proxyUrl + encodeURIComponent(url));
                if (!response.ok) throw new Error(`Gagal fetch ${url} via proxy`);
                return response.blob();
            };
            
            const promises = [];
            
            // Loop semua data kunjungan
            for (const data of dataKunjungan) {
                const baseName = `${data.site || 'NA'}-${data.noRack || 'NA'}-${data.jenisDevice || 'NA'}`;
                
                // Tambahkan file ke promise
                if (data.fotoUrlSN) {
                    promises.push(fetchImage(data.fotoUrlSN).then(blob => zip.file(`${baseName}_SN.jpg`, blob)));
                }
                if (data.fotoUrlPN) {
                    promises.push(fetchImage(data.fotoUrlPN).then(blob => zip.file(`${baseName}_PN.jpg`, blob)));
                }
                if (data.fotoUrlGPS) {
                    promises.push(fetchImage(data.fotoUrlGPS).then(blob => zip.file(`${baseName}_GPS.jpg`, blob)));
                }
            }
            
            // Tunggu semua gambar di-fetch
            await Promise.all(promises);

            // Generate ZIP
            globalActionStatus.textContent = "Mengompres file... mohon tunggu...";
            const content = await zip.generateAsync({ type: "blob" });
            
            // Trigger download
            saveAs(content, "Arsip_Foto_Perangkat.zip");
            globalActionStatus.textContent = "ZIP berhasil dibuat!";

        } catch (error) {
            console.error("Error creating ZIP:", error);
            // Error CORS sering terjadi di sini
            if (error.message.includes('fetch') || error.message.includes('CORS') || error.message.includes('proxy')) {
                globalActionStatus.textContent = "Gagal mengunduh foto (Error CORS). Cek setup Firebase Storage.";
                alert("Gagal mengunduh foto. Ini seringkali disebabkan oleh aturan CORS di Firebase Storage. Coba atur rules di Firebase Storage untuk mengizinkan 'GET' dari domain publik.");
            } else {
                globalActionStatus.textContent = "Gagal membuat file ZIP.";
            }
            globalActionStatus.style.color = 'red';
        } finally {
            setTimeout(() => { globalActionStatus.textContent = ''; globalActionStatus.style.color = 'blue'; }, 5000);
        }
    });


    // 9d. Send Email (Draft)
       // 9d. Send Email (Draft)
    btnSendEmail.addEventListener("click", () => {
        if (dataKunjungan.length === 0) {
            alert("Tidak ada data untuk dikirim.");
            return;
        }

        // header isi email
        let bodyEmail = "Berikut adalah rekap data kunjungan site:\n";
        bodyEmail += "Daftar ini dibuat otomatis oleh V.I.C.T.O.R.Y.\n\n";

        // isi per baris
        dataKunjungan.forEach((item, index) => {
            bodyEmail += `--- Data #${index + 1} ---\n`;
            bodyEmail += `Site: ${item.site} (PIC: ${item.pic})\n`;
            bodyEmail += `Device: ${item.jenisDevice} (${item.merk})\n`;
            bodyEmail += `SN/PN: ${item.serialNumber || "-"} / ${item.partNumber || "-"}\n`;
            bodyEmail += `Status: ${item.status}\n\n`;
        });

        bodyEmail += "Laporan selesai.\n";

        const subjek = encodeURIComponent("Laporan Kunjungan Site (Otomatis)");
        const body = encodeURIComponent(bodyEmail);

        // TODO: ganti email@tujuan.com dengan email admin kamu
        const mailtoLink = `mailto:email@tujuan.com?subject=${subjek}&body=${body}`;

        // Buka aplikasi email default
        window.location.href = mailtoLink;
    });
}); // === AKHIR DARI DOMContentLoaded ===






