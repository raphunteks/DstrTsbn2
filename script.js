/**
 * ==========================================
 * 1. APP STATE & GAS CONNECTIONS
 * ==========================================
 */

// Link Google Apps Script Anda (WAJIB DIPERBARUI DENGAN SCRIPT CODE.GS VERSI BARU DI BAWAH)
const GAS_URL = "https://script.google.com/macros/s/AKfycbw45o3mq7UYcuB8knNfdOr7mKLmwFM1sg_52DoircJFjXI4wX4DCE6hilyOd-0bA5mA/exec";

const state = {
    categories: ["Daster Kartika", "Daster Elok", "Daster Setcel", "Daster Gajah Putih", "Daster Dipakemama"],
    activeCategory: "Daster Kartika",
    products: [],  
    orders: [],    // SEKARANG DITARIK REAL-TIME DARI DATABASE
    settings: { qris: "", bca: "", ewallet: "" }, 
    cart: { productId: null, qty: 1, isMakassar: false, ongkir: 15000 },
    currentAdminTab: 'overview',
    tempSelectedOrder: null,
    paymentMethodSelected: ''
};

/**
 * ==========================================
 * 2. UTILITY & TOAST FUNCTIONS
 * ==========================================
 */
const formatRp = (num) => 'Rp ' + Number(num).toLocaleString('id-ID');
const showElement = (id) => document.getElementById(id).classList.remove('hidden');
const hideElement = (id) => document.getElementById(id).classList.add('hidden');
const openModal = (id) => document.getElementById(id).style.display = 'flex';
const closeModal = (id) => document.getElementById(id).style.display = 'none';

function showLoading(text = "Memuat Data...") {
    document.getElementById('loading-text').innerText = text;
    document.getElementById('loading-overlay').style.display = 'flex';
}
function hideLoading() { document.getElementById('loading-overlay').style.display = 'none'; }

// TOAST NOTIFICATION MODERN (Pengganti Alert Kaku)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    let icon = "✅";
    if(type === 'error') icon = "❌";
    else if(type === 'info') icon = "ℹ️";
    
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    
    // Auto remove after animation completes (3s)
    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 3000);
}

/**
 * ==========================================
 * 3. FETCH CORE DATA (BIG UPGRADE)
 * ==========================================
 */
async function fetchInitialData() {
    try {
        showLoading("Sinkronisasi Database...");
        
        // Fetch ALL: Products, Settings, AND ORDERS (Riwayat Lengkap)
        const [resProducts, resSettings, resOrders] = await Promise.all([
            fetch(GAS_URL + "?action=getProducts").catch(() => null),
            fetch(GAS_URL + "?action=getSettings").catch(() => null),
            fetch(GAS_URL + "?action=getOrders").catch(() => null)
        ]);

        if(resProducts) {
            const productsData = await resProducts.json();
            if(productsData && productsData.length > 0) state.products = productsData;
        }

        if(resSettings) {
            const settingsData = await resSettings.json();
            if(settingsData && Object.keys(settingsData).length > 0) state.settings = settingsData;
        }

        // BIG UPGRADE: Fetch Real Orders History
        if(resOrders) {
            const ordersData = await resOrders.json();
            // Simpan pesanan terbaru di atas (reverse)
            if(ordersData && ordersData.length > 0) state.orders = ordersData.reverse(); 
        }

        hideLoading();
        document.getElementById('app').style.display = 'block';
        initCustomerView();
        
    } catch (error) {
        console.error("Gagal menarik data:", error);
        showToast("Gagal memuat data dari server. Menampilkan versi lokal.", "error");
        hideLoading();
        document.getElementById('app').style.display = 'block';
        initCustomerView();
    }
}

/**
 * ==========================================
 * 4. CUSTOMER VIEW LOGIC
 * ==========================================
 */
function initCustomerView() {
    renderCategories();
    renderProducts();
}

