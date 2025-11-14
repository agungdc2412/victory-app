/*
 * SCRIPT APLIKASI V.I.C.T.O.R.Y v3.5 (Scan Only + Bug Fix)
 *
 * PERUBAHAN v3.5:
 * - Menghapus total fitur OCR (Tesseract.js)
 * - Menghapus fungsi runOCR() dan listener-nya.
 * - Tombol "Scan QR/Barcode" sekarang menjadi satu-satunya pilihan.
 * - Perbaikan bug "tombol macet" dari v3.4 sudah termasuk di sini.
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
    // Config Anda dari file sebelumnya
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
    const dataNamaRack = ["Modul", "DWDM", "Rectifier", "Battery", "OTB", "AC", "Lainnya"];
    const dataJenisDevice = [
        "DWDM Huawei Module", "DWDM Nokia Module", "OLT C320v2 Module", "OLT C620 Module", "OLT Huawei Module",
        "Router Cisco Module", "Router", "Switch", "OLT", "SWITCH", "Server", "RECTIFIER", "Sys. Controller Rectifier",
        "Module Rectifier", "Battery", "AC", "OTB"
    ];
    // MASTER LISTS (Nama diubah menjadi 'all...')
    const allModulTypes = [
        "OTU", "Filter", "Control", "Power", "CrossConnect", "Fan", "Protection", "Amplifier", "Supervisory", "Subrack",
        "Panel", "SFP", "GPON User Card", "Control Card", "XGSPON User Card", "Power Card",
