/*
 * SCRIPT V.I.C.T.O.R.Y v4.4 (Self-Diagnose Edition)
 * Fitur Baru: Deteksi Error Otomatis (CORS, Permission, Config)
 */

// === DETEKSI ERROR GLOBAL (PENTING UNTUK DEBUGGING) ===
window.onerror = function(msg, url, line) {
    if (msg.includes("ResizeObserver")) return;
    
    let tips = "";
    if (msg.toLowerCase().includes("unexpected token '<'")) {
        tips = "TIPS: Isi file script.js Anda salah! Sepertinya Anda memasukkan kode HTML ke dalamnya. Hapus isinya dan copy ulang kode JavaScript.";
    } else if (msg.toLowerCase().includes("module") || msg.toLowerCase().includes("cors")) {
        tips = "TIPS: Jangan buka file dengan klik dua kali (file://). Gunakan 'Live Server' di VS Code (http://localhost...).";
    } else if (msg.toLowerCase().includes("permission")) {
        tips = "TIPS: Cek 'Rules' di Firebase Firestore/Storage. Pastikan sudah 'allow read, write: if true;'.";
    } else if (msg.toLowerCase().includes("api key")) {
        tips = "TIPS: API Key Firebase Anda salah atau belum diganti.";
    }

    alert(`ERROR SISTEM:\n${msg}\n\n${tips}`);
    return false;
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    deleteDoc,
    writeBatch,
    query,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

function loadDashboardStats() {
    // nanti kalau mau bikin dashboard analitik beneran, isi di sini.
    console.log('loadDashboardStats() dipanggil – belum diimplementasi.');
}

// === 1. KONFIGURASI FIREBASE ===
// PENTING: GANTI DATA INI DENGAN MILIK ANDA SENDIRI!
const firebaseConfig = {
    apiKey: "AIzaSyDbTMK4ihGTmLa3fGAwHXdbMOwueDhEHW8", 
    authDomain: "victory-app-isp.firebaseapp.com",
    projectId: "victory-app-isp",
    storageBucket: "victory-app-isp.firebasestorage.app",
    messagingSenderId: "1023135709213",
    appId: "1:1023135709213:web:68dac1fdb975913bb56ef4",
    measurementId: "G-Q1DJ3BG41V"
};

// Inisialisasi dengan Error Handling
let app, auth, db, storage, provider;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    provider = new GoogleAuthProvider();
} catch (e) {
    alert("Gagal Menghubungkan Firebase:\n" + e.message);
}

// === STATE MANAGEMENT ===
let currentUser = null;
let currentUserId = null;
let referenceData = [];
let snList = [];
let liveQrCode = null;
let currentCameraTarget = null;
let chartInstances = {};

// ====== REPORT VISIT STATE ======
let cachedVisitData = [];         // cache semua dokumen visit dari Firestore
let currentEditVisitId = null;    // id dokumen yang sedang diedit

// === 2. AUTHENTICATION ===
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        currentUserId = user.uid;
        document.getElementById("login-container").style.display = "none";
        document.getElementById("app-container").style.display = "flex";
        document.getElementById("user-display").textContent = user.email.split('@')[0];
        
        // Load Data Awal
        loadReferences(); 
        loadReportData();
        loadDashboardStats();
    } else {
        document.getElementById("login-container").style.display = "flex";
        document.getElementById("app-container").style.display = "none";
    }
});

window.logoutApp = () => signOut(auth);

document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const em = document.getElementById("login-email").value;
    const pw = document.getElementById("login-password").value;
    signInWithEmailAndPassword(auth, em, pw).catch(err => {
        let msg = err.message;
        if(msg.includes("auth/invalid-credential")) msg = "Email atau Password Salah.";
        if(msg.includes("auth/user-not-found")) msg = "User tidak ditemukan. Silakan daftar dulu di Firebase Console.";
        alert("Login Gagal: " + msg);
    });
});

document.getElementById("google-login-btn").addEventListener("click", () => {
    signInWithPopup(auth, provider).catch(err => {
        alert("Login Google Gagal: " + err.message + "\n\nPastikan 'Google Sign-in' sudah di-enable di Firebase Console.");
    });
});

