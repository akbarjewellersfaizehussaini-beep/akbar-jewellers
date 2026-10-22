// ===== AKBAR JEWELLERS – APP (FINAL v4) =====
// Back button, auth, helpers

function formatPKR(amount) { return 'Rs ' + Math.round(Number(amount) || 0).toLocaleString('en-PK'); }
function formatDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; } }
function formatDateTime(d) { if (!d) return '—'; try { return new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; } }

// ===== BACK BUTTON (UNIVERSAL FIX) =====
function goBack(page = 'index.html') {
  try { if (typeof clearCache === 'function') clearCache(); } catch (e) {}
  window.location.href = page;
}
function navigate(page) { goBack(page); }
function navigateFresh(page) { goBack(page); }

// ===== AUTH =====
function checkAuth(allowedRoles = []) {
  const session = localStorage.getItem('akbar_user_session');
  if (!session) { window.location.href = 'login.html'; return null; }
  let user;
  try { user = JSON.parse(session); } catch { window.location.href = 'login.html'; return null; }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) { alert('❌ Access Denied!'); window.location.href = 'index.html'; return null; }
  return user;
}
function logout() { localStorage.removeItem('akbar_user_session'); window.location.href = 'login.html'; }
function getCurrentUser() { const s = localStorage.getItem('akbar_user_session'); return s ? JSON.parse(s) : null; }
function isAdmin() { const u = getCurrentUser(); return u && u.role === 'admin'; }
function canDelete() { return isAdmin(); }

function deleteButtonHTML(fn, id, label = '🗑️ Delete') {
  if (!canDelete()) return '';
  return `<button class="btn-danger" style="padding:6px 12px; font-size:0.75rem;" onclick="${fn}('${id}')">${label}</button>`;
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
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const weekStr = startOfWeek.toISOString().slice(0, 10);
  const thisMonth = now.toISOString().slice(0, 7);
  const thisYear = now.getFullYear().toString();
  return (data || []).filter(item => {
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
  const el = document.getElementById(elementId);
  if (!el) { alert('Print content not found'); return; }
  const content = el.innerHTML;
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Print</title><style>body{font-family:'Poppins',sans-serif;padding:20px;color:#000;background:#fff;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#FAF7F0;color:#D4AF37;}</style></head><body>${content}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
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