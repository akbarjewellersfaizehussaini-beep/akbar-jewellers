// ===== AKBAR JEWELLERS – SOFTWARE DATABASE (FINAL v3) =====

const SUPABASE_URL = 'https://cvuqtmmlewaudtxzpnyg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_of8TMEfEPDsVg21MfSSmBQ_CbwtRqRk';

const CLOUD_NAME = 'olpbssol';
const CLOUDINARY_PRESET = 'akbar-jewellers';

const CACHE_TIMEOUT = 5000;

const WEIGHT_UNITS = { gram: 1, tola: 11.664, masha: 0.972, ratti: 0.1215 };

function toGrams(value, unit) { return value * (WEIGHT_UNITS[unit] || 1); }

function formatWeight(grams) {
  if (!grams || grams <= 0) return '0g';
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

function formatPKR(amount) { return 'Rs ' + Math.round(amount || 0).toLocaleString('en-PK'); }
function formatDate(dateStr) { if (!dateStr) return '—'; return new Date(dateStr).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); }

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
  if (!res.ok) { const txt = await res.text(); throw new Error(`Supabase Error ${res.status}: ${txt}`); }
  if (res.status === 204) return null;
  return res.json();
}

async function getRecordsFast(storeName, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && dbCache[storeName]) {
    const cacheTime = dbCache[storeName + '_time'] || 0;
    if (now - cacheTime < CACHE_TIMEOUT) return dbCache[storeName];
  }
  try {
    const rows = await sbFetch(`${storeName}?select=*&order=created_at.desc`);
    const data = (rows || []).map(r => ({ ...r, date: r.sale_date || r.purchase_date || r.expense_date || r.payment_date || r.service_date || r.created_at }));
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
  const defaults = { name: 'AKBAR JEWELLERS', name_urdu: 'فیض حسینی', tagline: 'Diamond aur Kundan Antique Jewellery ke Expert', address: 'New Canal Park, Ali Plaza Tajbagh, Lahore', phone: '03234086439', email: 'akbarjewellersfaizehussaini@gmail.com', gst_pct: 3, making_pct: 15 };
  try {
    const rows = await sbFetch('settings?select=*');
    if (!rows || rows.length === 0) return defaults;
    const s = { ...defaults };
    rows.forEach(r => { const isNum = ['gst_pct', 'making_pct'].includes(r.setting_key); s[r.setting_key] = isNum ? parseFloat(r.setting_value) : r.setting_value; });
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

// ===== CALCULATIONS =====
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

function calculateProductStats(productCode, products, purchases, sales) {
  const product = products.find(p => p.product_code === productCode);
  if (!product) return null;
  
  const pPurch = purchases.filter(p => p.product_id === productCode);
  const pSales = sales.filter(s => s.product_id === productCode);
  
  const totalPurchasedQty = pPurch.reduce((sum, p) => sum + (Number(p.qty) || 0), 0);
  const totalPurchasedWeight = pPurch.reduce((sum, p) => sum + (Number(p.total_weight) || (Number(p.weight) * Number(p.qty)) || 0), 0);
  const totalPurchaseAmount = pPurch.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  const totalPurchasePaid = pPurch.reduce((sum, p) => sum + (Number(p.paid) || 0), 0);
  const totalPurchaseBalance = totalPurchaseAmount - totalPurchasePaid;
  
  const totalSoldQty = pSales.reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
  const totalSoldWeight = pSales.reduce((sum, s) => sum + (Number(s.total_weight) || (Number(s.weight) * Number(s.qty)) || 0), 0);
  const totalSaleAmount = pSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalSaleReceived = pSales.reduce((sum, s) => sum + (Number(s.received) || 0), 0);
  const totalSaleBalance = totalSaleAmount - totalSaleReceived;
  
  const openingStock = Number(product.opening_stock) || 0;
  const currentStock = openingStock + totalPurchasedQty - totalSoldQty;
  
  const avgPurchaseRate = totalPurchasedWeight > 0 ? totalPurchaseAmount / totalPurchasedWeight : (Number(product.cost_price) || 0);
  const avgSaleRate = totalSoldWeight > 0 ? totalSaleAmount / totalSoldWeight : (Number(product.sale_price) || 0);
  
  const costOfSold = totalSoldWeight * avgPurchaseRate;
  const revenueFromSold = totalSaleAmount;
  const grossProfit = revenueFromSold - costOfSold;
  
  let totalGST = 0;
  pSales.forEach(s => { const { gst } = calculateSaleGST(s); totalGST += gst; });
  
  const netProfit = grossProfit - totalGST;
  
  return {
    product, productCode, productName: product.name, category: product.category, karat: product.karat,
    openingStock, currentStock,
    totalPurchasedQty, totalPurchasedWeight, totalPurchaseAmount, totalPurchasePaid, totalPurchaseBalance,
    totalSoldQty, totalSoldWeight, totalSaleAmount, totalSaleReceived, totalSaleBalance,
    avgPurchaseRate, avgSaleRate, costOfSold, revenueFromSold, grossProfit, totalGST, netProfit,
    salesCount: pSales.length, purchasesCount: pPurch.length
  };
}

function calculateAllProductsStats(products, purchases, sales) {
  return products.map(p => calculateProductStats(p.product_code, products, purchases, sales)).filter(Boolean);
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

// ===== DELETE ALL DATA (Only Admin) =====
async function deleteAllData() {
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    alert('❌ Sirf admin data delete kar sakta hai');
    return false;
  }
  
  const tables = ['sales', 'purchases', 'payments', 'expenses', 'services', 'bank_transactions', 'products', 'customers', 'suppliers', 'karigars', 'bank_accounts'];
  
  try {
    for (const table of tables) {
      await sbFetch(`${table}?id=not.is.null`, { method: 'DELETE' });
    }
    clearCache();
    return true;
  } catch (e) {
    console.error('Delete all error:', e);
    throw e;
  }
}
// ===== RETURN CALCULATIONS =====
function calculateReturnTotal(returnItem) {
  const qty = Number(returnItem.qty) || 1;
  const weight = Number(returnItem.weight) || 0;
  const rate = Number(returnItem.rate) || 0;
  const discount = Number(returnItem.discount) || 0;
  
  const totalWeight = qty * weight;
  const metal = totalWeight * rate;
  const gst = Math.round(metal * 0.03);
  const total = metal + gst - discount;
  
  return { totalWeight, metal, gst, total };
}
async function initDB() { return true; }