// === 3. NAVIGATION ===
window.switchTab = (tabId) => {
    // ganti tampilan section
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${tabId}`).classList.add('active');

    // aktifkan menu sidebar
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    const navs = document.querySelectorAll('.nav-links li');
    if (tabId === 'dashboard') navs[0].classList.add('active');
    if (tabId === 'input')      navs[1].classList.add('active');
    if (tabId === 'report')     navs[2].classList.add('active');
    if (tabId === 'reference')  navs[3].classList.add('active');

    // behaviour per tab
    if (tabId === 'dashboard') refreshDashboard();
    if (tabId === 'report')    loadReportVisit();
};

// === 4. REFERENCE DATA ===
async function loadReferences() {
    const tbody = document.getElementById("refTableBody");
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Sedang memuat data...</td></tr>';

    try {
        const q = query(collection(db, 'references'));
        const snapshot = await getDocs(q);
        
        referenceData = [];
        tbody.innerHTML = "";
        let count = 0;
        const maxDisplay = 100; 

        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            d.id = docSnap.id;
            referenceData.push(d);
            
            if(count < maxDisplay) {
                const desc = d.description || d.descObject || "-";
                tbody.innerHTML += `
                    <tr>
                        <td>${d.module}</td>
                        <td>${d.deviceModule}</td>
                        <td>${d.modulType}</td>
                        <td>${d.boardName}</td>
                        <td>${desc}</td>
                        <td><button class="btn btn-sm btn-danger" onclick="deleteRef('${d.id}')"><i class="fas fa-trash"></i></button></td>
                    </tr>
                `;
            }
            count++;
        });
        
        if(count === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Data Kosong. Silakan Import CSV.</td></tr>';
        } else if(count > maxDisplay) {
            tbody.innerHTML += `<tr><td colspan="6" style="text-align:center; color:#888;">... ${count - maxDisplay} data lainnya ...</td></tr>`;
        }
        
        populateModuleDropdown();

    } catch (err) {
        console.error("Firebase Error:", err);
        let errorMsg = err.message;
        if(errorMsg.includes("Missing or insufficient permissions")) {
            errorMsg = "IZIN DITOLAK: Pastikan 'Firestore Rules' di Firebase Console sudah diset ke 'allow read, write: if true;'";
        }
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">${errorMsg}</td></tr>`;
        alert(errorMsg);
    }
}

function populateModuleDropdown() {
    const uniqueModules = [...new Set(referenceData.map(item => item.module).filter(x => x))].sort();
    const sel = document.getElementById("inpModule");
    sel.innerHTML = '<option value="">-- Pilih Module --</option>';
    uniqueModules.forEach(m => sel.innerHTML += `<option value="${m}">${m}</option>`);
    sel.disabled = false;
}

// Cascading Dropdown Listeners
document.getElementById("inpModule").addEventListener("change", (e) => {
    const val = e.target.value;
    const nextSel = document.getElementById("inpDeviceModule");
    nextSel.innerHTML = '<option value="">-- Pilih Device --</option>';
    const filtered = referenceData.filter(r => r.module === val);
    const uniqueDev = [...new Set(filtered.map(r => r.deviceModule).filter(x => x))].sort();
    uniqueDev.forEach(d => nextSel.innerHTML += `<option value="${d}">${d}</option>`);
    nextSel.disabled = false;
    resetDropdowns(['inpModulType', 'inpBoardName']);
    clearAutoFill();
});

document.getElementById("inpDeviceModule").addEventListener("change", (e) => {
    const mod = document.getElementById("inpModule").value;
    const dev = e.target.value;
    const nextSel = document.getElementById("inpModulType");
    nextSel.innerHTML = '<option value="">-- Pilih Type --</option>';
    const filtered = referenceData.filter(r => r.module === mod && r.deviceModule === dev);
    const uniqueType = [...new Set(filtered.map(r => r.modulType).filter(x => x))].sort();
    uniqueType.forEach(t => nextSel.innerHTML += `<option value="${t}">${t}</option>`);
    nextSel.disabled = false;
    resetDropdowns(['inpBoardName']);
    clearAutoFill();
});