function renderCategories() {
    const container = document.getElementById('category-container');
    container.innerHTML = state.categories.map(cat => 
        `<div class="chip ${cat === state.activeCategory ? 'active' : ''}" onclick="setCategory('${cat}')">${cat}</div>`
    ).join('');
}

function setCategory(cat) {
    state.activeCategory = cat;
    renderCategories();
    renderProducts();
}

function renderProducts() {
    const container = document.getElementById('product-container');
    const filtered = state.products.filter(p => p.category === state.activeCategory);
    
    if(filtered.length === 0) {
        container.innerHTML = `<p style="color:var(--text-gray);">Belum ada produk di kategori ini.</p>`;
        return;
    }

    container.innerHTML = filtered.map(p => `
        <div class="product-card glass" onclick="openCartModal('${p.id}')">
            <img src="${p.img}" alt="${p.name}" class="product-img" onerror="this.src='[https://images.unsplash.com/photo-1515347619362-71008cb13645?auto=format&fit=crop&w=300&q=80](https://images.unsplash.com/photo-1515347619362-71008cb13645?auto=format&fit=crop&w=300&q=80)'">
            <div class="product-title">${p.name}</div>
            <div class="product-price">${formatRp(p.price)}</div>
            <button class="btn btn-dark" style="width:100%; margin-top:10px;">+ Tambah ke Keranjang</button>
        </div>
    `).join('');
}

// Cart Logic
function openCartModal(productId) {
    const product = state.products.find(p => p.id === productId);
    if(!product) return;

    state.cart.productId = product.id;
    state.cart.qty = 1;
    
    const detailsHtml = `
        <img src="${product.img}" style="width:100%; border-radius:12px; height:200px; object-fit:cover; margin-bottom:15px;" onerror="this.src='[https://images.unsplash.com/photo-1515347619362-71008cb13645?auto=format&fit=crop&w=300&q=80](https://images.unsplash.com/photo-1515347619362-71008cb13645?auto=format&fit=crop&w=300&q=80)'">
        <h3>${product.name}</h3>
        <p style="color:#f39c12; font-size:0.9rem;">★★★★★ (${product.sold} terjual)</p>
        <h2 style="margin: 10px 0; color: var(--accent-dark);">${formatRp(product.price)}</h2>
        <p style="color:var(--text-gray); font-size:0.9rem; line-height: 1.5;">${product.desc}</p>
        
        <div class="qty-control">
            <button class="qty-btn" onclick="changeQty(-1)">-</button>
            <span id="cart-qty-display" style="font-weight: 600; width: 20px; text-align: center;">1</span>
            <button class="qty-btn" onclick="changeQty(1)">+</button>
        </div>
        <p style="font-size:0.85rem; color: ${product.stock > 5 ? 'var(--success)' : 'var(--danger)'}; font-weight:500;">
            Sisa Stok: ${product.stock} pcs
        </p>
    `;
    document.getElementById('cart-product-details').innerHTML = detailsHtml;
    updateCartSummary();
    openModal('modal-cart');
}

function changeQty(delta) {
    const product = state.products.find(p => p.id === state.cart.productId);
    let newQty = state.cart.qty + delta;
    if(newQty < 1) newQty = 1;
    if(newQty > product.stock) {
        showToast('Maaf, kuantitas melebihi stok yang tersedia!', 'error');
        return;
    }
    state.cart.qty = newQty;
    document.getElementById('cart-qty-display').innerText = state.cart.qty;
    updateCartSummary();
}

function updateCartSummary() {
    const product = state.products.find(p => p.id === state.cart.productId);
    const subtotal = product.price * state.cart.qty;
    let total = subtotal;
    
    document.getElementById('cart-subtotal').innerText = formatRp(subtotal);
    
    if(state.cart.isMakassar) {
        document.getElementById('ongkir-row').style.display = 'flex';
        total += state.cart.ongkir;
    } else {
        document.getElementById('ongkir-row').style.display = 'none';
    }
    
    document.getElementById('cart-total').innerText = formatRp(total);
}

