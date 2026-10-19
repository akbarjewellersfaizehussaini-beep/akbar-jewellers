// ===== SHAH REHAN JEWELLERS – ADMIN JS =====

// Check auth
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

// Logout
function logout() {
  localStorage.removeItem('srj_admin_session');
  window.location.href = 'login.html';
}

// Format currency
function formatPKR(amount) {
  return 'Rs ' + Math.round(amount || 0).toLocaleString('en-PK');
}

// ===== LOAD DASHBOARD STATS =====
async function loadStats() {
  try {
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    };
    
    // Products count
    const productsRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id`, { headers });
    const products = await productsRes.json();
    document.getElementById('statProducts').textContent = products.length;
    
    // Orders
    const ordersRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*`, { headers });
    const orders = await ordersRes.json();
    document.getElementById('statOrders').textContent = orders.length;
    
    // Revenue
    const revenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    document.getElementById('statRevenue').textContent = formatPKR(revenue);
    
    // Pending
    const pending = orders.filter(o => o.order_status === 'pending').length;
    document.getElementById('statPending').textContent = pending;
    
  } catch (error) {
    console.error('Stats error:', error);
  }
}

// ===== LOAD PRODUCTS =====
async function loadAdminProducts() {
  const grid = document.getElementById('adminProductsGrid');
  if (!grid) return;
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    const products = await res.json();
    
    if (!products || products.length === 0) {
      grid.innerHTML = '<div class="loading">No products yet. Add your first product!</div>';
      return;
    }
    
    grid.innerHTML = products.map(p => `
      <div class="admin-product-card">
        <img src="${p.image_url || 'https://via.placeholder.com/300x200/1C1C1C/FFD700?text=No+Image'}" alt="${p.name}">
        <div class="admin-product-info">
          <h4>${p.name}</h4>
          <p class="price">${formatPKR(p.price)}</p>
          <div class="admin-product-actions">
            <button class="btn-edit" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "&#39;")})'>✏️ Edit</button>
            <button class="btn-delete" onclick="deleteProduct('${p.id}', '${p.name.replace(/'/g, "")}')">🗑️ Delete</button>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Products error:', error);
    grid.innerHTML = '<div class="loading">Error loading products</div>';
  }
}

// ===== OPEN ADD PRODUCT MODAL =====
function openAddProductModal() {
  document.getElementById('modalTitle').textContent = 'Add New Product';
  document.getElementById('productForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('productModal').classList.add('active');
}

// ===== EDIT PRODUCT =====
function editProduct(product) {
  document.getElementById('modalTitle').textContent = 'Edit Product';
  document.getElementById('editId').value = product.id;
  document.getElementById('pName').value = product.name || '';
  document.getElementById('pCategory').value = product.category || '';
  document.getElementById('pSubcategory').value = product.subcategory || '';
  document.getElementById('pKarat').value = product.karat || '';
  document.getElementById('pWeight').value = product.weight || '';
  document.getElementById('pSize').value = product.size || '';
  document.getElementById('pPrice').value = product.price || '';
  document.getElementById('pImage').value = product.image_url || '';
  document.getElementById('pDescription').value = product.description || '';
  document.getElementById('pStock').value = product.stock || 0;
  document.getElementById('pFeatured').value = product.is_featured ? 'true' : 'false';
  
  document.getElementById('productModal').classList.add('active');
}

// ===== CLOSE MODAL =====
function closeModal() {
  document.getElementById('productModal').classList.remove('active');
}

// ===== SAVE PRODUCT =====
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const editId = document.getElementById('editId').value;
  const isEdit = !!editId;
  
  const productData = {
    name: document.getElementById('pName').value,
    category: document.getElementById('pCategory').value,
    subcategory: document.getElementById('pSubcategory').value || null,
    karat: document.getElementById('pKarat').value || null,
    weight: parseFloat(document.getElementById('pWeight').value) || null,
    weight_unit: 'gram',
    size: document.getElementById('pSize').value || null,
    price: parseFloat(document.getElementById('pPrice').value),
    image_url: document.getElementById('pImage').value || null,
    description: document.getElementById('pDescription').value || null,
    stock: parseInt(document.getElementById('pStock').value) || 0,
    is_featured: document.getElementById('pFeatured').value === 'true',
    is_active: true
  };
  
  try {
    const url = isEdit 
      ? `${SUPABASE_URL}/rest/v1/products?id=eq.${editId}`
      : `${SUPABASE_URL}/rest/v1/products`;
    
    const method = isEdit ? 'PATCH' : 'POST';
    
    const res = await fetch(url, {
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(productData)
    });
    
    if (!res.ok) {
      const err = await res.text();
      alert('❌ Error: ' + err);
      return;
    }
    
    alert('✅ Product ' + (isEdit ? 'updated' : 'added') + ' successfully!');
    closeModal();
    loadAdminProducts();
    loadStats();
    
  } catch (error) {
    alert('❌ Error: ' + error.message);
  }
});

// ===== DELETE PRODUCT =====
async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"?\n\nThis action cannot be undone.`)) return;
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!res.ok) throw new Error('Delete failed');
    
    alert('✅ Product deleted');
    loadAdminProducts();
    loadStats();
    
  } catch (error) {
    alert('❌ Error: ' + error.message);
  }
}

// ===== CLOSE MODAL ON OUTSIDE CLICK =====
document.addEventListener('click', (e) => {
  const modal = document.getElementById('productModal');
  if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  loadStats();
  loadAdminProducts();
  console.log('Admin Panel Loaded ✅');
});