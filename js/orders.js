// ===== SHAH REHAN JEWELLERS – ORDERS MANAGEMENT =====

// Auth check
function checkAuth() {
  const session = localStorage.getItem('srj_admin_session');
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  try {
    const data = JSON.parse(session);
    if (Date.now() > data.expires_at) {
      localStorage.removeItem('srj_admin_session');
      window.location.href = 'login.html';
      return null;
    }
    return data;
  } catch {
    window.location.href = 'login.html';
    return null;
  }
}

function logout() {
  localStorage.removeItem('srj_admin_session');
  window.location.href = 'login.html';
}

function formatPKR(amount) {
  return 'Rs ' + Math.round(amount || 0).toLocaleString('en-PK');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' });
}

// ===== LOAD ORDERS =====
async function loadOrders() {
  const container = document.getElementById('ordersContainer');
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    const orders = await res.json();
    
    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📭</div>
          <h3 style="color: #FFD700; font-family: 'Playfair Display', serif; margin-bottom: 10px;">No Orders Yet</h3>
          <p>Customer orders will appear here when they place them.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>WhatsApp</th>
            <th>Total</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td style="color: #FFD700; font-weight: 600;">${o.order_number}</td>
              <td>${o.customer_name}</td>
              <td>${o.customer_whatsapp}</td>
              <td>${formatPKR(o.total_amount)}</td>
              <td><span class="status-badge status-${o.order_status || 'pending'}">${(o.order_status || 'pending').toUpperCase()}</span></td>
              <td>${formatDate(o.created_at)}</td>
              <td><button class="btn-view" onclick='viewOrder(${JSON.stringify(o).replace(/'/g, "&#39;")})'>View</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
  } catch (error) {
    console.error('Orders error:', error);
    container.innerHTML = `<div class="empty-state"><p>Error loading orders</p></div>`;
  }
}

// ===== VIEW ORDER =====
function viewOrder(order) {
  const modal = document.getElementById('orderModal');
  const content = document.getElementById('orderDetailContent');
  
  document.getElementById('orderModalTitle').textContent = `Order ${order.order_number}`;
  
  // Parse items
  let items = [];
  try {
    items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
  } catch (e) {
    items = [];
  }
  
  const itemsHtml = items.map(item => `
    <div class="order-detail-row">
      <span class="order-detail-label">${item.name || 'Product'}</span>
      <span class="order-detail-value">${item.karat || 'N/A'} | ${item.weight || '—'} ${item.unit || ''} | ${item.size || 'Std'}</span>
    </div>
  `).join('');
  
  content.innerHTML = `
    <h3 style="color: #FFD700; margin: 15px 0 10px; font-size: 1rem;">Customer Info</h3>
    <div class="order-detail-row">
      <span class="order-detail-label">Name</span>
      <span class="order-detail-value">${order.customer_name}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">WhatsApp</span>
      <span class="order-detail-value">${order.customer_whatsapp}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Email</span>
      <span class="order-detail-value">${order.customer_email || '—'}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Address</span>
      <span class="order-detail-value">${order.customer_address || '—'}, ${order.customer_city || ''}</span>
    </div>
    
    <h3 style="color: #FFD700; margin: 20px 0 10px; font-size: 1rem;">Items</h3>
    ${itemsHtml || '<p style="color: #B8B8B8;">No items</p>'}
    
    <h3 style="color: #FFD700; margin: 20px 0 10px; font-size: 1rem;">Payment</h3>
    <div class="order-detail-row">
      <span class="order-detail-label">Total</span>
      <span class="order-detail-value">${formatPKR(order.total_amount)}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Advance (${order.advance_type === 'full' ? '100%' : '85%'})</span>
      <span class="order-detail-value">${formatPKR(order.advance_amount)}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Remaining</span>
      <span class="order-detail-value">${formatPKR(order.remaining_amount)}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Transaction ID</span>
      <span class="order-detail-value">${order.transaction_id || '—'}</span>
    </div>
    
    <h3 style="color: #FFD700; margin: 20px 0 10px; font-size: 1rem;">Update Status</h3>
    <select id="statusSelect" class="status-select">
      <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending</option>
      <option value="confirmed" ${order.order_status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
      <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>Processing</option>
      <option value="shipped" ${order.order_status === 'shipped' ? 'selected' : ''}>Shipped</option>
      <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered</option>
      <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
    </select>
    <button class="btn-update" onclick="updateOrderStatus('${order.id}')">Update Status</button>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
      <a href="https://wa.me/${(order.customer_whatsapp || '').replace(/[^0-9]/g, '')}" target="_blank" style="text-align: center; padding: 12px; background: #25D366; color: white; border-radius: 50px; text-decoration: none; font-weight: 600;">📱 WhatsApp</a>
      <button onclick="window.print()" style="padding: 12px; background: transparent; border: 2px solid #FFD700; color: #FFD700; border-radius: 50px; cursor: pointer; font-weight: 600;">🖨 Print</button>
    </div>
  `;
  
  modal.classList.add('active');
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('active');
}

// ===== UPDATE ORDER STATUS =====
async function updateOrderStatus(orderId) {
  const newStatus = document.getElementById('statusSelect').value;
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ 
        order_status: newStatus,
        updated_at: new Date().toISOString()
      })
    });
    
    if (!res.ok) throw new Error('Update failed');
    
    alert('✅ Order status updated to: ' + newStatus.toUpperCase());
    closeOrderModal();
    loadOrders();
    
  } catch (error) {
    alert('❌ Error: ' + error.message);
  }
}

// ===== CLOSE MODAL ON OUTSIDE =====
document.addEventListener('click', (e) => {
  const modal = document.getElementById('orderModal');
  if (e.target === modal) closeOrderModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeOrderModal();
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  loadOrders();
  console.log('Orders Page Loaded ✅');
});