document.getElementById("inpModulType").addEventListener("change", (e) => {
    const mod = document.getElementById("inpModule").value;
    const dev = document.getElementById("inpDeviceModule").value;
    const type = e.target.value;
    const nextSel = document.getElementById("inpBoardName");
    nextSel.innerHTML = '<option value="">-- Pilih Board --</option>';
    const filtered = referenceData.filter(r => r.module === mod && r.deviceModule === dev && r.modulType === type);
    const uniqueBoard = [...new Set(filtered.map(r => r.boardName).filter(x => x))].sort();
    uniqueBoard.forEach(b => nextSel.innerHTML += `<option value="${b}">${b}</option>`);
    nextSel.disabled = false;
    clearAutoFill();
});

document.getElementById("inpBoardName").addEventListener("change", (e) => {
    const mod = document.getElementById("inpModule").value;
    const dev = document.getElementById("inpDeviceModule").value;
    const type = document.getElementById("inpModulType").value;
    const board = e.target.value;
    const found = referenceData.find(r => r.module === mod && r.deviceModule === dev && r.modulType === type && r.boardName === board);
    if(found) {
        document.getElementById("autoDesc").value = found.description || found.descObject || "-";
        document.getElementById("autoTypeObj").value = found.typeObject || "-";
        document.getElementById("autoManuf").value = found.manufacturer || "-";
        document.getElementById("autoProdType").value = found.productType || "-";
    }
});

function resetDropdowns(ids) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        el.innerHTML = '<option value="">--</option>';
        el.disabled = true;
    });
}
function clearAutoFill() {
    document.getElementById("autoDesc").value = "";
    document.getElementById("autoTypeObj").value = "";
    document.getElementById("autoManuf").value = "";
    document.getElementById("autoProdType").value = "";
}

