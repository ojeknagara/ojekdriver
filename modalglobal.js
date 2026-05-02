import { supabase } from './supabaseClient.js';

// ==========================================
// 1. INJEKSI CSS (MURNI & VARIABEL)
// ==========================================
const style = document.createElement('style');
style.innerHTML = `
:root {
    --primary-red: #ff0000;
    --dark-red: #cc0000;
    --white: #ffffff;
    --gray-bg: #f8f9fa;
    --text-dark: #212529;
    --text-muted: #6c757d;
    --shadow: 0 10px 40px rgba(0,0,0,0.25);
    --radius: 16px;
    --transition: all 0.2s ease-in-out;
}

/* Modal Overlay Global */
.onar-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
    opacity: 0;
    transition: opacity 0.3s;
}
.onar-overlay.show {
    display: flex;
    opacity: 1;
}

/* Box Modal Order & Alert */
.onar-modal {
    background: var(--white);
    width: 100%;
    max-width: 400px;
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: var(--shadow);
    transform: translateY(30px);
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.onar-overlay.show .onar-modal {
    transform: translateY(0);
}

/* Header Modal */
.onar-header {
    background: var(--primary-red);
    color: var(--white);
    padding: 15px 20px;
    text-align: center;
    position: relative;
}
.onar-header h2 {
    margin: 0;
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 1px;
}
.timer-badge {
    position: absolute;
    top: 50%; right: 15px;
    transform: translateY(-50%);
    background: var(--white);
    color: var(--primary-red);
    padding: 4px 10px;
    border-radius: 20px;
    font-weight: bold;
    font-size: 0.9rem;
}

/* Body Modal */
.onar-body {
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
}
.data-row {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
}
.data-row:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}
.data-label {
    display: block;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 4px;
    text-transform: uppercase;
}
.data-value {
    margin: 0;
    font-size: 0.95rem;
    color: var(--text-dark);
    font-weight: 600;
}
.highlight-price {
    font-size: 1.4rem;
    color: var(--primary-red);
    text-align: center;
    margin: 15px 0 5px 0;
}

/* List Menu Makanan */
.menu-list {
    background: var(--gray-bg);
    padding: 10px;
    border-radius: 8px;
    margin-top: 5px;
}
.menu-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    margin-bottom: 5px;
}

/* Footer Modal (Tombol) */
.onar-footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 15px 20px 20px;
}
.btn {
    border: none;
    padding: 12px;
    border-radius: 8px;
    font-weight: bold;
    font-size: 1rem;
    cursor: pointer;
    text-transform: uppercase;
    transition: var(--transition);
}
.btn-terima {
    background: var(--primary-red);
    color: var(--white);
}
.btn-terima:hover {
    background: var(--dark-red);
}
.btn-tolak {
    background: #e9ecef;
    color: var(--text-dark);
}
.btn-tolak:hover {
    background: #ced4da;
}
.btn-full {
    grid-column: span 2;
}

@media (max-width: 480px) {
    .onar-modal { max-width: 90%; }
}
`;
document.head.appendChild(style);

