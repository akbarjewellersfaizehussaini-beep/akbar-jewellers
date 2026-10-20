// ===== AKBAR JEWELLERS – APP LOGIC (FINAL) =====

function formatPKR(amount) { 
  return 'Rs ' + Math.round(amount || 0).toLocaleString('en-PK'); 
}

function formatDate(dateStr) { 
  if (!dateStr) return '—'; 
  return new Date(dateStr).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); 
}

function formatDateTime(dateStr) { 
  if (!dateStr) return '—'; 
  return new Date(dateStr).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); 
}

function navigate(page) { window.location.href = page; }

// ---------- AUTHENTICATION ----------
function checkAuth(allowedRoles = []) {
  const session = localStorage.getItem('akbar_user_session');
  if (!session) { window.location.href = 'login.html'; return null; }
  
  const user = JSON.parse(session);
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    alert('❌ Access Denied! You do not have permission.');
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

function logout() {
  localStorage.removeItem('akbar_user_session');
  window.location.href = 'login.html';
}

function getCurrentUser() {
  const s = localStorage.getItem('akbar_user_session');
  return s ? JSON.parse(s) : null;
}

// ---------- ROLE CHECK HELPERS ----------
function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

function canDelete() {
  return isAdmin();
}

// Delete button (sirf admin ke liye)
function deleteButtonHTML(deleteFunction, id, label = '🗑️ Delete') {
  if (!canDelete()) return '';
  return `<button class="btn-danger" style="padding:6px 12px; font-size:0.75rem;" onclick="${deleteFunction}('${id}')">${label}</button>`;
}

// Delete confirmation
function confirmDelete(itemName = 'this item') {
  if (!canDelete()) {
    alert('❌ Only admin can delete entries');
    return false;
  }
  if (!confirm('⚠️ Delete ' + itemName + '?\n\nThis action cannot be undone!')) return false;
  if (!confirm('🔴 Final confirmation: Are you sure?')) return false;
  return true;
}

// ---------- CALCULATIONS ----------
function calculateInvoice(weight, rate, making, polish, gstPct, discount) {
  const metal = weight * rate;
  const makingTotal = making + polish;
  const subtotal = metal + makingTotal;
  const gst = subtotal * (gstPct / 100);
  const total = subtotal + gst - discount;
  return { metal, makingTotal, subtotal, gst, total };
}

// ---------- WHATSAPP ----------
function openWhatsApp(phone, message) {
  if (!phone) { alert('Phone number missing'); return; }
  let num = phone.toString().replace(/[^0-9]/g, '');
  if (num.startsWith('0')) num = '92' + num.slice(1);
  if (!num.startsWith('92') && num.length === 10) num = '92' + num;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, '_blank');
}

// ---------- EMAIL ----------
function sendEmail(to, subject, body) {
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailto, '_blank');
}

// ---------- DATE FILTERS ----------
function filterByDate(data, range) {
  if (range === 'all') return data;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const weekStr = startOfWeek.toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisYear = new Date().getFullYear().toString();

  return data.filter(item => {
    const d = item.date || item.created_at;
    if (!d) return false;
    const ds = d.slice(0, 10);
    if (range === 'today') return ds === today;
    if (range === 'week') return ds >= weekStr;
    if (range === 'month') return d.startsWith(thisMonth);
    if (range === 'year') return d.startsWith(thisYear);
    return true;
  });
}

// ---------- PRINT ----------
function printElement(elementId) {
  const content = document.getElementById(elementId).innerHTML;
  const originalContent = document.body.innerHTML;
  
  document.body.innerHTML = `
    <html>
      <head>
        <title>Print</title>
        <style>
          body { font-family: 'Poppins', sans-serif; padding: 20px; color: #000; background: #fff; }
          .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; border-radius: 10px; }
          .invoice-header { text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 15px; margin-bottom: 20px; }
          .invoice-header h1 { font-family: 'Playfair Display', serif; color: #D4AF37; margin: 0; font-size: 28px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #FAF7F0; color: #D4AF37; }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `;
  
  window.print();
  document.body.innerHTML = originalContent;
  window.location.reload();
}