/**
 * ==========================================
 * 1. APP STATE & MOCK DATA
 * ==========================================
 * Data ini bertindak sebagai fallback/mock sebelum terhubung ke Code.gs
 */
const GAS_URL = "https://script.google.com/macros/s/AKfycbw45o3mq7UYcuB8knNfdOr7mKLmwFM1sg_52DoircJFjXI4wX4DCE6hilyOd-0bA5mA/exec"; // Ganti setelah deploy Code.gs

const state = {
    categories: ["Daster Kartika", "Daster Elok", "Daster Setcel", "Daster Gajah Putih", "Daster Dipakemama"],
    activeCategory: "Daster Kartika",
    products: [
        { id: "P1", name: "Daster Kartika Renda Premium", category: "Daster Kartika", price: 65000, modal: 45000, stock: 20, sold: 126, desc: "Bahan adem, nyaman dipakai sehari-hari.", img: "https://images.unsplash.com/photo-1583391733958-6c782781b0a2?auto=format&fit=crop&w=300&q=80" },
        { id: "P2", name: "Daster Kartika Motif Bunga", category: "Daster Kartika", price: 45000, modal: 30000, stock: 50, sold: 89, desc: "Motif bunga cantik, rayon super.", img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=300&q=80" },
        { id: "P3", name: "Daster Elok Lengan Pendek", category: "Daster Elok", price: 55000, modal: 40000, stock: 15, sold: 42, desc: "Cocok untuk santai.", img: "https://images.unsplash.com/photo-1515347619362-71008cb13645?auto=format&fit=crop&w=300&q=80" }
    ],
    orders: [
        { id: "ORD-1234", date: "2023-10-27 14:30", customer: "Ibu Tati", total: 65000, status: "PENDING_QRIS", items: "1x Daster Kartika Renda" },
        { id: "ORD-1235", date: "2023-10-27 15:00", customer: "Siska", total: 45000, status: "SUCCESS_BCA", items: "1x Daster Kartika Bunga" }
    ],
    settings: { qris: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020101021226660014ID.CO.QRIS.WWW...", bca: "1234567890 a.n Tasbon", ewallet: "08123456789 (OVO/Dana)" },
    cart: { productId: null, qty: 1, isMakassar: false, ongkir: 15000 },
    currentAdminTab: 'overview',
    tempSelectedOrder: null
};

/**
 * ==========================================
 * 2. UTILITY FUNCTIONS
 * ==========================================
 */
const formatRp = (num) => 'Rp ' + num.toLocaleString('id-ID');
const showElement = (id) => document.getElementById(id).classList.remove('hidden');
const hideElement = (id) => document.getElementById(id).classList.add('hidden');
const openModal = (id) => document.getElementById(id).style.display = 'flex';
const closeModal = (id) => document.getElementById(id).style.display = 'none';

/**
 * ==========================================
 * 3. CUSTOMER VIEW LOGIC (FRONTEND)
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
            <img src="${p.img}" alt="${p.name}" class="product-img">
            <div class="product-title">${p.name}</div>
            <div class="product-price">${formatRp(p.price)}</div>
            <button class="btn btn-dark" style="width:100%; margin-top:10px;">+ Beli</button>
        </div>
    `).join('');
}

// Cart Logic
function openCartModal(productId) {
    const product = state.products.find(p => p.id === productId);
    if(!product) return;

    state.cart.productId = product.id;
    state.cart.qty = 1;
    
    // Render Left Side (Product Details)
    const detailsHtml = `
        <img src="${product.img}" style="width:100%; border-radius:12px; height:200px; object-fit:cover; margin-bottom:15px;">
        <h3>${product.name}</h3>
        <p style="color:#f39c12; font-size:0.9rem;">★★★★★ (${product.sold} sold)</p>
        <h2 style="margin: 10px 0;">${formatRp(product.price)}</h2>
        <p style="color:var(--text-gray); font-size:0.9rem;">${product.desc}</p>
        
        <div class="qty-control">
            <button class="qty-btn" onclick="changeQty(-1)">-</button>
            <span id="cart-qty-display">1</span>
            <button class="qty-btn" onclick="changeQty(1)">+</button>
        </div>
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
        alert('Stok tidak mencukupi!');
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

// Geolocation
function getLocation() {
    const status = document.getElementById('location-status');
    status.innerText = "Mendeteksi lokasi...";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            try {
                // Using free nominatim for reverse geocoding
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                const data = await res.json();
                const address = data.display_name;
                document.getElementById('cust-address').value = address;
                
                if(address.toLowerCase().includes('makassar')) {
                    state.cart.isMakassar = true;
                    status.innerText = "Wilayah Makassar terdeteksi. Ongkir aktif.";
                } else {
                    state.cart.isMakassar = false;
                    status.innerText = "Lokasi di luar Makassar.";
                }
                updateCartSummary();
            } catch(e) {
                status.innerText = "Gagal mengambil alamat detail.";
                status.style.color = "var(--danger)";
            }
        }, (error) => {
            status.innerText = "Izin lokasi ditolak/gagal.";
            status.style.color = "var(--danger)";
        });
    } else {
        status.innerText = "Geolocation tidak didukung browser ini.";
    }
}

// Checkout & Payment
function openPaymentModal() {
    const name = document.getElementById('cust-name').value;
    if(!name) return alert('Mohon isi Nama Lengkap');
    
    closeModal('modal-cart');
    
    const product = state.products.find(p => p.id === state.cart.productId);
    const total = (product.price * state.cart.qty) + (state.cart.isMakassar ? state.cart.ongkir : 0);
    
    document.getElementById('payment-amount').innerText = formatRp(total);
    selectPayment('QRIS'); // default
    openModal('modal-payment');
}

function selectPayment(method) {
    const area = document.getElementById('payment-details-area');
    const totalStr = document.getElementById('payment-amount').innerText;
    
    if(method === 'QRIS') {
        area.innerHTML = `
            <p style="margin-bottom:10px;">Scan QRIS di bawah ini:</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${state.settings.qris}" style="border-radius:10px;">
        `;
    } else if(method === 'BCA') {
        area.innerHTML = `
            <h3 style="color:#0066AE">BCA</h3>
            <p style="font-size:1.5rem; letter-spacing:2px; margin:10px 0;">${state.settings.bca}</p>
            <p>Transfer sejumlah <b>${totalStr}</b></p>
        `;
    } else {
        area.innerHTML = `
            <h3 style="color:#4a2b75">OVO / DANA / ShopeePay</h3>
            <p style="font-size:1.5rem; letter-spacing:2px; margin:10px 0;">${state.settings.ewallet}</p>
            <p>Transfer sejumlah <b>${totalStr}</b></p>
        `;
    }
}

function confirmCustomerOrder() {
    alert('Pesanan berhasil dibuat! Kami akan memprosesnya setelah pembayaran terverifikasi.');
    closeModal('modal-payment');
    // Logic push to Code.gs here
}

/**
 * ==========================================
 * 4. ADMIN AUTHENTICATION
 * ==========================================
 */
function toggleAdminLogin() {
    const custView = document.getElementById('customer-view');
    const loginView = document.getElementById('login-view');
    
    if(!custView.classList.contains('hidden')) {
        hideElement('customer-view');
        showElement('login-view');
        document.getElementById('btn-toggle-admin').innerText = 'Back to Store';
    } else {
        showElement('customer-view');
        hideElement('login-view');
        document.getElementById('btn-toggle-admin').innerText = 'Admin';
    }
}

function processLogin() {
    const u = document.getElementById('admin-user').value;
    const p = document.getElementById('admin-pass').value;
    
    if(u === 'dastertasbon' && p === 'tasbon12') {
        hideElement('login-view');
        showElement('admin-view');
        hideElement('btn-toggle-admin');
        showElement('btn-logout');
        switchAdminTab('overview');
    } else {
        alert('Username atau password salah!');
    }
}

function logoutAdmin() {
    hideElement('admin-view');
    showElement('customer-view');
    showElement('btn-toggle-admin');
    hideElement('btn-logout');
    document.getElementById('btn-toggle-admin').innerText = 'Admin';
    document.getElementById('admin-user').value = '';
    document.getElementById('admin-pass').value = '';
}

/**
 * ==========================================
 * 5. ADMIN DASHBOARD (ERP & CMS)
 * ==========================================
 */
function switchAdminTab(tab) {
    state.currentAdminTab = tab;
    
    // Update sidebar UI
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

function renderOverview(container) {
    // Kalkulasi sederhana
    const totalPenjualan = state.orders.filter(o => o.status.includes('SUCCESS')).reduce((sum, o) => sum + o.total, 0);
    const totalStok = state.products.reduce((sum, p) => sum + p.stock, 0);

    container.innerHTML = `
        <h2>Dashboard Overview</h2>
        <div class="dashboard-cards">
            <div class="glass stat-card">
                <p>Penjualan (Total Sukses)</p>
                <h3>${formatRp(totalPenjualan)}</h3>
            </div>
            <div class="glass stat-card">
                <p>Total Pesanan</p>
                <h3>${state.orders.length}</h3>
            </div>
            <div class="glass stat-card">
                <p>Sisa Stok Global</p>
                <h3>${totalStok} pcs</h3>
            </div>
        </div>
    `;
}

function renderCashier(container) {
    let options = state.products.map(p => `<option value="${p.id}">${p.name} (Sisa: ${p.stock}) - ${formatRp(p.price)}</option>`).join('');
    
    container.innerHTML = `
        <h2>Cashier (Offline POS)</h2>
        <div class="glass" style="padding: 20px; max-width: 500px; margin-top: 20px;">
            <input type="text" id="pos-name" class="input-glass" placeholder="Nama Customer">
            <select id="pos-product" class="input-glass" onchange="calcPosTotal()">
                <option value="">-- Pilih Produk --</option>
                ${options}
            </select>
            <input type="number" id="pos-qty" class="input-glass" placeholder="QTY" value="1" oninput="calcPosTotal()">
            <h3 style="margin: 15px 0;">Total: <span id="pos-total">Rp 0</span></h3>
            <button class="btn btn-dark" style="width: 100%;" onclick="processPOS()">Proses Pembayaran (SUCCESS)</button>
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

function processPOS() {
    const pid = document.getElementById('pos-product').value;
    const qty = parseInt(document.getElementById('pos-qty').value) || 0;
    const name = document.getElementById('pos-name').value;
    
    if(!pid || !name || qty < 1) return alert('Lengkapi data POS!');
    
    const p = state.products.find(x => x.id === pid);
    if(qty > p.stock) return alert('Stok tidak cukup!');

    // Update state (mock db update)
    p.stock -= qty;
    p.sold += qty;
    
    state.orders.unshift({
        id: "OFF-" + Math.floor(Math.random()*10000),
        date: new Date().toISOString().slice(0,16).replace('T',' '),
        customer: name,
        total: p.price * qty,
        status: "SUCCESS_OFFLINE",
        items: `${qty}x ${p.name}`
    });

    alert('Transaksi Kasir Sukses!');
    switchAdminTab('overview'); // refresh
}

function renderCatalog(container) {
    let trs = state.products.map(p => `
        <tr>
            <td><img src="${p.img}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;"></td>
            <td>${p.name}</td>
            <td>${formatRp(p.price)}</td>
            <td>${p.stock}</td>
            <td>${p.sold}</td>
            <td><button class="btn btn-outline" style="padding: 5px 10px; font-size:0.8rem;" onclick="openProductModal('${p.id}')">Edit</button></td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2>Catalog Product</h2>
            <button class="btn btn-dark" onclick="openProductModal()">+ Add New Product</button>
        </div>
        <div class="glass" style="margin-top:20px; overflow-x:auto;">
            <table>
                <thead>
                    <tr><th>Photo</th><th>Name</th><th>Price</th><th>Stock</th><th>Sold</th><th>Action</th></tr>
                </thead>
                <tbody>${trs}</tbody>
            </table>
        </div>
    `;
}

function openProductModal(id = null) {
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
    } else {
        document.getElementById('product-modal-title').innerText = "Add New Product";
        document.getElementById('prod-id').value = "";
        document.getElementById('prod-name').value = "";
        document.getElementById('prod-desc').value = "";
        document.getElementById('prod-price').value = "";
        document.getElementById('prod-modal').value = "";
        document.getElementById('prod-stock').value = "";
    }
    openModal('modal-admin-product');
}

function saveProduct() {
    alert('Fungsi ini akan mengupload foto ke GDrive via Code.gs dan menyimpan data ke Spreadsheet.');
    closeModal('modal-admin-product');
    // Implementation detail: Use FileReader to convert file to base64, then fetch() to SCRIPT_URL
}

function renderTransactions(container) {
    let trs = state.orders.map(o => `
        <tr>
            <td>${o.id}</td>
            <td>${o.date}</td>
            <td>${o.customer}</td>
            <td>${formatRp(o.total)}</td>
            <td><span style="background:${o.status.includes('SUCCESS') ? 'var(--success)' : 'var(--warning)'}; color:white; padding:3px 8px; border-radius:10px; font-size:0.8rem;">${o.status}</span></td>
            <td><button class="btn btn-outline" style="padding: 5px 10px; font-size:0.8rem;" onclick="openOrderDetail('${o.id}')">Detail</button></td>
        </tr>
    `).join('');

    container.innerHTML = `
        <h2>History Transaction</h2>
        <div class="glass" style="margin-top:20px; overflow-x:auto;">
            <table>
                <thead>
                    <tr><th>ID Order</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>${trs}</tbody>
            </table>
        </div>
    `;
}

function openOrderDetail(id) {
    const o = state.orders.find(x => x.id === id);
    state.tempSelectedOrder = o;
    
    document.getElementById('order-detail-content').innerHTML = `
        <p><b>ID:</b> ${o.id}</p>
        <p><b>Date:</b> ${o.date}</p>
        <p><b>Customer:</b> ${o.customer}</p>
        <p><b>Items:</b> ${o.items}</p>
        <p><b>Total:</b> ${formatRp(o.total)}</p>
        <p><b>Status:</b> ${o.status}</p>
    `;
    
    const btn = document.getElementById('btn-confirm-trx');
    if(o.status.includes('SUCCESS')) {
        btn.style.display = 'none';
    } else {
        btn.style.display = 'block';
    }
    
    openModal('modal-order-detail');
}

function confirmAdminTransaction() {
    if(state.tempSelectedOrder) {
        state.tempSelectedOrder.status = state.tempSelectedOrder.status.replace('PENDING', 'SUCCESS');
        alert('Status berhasil diubah menjadi SUCCESS!');
        closeModal('modal-order-detail');
        switchAdminTab('transactions'); // refresh
    }
}

function renderFinance(container) {
    // Kalkulasi Akuntansi
    const successOrders = state.orders.filter(o => o.status.includes('SUCCESS'));
    const gross = successOrders.reduce((sum, o) => sum + o.total, 0);
    
    // Dummy HPP calculation (in real app, we track modal per item sold)
    const hpp = successOrders.reduce((sum, o) => sum + (o.total * 0.7), 0); // Asumsi Modal 70% dari harga
    const net = gross - hpp;

    container.innerHTML = `
        <h2>Laporan Keuangan</h2>
        <div class="glass" style="margin-top:20px; padding:30px;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:10px; margin-bottom:10px;">
                <span>Pendapatan Kotor (Omzet)</span>
                <b>${formatRp(gross)}</b>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:10px; margin-bottom:10px; color:var(--danger)">
                <span>Total HPP / Modal Barang</span>
                <b>- ${formatRp(hpp)}</b>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:20px; font-size:1.5rem; color:var(--success)">
                <span>Laba Bersih (Net Profit)</span>
                <b>${formatRp(net)}</b>
            </div>
        </div>
    `;
}

function renderSettings(container) {
    container.innerHTML = `
        <h2>Pengaturan Sistem</h2>
        <div class="glass" style="margin-top:20px; padding:20px; max-width:600px;">
            <label>Data QRIS (Link String):</label>
            <input type="text" class="input-glass" value="${state.settings.qris}">
            
            <label>No. Rekening BCA:</label>
            <input type="text" class="input-glass" value="${state.settings.bca}">
            
            <label>No. E-Wallet (Dana/OVO/ShopeePay):</label>
            <input type="text" class="input-glass" value="${state.settings.ewallet}">
            
            <button class="btn btn-dark" style="width:100%; margin-top:10px;" onclick="alert('Pengaturan disimpan!')">Simpan Pengaturan</button>
        </div>
    `;
}