function getLocation() {
    const status = document.getElementById('location-status');
    status.innerText = "Mendeteksi koordinat GPS...";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                const data = await res.json();
                const address = data.display_name;
                document.getElementById('cust-address').value = address;
                
                if(address.toLowerCase().includes('makassar')) {
                    state.cart.isMakassar = true;
                    status.innerText = "Wilayah Makassar terdeteksi. Subsudi/Hitungan Ongkir aktif.";
                } else {
                    state.cart.isMakassar = false;
                    status.innerText = "Lokasi terdeteksi di luar Makassar.";
                }
                updateCartSummary();
            } catch(e) {
                status.innerText = "Gagal menerjemahkan lokasi.";
                status.style.color = "var(--danger)";
            }
        }, (error) => {
            status.innerText = "Izin lokasi diblokir oleh perangkat Anda.";
            status.style.color = "var(--danger)";
        });
    } else {
        status.innerText = "Geolocation tidak didukung.";
    }
}

// Checkout & Payment
function openPaymentModal() {
    const name = document.getElementById('cust-name').value;
    const wa = document.getElementById('cust-wa').value;
    const address = document.getElementById('cust-address').value;

    if(!name || !wa || !address) {
        showToast('Mohon lengkapi Detail Pengiriman Anda', 'error');
        return;
    }
    
    closeModal('modal-cart');
    
    const product = state.products.find(p => p.id === state.cart.productId);
    const total = (product.price * state.cart.qty) + (state.cart.isMakassar ? state.cart.ongkir : 0);
    
    document.getElementById('payment-amount').innerText = formatRp(total);
    selectPayment('QRIS'); // default
    openModal('modal-payment');
}

function selectPayment(method) {
    state.paymentMethodSelected = method;
    const area = document.getElementById('payment-details-area');
    const totalStr = document.getElementById('payment-amount').innerText;
    
    if(method === 'QRIS') {
        const qrisString = state.settings.qris || "00020101021226660014ID.CO.QRIS.WWW..."; 
        area.innerHTML = `
            <p style="margin-bottom:10px; font-weight:500;">Scan QRIS di bawah ini:</p>
            <img src="[https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=$](https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=$){encodeURIComponent(qrisString)}" style="border-radius:12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <p style="margin-top:15px; font-size:0.9rem; color:var(--text-gray);">A.n Daster Tasbon</p>
        `;
    } else if(method === 'BCA') {
        area.innerHTML = `
            <h3 style="color:#0066AE; font-size: 1.5rem;">Bank BCA</h3>
            <div style="background: rgba(0,102,174,0.1); padding: 15px; border-radius: 12px; margin: 15px 0;">
                <p style="font-size:1.8rem; letter-spacing:2px; font-weight:700; color:#0066AE;">${state.settings.bca || "1234567890"}</p>
            </div>
            <p>Silakan transfer tepat sejumlah <b>${totalStr}</b></p>
        `;
    } else {
        area.innerHTML = `
            <h3 style="color:#4a2b75; font-size: 1.5rem;">E-Wallet (OVO/Dana)</h3>
            <div style="background: rgba(74,43,117,0.1); padding: 15px; border-radius: 12px; margin: 15px 0;">
                <p style="font-size:1.8rem; letter-spacing:2px; font-weight:700; color:#4a2b75;">${state.settings.ewallet || "08123456789"}</p>
            </div>
            <p>Silakan transfer tepat sejumlah <b>${totalStr}</b></p>
        `;
    }
}