// === 5. CSV IMPORT (SMART PARSER – SUPPORT ; , dan TAB) ===
document.getElementById("importCsvRef").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const statusEl = document.getElementById("importStatus");
    statusEl.style.color = "#333";
    statusEl.textContent = "Menganalisa file CSV...";

    reader.onload = async (event) => {
        try {
            const text = event.target.result;

            // Pecah jadi baris
            let lines = text.split(/\r\n|\n|\r/).filter(l => l && l.trim() !== "");
            if (lines.length < 2) throw new Error("File CSV kosong / hanya berisi header.");

            const header = lines[0];

            // Hitung kandidat delimiter
            const semiCount = (header.match(/;/g) || []).length;
            const commaCount = (header.match(/,/g) || []).length;
            const tabCount = (header.match(/\t/g) || []).length;

            let delimiter = ";";
            let delimLabel = "Titik Koma (;)";

            const maxCount = Math.max(semiCount, commaCount, tabCount);
            if (maxCount === tabCount) {
                delimiter = "\t";
                delimLabel = "TAB";
            } else if (maxCount === commaCount) {
                delimiter = ",";
                delimLabel = "Koma (,)";
            } else {
                delimiter = ";";
                delimLabel = "Titik Koma (;)";
            }

            statusEl.textContent = `Memproses... (Delimiter terdeteksi: ${delimLabel})`;

            // Fungsi bersih-bersih string
            const clean = (str) => {
                if (!str && str !== 0) return "";
                return String(str)
                    .trim()
                    .replace(/^"|"$/g, "")
                    .replace(/[\x00-\x1F\x7F-\x9F]/g, "");
            };

            const batchSize = 400;
            let batch = writeBatch(db);
            let countInBatch = 0;
            let totalImported = 0;

            // Lewati baris header (mulai dari index 1)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line || line.trim() === "") continue;

                const cols = line.split(delimiter);

                // Minimal harus ada 2 kolom supaya masuk akal
                if (cols.length < 2) continue;

                // Mapping kolom sesuai file contoh:
                // 0: Module
                // 1: Device Module
                // 2: Modul Type
                // 3: Board Name
                // 4: Description Object (SAP)
                // 5: Type Object (SAP)
                // 6: Manufacturer (SAP)
                // 7: Product Type-MM (SAP)
                const refData = {
                    module:       clean(cols[0]),
                    deviceModule: clean(cols[1]),
                    modulType:    clean(cols[2]),
                    boardName:    clean(cols[3] || "-"),
                    description:  clean(cols[4] || ""),   // Description Object (SAP)
                    typeObject:   clean(cols[5] || ""),   // Type Object (SAP)
                    manufacturer: clean(cols[6] || ""),   // Manufacturer (SAP)
                    productType:  clean(cols[7] || "")    // Product Type-MM (SAP)
                };

                // Jika module & device kosong, skip baris
                if (!refData.module && !refData.deviceModule) continue;

                const newRef = doc(collection(db, "references"));
                batch.set(newRef, refData);
                countInBatch++;
                totalImported++;

                // Commit per batch untuk aman (limit 500 doc per batch Firestore)
                if (countInBatch >= batchSize) {
                    await batch.commit();
                    batch = writeBatch(db);
                    countInBatch = 0;
                    statusEl.textContent = `Terupload ${totalImported} baris... (delimiter: ${delimLabel})`;
                }
            }

            if (countInBatch > 0) {
                await batch.commit();
            }

            if (totalImported === 0) {
                statusEl.style.color = "red";
                statusEl.textContent = "Tidak ada baris valid yang berhasil diimport. Cek kembali format CSV.";
            } else {
                statusEl.style.color = "green";
                statusEl.textContent = `SUKSES! ${totalImported} data referensi berhasil diimpor.`;
            }

            // Refresh tampilan tabel & dropdown Module/Device/Type/Board
            await loadReferences();

        } catch (err) {
            console.error("CSV Import Error:", err);
            statusEl.style.color = "red";
            let msg = err.message || String(err);
            if (msg.includes("Missing or insufficient permissions")) {
                msg = "IZIN FIRESTORE DITOLAK: Cek rules Firestore (allow read, write: if true; untuk testing).";
            }
            statusEl.textContent = `ERROR: ${msg}`;
            alert(`Gagal import CSV:\n${msg}`);
        } finally {
            // Reset input supaya bisa pilih file yang sama lagi kalau mau re-import
            e.target.value = "";
        }
    };

    // Baca sebagai teks (browser akan handle encoding umum: UTF-8, ANSI, dll)
    reader.readAsText(file);
});

window.deleteAllRefs = async () => {
    if(!confirm("Yakin HAPUS SEMUA DATA REFERENSI?")) return;
    const statusEl = document.getElementById("importStatus");
    statusEl.textContent = "Menghapus data...";
    
    try {
        const q = query(collection(db, 'references'));
        const snapshot = await getDocs(q);
        let batch = writeBatch(db);
        let count = 0;
        
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
            count++;
            if(count >= 400) { batch.commit(); batch = writeBatch(db); count = 0; }
        });
        if(count > 0) await batch.commit();
        statusEl.textContent = "Data referensi kosong.";
        loadReferences();
    } catch (e) {
        alert("Gagal hapus: " + e.message);
    }
}

window.openRefModal = () => document.getElementById("ref-modal").style.display = "flex";
window.closeRefModal = () => document.getElementById("ref-modal").style.display = "none";
window.deleteRef = async (id) => {
    if(confirm("Hapus item ini?")) {
        await deleteDoc(doc(db, 'references', id));
        loadReferences();
    }
}
document.getElementById("refForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const newData = {
            module: document.getElementById("refModule").value,
            deviceModule: document.getElementById("refDevMod").value,
            modulType: document.getElementById("refModType").value,
            boardName: document.getElementById("refBoard").value,
            description: document.getElementById("refDesc").value,
            typeObject: document.getElementById("refTypeObj").value,
            manufacturer: document.getElementById("refManuf").value,
            productType: document.getElementById("refProd").value
        };
        await addDoc(collection(db, 'references'), newData);
        alert("Berhasil!");
        closeRefModal();
        loadReferences();
    } catch(err) {
        alert("Gagal Simpan: " + err.message);
    }
});

