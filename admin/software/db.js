// ===== AKBAR JEWELLERS – DATABASE (FINAL v4) =====
// Live stock, per-piece weight, cash/credit, ledger auto

const SUPABASE_URL = 'https://cvuqtmmlewaudtxzpnyg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_of8TMEfEPDsVg21MfSSmBQ_CbwtRqRk';
const CLOUD_NAME = 'olpbssol';
const CLOUDINARY_PRESET = 'akbar-jewellers';
const CACHE_TIMEOUT = 5000;

const WEIGHT_UNITS = { gram: 1, tola: 11.664, masha: 0.972, ratti: 0.1215 };

function toGrams(value, unit) { return (Number(value) || 0) * (WEIGHT_UNITS[unit] || 1); }

function formatWeight(grams) {
  grams = Number(grams) || 0;
  if (grams <= 0) return '0g';
  if (grams >= 11.664) {
    const tola = Math.floor(grams / 11.664);
    const rem = grams - (tola * 11.664);
    const masha = Math.floor(rem / 0.972);
    const ratti = ((rem - (masha * 0.972)) / 0.1215).toFixed(1);
    let r = '';
    if (tola > 0) r += `${tola} tola `;
    if (masha > 0) r += `${masha} masha `;
    if (parseFloat(ratti) > 0) r += `${ratti} ratti`;
    return r.trim() || `${grams.toFixed(2)}g`;
  }
  if (grams >= 0.972) {
    const masha = Math.floor(grams / 0.972);
    const ratti = ((grams - (masha * 0.972)) / 0.1215).toFixed(1);
    return `${masha} masha ${ratti} ratti`;
  }
  return `${grams.toFixed(2)}g`;
}

function formatPKR(amount) { return 'Rs ' + Math.round(Number(amount) || 0).toLocaleString('en-PK'); }
function formatDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; } }
function formatDateTime(d) { if (!d) return '—'; try { return new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; } }

const dbCache = {};

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {})
    }
  });
  if (!res.ok) { const txt = await res.text(); throw new Error(`Supabase ${res.status}: ${txt}`); }
  if (res.status === 204) return null;
  return res.json();
}

async function getRecordsFast(storeName, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && dbCache[storeName]) {
    const t = dbCache[storeName + '_time'] || 0;
    if (now - t < CACHE_TIMEOUT) return dbCache[storeName];
  }
  try {
    const rows = await sbFetch(`${storeName}?select=*&order=created_at.desc`);
    const data = (rows || []).map(r => ({ ...r, date: r.sale_date || r.purchase_date || r.expense_date || r.payment_date || r.service_date || r.return_date || r.created_at }));
    dbCache[storeName] = data;
    dbCache[storeName + '_time'] = now;
    return data;
  } catch (e) { console.error('Error:', storeName, e); return []; }
}

function clearCache(storeName) {
  if (storeName) { delete dbCache[storeName]; delete dbCache[storeName + '_time']; }
  else Object.keys(dbCache).forEach(k => delete dbCache[k]);
}

async function addRecord(storeName, data) {
  const clean = { ...data }; delete clean.id; delete clean.date; delete clean.created_at;
  const result = await sbFetch(storeName, { method: 'POST', body: JSON.stringify(clean) });
  clearCache(storeName);
  return Array.isArray(result) ? result[0] : result;
}