// POST Request for creating order
async function confirmCustomerOrder() {
    const btn = document.getElementById('btn-confirm-order');
    btn.innerHTML = `<div class="spinner" style="width:20px; height:20px; border-width:2px; border-left-color:white;"></div> Memproses...`;
    btn.disabled = true;

    const name = document.getElementById('cust-name').value;
    const wa = document.getElementById('cust-wa').value;
    const address = document.getElementById('cust-address').value;
    
    const product = state.products.find(p => p.id === state.cart.productId);
    const total = (product.price * state.cart.qty) + (state.cart.isMakassar ? state.cart.ongkir : 0);
    
    const payload = {
        action: "createOrder",
        customerName: name, wa: wa, address: address,
        itemsString: `${state.cart.qty}x ${product.name}`,
        total: total,
        status: `PENDING_${state.paymentMethodSelected.toUpperCase()}`,
        productId: product.id, qty: state.cart.qty
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.status === "success") {
            showToast('Pesanan berhasil dibuat! Menunggu verifikasi admin.', 'success');
            // Update state local instantly
            state.orders.unshift({
                id: result.orderId, date: new Date().toLocaleString("id-ID"), customer: name, total: total, status: payload.status, items: payload.itemsString
            });
            // Update stock local visually
            product.stock -= state.cart.qty;
            closeModal('modal-payment');
            // Clean forms
            document.getElementById('cust-name').value = '';
            document.getElementById('cust-wa').value = '';
        } else {
            showToast('Gagal membuat pesanan: ' + result.message, 'error');
        }
    } catch (error) {
        showToast('Koneksi terputus. Pastikan URL GAS Anda benar.', 'error');
    } finally {
        btn.innerText = "Konfirmasi Saya Sudah Bayar";
        btn.disabled = false;
    }
}

/**
 * ==========================================
 * 5. ADMIN AUTHENTICATION
 * ==========================================
 */
function toggleAdminLogin() {
    const custView = document.getElementById('customer-view');
    if(!custView.classList.contains('hidden')) {
        hideElement('customer-view'); showElement('login-view');
        document.getElementById('btn-toggle-admin').innerText = 'Back to Store';
    } else {
        showElement('customer-view'); hideElement('login-view');
        document.getElementById('btn-toggle-admin').innerText = 'Admin ERP';
    }
}

function processLogin() {
    const u = document.getElementById('admin-user').value;
    const p = document.getElementById('admin-pass').value;
    
    if(u === 'dastertasbon' && p === 'tasbon12') {
        hideElement('login-view'); showElement('admin-view');
        hideElement('btn-toggle-admin'); showElement('btn-logout');
        switchAdminTab('overview');
        showToast('Selamat datang, Admin!', 'success');
    } else {
        showToast('Username atau password salah!', 'error');
    }
}

function logoutAdmin() {
    hideElement('admin-view'); showElement('customer-view');
    showElement('btn-toggle-admin'); hideElement('btn-logout');
    document.getElementById('btn-toggle-admin').innerText = 'Admin ERP';
    document.getElementById('admin-user').value = '';
    document.getElementById('admin-pass').value = '';
    showToast('Berhasil logout.', 'info');
}

/**
 * ==========================================
 * 6. ADMIN DASHBOARD - BIG UPGRADE MODULES
 * ==========================================
 */
function switchAdminTab(tab) {
    state.currentAdminTab = tab;
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');

    const content = document.getElementById('admin-content-area');
    
    if(tab === 'overview') renderOverview(content);
    else if(tab === 'cashier') renderCashier(content);
    else if(tab === 'catalog') renderCatalog(content);
    else if(tab === 'transactions') renderTransactions(content);
    else if(tab === 'finance') renderFinance(content);
    else if(tab === 'settings') renderSettings(content);
}

// 6A. OVERVIEW
function renderOverview(container) {
    const successOrders = state.orders.filter(o => String(o.status).includes('SUCCESS'));
    const totalPenjualan = successOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalStok = state.products.reduce((sum, p) => sum + Number(p.stock), 0);
    const pendingCount = state.orders.filter(o => String(o.status).includes('PENDING')).length;

    container.innerHTML = `
        <h2>Dashboard Overview</h2>
        <div class="dashboard-cards">
            <div class="glass stat-card" style="border-top: 4px solid var(--success)">
                <p>Gross Income (Sukses)</p>
                <h3>${formatRp(totalPenjualan)}</h3>
            </div>
            <div class="glass stat-card" style="border-top: 4px solid var(--warning)">
                <p>Pesanan Pending</p>
                <h3>${pendingCount}</h3>
            </div>
            <div class="glass stat-card" style="border-top: 4px solid var(--info)">
                <p>Sisa Inventory Global</p>
                <h3>${totalStok} pcs</h3>
            </div>
        </div>
        <p style="color:var(--text-gray);">Data riwayat pesanan disinkronisasi dari Database (Sheets) secara real-time saat aplikasi dimuat.</p>
    `;
}