// ==========================================
// 2. INJEKSI STRUKTUR HTML MODAL
// ==========================================
const htmlStructure = `
<div class="onar-overlay" id="modalOrderOverlay">
    <div class="onar-modal">
        <div class="onar-header">
            <h2 id="orderTitle">ORDER MASUK</h2>
            <div class="timer-badge"><span id="orderTimer">10</span>s</div>
        </div>
        <div class="onar-body" id="orderContent">
            </div>
        <div class="onar-footer">
            <button class="btn btn-tolak" id="btnTolak">Tolak</button>
            <button class="btn btn-terima" id="btnTerima">Terima</button>
        </div>
    </div>
</div>

<div class="onar-overlay" id="modalAlertOverlay" style="z-index: 10000;">
    <div class="onar-modal">
        <div class="onar-header">
            <h2>PEMBERITAHUAN</h2>
        </div>
        <div class="onar-body text-center">
            <p class="data-value" id="alertMessage" style="text-align:center; padding: 20px 0;"></p>
        </div>
        <div class="onar-footer">
            <button class="btn btn-terima btn-full" id="btnTutupAlert">Tutup</button>
        </div>
    </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', htmlStructure);

// ==========================================
// 3. VARIABEL STATE, UTILS & AUDIO
// ==========================================
let globalDriverId = null;
let currentOrderData = null;
let calculatedPotongan = 0;
let timeoutId = null;
let intervalId = null;

// Konfigurasi Suara Notifikasi (Pastikan file notif.mp3 ada)
const audioNotif = new Audio('notif.mp3');
audioNotif.loop = true;

// Format Rupiah
const formatRp = (angka) => `Rp ${Number(angka).toLocaleString('id-ID')}`;

// Custom Alert Function (Mengganti alert bawaan browser)
const showOnarAlert = (message) => {
    document.getElementById('alertMessage').innerText = message;
    document.getElementById('modalAlertOverlay').classList.add('show');
};
document.getElementById('btnTutupAlert').addEventListener('click', () => {
    document.getElementById('modalAlertOverlay').classList.remove('show');
});

// ==========================================
// 4. LOGIKA UTAMA & RENDER MODAL
// ==========================================
const renderModalContent = async (order, tarif) => {
    const contentBox = document.getElementById('orderContent');
    document.getElementById('orderTitle').innerText = `ORDER ${order.jenis}`;
    
    const { data: userData } = await supabase.from('users').select('nama').eq('id', order.user_id).single();
    const namaUser = userData ? userData.nama : 'Unknown User';

    let html = '';
    calculatedPotongan = 0;

    // AMBIL NILAI PASTI DARI DATABASE (Tabel Orders)
    const ongkirFix = Number(order.ongkir) || 0; 
    const totalFix = Number(order.total) || 0;

    // LOGIKA OJEK
    if (order.jenis === 'ojek') {
        calculatedPotongan = tarif.potongan_ojek;

        html = `
            <div class="data-row"><span class="data-label">Nama Penumpang</span><p class="data-value">${namaUser}</p></div>
            <div class="data-row"><span class="data-label">Titik Jemput</span><p class="data-value">${order.titik_jemput}</p></div>
            <div class="data-row"><span class="data-label">Titik Antar</span><p class="data-value">${order.titik_antar}</p></div>
            <div class="data-row"><span class="data-label">Jarak</span><p class="data-value">${Number(order.jarak).toFixed(1)} Km</p></div>
            <div class="data-row"><span class="data-label">Ongkir</span><p class="data-value highlight-price">${formatRp(ongkirFix)}</p></div>
        `;
    } 
    // LOGIKA MAKANAN
    else if (order.jenis === 'makanan') {
        const { data: details } = await supabase.from('order_detail').select('qty, harga, menu(nama)').eq('order_id', order.id);
        let totalPorsi = 0;
        let totalBiayaMakanan = 0;
        let listHtml = '<div class="menu-list">';
        
        if(details) {
            details.forEach(d => {
                totalPorsi += d.qty;
                totalBiayaMakanan += (d.harga * d.qty);
                listHtml += `<div class="menu-item"><span>${d.qty}x ${d.menu.nama}</span><span>${formatRp(d.harga * d.qty)}</span></div>`;
            });
        }
        listHtml += '</div>';

        // Kalkulasi Potongan Saldo tetap dihitung di sini untuk driver: Dasar + (Per Porsi x Qty)
        calculatedPotongan = tarif.potongan_makanan + (tarif.potongan_porsi * totalPorsi);

        html = `
            <div class="data-row"><span class="data-label">Nama Pemesan</span><p class="data-value">${namaUser}</p></div>
            <div class="data-row"><span class="data-label">Pesanan Makanan</span>${listHtml}</div>
            <div class="data-row"><span class="data-label">Titik Jemput (Resto)</span><p class="data-value">${order.titik_jemput}</p></div>
            <div class="data-row"><span class="data-label">Titik Antar</span><p class="data-value">${order.titik_antar}</p></div>
            <div class="data-row">
                <div style="display:flex; justify-content:space-between;">
                    <span class="data-label">Ongkir: ${formatRp(ongkirFix)}</span>
                    <span class="data-label">Makanan: ${formatRp(totalBiayaMakanan)}</span>
                </div>
                <p class="data-value highlight-price">Total Tagihan: ${formatRp(totalFix)}</p>
            </div>
        `;
    }
    // LOGIKA KURIR
    else if (order.jenis === 'kurir') {
        calculatedPotongan = tarif.potongan_kurir;

        html = `
            <div class="data-row"><span class="data-label">Nama Pengirim</span><p class="data-value">${namaUser}</p></div>
            <div class="data-row"><span class="data-label">Barang / Deskripsi</span><p class="data-value">${order.nama_barang || '-'} <br> <small style="font-weight:normal">${order.deskripsi_barang || ''}</small></p></div>
            <div class="data-row"><span class="data-label">Titik Jemput</span><p class="data-value">${order.titik_jemput}</p></div>
            <div class="data-row"><span class="data-label">Titik Antar</span><p class="data-value">${order.titik_antar}</p></div>
            <div class="data-row"><span class="data-label">Ongkir</span><p class="data-value highlight-price">${formatRp(ongkirFix)}</p></div>
        `;
    }

    contentBox.innerHTML = html;
};

// ==========================================
// 5. MANAJEMEN TIMER, SUARA & TAMPILAN
// ==========================================
const clearOrderTimer = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
};

const closeOrderModal = () => {
    document.getElementById('modalOrderOverlay').classList.remove('show');
    
    audioNotif.pause();
    audioNotif.currentTime = 0;
    
    clearOrderTimer();
    currentOrderData = null;
};

const triggerModalOrder = async (orderData) => {
    currentOrderData = orderData;
    
    const { data: tarifData, error } = await supabase.from('tarif').select('*').limit(1).single();
    if(error || !tarifData) {
        console.error("Gagal load tarif:", error);
        return;
    }

    await renderModalContent(orderData, tarifData);
    
    document.getElementById('modalOrderOverlay').classList.add('show');

    audioNotif.play().catch(error => {
        console.log("Autoplay audio dicegah oleh browser sebelum user berinteraksi:", error);
    });

    let timeLeft = 10;
    document.getElementById('orderTimer').innerText = timeLeft;
    
    intervalId = setInterval(() => {
        timeLeft--;
        document.getElementById('orderTimer').innerText = timeLeft;
    }, 1000);

    timeoutId = setTimeout(async () => {
        await processTolakOrder();
    }, 10000);
};

// ==========================================
// 6. AKSI TERIMA & TOLAK
// ==========================================
const processTolakOrder = async () => {
    if(!currentOrderData || !globalDriverId) return;
    const orderId = currentOrderData.id;
    closeOrderModal();

    try {
        await supabase.rpc('tolak_order_safe', {
            p_order_id: orderId,
            p_driver_id: globalDriverId
        });
    } catch (err) {
        console.error("Gagal tolak order:", err);
    }
};

const processTerimaOrder = async () => {
    if(!currentOrderData || !globalDriverId) return;
    
    clearOrderTimer(); 
    audioNotif.pause();
    audioNotif.currentTime = 0;
    
    const orderId = currentOrderData.id;
    const jenisOrder = currentOrderData.jenis;
    const potonganFinal = calculatedPotongan; 

    try {
        const { data, error } = await supabase.rpc('ambil_order_safe', {
            p_order_id: orderId,
            p_driver_id: globalDriverId,
            p_potongan: potonganFinal
        });

        if (error) throw error;

        if (data === true) {
            closeOrderModal();
            // Arahkan ke halaman sesuai jenis order
            if(jenisOrder === 'ojek') window.location.href = 'driver_ojek.html';
            else if(jenisOrder === 'makanan') window.location.href = 'driver_makanan.html';
            else if(jenisOrder === 'kurir') window.location.href = 'driver_kurir.html';
        } else {
            closeOrderModal();
            showOnarAlert("Gagal mengambil pesanan! Pastikan saldo Anda mencukupi (Min. Saldo untuk potongan: " + formatRp(potonganFinal) + ") atau pesanan telah diambil/dibatalkan.");
        }
    } catch (err) {
        console.error("Error terima order:", err);
        closeOrderModal();
        showOnarAlert("Terjadi kesalahan sistem saat mengambil pesanan.");
    }
};

document.getElementById('btnTolak').addEventListener('click', processTolakOrder);
document.getElementById('btnTerima').addEventListener('click', processTerimaOrder);

// ==========================================
// 7. INISIALISASI & REALTIME LISTENER
// ==========================================
export const initGlobalModal = async () => {
    console.log("ModalGlobal: Memeriksa Sesi...");
    
    // PENGGUNAAN KEY YANG TEPAT: "token"
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log("ModalGlobal: Token tidak ditemukan, menunggu login...");
        return;
    }

    const { data: sessionInfo } = await supabase.rpc('cek_session', { p_token: token });
    if (!sessionInfo || sessionInfo.length === 0 || sessionInfo[0].role !== 'driver') {
        console.log("ModalGlobal: Sesi tidak valid / bukan driver.");
        return;
    }
    
    globalDriverId = sessionInfo[0].user_id;
    console.log("ModalGlobal: Listener ON untuk Driver ID:", globalDriverId);

    supabase
        .channel('global-orders-listener')
        .on('postgres_changes', { 
            event: '*', // Deteksi Insert maupun Update
            schema: 'public', 
            table: 'orders',
            filter: `target_driver_id=eq.${globalDriverId}`
        }, (payload) => {
            const order = payload.new;
            console.log("ModalGlobal: Event Order Masuk!", order.status);
            
            if (order.status === 'offered' && order.driver_id === null) {
                if(!currentOrderData || currentOrderData.id !== order.id) {
                    triggerModalOrder(order);
                }
            }
            
            if (order.status !== 'offered' && currentOrderData && currentOrderData.id === order.id) {
                closeOrderModal();
                showOnarAlert("Pesanan telah dibatalkan oleh sistem atau pengguna.");
            }
        })
        .subscribe();
};

// MEMASTIKAN FUNGSI SELALU TERPANGGIL
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalModal);
} else {
    initGlobalModal();
}