async function updateRecord(storeName, id, data) {
  const clean = { ...data }; delete clean.id; delete clean.date; delete clean.created_at;
  const result = await sbFetch(`${storeName}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(clean) });
  clearCache(storeName);
  return result;
}

async function deleteRecord(storeName, id) {
  await sbFetch(`${storeName}?id=eq.${id}`, { method: 'DELETE' });
  clearCache(storeName);
}

async function getShopSettings() {
  const defaults = {
    name: 'AKBAR JEWELLERS', name_urdu: 'فیض حسینی',
    tagline: 'Diamond aur Kundan Antique Jewellery ke Expert',
    address: 'New Canal Park, Ali Plaza Tajbagh, Lahore',
    phone: '03234086439', email: 'akbarjewellersfaizehussaini@gmail.com',
    gst_pct: 3, making_pct: 15
  };
  try {
    const rows = await sbFetch('settings?select=*');
    if (!rows || rows.length === 0) return defaults;
    const s = { ...defaults };
    rows.forEach(r => {
      const isNum = ['gst_pct', 'making_pct'].includes(r.setting_key);
      s[r.setting_key] = isNum ? parseFloat(r.setting_value) : r.setting_value;
    });
    return s;
  } catch (e) { return defaults; }
}

async function uploadImage(file) {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url;
}

// ===== GST =====
function calculateSaleGST(sale) {
  const qty = Number(sale.qty) || 1;
  const weight = Number(sale.weight) || 0;
  const rate = Number(sale.rate) || 0;
  const making = Number(sale.making) || 0;
  const polish = Number(sale.polish) || 0;
  const gstPct = Number(sale.gst_pct) || 3;
  const totalWeight = qty * weight;
  const metal = totalWeight * rate;
  const subtotal = metal + (making * qty) + (polish * qty);
  const gst = Math.round(subtotal * (gstPct / 100));
  return { totalWeight, metal, makingTotal: making * qty, polishTotal: polish * qty, subtotal, gst, gstPct };
}

// ===== LIVE STOCK (SABSE IMPORTANT) =====
// Current Stock = opening_stock + SUM(purchases.qty) - SUM(sales.qty) + SUM(returns.qty)
function calculateLiveStock(productCode, products, purchases, sales, returns) {
  const product = (products || []).find(p => p.product_code === productCode);
  if (!product) return { opening: 0, purchased: 0, sold: 0, returned: 0, current: 0, totalWeight: 0, perPieceWeight: 0 };
  const opening = Number(product.opening_stock) || 0;
  const purchased = (purchases || []).filter(p => p.product_id === productCode).reduce((s, p) => s + (Number(p.qty) || 0), 0);
  const sold = (sales || []).filter(s => s.product_id === productCode).reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
  const returned = (returns || []).filter(r => r.product_id === productCode).reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  const current = opening + purchased - sold + returned;
  const perPieceWeight = Number(product.weight) || 0;
  return { opening, purchased, sold, returned, current, perPieceWeight, totalWeight: current * perPieceWeight };
}

// ===== PER PIECE CALCULATION =====
// Product ka weight = 1 piece ka weight (jab product add ho)
// Purchase mein: qty x weight = total_weight
// Sale mein: 1 piece = 1 x weight
function calculateProductStats(productCode, products, purchases, sales, returns) {
  const product = (products || []).find(p => p.product_code === productCode);
  if (!product) return null;

  const live = calculateLiveStock(productCode, products, purchases, sales, returns);
  const pPurch = (purchases || []).filter(p => p.product_id === productCode);
  const pSales = (sales || []).filter(s => s.product_id === productCode);
  const pReturns = (returns || []).filter(r => r.product_id === productCode);

  const totalPurchaseAmount = pPurch.reduce((s, p) => s + (Number(p.total) || 0), 0);
  const totalSaleAmount = pSales.reduce((s, p) => s + (Number(s.total) || 0), 0);
  const totalReturnAmount = pReturns.reduce((s, r) => s + (Number(r.total) || 0), 0);

  // Per piece cost = total purchase amount / total purchased qty
  const costPerPiece = live.purchased > 0 ? (totalPurchaseAmount / live.purchased) : (Number(product.cost_price) || 0);
  // Per piece sale = total sale amount / total sold qty
  const salePerPiece = live.sold > 0 ? (totalSaleAmount / live.sold) : (Number(product.sale_price) || 0);

  // GST on sold
  let totalGST = 0;
  pSales.forEach(s => { totalGST += calculateSaleGST(s).gst; });

  // Profit = (sale/pc - cost/pc) x sold - GST - returns
  const grossProfit = (salePerPiece - costPerPiece) * live.sold;
  const netProfit = grossProfit - totalGST - totalReturnAmount;

  return {
    product, productCode, productName: product.name, category: product.category, karat: product.karat,
    openingStock: live.opening, currentStock: live.current,
    totalPurchasedQty: live.purchased, totalSoldQty: live.sold, totalReturnedQty: live.returned,
    totalPurchaseAmount, totalSaleAmount, totalReturnAmount,
    perPieceWeight: live.perPieceWeight,
    costPerPiece, salePerPiece,
    grossProfit, totalGST, netProfit,
    salesCount: pSales.length, purchasesCount: pPurch.length
  };
}

function calculateAllProductsStats(products, purchases, sales, returns) {
  return (products || []).map(p => calculateProductStats(p.product_code, products, purchases, sales, returns)).filter(Boolean);
}

// ===== CASH vs CREDIT =====
function isCashSale(s) { return (s.payment_mode || 'cash') === 'cash'; }
function isCreditSale(s) { const m = (s.payment_mode || '').toLowerCase(); return m === 'credit' || m === 'udhaar' || m === 'udhar'; }

function calculateCashTotal(sales) { return (sales || []).filter(isCashSale).reduce((s, x) => s + (Number(x.total) || 0), 0); }
function calculateCreditTotal(sales) { return (sales || []).filter(isCreditSale).reduce((s, x) => s + (Number(x.total) || 0), 0); }

// ===== CASH IN HAND (LIVE) =====
// Sirf cash sales ka received + cash customer payments - cash purchases - cash expenses - cash payments out
function calculateCashInHand(sales, purchases, expenses, payments) {
  let inCash = 0, outCash = 0;
  (sales || []).forEach(s => {
    if (isCashSale(s)) inCash += Number(s.received) || 0;
  });
  (payments || []).forEach(p => {
    if ((p.payment_mode || 'cash') === 'cash') {
      if (p.person_type === 'customer') inCash += Number(p.amount) || 0;
      else outCash += Number(p.amount) || 0;
    }
  });
  (purchases || []).forEach(p => {
    if ((p.payment_mode || 'cash') === 'cash') outCash += Number(p.paid) || 0;
  });
  (expenses || []).forEach(e => {
    if ((e.payment_mode || 'cash') === 'cash') outCash += Number(e.amount) || 0;
  });
  return inCash - outCash;
}

// ===== CASH IN BANKS (LIVE) =====
function calculateBankBalances(accounts, transactions) {
  let bank = 0, easypaisa = 0, jazzcash = 0;
  (accounts || []).forEach(acc => {
    let bal = Number(acc.opening_balance) || 0;
    (transactions || []).filter(t => t.account_id === acc.id).forEach(t => {
      if (t.transaction_type === 'deposit') bal += Number(t.amount) || 0;
      else if (t.transaction_type === 'withdraw') bal -= Number(t.amount) || 0;
    });
    if (acc.account_type === 'bank') bank += bal;
    else if (acc.account_type === 'easypaisa') easypaisa += bal;
    else if (acc.account_type === 'jazzcash') jazzcash += bal;
  });
  return { bank, easypaisa, jazzcash, total: bank + easypaisa + jazzcash };
}

// ===== LEDGER (AUTO) =====
// Customer ledger = sales + payments
function getCustomerLedger(customerName, sales, payments) {
  const entries = [];
  (sales || []).filter(s => s.customer_name === customerName).forEach(s => {
    entries.push({ date: s.sale_date, type: 'Sale', ref: s.invoice_number, debit: Number(s.total) || 0, credit: 0, note: s.items_summary || '' });
  });
  (payments || []).filter(p => p.person_name === customerName && p.person_type === 'customer').forEach(p => {
    entries.push({ date: p.payment_date, type: 'Payment', ref: p.receipt_number, debit: 0, credit: Number(p.amount) || 0, note: p.notes || '' });
  });
  entries.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  let balance = 0;
  entries.forEach(e => { balance += e.debit - e.credit; e.balance = balance; });
  return entries;
}

function getSupplierLedger(supplierName, purchases, payments) {
  const entries = [];
  (purchases || []).filter(p => p.supplier_name === supplierName).forEach(p => {
    entries.push({ date: p.purchase_date, type: 'Purchase', ref: p.invoice_no, debit: 0, credit: Number(p.total) || 0, note: p.item || '' });
  });
  (payments || []).filter(p => p.person_name === supplierName && p.person_type === 'supplier').forEach(p => {
    entries.push({ date: p.payment_date, type: 'Payment', ref: p.receipt_number, debit: Number(p.amount) || 0, credit: 0, note: p.notes || '' });
  });
  entries.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  let balance = 0;
  entries.forEach(e => { balance += e.credit - e.debit; e.balance = balance; });
  return entries;
}

function getKarigarLedger(karigarName, services, payments) {
  const entries = [];
  (services || []).filter(s => s.karigar_name === karigarName).forEach(s => {
    entries.push({ date: s.service_date, type: 'Service', ref: s.id, debit: 0, credit: Number(s.charges) || 0, note: s.item || '' });
  });
  (payments || []).filter(p => p.person_name === karigarName && p.person_type === 'karigar').forEach(p => {
    entries.push({ date: p.payment_date, type: 'Payment', ref: p.receipt_number, debit: Number(p.amount) || 0, credit: 0, note: p.notes || '' });
  });
  entries.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  let balance = 0;
  entries.forEach(e => { balance += e.credit - e.debit; e.balance = balance; });
  return entries;
}

function getProductLedger(productCode, purchases, sales, returns) {
  const entries = [];
  (purchases || []).filter(p => p.product_id === productCode).forEach(p => {
    entries.push({ date: p.purchase_date, type: 'Purchase', ref: p.invoice_no, qtyIn: Number(p.qty) || 0, qtyOut: 0, rate: Number(p.rate) || 0, amount: Number(p.total) || 0 });
  });
  (sales || []).filter(s => s.product_id === productCode).forEach(s => {
    entries.push({ date: s.sale_date, type: 'Sale', ref: s.invoice_number, qtyIn: 0, qtyOut: Number(s.qty) || 0, rate: Number(s.rate) || 0, amount: Number(s.total) || 0 });
  });
  (returns || []).filter(r => r.product_id === productCode).forEach(r => {
    entries.push({ date: r.return_date, type: 'Return', ref: r.id, qtyIn: Number(r.qty) || 0, qtyOut: 0, rate: Number(r.rate) || 0, amount: Number(r.total) || 0 });
  });
  entries.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  let qty = 0;
  entries.forEach(e => { qty += e.qtyIn - e.qtyOut; e.balanceQty = qty; });
  return entries;
}

function openWhatsApp(phone, message) {
  if (!phone) { alert('Phone missing'); return; }
  let num = phone.toString().replace(/[^0-9]/g, '');
  if (num.startsWith('0')) num = '92' + num.slice(1);
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, '_blank');
}

function sendEmail(to, subject, body) {
  window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
}

async function initDB() { return true; }