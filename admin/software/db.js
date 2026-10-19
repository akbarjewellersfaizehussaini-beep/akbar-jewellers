// ===== SHAH REHAN JEWELLERS – DATABASE (FAST + CLOUD) =====
const SUPABASE_URL = 'https://jwelbgexizmxdwozcxut.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZWxiZ2V4aXpteGR3b3pjeHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTMwOTMsImV4cCI6MjEwNzU2OTA5M30.D_yqxv2sDzijObjHjMXDL-HsXAX6wPsM6s2-GVoQtuE';
const CLOUD_NAME = 'mo7txjdn';
const CLOUDINARY_PRESET = 'shah-rehan-jewellers';

// In-Memory Cache (Fast Performance)
const dbCache = {};

// ---------- Supabase Core ----------
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

// ---------- FAST FETCH (Cache Logic) ----------
async function getRecordsFast(storeName, forceRefresh = false) {
  if (!forceRefresh && dbCache[storeName]) {
    return dbCache[storeName];
  }
  const rows = await sbFetch(`${storeName}?select=*&order=created_at.desc`);
  const data = (rows || []).map(r => ({ ...r, date: r.sale_date || r.purchase_date || r.expense_date || r.payment_date || r.created_at }));
  dbCache[storeName] = data;
  return data;
}

function clearCache(storeName) {
  if (storeName) delete dbCache[storeName];
  else Object.keys(dbCache).forEach(k => delete dbCache[k]);
}

// ---------- CRUD Operations ----------
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

// ---------- Settings (Cloud) ----------
async function getShopSettings() {
  const defaults = { name: 'SHAH REHAN JEWELLERS', address: 'Main Bazar #2, Ghaziabad, Lahore Cantt', phone: '0092 326 6501314', gst_pct: 3, making_pct: 15 };
  try {
    const rows = await sbFetch('settings?select=*');
    if (!rows || rows.length === 0) return defaults;
    const s = { ...defaults };
    rows.forEach(r => {
      const isNum = ['gst_pct', 'making_pct'].includes(r.key);
      s[r.key] = isNum ? parseFloat(r.value) : r.value;
    });
    return s;
  } catch (e) { return defaults; }
}

async function saveSetting(key, value) {
  const existing = await sbFetch(`settings?key=eq.${encodeURIComponent(key)}&select=key`);
  if (existing && existing.length > 0) {
    return sbFetch(`settings?key=eq.${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify({ value: String(value) }) });
  } else {
    return sbFetch(`settings`, { method: 'POST', body: JSON.stringify({ key, value: String(value) }) });
  }
}

// ---------- Cloudinary ----------
async function uploadToCloudinary(file, resourceType = 'image') {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url;
}

async function uploadImage(file) { return uploadToCloudinary(file, 'image'); }
async function uploadVideo(file) { return uploadToCloudinary(file, 'video'); }
async function initDB() { return true; }