// === 6. SCANNER & CHIPS ===
window.openCamera = async (target) => {
    document.getElementById("camera-modal").style.display = "flex";
    currentCameraTarget = target;
    if(liveQrCode) { await liveQrCode.stop().catch(()=>{}); liveQrCode.clear(); }
    liveQrCode = new Html5Qrcode("qr-camera-view");
    liveQrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (decodedText) => {
        if(currentCameraTarget === 'SN') addSnChip(decodedText);
        else document.getElementById("valPN").value = decodedText;
        if(currentCameraTarget === 'PN') { closeCamera(); alert("PN: " + decodedText); }
    }).catch(err => alert("Kamera Error: " + err));
}
window.closeCamera = () => {
    if(liveQrCode) liveQrCode.stop().catch(()=>{});
    document.getElementById("camera-modal").style.display = "none";
}
window.triggerFileScan = (target) => {
    const inputId = target === 'SN' ? 'fileSN' : 'filePN';
    const input = document.getElementById(inputId);
    if(!input.files[0]) return alert("Pilih file gambar dulu!");
    const scanner = new Html5Qrcode("qr-reader");
    scanner.scanFile(input.files[0], false).then(decodedText => {
        if(target === 'SN') addSnChip(decodedText);
        else document.getElementById("valPN").value = decodedText;
        alert(`Scan: ${decodedText}`);
    }).catch(err => alert("Tidak ada QR/Barcode pada gambar ini."));
}
function addSnChip(text) {
    if(!text) return;
    const clean = text.trim().toUpperCase();
    if(snList.includes(clean)) return;
    snList.push(clean);
    renderChips();
}
window.removeSnChip = (idx) => {
    snList.splice(idx, 1);
    renderChips();
}
function renderChips() {
    const con = document.getElementById("snTagsContainer");
    con.innerHTML = "";
    snList.forEach((sn, i) => {
        con.innerHTML += `<div class="chip">${sn} <i class="fas fa-times" onclick="removeSnChip(${i})"></i></div>`;
    });
    document.getElementById("valSN").value = snList.join(", ");
}

// === 7. SUBMIT & UPLOAD ===
async function uploadFile(fileInputId, folder) {
    const file = document.getElementById(fileInputId).files[0];
    if(!file) return null;
    const uniqueName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `uploads/${currentUserId}/${folder}/${uniqueName}`);
    try {
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    } catch(err) {
        console.error("Upload Error:", err);
        throw new Error(`Gagal Upload Foto (${folder}). Cek Storage Rules!`);
    }
}

document.getElementById("dataForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const status = document.getElementById("submitStatus");
    if(snList.length === 0 && !document.getElementById("valSN").value) return alert("Wajib isi SN (Scan atau Manual)!");
    
    btn.disabled = true;
    status.textContent = "Mengupload...";
    
    try {
        const [urlSN, urlPN, urlLabel, urlType, urlFar] = await Promise.all([
            uploadFile("fileSN", "sn"),
            uploadFile("filePN", "pn"),
            uploadFile("fotoLabel", "device_photos"),
            uploadFile("fotoType", "device_photos"),
            uploadFile("fotoFar", "device_photos")
        ]);

        const dataPayload = {
            date: document.getElementById("inpDate").value,
            siteCode: document.getElementById("inpSiteCode").value,
            siteName: document.getElementById("inpSiteName").value,
            pic: document.getElementById("inpPic").value,
            rackNo: document.getElementById("inpRackNo").value,
            floor: document.getElementById("inpFloor").value,
            module: document.getElementById("inpModule").value,
            deviceModule: document.getElementById("inpDeviceModule").value,
            modulType: document.getElementById("inpModulType").value,
            boardName: document.getElementById("inpBoardName").value,
            description: document.getElementById("autoDesc").value,
            typeObject: document.getElementById("autoTypeObj").value,
            manufacturer: document.getElementById("autoManuf").value,
            productType: document.getElementById("autoProdType").value,
            status: document.getElementById("inpStatus").value,
            serialNumber: document.getElementById("valSN").value,
            partNumber: document.getElementById("valPN").value,
            photos: { sn: urlSN, pn: urlPN, label: urlLabel, type: urlType, far: urlFar },
            createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, `users/${currentUserId}/devices`), dataPayload);
        status.textContent = "Tersimpan!";
        status.style.color = "green";
        e.target.reset();
        snList = []; renderChips();
        resetDropdowns(['inpDeviceModule', 'inpModulType', 'inpBoardName']);
        setTimeout(() => status.textContent = "", 3000);
    } catch (err) {
        status.textContent = "Error: " + err.message;
        status.style.color = "red";
        alert(err.message);
    } finally {
        btn.disabled = false;
    }
});

