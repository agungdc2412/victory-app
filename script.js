/*
 * SCRIPT V.I.C.T.O.R.Y v4.1 (Enterprise Edition)
 * Fitur: CSV Import, Cascading Dropdown, Multi-SN, Dashboard Analytics
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, writeBatch, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// === 1. KONFIGURASI FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyDbTMK4ihGTmLa3fGAwHXdbMOwueDhEHW8",
    authDomain: "victory-app-isp.firebaseapp.com",
    projectId: "victory-app-isp",
    storageBucket: "victory-app-isp.firebasestorage.app",
    messagingSenderId: "1023135709213",
    appId: "1:1023135709213:web:68dac1fdb975913bb56ef4",
    measurementId: "G-Q1DJ3BG41V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// === STATE MANAGEMENT ===
let currentUser = null;
let currentUserId = null;
let referenceData = []; // Cache lokal data referensi
let snList = [];        // Array untuk Chips SN
let liveQrCode = null;
let currentCameraTarget = null;
let chartInstances = {};

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
    signInWithEmailAndPassword(auth, em, pw).catch(err => alert("Login Gagal: " + err.message));
});

document.getElementById("google-login-btn").addEventListener("click", () => {
    signInWithPopup(auth, provider);
});

// === 3. NAVIGATION (SPA LOGIC) ===
window.switchTab = (tabId) => {
    // Sembunyikan semua section
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    // Tampilkan section yang dipilih
    document.getElementById(`view-${tabId}`).classList.add('active');
    
    // Update active state di sidebar
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    // Cari elemen li parent dari yang diklik (sedikit hacky tapi works untuk onclick inline)
    const navItems = document.querySelectorAll('.nav-links li');
    if(tabId === 'dashboard') navItems[0].classList.add('active');
    if(tabId === 'input') navItems[1].classList.add('active');
    if(tabId === 'report') navItems[2].classList.add('active');
    if(tabId === 'reference') navItems[3].classList.add('active');

    if(tabId === 'dashboard') refreshDashboard();
}

// === 4. REFERENCE DATA & CASCADING DROPDOWNS ===

// A. Load References from Firestore
async function loadReferences() {
    const tbody = document.getElementById("refTableBody");
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Memuat data...</td></tr>';

    try {
        const q = query(collection(db, 'references'));
        const snapshot = await getDocs(q);
        
        referenceData = [];
        tbody.innerHTML = "";
        
        let count = 0;
        const maxDisplay = 50; // Limit tampilan tabel agar browser tidak berat

        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            d.id = docSnap.id;
            referenceData.push(d);
            
            if(count < maxDisplay) {
                tbody.innerHTML += `
                    <tr>
                        <td>${d.module}</td>
                        <td>${d.deviceModule}</td>
                        <td>${d.modulType}</td>
                        <td>${d.boardName}</td>
                        <td>${d.descObject || '-'}</td>
                        <td><button class="btn btn-sm btn-danger" onclick="deleteRef('${d.id}')"><i class="fas fa-trash"></i></button></td>
                    </tr>
                `;
            }
            count++;
        });
        
        if(count === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada data referensi. Silakan Import CSV.</td></tr>';
        } else if(count > maxDisplay) {
            tbody.innerHTML += `<tr><td colspan="6" style="text-align:center; color:#888;">... dan ${count - maxDisplay} data lainnya (Disembunyikan demi performa) ...</td></tr>`;
        }
        
        // Inisialisasi Dropdown Level 1
        populateModuleDropdown();

    } catch (err) {
        console.error("Gagal load referensi:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Gagal memuat data. Cek koneksi internet.</td></tr>';
    }
}

// B. Populate Dropdown 1: Module
function populateModuleDropdown() {
    const uniqueModules = [...new Set(referenceData.map(item => item.module).filter(Boolean))].sort();
    const sel = document.getElementById("inpModule");
    sel.innerHTML = '<option value="">-- Pilih Module --</option>';
    uniqueModules.forEach(m => sel.innerHTML += `<option value="${m}">${m}</option>`);
    sel.disabled = false;
}

// C. Event Listeners untuk Cascading Logic
// 1. Module -> Device Module
document.getElementById("inpModule").addEventListener("change", (e) => {
    const val = e.target.value;
    const nextSel = document.getElementById("inpDeviceModule");
    nextSel.innerHTML = '<option value="">-- Pilih Device --</option>';
    
    // Filter data berdasarkan Module yang dipilih
    const filtered = referenceData.filter(r => r.module === val);
    const uniqueDev = [...new Set(filtered.map(r => r.deviceModule).filter(Boolean))].sort();
    
    uniqueDev.forEach(d => nextSel.innerHTML += `<option value="${d}">${d}</option>`);
    nextSel.disabled = false;
    
    // Reset dropdown di bawahnya
    resetDropdowns(['inpModulType', 'inpBoardName']);
    clearAutoFill();
});

// 2. Device Module -> Modul Type
document.getElementById("inpDeviceModule").addEventListener("change", (e) => {
    const mod = document.getElementById("inpModule").value;
    const dev = e.target.value;
    const nextSel = document.getElementById("inpModulType");
    nextSel.innerHTML = '<option value="">-- Pilih Type --</option>';
    
    const filtered = referenceData.filter(r => r.module === mod && r.deviceModule === dev);
    const uniqueType = [...new Set(filtered.map(r => r.modulType).filter(Boolean))].sort();
    
    uniqueType.forEach(t => nextSel.innerHTML += `<option value="${t}">${t}</option>`);
    nextSel.disabled = false;
    
    resetDropdowns(['inpBoardName']);
    clearAutoFill();
});

// 3. Modul Type -> Board Name
document.getElementById("inpModulType").addEventListener("change", (e) => {
    const mod = document.getElementById("inpModule").value;
    const dev = document.getElementById("inpDeviceModule").value;
    const type = e.target.value;
    const nextSel = document.getElementById("inpBoardName");
    nextSel.innerHTML = '<option value="">-- Pilih Board --</option>';
    
    const filtered = referenceData.filter(r => r.module === mod && r.deviceModule === dev && r.modulType === type);
    const uniqueBoard = [...new Set(filtered.map(r => r.boardName).filter(Boolean))].sort();
    
    uniqueBoard.forEach(b => nextSel.innerHTML += `<option value="${b}">${b}</option>`);
    nextSel.disabled = false;
    
    clearAutoFill();
});

// 4. Board Name -> Auto Fill
document.getElementById("inpBoardName").addEventListener("change", (e) => {
    const mod = document.getElementById("inpModule").value;
    const dev = document.getElementById("inpDeviceModule").value;
    const type = document.getElementById("inpModulType").value;
    const board = e.target.value;
    
    // Cari objek yang cocok persis
    const found = referenceData.find(r => 
        r.module === mod && 
        r.deviceModule === dev && 
        r.modulType === type && 
        r.boardName === board
    );
    
    if(found) {
        document.getElementById("autoDesc").value = found.descObject || "-";
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

// === 5. CSV IMPORT LOGIC (Parser) ===
document.getElementById("importCsvRef").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    const statusEl = document.getElementById("importStatus");
    statusEl.textContent = "Membaca file CSV...";
    statusEl.style.color = "blue";
    
    reader.onload = async (event) => {
        const text = event.target.result;
        const lines = text.split('\n');
        
        const batchSize = 400; 
        let batch = writeBatch(db);
        let count = 0;
        let totalImported = 0;
        
        statusEl.textContent = `Memproses ${lines.length} baris data... (Mohon jangan tutup halaman)`;
        
        // Loop mulai index 1 karena index 0 adalah Header
        for(let i=1; i<lines.length; i++) {
            const line = lines[i].trim();
            if(!line) continue;
            
            // Parsing CSV (Delimiter ;)
            const cols = line.split(';');
            
            // Mapping sesuai urutan kolom di CSV Anda
            const refData = {
                module: cols[0]?.trim() || "",
                deviceModule: cols[1]?.trim() || "",
                modulType: cols[2]?.trim() || "",
                boardName: cols[3]?.trim() || "-",
                descObject: cols[4]?.trim() || "",
                typeObject: cols[5]?.trim() || "",
                manufacturer: cols[6]?.trim() || "",
                productType: cols[7]?.trim() || ""
            };
            
            const newRef = doc(collection(db, "references"));
            batch.set(newRef, refData);
            count++;
            totalImported++;
            
            if(count >= batchSize) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
                statusEl.textContent = `Terupload ${totalImported} data...`;
            }
        }
        
        if(count > 0) await batch.commit();
        
        statusEl.textContent = `Sukses! Total ${totalImported} data referensi berhasil diimpor.`;
        statusEl.style.color = "green";
        loadReferences(); // Refresh data di memori
        
        // Reset input file agar bisa upload file yang sama jika perlu
        e.target.value = "";
    };
    reader.readAsText(file);
});

// Hapus Semua Data Referensi
window.deleteAllRefs = async () => {
    if(!confirm("PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA DATA REFERENSI?\n\nDatabase referensi akan kosong dan user harus import ulang.")) return;
    
    const statusEl = document.getElementById("importStatus");
    statusEl.textContent = "Menghapus data... (Mohon tunggu)";
    statusEl.style.color = "red";
    
    const q = query(collection(db, 'references'));
    const snapshot = await getDocs(q);
    
    let batch = writeBatch(db);
    let count = 0;
    
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
        count++;
        if(count >= 400) {
            batch.commit();
            batch = writeBatch(db);
            count = 0;
        }
    });
    
    if(count > 0) await batch.commit();
    
    statusEl.textContent = "Database referensi telah dikosongkan.";
    loadReferences();
}

window.openRefModal = () => document.getElementById("ref-modal").style.display = "flex";
window.closeRefModal = () => document.getElementById("ref-modal").style.display = "none";
window.deleteRef = async (id) => {
    if(confirm("Hapus item referensi ini?")) {
        await deleteDoc(doc(db, 'references', id));
        loadReferences();
    }
}
// Tambah Referensi Manual
document.getElementById("refForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const newData = {
        module: document.getElementById("refModule").value,
        deviceModule: document.getElementById("refDevMod").value,
        modulType: document.getElementById("refModType").value,
        boardName: document.getElementById("refBoard").value,
        descObject: document.getElementById("refDesc").value,
        typeObject: document.getElementById("refTypeObj").value,
        manufacturer: document.getElementById("refManuf").value,
        productType: document.getElementById("refProd").value
    };
    await addDoc(collection(db, 'references'), newData);
    alert("Data berhasil ditambahkan!");
    closeRefModal();
    loadReferences();
});

// === 6. SCANNER & MULTI-SN CHIPS ===
window.openCamera = async (target) => {
    document.getElementById("camera-modal").style.display = "flex";
    currentCameraTarget = target;
    
    if(liveQrCode) { await liveQrCode.stop().catch(()=>{}); liveQrCode.clear(); }
    
    liveQrCode = new Html5Qrcode("qr-camera-view");
    
    liveQrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 250 }, 
        (decodedText) => {
            if(currentCameraTarget === 'SN') addSnChip(decodedText);
            else document.getElementById("valPN").value = decodedText;
            
            // Opsional: Tutup kamera otomatis jika target PN (karena PN biasanya cuma 1)
            if(currentCameraTarget === 'PN') {
                closeCamera();
                alert("PN Terdeteksi: " + decodedText);
            }
        }
    ).catch(err => alert("Gagal akses kamera: " + err));
}

window.closeCamera = () => {
    if(liveQrCode) liveQrCode.stop().catch(()=>{});
    document.getElementById("camera-modal").style.display = "none";
}

window.triggerFileScan = (target) => {
    const inputId = target === 'SN' ? 'fileSN' : 'filePN';
    const input = document.getElementById(inputId);
    
    if(!input.files[0]) return alert("Pilih file gambar terlebih dahulu!");
    
    const scanner = new Html5Qrcode("qr-reader");
    scanner.scanFile(input.files[0], false)
        .then(decodedText => {
            if(target === 'SN') addSnChip(decodedText);
            else document.getElementById("valPN").value = decodedText;
            alert(`Scan Berhasil: ${decodedText}`);
        })
        .catch(err => {
            console.error(err);
            alert("Tidak ditemukan kode QR/Barcode pada gambar ini.");
        });
}

// Logika Chips SN
function addSnChip(text) {
    if(!text) return;
    const clean = text.trim().toUpperCase();
    
    // Cek duplikat
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
        con.innerHTML += `
            <div class="chip">
                ${sn} 
                <i class="fas fa-times" onclick="removeSnChip(${i})"></i>
            </div>
        `;
    });
    
    // Update hidden input untuk dikirim ke DB
    document.getElementById("valSN").value = snList.join(", ");
}

// === 7. FORM SUBMIT & UPLOAD IMAGES ===

// Helper Upload
async function uploadFile(fileInputId, folderName) {
    const file = document.getElementById(fileInputId).files[0];
    if(!file) return null; // Jika user tidak upload, return null
    
    const uniqueName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `uploads/${currentUserId}/${folderName}/${uniqueName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
}

document.getElementById("dataForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const btn = e.target.querySelector("button[type=submit]");
    const status = document.getElementById("submitStatus");
    
    // Validasi Manual
    if(snList.length === 0 && !document.getElementById("valSN").value) {
        alert("Wajib isi Serial Number (Scan atau Manual via Chips).");
        return;
    }
    
    btn.disabled = true;
    status.textContent = "Sedang mengupload foto... (Mohon tunggu)";
    status.style.color = "blue";
    
    try {
        // Upload 5 Foto secara Paralel
        const [urlSN, urlPN, urlLabel, urlType, urlFar] = await Promise.all([
            uploadFile("fileSN", "sn"),
            uploadFile("filePN", "pn"),
            uploadFile("fotoLabel", "device_photos"),
            uploadFile("fotoType", "device_photos"),
            uploadFile("fotoFar", "device_photos")
        ]);

        // Siapkan Payload Data
        const dataPayload = {
            date: document.getElementById("inpDate").value,
            siteCode: document.getElementById("inpSiteCode").value,
            siteName: document.getElementById("inpSiteName").value,
            pic: document.getElementById("inpPic").value,
            rackNo: document.getElementById("inpRackNo").value,
            floor: document.getElementById("inpFloor").value,
            
            // Device Info
            module: document.getElementById("inpModule").value,
            deviceModule: document.getElementById("inpDeviceModule").value,
            modulType: document.getElementById("inpModulType").value,
            boardName: document.getElementById("inpBoardName").value,
            
            // Auto-filled Info
            descObject: document.getElementById("autoDesc").value,
            typeObject: document.getElementById("autoTypeObj").value,
            manufacturer: document.getElementById("autoManuf").value,
            productType: document.getElementById("autoProdType").value,
            
            status: document.getElementById("inpStatus").value,
            
            // Identification
            serialNumber: document.getElementById("valSN").value,
            partNumber: document.getElementById("valPN").value,
            
            // Photos
            photos: {
                sn: urlSN,
                pn: urlPN,
                label: urlLabel,
                type: urlType,
                far: urlFar
            },
            
            createdAt: new Date().toISOString()
        };

        // Simpan ke Firestore
        await addDoc(collection(db, `users/${currentUserId}/devices`), dataPayload);
        
        status.textContent = "Data Berhasil Disimpan!";
        status.style.color = "green";
        
        // Reset Form
        e.target.reset();
        snList = []; 
        renderChips();
        resetDropdowns(['inpDeviceModule', 'inpModulType', 'inpBoardName']);
        
        setTimeout(() => { status.textContent = ""; }, 5000);
        
    } catch (err) {
        console.error(err);
        status.textContent = "Gagal menyimpan: " + err.message;
        status.style.color = "red";
    } finally {
        btn.disabled = false;
    }
});

// === 8. REPORT TABLE & DASHBOARD ===

function loadReportData() {
    const q = query(collection(db, `users/${currentUserId}/devices`), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snap) => {
        const tbody = document.getElementById("reportTableBody");
        tbody.innerHTML = "";
        
        let total = 0;
        let activeCount = 0;
        const sites = new Set();
        
        // Data untuk Chart
        const statusCounts = { Active: 0, 'Not Active': 0, Dismantle: 0 };
        const deviceTypeCounts = {};

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const id = docSnap.id;
            
            total++;
            sites.add(d.siteName);
            
            // Hitung Status
            if(statusCounts[d.status] !== undefined) statusCounts[d.status]++;
            if(d.status === 'Active') activeCount++;
            
            // Hitung Tipe Module untuk Chart
            const modName = d.module || "Unknown";
            deviceTypeCounts[modName] = (deviceTypeCounts[modName] || 0) + 1;

            // Render Table
            tbody.innerHTML += `
                <tr>
                    <td>${d.date}</td>
                    <td>${d.siteName}<br><small>${d.siteCode}</small></td>
                    <td>${d.rackNo}</td>
                    <td>${d.deviceModule}<br><small>${d.boardName}</small></td>
                    <td>
                        SN: ${d.serialNumber}<br>
                        <small>PN: ${d.partNumber}</small>
                    </td>
                    <td>
                        <span class="badge ${d.status === 'Active' ? 'badge-success' : 'badge-danger'}">
                            ${d.status}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteReport('${id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        // Update Dashboard Cards
        document.getElementById("stat-total-visit").textContent = total;
        document.getElementById("stat-unique-site").textContent = sites.size;
        document.getElementById("stat-active-device").textContent = activeCount;

        // Update Charts
        updateCharts(statusCounts, deviceTypeCounts);
    });
}

window.deleteReport = async (id) => {
    if(confirm("Apakah Anda yakin ingin menghapus laporan kunjungan ini?")) {
        await deleteDoc(doc(db, `users/${currentUserId}/devices`, id));
    }
}

function loadDashboardStats() {
    // Dipanggil saat auth ready, fungsinya sama dengan loadReportData karena onSnapshot sudah realtime
    // Placeholder function jika ingin logic terpisah di masa depan
}

function updateCharts(statusData, deviceData) {
    const ctx1 = document.getElementById('chartStatus').getContext('2d');
    const ctx2 = document.getElementById('chartDeviceType').getContext('2d');

    // Destroy chart lama jika ada agar tidak numpuk
    if(chartInstances.status) chartInstances.status.destroy();
    if(chartInstances.device) chartInstances.device.destroy();

    // Chart 1: Doughnut Status
    chartInstances.status = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusData),
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Status Perangkat' },
                legend: { position: 'bottom' }
            }
        }
    });

    // Chart 2: Bar Device Type
    chartInstances.device = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: Object.keys(deviceData),
            datasets: [{
                label: 'Jumlah Perangkat',
                data: Object.values(deviceData),
                backgroundColor: '#005a9c',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Distribusi Module Device' },
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

window.refreshDashboard = () => {
    // Trigger ulang listener
    // onSnapshot sebenarnya sudah otomatis, tapi kita bisa force reload jika perlu
    console.log("Dashboard refreshed.");
}

// === EXPORT EXCEL & ZIP ===
window.exportExcel = () => {
    const table = document.getElementById("reportTable");
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, `Report_Victory_${new Date().toISOString().split('T')[0]}.xlsx`);
}

window.downloadAllImages = () => {
    alert("Fitur Download ZIP sedang dalam pengembangan (Membutuhkan Proxy CORS). Silakan gunakan Excel untuk rekap data teks.");
}
