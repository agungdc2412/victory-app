/*
 * SCRIPT APLIKASI V.I.C.T.O.R.Y v3.6 (Fixed Multi-Tag & Camera)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, deleteDoc, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {

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

    // === 2. VARIABEL GLOBAL ===
    let currentUser = null;
    let currentUserId = null;
    let dataKunjungan = []; // Menyimpan data lokal
    let serialNumberList = []; // ARRAY UNTUK MENAMPUNG MULTI-SN (FITUR BARU)
    
    // Variabel Kamera
    let liveQrCode = null;
    let liveScanTarget = null; // 'SN' atau 'PN'

    // Referensi DOM Utama
    const appContainer = document.getElementById('app-container');
    const loginContainer = document.getElementById('login-container');
    
    // Referensi Elemen Form
    const snTagsContainer = document.getElementById("snTagsContainer");
    const hasilSN = document.getElementById("hasilSN");
    const hasilPN = document.getElementById("hasilPN");
    const siteName = document.getElementById("siteName");
    const jenisDevice = document.getElementById("jenisDevice");

    // === 3. FUNGSI MULTI-SN (SISTEM CHIPS) ===
    
    // Menambah SN ke daftar
    function addSerialNumberTag(text) {
        if (!text) return;
        const cleanText = text.trim();
        
        // Cek duplikat
        if (serialNumberList.includes(cleanText)) {
            // Opsional: Beri feedback visual/audio jika duplikat
            console.log("SN sudah ada di daftar");
            return;
        }
        
        serialNumberList.push(cleanText);
        renderSnTags();
    }

    // Menghapus SN (dibuat global agar bisa dipanggil dari HTML onclick)
    window.removeSnTag = function(index) {
        serialNumberList.splice(index, 1);
        renderSnTags();
    }

    // Render tampilan Chips
    function renderSnTags() {
        snTagsContainer.innerHTML = ""; // Bersihkan wadah
        
        if (serialNumberList.length === 0) {
            snTagsContainer.innerHTML = '<span style="color: #aaa; font-size: 0.85rem; padding: 5px;">Hasil scan akan muncul di sini...</span>';
            hasilSN.value = ""; // Kosongkan input hidden
            return;
        }

        // Loop array dan buat elemen Chip
        serialNumberList.forEach((sn, index) => {
            const tag = document.createElement("div");
            tag.className = "sn-tag";
            tag.innerHTML = `
                ${sn} 
                <span class="sn-tag-remove" onclick="window.removeSnTag(${index})">&times;</span>
            `;
            snTagsContainer.appendChild(tag);
        });

        // Update input hidden dengan format gabungan (SN1, SN2, SN3)
        hasilSN.value = serialNumberList.join(", ");
    }

    // === 4. LOGIKA SCANNER (FILE & KAMERA) ===
    
    // A. Scan dari File (Upload Gambar)
    async function runQRScan(fileInput, statusEl, resultEl, btnEl) {
        const file = fileInput.files[0];
        if (!file) {
            statusEl.textContent = "Pilih file gambar terlebih dahulu.";
            statusEl.style.color = "red";
            return;
        }

        statusEl.textContent = "Scanning...";
        statusEl.style.color = "blue";
        btnEl.disabled = true;
        const originalText = btnEl.textContent;
        btnEl.textContent = "Memproses...";

        try {
            // Pastikan library sudah dimuat
            if (!window.Html5Qrcode) throw new Error("Library QR Code belum siap. Coba refresh halaman.");
            
            // Gunakan div 'qr-reader' yang tersembunyi sebagai anchor
            const html5QrCode = new window.Html5Qrcode("qr-reader");
            const decodedText = await html5QrCode.scanFile(file, false);

            // Logika percabangan hasil scan
            if (resultEl === hasilSN) {
                // Jika scan SN, tambahkan ke Chips
                addSerialNumberTag(decodedText);
                statusEl.textContent = `Berhasil menambahkan: ${decodedText}`;
            } else {
                // Jika scan PN, timpah input biasa
                resultEl.value = decodedText;
                statusEl.textContent = "Scan Berhasil!";
            }
            
            statusEl.style.color = "green";
            html5QrCode.clear();

        } catch (error) {
            console.error(error);
            statusEl.textContent = "Gagal memindai. Pastikan gambar jelas & berisi kode.";
            statusEl.style.color = "red";
        } finally {
            btnEl.disabled = false;
            btnEl.textContent = originalText;
        }
    }

    // B. Scan dari Kamera (Live)
    async function openCameraScan(targetField) {
        const modal = document.getElementById("camera-modal");
        const statusEl = document.getElementById("camera-status");
        const chkContinuous = document.getElementById("chkContinuousScan");
        
        modal.style.display = "flex";
        liveScanTarget = targetField;
        statusEl.textContent = "Menyiapkan kamera...";
        
        // Hentikan instance lama jika ada
        if (liveQrCode) {
            await liveQrCode.stop().catch(e => console.log(e));
            await liveQrCode.clear().catch(e => console.log(e));
        }
        
        liveQrCode = new window.Html5Qrcode("qr-reader-camera");
        
        const onSuccess = (decodedText) => {
            if (liveScanTarget === "SN") {
                addSerialNumberTag(decodedText);
                statusEl.textContent = `Berhasil Scan: ${decodedText}`;
            } else {
                hasilPN.value = decodedText;
                statusEl.textContent = "Part Number Terdeteksi!";
            }
            statusEl.style.color = "green";

            // Jika mode continuous MATI, tutup kamera setelah scan
            if (!chkContinuous.checked) {
                stopCameraScan();
            }
        };

        try {
            // Mulai kamera (utamakan kamera belakang)
            await liveQrCode.start(
                { facingMode: "environment" }, 
                { fps: 10, qrbox: 250 }, 
                onSuccess
            );
            statusEl.textContent = "Kamera Aktif. Arahkan ke Barcode/QR.";
            statusEl.style.color = "blue";
        } catch (err) {
            console.error(err);
            statusEl.textContent = "Gagal akses kamera: " + err;
            statusEl.style.color = "red";
        }
    }

    function stopCameraScan() {
        const modal = document.getElementById("camera-modal");
        if (liveQrCode) {
            liveQrCode.stop().catch(e => console.log(e)).finally(() => {
                liveQrCode.clear();
            });
        }
        modal.style.display = "none";
    }

    // === 5. EVENT LISTENERS (TOMBOL SCAN) ===
    
    // Tombol Scan File
    document.getElementById("btnScanSN").addEventListener("click", () => {
        runQRScan(document.getElementById("fotoUploadSN"), document.getElementById("ocrStatusSN"), hasilSN, document.getElementById("btnScanSN"));
    });
    document.getElementById("btnScanPN").addEventListener("click", () => {
        runQRScan(document.getElementById("fotoUploadPN"), document.getElementById("ocrStatusPN"), hasilPN, document.getElementById("btnScanPN"));
    });

    // Tombol Scan Kamera
    document.getElementById("btnCameraSN").addEventListener("click", () => openCameraScan("SN"));
    document.getElementById("btnCameraPN").addEventListener("click", () => openCameraScan("PN"));
    document.getElementById("btnCloseCamera").addEventListener("click", stopCameraScan);


    // === 6. HELPER: PREVIEW GAMBAR & DATALIST ===
    function setupImagePreview(inputId, imgId) {
        document.getElementById(inputId).addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = document.getElementById(imgId);
                    img.src = ev.target.result;
                    img.style.display = "block";
                };
                reader.readAsDataURL(file);
            } else {
                document.getElementById(imgId).style.display = "none";
            }
        });
    }
    setupImagePreview("fotoUploadSN", "imagePreviewSN");
    setupImagePreview("fotoUploadPN", "imagePreviewPN");
    setupImagePreview("fotoUploadGPS", "imagePreviewGPS");

    // Data Autocomplete (Bisa ditambah sesuai kebutuhan)
    const dataLists = {
        'listNamaRack': ["Modul", "DWDM", "Rectifier", "Battery", "OTB", "AC", "Lainnya"],
        'listJenisDevice': ["DWDM Huawei", "DWDM Nokia", "OLT ZTE", "Router Cisco", "Switch", "Rectifier", "Battery"],
        'listModulType': ["Control Card", "Line Card", "Power", "Fan", "SFP"],
        'listBoardName': ["V3T220", "S7N402", "S1EFI", "S1CTU"],
        'listDeviceMerk': ["Nokia", "Huawei", "ZTE", "Cisco", "Mikrotik"]
    };

    for (const [id, items] of Object.entries(dataLists)) {
        const datalist = document.getElementById(id);
        if (datalist) {
            datalist.innerHTML = "";
            items.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item;
                datalist.appendChild(opt);
            });
        }
    }

    // === 7. AUTHENTICATION LOGIC ===
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            currentUserId = user.uid;
            appContainer.style.display = 'block';
            loginContainer.style.display = 'none';
            document.getElementById("user-email").textContent = user.email;
            setupFirestoreListener(currentUserId);
            
            // Ambil GPS Lokasi saat login (opsional)
            if(navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(p => {
                    document.getElementById("gpsInfo").innerHTML = `<a href="https://maps.google.com/?q=${p.coords.latitude},${p.coords.longitude}" target="_blank">Lokasi Terkunci (Klik Map)</a>`;
                }, () => {
                    document.getElementById("gpsInfo").textContent = "Lokasi tidak diizinkan.";
                });
            }
        } else {
            currentUser = null;
            currentUserId = null;
            appContainer.style.display = 'none';
            loginContainer.style.display = 'flex';
        }
    });

    document.getElementById("login-btn").addEventListener("click", (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const pass = document.getElementById("login-password").value;
        signInWithEmailAndPassword(auth, email, pass)
        .catch(e => document.getElementById("login-error").textContent = "Login Gagal: " + e.message);
    });
    
    document.getElementById("register-btn").addEventListener("click", (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const pass = document.getElementById("login-password").value;
        createUserWithEmailAndPassword(auth, email, pass)
        .then(() => alert("Akun berhasil dibuat! Silakan login."))
        .catch(e => document.getElementById("login-error").textContent = "Register Gagal: " + e.message);
    });

    document.getElementById("google-login-btn").addEventListener("click", () => {
        signInWithPopup(auth, provider).catch(e => console.error(e));
    });

    document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

    // === 8. SIMPAN DATA KE FIREBASE (SUBMIT FORM) ===
    document.getElementById("dataForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("btnCreateCard");
        const status = document.getElementById("form-status");

        // Validasi Sederhana
        if (!siteName.value || !jenisDevice.value) {
            status.textContent = "Harap lengkapi data utama (Nama Site & Jenis Device).";
            status.style.color = "red";
            return;
        }
        
        btn.disabled = true;
        status.textContent = "Sedang menyimpan data...";
        status.style.color = "blue";
        
        try {
            // TODO: Di versi produksi, gunakan uploadBytes() untuk upload foto ke Firebase Storage
            // dan dapatkan URL download-nya. Untuk demo ini, kita simpan data teks saja.
            // (Lihat kode v3.5.2 sebelumnya untuk fungsi uploadFile lengkap)
            
            // Simpan Dokumen ke Firestore
            await addDoc(collection(db, 'users', currentUserId, 'devices'), {
                tanggal: document.getElementById("inputTanggal").value,
                site: siteName.value,
                pic: document.getElementById("picName").value,
                noRack: document.getElementById("noRack").value,
                namaRack: document.getElementById("namaRack").value,
                jenisDevice: jenisDevice.value,
                modulType: document.getElementById("modulType").value,
                boardName: document.getElementById("boardName").value,
                merk: document.getElementById("deviceMerk").value,
                status: document.getElementById("deviceStatus").value,
                remark: document.getElementById("remark").value,
                
                serialNumber: hasilSN.value, // INI SUDAH BERISI GABUNGAN STRING (SN1, SN2, ...)
                partNumber: hasilPN.value,
                
                // URL foto (placeholder jika belum implementasi upload)
                fotoUrlSN: null, 
                fotoUrlPN: null,
                fotoUrlGPS: null,
                
                createdAt: new Date().toISOString()
            });

            status.textContent = "Data Berhasil Disimpan!";
            status.style.color = "green";
            
            // Reset Form & State
            e.target.reset();
            serialNumberList = []; // Kosongkan array SN
            renderSnTags(); // Bersihkan visual chips
            
            // Reset Preview Gambar
            document.getElementById("imagePreviewSN").style.display = "none";
            document.getElementById("imagePreviewPN").style.display = "none";
            document.getElementById("imagePreviewGPS").style.display = "none";

        } catch (err) {
            console.error("Error submit:", err);
            status.textContent = "Gagal menyimpan: " + err.message;
            status.style.color = "red";
        } finally {
            btn.disabled = false;
            // Hilangkan status setelah 3 detik
            setTimeout(() => { 
                if(status.textContent.includes("Berhasil")) status.textContent = ""; 
            }, 3000);
        }
    });

    // === 9. MENAMPILKAN DATA (REALTIME LISTENER) ===
    function setupFirestoreListener(uid) {
        // Listener Realtime ke Koleksi 'devices' user ini
        onSnapshot(query(collection(db, 'users', uid, 'devices')), (snapshot) => {
            const container = document.getElementById("hasilDataContainer");
            dataKunjungan = []; // Reset data lokal
            container.innerHTML = ""; // Reset tampilan
            
            if (snapshot.empty) {
                container.innerHTML = "<p>Belum ada data yang tersimpan.</p>";
                return;
            }
            
            snapshot.forEach(doc => {
                const data = doc.data();
                data.id = doc.id; // Simpan ID dokumen untuk keperluan hapus/edit
                dataKunjungan.push(data);
                
                // Buat Elemen Kartu
                const div = document.createElement("div");
                div.className = "data-card";
                div.innerHTML = `
                    <h3>${data.site} <small style="color:#777; font-size:0.8rem;">(${data.tanggal})</small></h3>
                    <button class="btn-delete-card" onclick="hapusData('${data.id}')" title="Hapus Data">&times;</button>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; font-size:0.9rem; margin-top:10px;">
                        <div>
                            <p><strong>PIC:</strong> ${data.pic}</p>
                            <p><strong>Device:</strong> ${data.jenisDevice}</p>
                            <p><strong>Merk:</strong> ${data.merk}</p>
                        </div>
                        <div style="background:#f9f9f9; padding:8px; border-radius:6px;">
                            <p><strong>SN:</strong> ${data.serialNumber || '-'}</p>
                            <p><strong>PN:</strong> ${data.partNumber || '-'}</p>
                        </div>
                    </div>
                    <p style="margin-top:10px; font-style:italic; color:#666;">Remark: ${data.remark || '-'}</p>
                `;
                container.appendChild(div);
            });
        }, (error) => {
            console.error("Error listener:", error);
            document.getElementById("hasilDataContainer").innerHTML = "<p style='color:red'>Gagal memuat data.</p>";
        });
    }

    // Fungsi Hapus Data (Global)
    window.hapusData = async function(docId) {
        if (!confirm("Yakin ingin menghapus data ini?")) return;
        try {
            await deleteDoc(doc(db, 'users', currentUserId, 'devices', docId));
        } catch (e) {
            alert("Gagal menghapus: " + e.message);
        }
    }

    // === 10. EXPORT & DOWNLOAD (OPSIONAL/LANJUTAN) ===
    document.getElementById("btnExportExcel").addEventListener("click", () => {
        if (dataKunjungan.length === 0) return alert("Tidak ada data.");
        const ws = XLSX.utils.json_to_sheet(dataKunjungan);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Visit");
        XLSX.writeFile(wb, "Rekap_Data_Visit.xlsx");
    });
    
    // (Fitur PDF, Zip, Email bisa ditambahkan sesuai kode v3.5.2 sebelumnya)

});