// 6B. CASHIER (POS)
function renderCashier(container) {
    let options = state.products.map(p => `<option value="${p.id}">${p.name} (Sisa: ${p.stock}) - ${formatRp(p.price)}</option>`).join('');
    
    container.innerHTML = `
        <h2>Cashier (Offline POS)</h2>
        <div class="glass" style="padding: 25px; max-width: 500px; margin-top: 20px;">
            <input type="text" id="pos-name" class="input-glass" placeholder="Nama Customer / Tamu">
            <select id="pos-product" class="input-glass" onchange="calcPosTotal()" style="cursor:pointer;">
                <option value="">-- Pilih Produk yang Dibeli --</option>
                ${options}
            </select>
            <div style="display:flex; gap:15px;">
                <input type="number" id="pos-qty" class="input-glass" placeholder="QTY" value="1" oninput="calcPosTotal()">
            </div>
            <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 12px; margin: 15px 0;">
                <p style="font-size: 0.9rem; color:var(--text-gray);">Total Tagihan</p>
                <h3 style="font-size: 1.8rem; color: var(--accent-dark);"><span id="pos-total">Rp 0</span></h3>
            </div>
            <button class="btn btn-dark" style="width: 100%; font-size:1.1rem; padding: 12px;" onclick="processPOS()">💳 Bayar Sekarang (Cetak SUCCESS)</button>
        </div>
    `;
}

function calcPosTotal() {
    const pid = document.getElementById('pos-product').value;
    const qty = parseInt(document.getElementById('pos-qty').value) || 0;
    if(!pid) return;
    const p = state.products.find(x => x.id === pid);
    document.getElementById('pos-total').innerText = formatRp(p.price * qty);
}

async function processPOS() {
    const pid = document.getElementById('pos-product').value;
    const qty = parseInt(document.getElementById('pos-qty').value) || 0;
    const name = document.getElementById('pos-name').value;
    
    if(!pid || !name || qty < 1) return showToast('Lengkapi data Nama dan Produk!', 'error');
    const p = state.products.find(x => x.id === pid);
    if(qty > p.stock) return showToast('Peringatan: Stok di sistem tidak mencukupi!', 'warning');

    const payload = {
        action: "createOrder", customerName: name, wa: "-", address: "Pembelian Offline (Toko)",
        itemsString: `${qty}x ${p.name}`, total: p.price * qty, status: "SUCCESS_OFFLINE",
        productId: p.id, qty: qty
    };

    showLoading("Memproses Transaksi Kasir...");
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if(result.status === "success") {
            p.stock -= qty; p.sold += qty; // Update frontend RAM
            state.orders.unshift({
                id: result.orderId, date: new Date().toLocaleString("id-ID"), customer: name, total: payload.total, status: payload.status, items: payload.itemsString
            });
            showToast('Transaksi Kasir Sukses Disimpan!', 'success');
            switchAdminTab('overview');
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('Gagal memproses. Cek koneksi.', 'error');
    } finally { hideLoading(); }
}