// === 8. REPORT & DASHBOARD ===
function loadReportData() {
    // Fungsi ini sekarang hanya dipakai untuk hitung statistik & chart
    const q = query(collection(db, `users/${currentUserId}/devices`), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        let total = 0, active = 0, sites = new Set();
        const statusCounts = { Active: 0, 'Not Active': 0, Dismantle: 0 };
        const deviceTypeCounts = {};

        snap.forEach(docSnap => {
            const d = docSnap.data();
            total++; sites.add(d.siteName);
            if (d.status === 'Active') active++;
            if (statusCounts[d.status] !== undefined) statusCounts[d.status]++;

            const mod = d.module || "Lainnya";
            deviceTypeCounts[mod] = (deviceTypeCounts[mod] || 0) + 1;
        });

        // Update kartu statistik
        document.getElementById("stat-total-visit").textContent = total;
        document.getElementById("stat-unique-site").textContent = sites.size;
        document.getElementById("stat-active-device").textContent = active;

        // Update chart
        updateCharts(statusCounts, deviceTypeCounts);
    }, (error) => {
        console.error("Report Error:", error);
    });
}

window.deleteReport = async (id) => {
    if(confirm("Hapus laporan?")) await deleteDoc(doc(db, `users/${currentUserId}/devices`, id));
}
function updateCharts(sData, dData) {
    const ctx1 = document.getElementById('chartStatus').getContext('2d');
    const ctx2 = document.getElementById('chartDeviceType').getContext('2d');
    if(chartInstances.s) chartInstances.s.destroy();
    if(chartInstances.d) chartInstances.d.destroy();
    chartInstances.s = new Chart(ctx1, { type: 'doughnut', data: { labels: Object.keys(sData), datasets: [{ data: Object.values(sData), backgroundColor: ['#28a745', '#dc3545', '#ffc107'] }] } });
    chartInstances.d = new Chart(ctx2, { type: 'bar', data: { labels: Object.keys(dData), datasets: [{ label: 'Jumlah', data: Object.values(dData), backgroundColor: '#005a9c' }] } });
}
window.refreshDashboard = () => {
    // Force reload references juga
    loadReferences();
}
window.exportExcel = () => {
    const table = document.getElementById("reportVisitTable");
    if (!table) {
        alert("Tabel report belum tersedia.");
        return;
    }
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, "Report_Victory.xlsx");
};
window.downloadAllImages = () => alert("Fitur ZIP sedang dikembangkan.");

// cache data visit untuk keperluan edit & search
let visitCacheById = {};
// ============================
// 8b. REPORT VISIT (TABEL BARU)
// ============================

