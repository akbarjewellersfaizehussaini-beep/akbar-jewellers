// ===== AKBAR JEWELLERS – SOFTWARE DATABASE (PRIMARY KEY SYSTEM) =====

const SUPABASE_URL = 'https://cvuqtmmlewaudtxzpnyg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_of8TMEfEPDsVg21MfSSmBQ_CbwtRqRk';

const CLOUD_NAME = 'olpbssol';
const CLOUDINARY_PRESET = 'akbar-jewellers';

// ===== CACHE TIMEOUT =====
const CACHE_TIMEOUT = 5000;

// ===== WEIGHT UNITS =====
const WEIGHT_UNITS = {
  gram: 1,
  tola: 11.664,
  masha: 0.972,
  ratti: 0.1215
};

// ===== WEIGHT CONVERSION =====
function toGrams(value, unit) {
  return value * (WEIGHT_UNITS[unit] || 1);
}

function formatWeight(grams) {
  if (!grams || grams <= 0) return '0g';
  if (grams >= 11.664) {
    const tola = Math.floor(grams / 11.664);
    const remaining = grams - (tola * 11.664);
    const masha = Math.floor(remaining / 0.972);
    const ratti = ((remaining - (masha * 0.972)) / 0.1215).toFixed(1);
    let result = '';
    if (tola > 0) result += `${tola} tola `;
    if (masha > 0) result += `${masha} masha `;
    if (parseFloat(ratti) > 0) result += `${ratti} ratti`;
    return result.trim() || `${grams.toFixed(2)}g`;
  }
  if (grams >= 0.972) {
    const masha = Math.floor(grams / 0.972);
    const ratti = ((grams - (masha * 0.972)) / 0.1215).toFixed(1);
    return `${masha} masha ${ratti} ratti`;
  }
  return `${grams.toFixed(2)}g`;
}

