// ===== SHAH REHAN JEWELLERS – APP LOGIC =====

function formatPKR(amount) { 
  return 'Rs ' + Math.round(amount || 0).toLocaleString('en-PK'); 
}

function formatDate(dateStr) { 
  if (!dateStr) return '—'; 
  return new Date(dateStr).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); 
}

function navigate(page) { window.location.href = page; }

// ---------- AUTHENTICATION ----------
function checkAuth(allowedRoles = []) {
  const session = localStorage.getItem('srj_user_session');
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
  localStorage.removeItem('srj_user_session');
  window.location.href = 'login.html';
}

function getCurrentUser() {
  const s = localStorage.getItem('srj_user_session');
  return s ? JSON.parse(s) : null;
}

// ---------- CALCULATIONS (Dynamic) ----------
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

// ---------- DATE FILTERS ----------
function filterByDate(data, range) {
  if (range === 'all') return data;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  
  // Start of week (Sunday)
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

// ---------- PRINT INVOICE ----------
function printElement(elementId) {
  const content = document.getElementById(elementId).innerHTML;
  const originalContent = document.body.innerHTML;
  
  document.body.innerHTML = `
    <html>
      <head>
        <title>Print Invoice</title>
        <style>
          body { font-family: 'Poppins', sans-serif; padding: 20px; color: #000; background: #fff; }
          .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; border-radius: 10px; }
          .invoice-header { text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 15px; margin-bottom: 20px; }
          .invoice-header h1 { font-family: 'Playfair Display', serif; color: #D4AF37; margin: 0; font-size: 28px; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #FAF7F0; color: #D4AF37; }
          .total-box { text-align: right; font-size: 20px; font-weight: bold; color: #D4AF37; margin-top: 20px; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;
  
  window.print();
  document.body.innerHTML = originalContent;
  window.location.reload(); // Reload to restore JS state
}