// muat semua data visit dari koleksi "visit_data"
async function loadReportVisit() {
    const tbody = document.getElementById("reportVisitTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="15" style="text-align:center">Memuat data...</td></tr>`;
    visitCacheById = {};

    try {
        const snap = await getDocs(collection(db, "visit_data"));
        let html = "";

        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="15" style="text-align:center">Belum ada data visit.</td></tr>`;
            return;
        }

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const id = docSnap.id;

            // simpan ke cache
            visitCacheById[id] = d;

            html += `
                <tr data-id="${id}">
                    <td>${d.date || "-"}</td>
                    <td>${d.siteCode || "-"}</td>
                    <td>${d.siteName || "-"}</td>
                    <td>${d.picName || "-"}</td>
                    <td>${d.module || "-"}</td>
                    <td>${d.deviceModule || "-"}</td>
                    <td>${d.modulType || "-"}</td>
                    <td>${d.boardName || "-"}</td>
                    <td>${d.status || "-"}</td>

                    <td>${Array.isArray(d.serialNumbers) ? d.serialNumbers.join("<br>") : (d.serialNumber || "-")}</td>
                    <td>${d.partNumber || "-"}</td>

                    <td>${d.fotoSN  ? `<img src="${d.fotoSN}"  class="tbl-img">` : "-"}</td>
                    <td>${d.fotoPN  ? `<img src="${d.fotoPN}"  class="tbl-img">` : "-"}</td>
                    <td>
                        ${d.fotoLabel ? `<img src="${d.fotoLabel}" class="tbl-img">` : ""}
                        ${d.fotoType  ? `<img src="${d.fotoType}"  class="tbl-img">` : ""}
                        ${d.fotoFar   ? `<img src="${d.fotoFar}"   class="tbl-img">` : ""}
                    </td>

                    <td>
                        <button class="btn-mini btn-warning" onclick="openEditVisit('${id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        // setelah data terisi, apply filter kalau ada input
        filterReportVisit();

    } catch (err) {
        console.error("loadReportVisit error:", err);
        tbody.innerHTML = `<tr><td colspan="15" style="text-align:center;color:red;">Gagal memuat data: ${err.message}</td></tr>`;
    }
}

// search / filter data pada tabel
document.getElementById("reportSearchInput").addEventListener("input", filterReportVisit);
document.getElementById("reportSearchField").addEventListener("change", filterReportVisit);

function filterReportVisit() {
    const q = document.getElementById("reportSearchInput").value.toLowerCase();
    const field = document.getElementById("reportSearchField").value;
    const rows = document.querySelectorAll("#reportVisitTableBody tr");

    const mapIndex = {
        siteCode:      1,
        siteName:      2,
        picName:       3,
        module:        4,
        deviceModule:  5,
        serialNumbers: 9,
        partNumbers:   10
    };

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        // row kosong (misal: "Memuat data..."), biarkan saja
        if (!cells.length || cells.length < 15) return;

        let textData = "";

        if (field === "all") {
            textData = row.innerText.toLowerCase();
        } else {
            const idx = mapIndex[field];
            if (idx == null || !cells[idx]) {
                textData = row.innerText.toLowerCase();
            } else {
                textData = cells[idx].innerText.toLowerCase();
            }
        }

        row.style.display = textData.includes(q) ? "" : "none";
    });
}

// =====================
// 8c. EDIT DATA VISIT
// =====================

// buka modal edit
window.openEditVisit = async function (id) {
    const modal = document.getElementById("editVisitModal");
    if (!modal) return;

    document.getElementById("editVisitId").value = id;

    // ambil dari cache dulu
    let d = visitCacheById[id];

    // kalau cache kosong, fallback ke getDoc
    if (!d) {
        const snap = await getDoc(doc(db, "visit_data", id));
        if (!snap.exists()) {
            alert("Dokumen visit tidak ditemukan (mungkin sudah terhapus).");
            return;
        }
        d = snap.data();
    }

    document.getElementById("editPicName").value = d.picName || "";
    document.getElementById("editStatus").value = d.status || "Active";
    document.getElementById("editPN").value = d.partNumber || "";

    modal.style.display = "flex";
};

window.closeEditVisit = function () {
    const modal = document.getElementById("editVisitModal");
    if (modal) modal.style.display = "none";
};

// submit perubahan edit
document.getElementById("editVisitForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("editVisitId").value;
    if (!id) {
        alert("ID dokumen kosong. Refresh halaman dan coba lagi.");
        return;
    }

    const payload = {
        picName:   document.getElementById("editPicName").value || null,
        status:    document.getElementById("editStatus").value || null,
        partNumber:document.getElementById("editPN").value || null
    };

    try {
        // pakai setDoc merge, supaya tidak error "No document to update"
        await setDoc(doc(db, "visit_data", id), payload, { merge: true });

        alert("Data visit berhasil diperbarui.");
        closeEditVisit();
        await loadReportVisit();
    } catch (err) {
        console.error("Update visit error:", err);
        alert("Gagal update data visit: " + err.message);
    }
});

