// 6C. CATALOG CRUD
function renderCatalog(container) {
    let trs = state.products.map(p => `
        <tr>
            <td><img src="${p.img}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;"></td>
            <td style="font-weight:500;">${p.name}</td>
            <td>${formatRp(p.price)}</td>
            <td>${p.stock}</td>
            <td>${p.sold}</td>
            <td><button class="btn btn-outline" style="padding: 5px 12px; font-size:0.8rem;" onclick="openProductModal('${p.id}')">✏️ Edit</button></td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2>Catalog Product & Inventory</h2>
            <button class="btn btn-dark" onclick="openProductModal()">+ Tambah Produk</button>
        </div>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr><th>Foto</th><th>Nama Produk</th><th>Harga Jual</th><th>Stok</th><th>Terjual</th><th>Action</th></tr>
                </thead>
                <tbody>${trs}</tbody>
            </table>
        </div>
    `;
}

function openProductModal(id = null) {
    const previewImg = document.getElementById('prod-preview-img');
    if(id) {
        const p = state.products.find(x => x.id === id);
        document.getElementById('product-modal-title').innerText = "Edit Product";
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-cat').value = p.category;
        document.getElementById('prod-desc').value = p.desc;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-modal').value = p.modal;
        document.getElementById('prod-stock').value = p.stock;
        previewImg.src = p.img; previewImg.style.display = 'block';
    } else {
        document.getElementById('product-modal-title').innerText = "Add New Product";
        document.getElementById('prod-id').value = "";
        document.getElementById('prod-name').value = "";
        document.getElementById('prod-desc').value = "";
        document.getElementById('prod-price').value = "";
        document.getElementById('prod-modal').value = "";
        document.getElementById('prod-stock').value = "";
        previewImg.style.display = 'none';
        document.getElementById('prod-file').value = ""; // Reset file input
    }
    openModal('modal-admin-product');
}

// Feature: Live Image Preview before Upload
function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function(){
        const output = document.getElementById('prod-preview-img');
        output.src = reader.result;
        output.style.display = 'block';
    };
    reader.readAsDataURL(event.target.files[0]);
}

async function saveProduct() {
    const btn = document.getElementById('btn-save-product');
    btn.innerHTML = `<div class="spinner" style="width:15px; height:15px; border-width:2px; border-left-color:white;"></div> Uploading...`;
    btn.disabled = true;

    const id = document.getElementById('prod-id').value;
    const fileInput = document.getElementById('prod-file');

    let fileBase64 = null; let fileName = null;
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileName = file.name;
        fileBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    const payload = {
        action: "uploadProduct", id: id,
        name: document.getElementById('prod-name').value,
        category: document.getElementById('prod-cat').value,
        desc: document.getElementById('prod-desc').value,
        price: document.getElementById('prod-price').value,
        modal: document.getElementById('prod-modal').value,
        stock: document.getElementById('prod-stock').value,
        fileBase64: fileBase64, fileName: fileName
    };

    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if(result.status === "success") {
            showToast(result.message, 'success');
            closeModal('modal-admin-product');
            await fetchInitialData(); // Refresh DB seamlessly
            switchAdminTab('catalog');
        } else { showToast(result.message, 'error'); }
    } catch (e) {
        showToast("Error upload/simpan ke server.", "error");
    } finally {
        btn.innerText = "Simpan Data Produk"; btn.disabled = false;
    }
}

