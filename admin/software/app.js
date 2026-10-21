// ===== AKBAR JEWELLERS – APP LOGIC (FINAL v3) =====

function formatPKR(amount) { return 'Rs ' + Math.round(amount || 0).toLocaleString('en-PK'); }
function formatDate(dateStr) { if (!dateStr) return '—'; return new Date(dateStr).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatDateTime(dateStr) { if (!dateStr) return '—'; return new Date(dateStr).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

function navigate(page) { window.location.href = page; }
function navigateFresh(page) { if (typeof clearCache === 'function') clearCache(); window.location.href = page; }

function checkAuth(allowedRoles = []) {
  const session = localStorage.getItem('akbar_user_session');
  if (!session) { window.location.href = 'login.html'; return null; }
  const user = JSON.parse(session);
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) { alert('❌ Access Denied!'); window.location.href = 'index.html'; return null; }
  return user;
}

function logout() { localStorage.removeItem('akbar_user_session'); window.location.href = 'login.html'; }
function getCurrentUser() { const s = localStorage.getItem('akbar_user_session'); return s ? JSON.parse(s) : null; }

function isAdmin() { const user = getCurrentUser(); return user && user.role === 'admin'; }
function canDelete() { return isAdmin(); }

function deleteButtonHTML(deleteFunction, id, label = '🗑️ Delete') {
  if (!canDelete()) return '';
  return `<button class="btn-danger" style="padding:6px 12px; font-size:0.75rem;" onclick="${deleteFunction}('${id}')">${label}</button>`;
}

function confirmDelete(itemName = 'this item') {
  if (!canDelete()) { alert('❌ Only admin can delete'); return false; }
  if (!confirm('⚠️ Delete ' + itemName + '?\n\nThis cannot be undone!')) return false;
  if (!confirm('🔴 Final confirmation: Are you sure?')) return false;
  return true;
}

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

function printElement(elementId) {
  const content = document.getElementById(elementId).innerHTML;
  const originalContent = document.body.innerHTML;
  document.body.innerHTML = `<html><head><title>Print</title><style>body{font-family:'Poppins',sans-serif;padding:20px;color:#000;background:#fff;}.invoice-container{max-width:800px;margin:0 auto;border:1px solid #ddd;padding:30px;border-radius:10px;}table{width:100%;border-collapse:collapse;margin-bottom:20px;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#FAF7F0;color:#D4AF37;}</style></head><body>${content}</body></html>`;
  window.print();
  document.body.innerHTML = originalContent;
  window.location.reload();
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