function formatPKR(amount) {
  return 'Rs ' + Math.round(amount || 0).toLocaleString('en-PK');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ===== CACHE =====
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
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase Error ${res.status}: ${txt}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ===== GET RECORDS WITH CACHE TIMEOUT =====
async function getRecordsFast(storeName, forceRefresh = false) {
  const now = Date.now();
  
  if (!forceRefresh && dbCache[storeName]) {
    const cacheTime = dbCache[storeName + '_time'] || 0;
    if (now - cacheTime < CACHE_TIMEOUT) {
      return dbCache[storeName];
    }
  }
  
  try {
    const rows = await sbFetch(`${storeName}?select=*&order=created_at.desc`);
    const data = (rows || []).map(r => ({ 
      ...r, 
      date: r.sale_date || r.purchase_date || r.expense_date || r.payment_date || r.service_date || r.created_at 
    }));
    dbCache[storeName] = data;
    dbCache[storeName + '_time'] = now;
    return data;
  } catch (e) {
    console.error('getRecordsFast error for', storeName, ':', e);
    return [];
  }
}

function clearCache(storeName) {
  if (storeName) {
    delete dbCache[storeName];
    delete dbCache[storeName + '_time'];
  } else {
    Object.keys(dbCache).forEach(k => delete dbCache[k]);
  }
}

async function addRecord(storeName, data) {
  const clean = { ...data };
  delete clean.id; delete clean.date; delete clean.created_at;
  const result = await sbFetch(storeName, { method: 'POST', body: JSON.stringify(clean) });
  clearCache(storeName);
  return Array.isArray(result) ? result[0] : result;
}

async function updateRecord(storeName, id, data) {
  const clean = { ...data };
  delete clean.id; delete clean.date; delete clean.created_at;
  const result = await sbFetch(`${storeName}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(clean) });
  clearCache(storeName);
  return result;
}

async function deleteRecord(storeName, id) {
  await sbFetch(`${storeName}?id=eq.${id}`, { method: 'DELETE' });
  clearCache(storeName);
}

// ===== SHOP SETTINGS =====
async function getShopSettings() {
  const defaults = { 
    name: 'AKBAR JEWELLERS', 
    name_urdu: 'فیض حسینی',
    tagline: 'Diamond aur Kundan Antique Jewellery ke Expert',
    address: 'New Canal Park, Ali Plaza Tajbagh, Lahore', 
    phone: '03234086439', 
    email: 'akbarjewellersfaizehussaini@gmail.com',
    gst_pct: 3, 
    making_pct: 15 
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
  } catch (e) { 
    return defaults; 
  }
}

// ===== CLOUDINARY =====
async function uploadToCloudinary(file, resourceType = 'image') {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, { 
    method: 'POST', 
    body: form 
  });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url;
}

async function uploadImage(file) { return uploadToCloudinary(file, 'image'); }

// ===== PRODUCT-WISE CALCULATIONS (PRIMARY KEY SYSTEM) =====

// Har product ka complete hisaab
function calculateProductStats(productCode, products, purchases, sales, payments, customers) {
  const product = products.find(p => p.product_code === productCode);
  if (!product) return null;

  // Purchases of this product
  const productPurchases = purchases.filter(p => p.product_id === productCode);
  const totalPurchasedQty = productPurchases.reduce((sum, p) => sum + (Number(p.qty) || 0), 0);
  const totalPurchasedWeight = productPurchases.reduce((sum, p) => sum + (Number(p.total_weight) || Number(p.weight) * Number(p.qty) || 0), 0);
  const totalPurchaseAmount = productPurchases.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  const totalPurchasePaid = productPurchases.reduce((sum, p) => sum + (Number(p.paid) || 0), 0);
  const totalPurchaseBalance = totalPurchasedAmount - totalPurchasePaid;

  // Sales of this product
  const productSales = sales.filter(s => s.product_id === productCode);
  const totalSoldQty = productSales.reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
  const totalSoldWeight = productSales.reduce((sum, s) => sum + (Number(s.total_weight) || Number(s.weight) * Number(s.qty) || 0), 0);
  const totalSaleAmount = productSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalSaleReceived = productSales.reduce((sum, s) => sum + (Number(s.received) || 0), 0);
  const totalSaleBalance = totalSaleAmount - totalSaleReceived;

  // Inventory
  const openingStock = Number(product.opening_stock) || 0;
  const currentStock = openingStock + totalPurchasedQty - totalSoldQty;

  // Profit (per product)
  const avgPurchaseRate = totalPurchasedWeight > 0 ? totalPurchaseAmount / totalPurchasedWeight : (Number(product.cost_price) || 0);
  const avgSaleRate = totalSoldWeight > 0 ? totalSaleAmount / totalSoldWeight : (Number(product.sale_price) || 0);

  const costOfSold = totalSoldWeight * avgPurchaseRate;
  const revenueFromSold = totalSaleAmount;
  const grossProfit = revenueFromSold - costOfSold;

  // GST on sales
  let totalGST = 0;
  productSales.forEach(s => {
    const qty = Number(s.qty) || 1;
    const weight = Number(s.weight) || 0;
    const rate = Number(s.rate) || 0;
    const making = Number(s.making) || 0;
    const polish = Number(s.polish) || 0;
    const gstPct = Number(s.gst_pct) || 3;
    const totalWeight = qty * weight;
    const subtotal = (totalWeight * rate) + (making * qty) + (polish * qty);
    totalGST += subtotal * (gstPct / 100);
  });

  // Net profit
  const netProfit = grossProfit - totalGST;

  return {
    product,
    productCode,
    productName: product.name,
    category: product.category,
    karat: product.karat,
    openingStock,
    currentStock,
    totalPurchasedQty,
    totalPurchasedWeight,
    totalPurchaseAmount,
    totalPurchasePaid,
    totalPurchaseBalance,
    totalSoldQty,
    totalSoldWeight,
    totalSaleAmount,
    totalSaleReceived,
    totalSaleBalance,
    avgPurchaseRate,
    avgSaleRate,
    costOfSold,
    revenueFromSold,
    grossProfit,
    totalGST,
    netProfit,
    salesCount: productSales.length,
    purchasesCount: productPurchases.length
  };
}

// Saare products ka stats
function calculateAllProductsStats(products, purchases, sales, payments, customers) {
  return products.map(p => calculateProductStats(p.product_code, products, purchases, sales, payments, customers)).filter(Boolean);
}

// ===== WHATSAPP / EMAIL =====
function openWhatsApp(phone, message) {
  if (!phone) { alert('Phone number missing'); return; }
  let num = phone.toString().replace(/[^0-9]/g, '');
  if (num.startsWith('0')) num = '92' + num.slice(1);
  if (!num.startsWith('92') && num.length === 10) num = '92' + num;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, '_blank');
}

async function sendEmail(to, subject, body) {
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailto, '_blank');
}

async function initDB() { return true; }