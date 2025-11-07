/*
 * SCRIPT APLIKASI V.I.C.T.O.R.Y v3.1 (FIREBASE + DOM LOAD FIX)
 * File ini menangani semua logika aplikasi.
 *
 * PERUBAHAN v3.1:
 * - Seluruh kode dibungkus dalam listener 'DOMContentLoaded'
 * Ini untuk memastikan HTML selesai dimuat sebelum script 
 * mencari elemen (getElementById) dan memasang listener (addEventListener).
 * Ini memperbaiki bug "tombol tidak bisa diklik".
 */

// === 1. IMPORT MODUL FIREBASE ===
// (Ini tetap di luar, karena 'import' harus ada di level atas)
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

// === PEMBUNGKUS UTAMA: DOMContentLoaded ===
// Kode di dalam ini HANYA akan berjalan setelah HTML siap.
document.addEventListener('DOMContentLoaded', () => {

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


    // === 7. LOGIKA AUTENTIKASI (LOGIN, REGISTER, LOGOUT) ===

    // 7a. Listener Status Autentikasi (Fungsi Utama)
    // Fungsi ini berjalan setiap kali status login berubah
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // --- Pengguna BERHASIL LOGIN ---
            currentUser = user;
            currentUserId = user.uid;

            // Tampilkan aplikasi, sembunyikan login
            appContainer.style.display = 'block';
            loginContainer.style.display = 'none';

            // Tampilkan email pengguna
            userEmailDisplay.textContent = user.email;

            // Mulai mengambil data dari database
            setupFirestoreListener(currentUserId);

        } else {
            // --- Pengguna LOGOUT atau TIDAK LOGIN ---
            currentUser = null;
            currentUserId = null;

            // Tampilkan login, sembunyikan aplikasi
            appContainer.style.display = 'none';
            loginContainer.style.display = 'flex';

            // Berhenti mendengarkan database (jika sedang berjalan)
            if (unsubscribeFromFirestore) {
                unsubscribeFromFirestore();
            }
            // Kosongkan data
            dataKunjungan = [];
            hasilDataContainer.innerHTML = '<p>Silakan login untuk melihat data.</p>';
        }
    });

    // 7b. Tombol Login Email/Password
    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        try {
            await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
            // onAuthStateChanged akan otomatis menangani sisanya
        } catch (error) {
            console.error("Error login:", error.message);
            loginError.textContent = "Email atau password salah.";
        }
    });

    // 7c. Tombol Register Akun Baru
    registerBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        try {
            await createUserWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
            // onAuthStateChanged akan otomatis menangani sisanya
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

    // 7d. Tombol Login Google
    googleLoginBtn.addEventListener('click', async () => {
        loginError.textContent = '';
        try {
            await signInWithPopup(auth, provider);
            // onAuthStateChanged akan otomatis menangani sisanya
        } catch (error) {
            console.error("Error Google login:", error.message);
            loginError.textContent = 'Gagal login dengan Google.';
        }
    });

    // 7e. Tombol Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // onAuthStateChanged akan otomatis menangani sisanya
        } catch (error) {
            console.error("Error logout:", error.message);
        }
    });


    // === 8. LOGIKA APLIKASI UTAMA (Form, Database, Storage) ===

    // 8a. Setup Awal (sudah di dalam DOMContentLoaded)
    
    // Isi semua datalist (autocomplete)
    populateDatalist('listNamaRack', dataNamaRack);
    populateDatalist('listJenisDevice', dataJenisDevice);
    populateDatalist('listModulType', dataModulType);
    populateDatalist('listBoardName', dataBoardName);
    populateDatalist('listDeviceMerk', dataDeviceMerk);

    // Setup semua preview gambar
    setupImagePreview(fotoUploadSN, imagePreviewSN);
    setupImagePreview(fotoUploadPN, imagePreviewPN);
    setupImagePreview(fotoUploadGPS, imagePreviewGPS);

    // Setup tombol OCR
    btnGenerateSN.addEventListener("click", () => {
        runOCR(fotoUploadSN, ocrStatusSN, hasilSN, btnGenerateSN);
    });
    btnGeneratePN.addEventListener("click", () => {
        runOCR(fotoUploadPN, ocrStatusPN, hasilPN, btnGeneratePN);
    });


    // 8b. Listener Tombol Submit Form (Simpan Data)
    dataForm.addEventListener('submit', handleFormSubmit);

    async function handleFormSubmit(e) {
        e.preventDefault(); // Hentikan form dari reload halaman

        // Validasi sederhana
        if (!siteName.value || !picName.value || !jenisDevice.value) {
            formStatus.textContent = "Error: Harap isi Nama Site, Nama PIC, dan Jenis Device.";
            formStatus.style.color = 'red';
            return;
        }
        
        // Cek file
        const fileSN = fotoUploadSN.files[0];
        const filePN = fotoUploadPN.files[0];
        const fileGPS = fotoUploadGPS.files[0];
        
        // Minimal 1 foto harus ada
        if (!fileSN && !filePN && !fileGPS) {
            formStatus.textContent = "Error: Harap upload minimal 1 foto (SN, PN, atau GPS).";
            formStatus.style.color = 'red';
            return;
        }

        formStatus.textContent = "Menyimpan data... mohon tunggu...";
        formStatus.style.color = 'blue';
        btnCreateCard.disabled = true;

        try {
            // 1. Upload semua file yang ada ke Firebase Storage
            formStatus.textContent = "Mengupload foto (1/3)...";
            const snUrl = fileSN ? await uploadFile(fileSN, 'sn') : null;
            
            formStatus.textContent = "Mengupload foto (2/3)...";
            const pnUrl = filePN ? await uploadFile(filePN, 'pn') : null;
            
            formStatus.textContent = "Mengupload foto (3/3)...";
            const gpsUrl = fileGPS ? await uploadFile(fileGPS, 'gps') : null;

            // 2. Siapkan objek data untuk disimpan
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
                serialNumber: hasilSN.value, // Teks dari OCR
                partNumber: hasilPN.value,   // Teks dari OCR
                fotoUrlSN: snUrl,   // URL dari Storage
                fotoUrlPN: pnUrl,   // URL dari Storage
                fotoUrlGPS: gpsUrl, // URL dari Storage
                userId: currentUserId, // Simpan ID user yang input
                createdAt: new Date().toISOString() // Simpan waktu input
            };

            // 3. Simpan objek data ke Firestore
            formStatus.textContent = "Menyimpan data ke database...";
            // Path koleksi: users/USER_ID/devices
            const collectionRef = collection(db, 'users', currentUserId, 'devices');
            await addDoc(collectionRef, dataBaru);

            // 4. Berhasil! Reset form
            formStatus.textContent = "Data berhasil disimpan!";
            formStatus.style.color = 'green';
            dataForm.reset();
            // Sembunyikan semua preview
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
            btnCreateCard.disabled = false;
            // Hapus status setelah 3 detik
            setTimeout(() => { formStatus.textContent = ''; }, 3000);
        }
    }

    // 8c. Listener Database (Mengambil Data Real-time)
    function setupFirestoreListener(userId) {
        // Jika sudah ada listener, hentikan dulu
        if (unsubscribeFromFirestore) {
            unsubscribeFromFirestore();
        }

        // Path koleksi: users/USER_ID/devices
        const collectionRef = collection(db, 'users', userId, 'devices');
        const q = query(collectionRef); // (Nanti bisa ditambah sort/filter di sini)

        // onSnapshot: Fungsi ini berjalan SETIAP KALI ada data baru,
        // perubahan data, atau data dihapus di database.
        unsubscribeFromFirestore = onSnapshot(q, (snapshot) => {
            dataKunjungan = []; // Kosongkan array lokal
            
            if (snapshot.empty) {
                hasilDataContainer.innerHTML = '<p>Belum ada data. Silakan isi form.</p>';
                return;
            }

            hasilDataContainer.innerHTML = ''; // Kosongkan container kartu

            snapshot.forEach((doc) => {
                const data = doc.data();
                data.id = doc.id; // Simpan ID dokumen (penting untuk hapus)
                
                dataKunjungan.push(data); // Simpan ke array lokal (untuk export)
                buatKartuDOM(data); // Tampilkan kartu di HTML
            });
        }, (error) => {
            console.error("Error mengambil data:", error);
            hasilDataContainer.innerHTML = '<p style="color:red;">Gagal memuat data dari database.</p>';
        });
    }

    // 8d. Fungsi Membuat Kartu di HTML
    function buatKartuDOM(data) {
        const card = document.createElement("div");
        card.className = "data-card";
        card.setAttribute('data-id', data.id); 

        // Helper untuk menampilkan gambar atau placeholder
        const renderImage = (url, alt) => {
            if (url) {
                return `<img src="${url}" alt="${alt}" target="_blank" rel="noopener noreferrer">`;
            }
            return `<div class="img-placeholder">(${alt})</div>`;
        };
        
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
                    <p><strong>Serial Number (SN):</strong> ${data.serialNumber || '-'}</p>
                    <p><strong>Part Number (PN):</strong> ${data.partNumber || '-'}</p>
                    <p><strong>Remark:</strong> ${data.remark || '-'}</p>
                </div>
            </div>
            
            <hr>
            <div class="card-images-grid">
                <div>
                    <p>Foto SN:</p>
                    ${renderImage(data.fotoUrlSN, 'Foto SN')}
                </div>
                <div>
                    <p>Foto PN:</p>
                    ${renderImage(data.fotoUrlPN, 'Foto PN')}
                </div>
                <div>
                    <p>Foto GPS:</p>
                    ${renderImage(data.fotoUrlGPS, 'Foto GPS')}
                </div>
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

            // Konfirmasi
            if (!confirm(`Apakah Anda yakin ingin menghapus data ${docId}?`)) {
                return;
            }

            try {
                // Path dokumen: users/USER_ID/devices/DOKUMEN_ID
                const docRef = doc(db, 'users', currentUserId, 'devices', docId);
                await deleteDoc(docRef);
                
                // Kartu akan otomatis hilang karena onSnapshot akan berjalan lagi
                // (PERINGATAN: File di Storage belum terhapus, hanya data di Firestore)

            } catch (error) {
                console.error("Error hapus data:", error);
                alert("Gagal menghapus data.");
            }
        }
    });


    // === 9. LOGIKA AKSI GLOBAL (EXPORT, ZIP, EMAIL) ===
    // (Fungsi-fungsi ini menggunakan array 'dataKunjungan' yang diisi oleh listener Firestore)

    // 9a. Export to Excel
    btnExportExcel.addEventListener("click", () => {
        if (dataKunjungan.length === 0) {
            alert("Tidak ada data untuk diekspor.");
            return;
        }
        const dataUntukExcel = dataKunjungan.map(item => ({
            "Tanggal": item.tanggal, "Nama Site": item.site, "Nama PIC": item.pic,
            "No Rack": item.noRack, "Nama Rack": item.namaRack, "Jenis Device": item.jenisDevice,
            "Modul Type": item.modulType, "Board Name": item.boardName, "Merk/Vendor": item.merk,
            "Status": item.status, "Serial Number": item.serialNumber, "Part Number": item.partNumber,
            "Remark": item.remark, "Link Foto SN": item.fotoUrlSN, "Link Foto PN": item.fotoUrlPN, "Link Foto GPS": item.fotoUrlGPS
        }));
        const ws = XLSX.utils.json_to_sheet(dataUntukExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Perangkat");
        XLSX.writeFile(wb, "RekapDataPerangkat.xlsx");
    });

    // 9b. Export to PDF
    btnExportPDF.addEventListener("click", () => {
        if (dataKunjungan.length === 0) {
            alert("Tidak ada data untuk diekspor.");
            return;
        }
        globalActionStatus.textContent = "Membuat PDF... mohon tunggu...";
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const container = hasilDataContainer;
        html2canvas(container, { scale: 2 })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 210; const pageHeight = 295;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight; let position = 0;
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
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
            const zip = new JSZip();
            // Fungsi untuk mengambil file dari URL
            const fetchImage = async (url) => {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Gagal fetch ${url}`);
                return response.blob();
            };

            const promises = [];
            for (const data of dataKunjungan) {
                const baseName = `${data.site || 'NA'}-${data.noRack || 'NA'}-${data.jenisDevice || 'NA'}`;
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

            await Promise.all(promises);

            globalActionStatus.textContent = "Mengompres file... mohon tunggu...";
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "Arsip_Foto_Perangkat.zip");
            globalActionStatus.textContent = "ZIP berhasil dibuat!";
        } catch (error) {
            console.error("Error creating ZIP:", error);
            globalActionStatus.textContent = "Gagal membuat file ZIP.";
            globalActionStatus.style.color = 'red';
        } finally {
            setTimeout(() => { globalActionStatus.textContent = ''; }, 3000);
        }
    });


    // 9d. Send Email (Draft)
    btnSendEmail.addEventListener("click", () => {
        if (dataKunjungan.length === 0) {
            alert("Tidak ada data untuk dikirim.");
            return;
        }
        let bodyEmail = "Berikut adalah rekap data kunjungan site:\n\n";
        dataKunjungan.forEach((item, index) => {
            bodyEmail += `--- Data #${index + 1} ---\n`;
            bodyEmail += `Site: ${item.site} (PIC: ${item.pic})\n`;
            bodyEmail += `Device: ${item.jenisDevice} (${item.merk})\n`;
            bodyEmail += `SN/PN: ${item.serialNumber || '-'} / ${item.partNumber || '-'}\n`;
            bodyEmail += `Status: ${item.status}\n\n`;
        });
        bodyEmail += "Laporan selesai.\n";
        const subjek = encodeURIComponent(`Laporan Kunjungan Site`);
        const body = encodeURIComponent(bodyEmail);
        const mailtoLink = `mailto:email@tujuan.com?subject=${subjek}&body=${body}`;
        window.location.href = mailtoLink;
    });

}); // === AKHIR DARI DOMContentLoaded ===
