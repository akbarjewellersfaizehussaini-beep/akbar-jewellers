// ===== AKBAR JEWELLERS – SOFTWARE DATABASE =====
// FALLBACK: Agar supabase.js load na ho to yeh use hoga

if (typeof window.SUPABASE_URL === 'undefined') {
  window.SUPABASE_URL = 'https://cvuqtmmlewaudtxzpnyg.supabase.co';
}
if (typeof window.SUPABASE_KEY === 'undefined') {
  window.SUPABASE_KEY = 'sb_publishable_of8TMEfEPDsVg21MfSSmBQ_CbwtRqRk';
}

const CLOUD_NAME = 'olpbssol';
const CLOUDINARY_PRESET = 'akbar-jewellers';

// ===== WEIGHT UNITS =====
const WEIGHT_UNITS = {
  gram: 1,
  tola: 11.664,
  masha: 0.972,
  ratti: 0.1215
};

const KARAT_PURITY = {
  '24K': 1.0, '22K': 0.9167, '21K': 0.875, '18K': 0.75,
  '16K': 0.6667, '14K': 0.5833, '12K': 0.5, '10K': 0.4167, '8K': 0.3333
};

// ===== WEIGHT CONVERSION =====
function toGrams(value, unit) {
  return value * (WEIGHT_UNITS[unit] || 1);
}

function fromGrams(grams, unit) {
  return grams / (WEIGHT_UNITS[unit] || 1);
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

function formatNumber(num) {
  return Math.round(num || 0).toLocaleString('en-PK');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ===== CACHE =====
const dbCache = {};

async function sbFetch(path, options = {}) {
  const res = await fetch(`${window.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': window.SUPABASE_KEY,
      'Authorization': `Bearer ${window.SUPABASE_KEY}`,
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

async function getRecordsFast(storeName, forceRefresh = false) {
  if (!forceRefresh && dbCache[storeName]) return dbCache[storeName];
  
  try {
    const rows = await sbFetch(`${storeName}?select=*&order=created_at.desc`);
    const data = (rows || []).map(r => ({ 
      ...r, 
      date: r.sale_date || r.purchase_date || r.expense_date || r.payment_date || r.service_date || r.created_at 
    }));
    dbCache[storeName] = data;
    return data;
  } catch (e) {
    console.error('getRecordsFast error for', storeName, ':', e);
    return [];
  }
}

function clearCache(storeName) {
  if (storeName) delete dbCache[storeName];
  else Object.keys(dbCache).forEach(k => delete dbCache[k]);
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

// ===== SETTINGS =====
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

async function saveSetting(key, value) {
  const existing = await sbFetch(`settings?setting_key=eq.${encodeURIComponent(key)}&select=id`);
  if (existing && existing.length > 0) {
    return sbFetch(`settings?setting_key=eq.${encodeURIComponent(key)}`, { 
      method: 'PATCH', 
      body: JSON.stringify({ setting_value: String(value) }) 
    });
  } else {
    return sbFetch(`settings`, { 
      method: 'POST', 
      body: JSON.stringify({ setting_key: key, setting_value: String(value) }) 
    });
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
async function uploadVideo(file) { return uploadToCloudinary(file, 'video'); }
async function uploadMultipleImages(files) {
  const urls = [];
  for (const file of Array.from(files)) {
    const url = await uploadImage(file);
    urls.push(url);
  }
  return urls;
}

// ===== BUSINESS CALCULATIONS =====
function calculateSaleTotal(sale) {
  const qty = sale.qty || 1;
  const weight = sale.weight || 0;
  const rate = sale.rate || 0;
  const making = sale.making || 0;
  const polish = sale.polish || 0;
  const discount = sale.discount || 0;
  const gstPct = sale.gst_pct || 3;
  
  const totalWeight = qty * weight;
  const metal = totalWeight * rate;
  const makingTotal = making * qty;
  const polishTotal = polish * qty;
  const subtotal = metal + makingTotal + polishTotal;
  const gst = subtotal * (gstPct / 100);
  const total = subtotal + gst - discount;
  
  return { totalWeight, metal, makingTotal, polishTotal, subtotal, gst, total };
}

function calculatePurchaseTotal(purchase) {
  const qty = purchase.qty || 1;
  const weight = purchase.weight || 0;
  const rate = purchase.rate || 0;
  const totalWeight = qty * weight;
  const total = totalWeight * rate;
  
  return { totalWeight, total };
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