// 6D. TRANSACTION HISTORY
function renderTransactions(container) {
    let trs = state.orders.map(o => {
        let statusClass = "pending";
        if(String(o.status).includes('SUCCESS')) statusClass = "success";
        if(String(o.status).includes('OFFLINE')) statusClass = "offline";

        return `
        <tr>
            <td style="font-family:monospace; color:#555;">${o.id}</td>
            <td>${o.date}</td>
            <td style="font-weight:600;">${o.customer}</td>
            <td>${formatRp(o.total)}</td>
            <td><span class="badge ${statusClass}">${o.status}</span></td>
            <td><button class="btn btn-outline" style="padding: 5px 12px; font-size:0.8rem;" onclick="openOrderDetail('${o.id}')">🔎 Periksa</button></td>
        </tr>
    `}).join('');

    container.innerHTML = `
        <h2>Riwayat Seluruh Transaksi</h2>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr><th>ID Order</th><th>Waktu</th><th>Nama Customer</th><th>Total Bayar</th><th>Status Tagihan</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                    ${trs || '<tr><td colspan="6" style="text-align:center;">Belum ada transaksi</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function openOrderDetail(id) {
    const o = state.orders.find(x => x.id === id);
    state.tempSelectedOrder = o;
    
    document.getElementById('order-detail-content').innerHTML = `
        <p><b>ID Transaksi:</b> ${o.id}</p>
        <p><b>Waktu Checkout:</b> ${o.date}</p>
        <hr style="margin:10px 0; border:none; border-top:1px dashed #ccc;">
        <p><b>Customer:</b> ${o.customer}</p>
        <p><b>No. WhatsApp:</b> ${o.wa || '-'}</p>
        <p><b>Alamat Pengiriman:</b><br> ${o.address || '-'}</p>
        <hr style="margin:10px 0; border:none; border-top:1px dashed #ccc;">
        <p><b>Item Dipesan:</b> ${o.items}</p>
        <p style="font-size:1.2rem; margin-top:10px;"><b>Total Tagihan:</b> <span style="color:var(--danger)">${formatRp(o.total)}</span></p>
        <p><b>Status Pembayaran:</b> <span class="badge" style="background:#555;">${o.status}</span></p>
    `;
    
    const btn = document.getElementById('btn-confirm-trx');
    if(String(o.status).includes('SUCCESS')) {
        btn.style.display = 'none'; // Jika sudah sukses, hilangkan tombol verify
    } else {
        btn.style.display = 'block';
    }
    
    openModal('modal-order-detail');
}

async function confirmAdminTransaction() {
    if(state.tempSelectedOrder) {
        const newStatus = state.tempSelectedOrder.status.replace('PENDING', 'SUCCESS');
        
        // Ekstrak ID dan Qty untuk update stok
        let qty = 1; let pid = null;
        const itemsStr = state.tempSelectedOrder.items;
        const match = itemsStr.match(/^(\d+)x\s+(.*)/);
        if(match) {
            qty = parseInt(match[1]);
            const pName = match[2].trim();
            const prod = state.products.find(p => p.name === pName);
            if(prod) pid = prod.id;
        }

        const payload = {
            action: "updateOrderStatus", orderId: state.tempSelectedOrder.id,
            newStatus: newStatus, productId: pid, qty: qty
        };

        const btn = document.getElementById('btn-confirm-trx');
        btn.innerHTML = `<div class="spinner" style="width:15px; height:15px; border-width:2px;"></div> Memverifikasi...`; 
        btn.disabled = true;

        try {
            const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
            const result = await res.json();
            
            if(result.status === "success") {
                state.tempSelectedOrder.status = newStatus;
                if(pid) {
                    const p = state.products.find(x => x.id === pid);
                    if(p) { p.stock -= qty; p.sold += qty; }
                }
                showToast('Status Pembayaran Terverifikasi!', 'success');
                closeModal('modal-order-detail');
                switchAdminTab('transactions');
            } else { showToast(result.message, 'error'); }
        } catch(e) {
            showToast('Gagal menghubungi server.', 'error');
        } finally {
            btn.innerHTML = "✅ Verifikasi & Set SUCCESS"; btn.disabled = false;
        }
    }
}

// 6E. FINANCE (REAL CALCULATION DARI SELURUH HISTORY)
function renderFinance(container) {
    const successOrders = state.orders.filter(o => String(o.status).includes('SUCCESS'));
    const gross = successOrders.reduce((sum, o) => sum + Number(o.total), 0);
    
    // Algoritma Mencari Total HPP Akurat:
    // Cek setiap item yang sukses, cari modal aslinya di state.products
    let accurateHpp = 0;
    successOrders.forEach(o => {
        const itemsStr = o.items;
        const match = itemsStr.match(/^(\d+)x\s+(.*)/);
        if(match) {
            let qty = parseInt(match[1]);
            let pName = match[2].trim();
            let prod = state.products.find(p => p.name === pName);
            if(prod && prod.modal) {
                accurateHpp += (Number(prod.modal) * qty);
            } else {
                accurateHpp += (Number(o.total) * 0.65); // Fallback: Asumsi HPP 65% jika produk dihapus
            }
        }
    });

    const net = gross - accurateHpp;

    container.innerHTML = `
        <h2>Laporan Keuangan & Akuntansi (Global)</h2>
        <div class="glass" style="margin-top:20px; padding:35px; border-radius: 20px;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:15px; margin-bottom:15px;">
                <span style="font-size:1.1rem;">💰 Total Pendapatan Kotor (Omzet)</span>
                <b style="font-size:1.3rem;">${formatRp(gross)}</b>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:15px; margin-bottom:15px; color:var(--danger)">
                <span style="font-size:1.1rem;">📦 Total HPP / Modal Keluar (Terkalkulasi)</span>
                <b style="font-size:1.3rem;">- ${formatRp(accurateHpp)}</b>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:30px; background: rgba(40, 167, 69, 0.1); padding: 20px; border-radius: 12px; color:var(--success)">
                <span style="font-size:1.3rem; font-weight:600;">📈 Laba Bersih (Net Profit)</span>
                <b style="font-size:1.8rem;">${formatRp(net)}</b>
            </div>
        </div>
        <p style="margin-top:20px; color:var(--text-gray); font-size:0.9rem;">Catatan: Sistem secara pintar (ERP) mengalikan <b>Kuantitas Terjual</b> dengan <b>Harga Modal per Produk</b> yang disetel pada Katalog Anda untuk mendapatkan nilai Total HPP secara persis.</p>
    `;
}

// 6F. SETTINGS (BIG UPGRADE: SAVE TO BACKEND)
function renderSettings(container) {
    container.innerHTML = `
        <h2>Pengaturan Pembayaran Sistem</h2>
        <div class="glass" style="margin-top:20px; padding:30px; max-width:600px;">
            
            <label style="font-weight:500;">Link Payload QRIS (Dinamis):</label>
            <p style="font-size:0.8rem; color:var(--text-gray); margin-bottom:5px;">Ambil string payload dari QRIS statis toko Anda</p>
            <textarea id="set-qris" class="input-glass" rows="2">${state.settings.qris || ''}</textarea>
            
            <label style="font-weight:500;">No. Rekening BCA & Atas Nama:</label>
            <input type="text" id="set-bca" class="input-glass" value="${state.settings.bca || ''}">
            
            <label style="font-weight:500;">No. E-Wallet (Dana/OVO/ShopeePay):</label>
            <input type="text" id="set-ewallet" class="input-glass" value="${state.settings.ewallet || ''}">
            
            <button class="btn btn-dark" style="width:100%; margin-top:20px; padding:15px; font-size:1.1rem;" id="btn-save-settings" onclick="saveSettingsAdmin()">💾 Simpan & Terapkan Pengaturan</button>
        </div>
    `;
}

async function saveSettingsAdmin() {
    const btn = document.getElementById('btn-save-settings');
    btn.innerHTML = `<div class="spinner" style="width:15px; height:15px; border-width:2px; border-left-color:white;"></div> Menyimpan...`;
    btn.disabled = true;

    const qris = document.getElementById('set-qris').value;
    const bca = document.getElementById('set-bca').value;
    const ewallet = document.getElementById('set-ewallet').value;

    const payload = {
        action: "updateSettings",
        settings: { qris: qris, bca: bca, ewallet: ewallet }
    };

    try {
        const res = await fetch(GAS_URL, { method: "POST", body: JSON.stringify(payload) });
        const data = await res.json();
        
        if(data.status === "success") {
            state.settings = { qris, bca, ewallet }; // update local
            showToast("Berhasil! Pengaturan metode pembayaran telah diubah.", "success");
        } else { showToast("Gagal menyimpan: " + data.message, "error"); }
    } catch(e) {
        showToast("Kesalahan jaringan. Gagal menghubungi DB.", "error");
    } finally {
        btn.innerText = "💾 Simpan & Terapkan Pengaturan";
        btn.disabled = false;
    }
}

// INIT PADA SAAT HALAMAN DIMUAT
window.onload = fetchInitialData;
