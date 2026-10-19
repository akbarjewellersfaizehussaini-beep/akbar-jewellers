// ===== SHAH REHAN JEWELLERS – ADMIN VLOGS =====

// Check auth
function checkAuth() {
  const session = localStorage.getItem('srj_admin_session');
  if (!session) {
    window.location.href = 'login.html';
    return false;
  }
  try {
    const data = JSON.parse(session);
    if (Date.now() > data.expires_at) {
      localStorage.removeItem('srj_admin_session');
      window.location.href = 'login.html';
      return false;
    }
    return true;
  } catch {
    window.location.href = 'login.html';
    return false;
  }
}

function logout() {
  localStorage.removeItem('srj_admin_session');
  window.location.href = 'login.html';
}

// Extract YouTube ID from URL
function extractYoutubeId(url) {
  if (!url) return null;
  url = url.trim();
  
  // youtu.be/ID
  let match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  
  // youtube.com/watch?v=ID
  match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  
  // youtube.com/embed/ID
  match = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  
  // If just ID passed (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  
  return null;
}

// Preview YouTube video
function previewYoutube() {
  const url = document.getElementById('vlogYoutubeUrl').value.trim();
  const preview = document.getElementById('youtubePreview');
  const iframe = document.getElementById('previewIframe');
  
  const videoId = extractYoutubeId(url);
  
  if (videoId) {
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    preview.classList.add('active');
  } else {
    preview.classList.remove('active');
    iframe.src = '';
  }
}

// Load all vlogs
async function loadVlogs() {
  const grid = document.getElementById('vlogsGrid');
  if (!grid) return;
  
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/vlogs?select=*&order=display_order.asc,created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    const vlogs = await res.json();
    
    if (!vlogs || vlogs.length === 0) {
      grid.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; grid-column: 1/-1;">
          <div style="font-size: 4rem; margin-bottom: 15px;">📹</div>
          <h3 style="color: #FFD700; font-family: 'Playfair Display', serif; font-size: 1.5rem; margin-bottom: 10px;">No Vlogs Yet</h3>
          <p style="color: #B8B8B8;">Click "+ Add Vlog" to upload your first vlog</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = vlogs.map(v => `
      <div class="vlog-admin-card">
        <div class="vlog-thumbnail">
          <iframe 
            src="https://www.youtube.com/embed/${v.youtube_id}?rel=0&modestbranding=1" 
            allowfullscreen>
          </iframe>
        </div>
        <div class="vlog-admin-info">
          <span class="vlog-status ${v.is_active ? 'status-active' : 'status-inactive'}">
            ${v.is_active ? '✓ Active' : '✗ Inactive'}
          </span>
          <h4>${v.title}</h4>
          <p>${v.description || 'No description'}</p>
          <p style="font-size: 0.75rem; color: #888;">📁 ${v.category || 'other'} • Order: ${v.display_order}</p>
          <div class="vlog-admin-actions">
            <button class="btn-action btn-edit" onclick='editVlog(${JSON.stringify(v).replace(/'/g, "&#39;")})'>✏️ Edit</button>
            <button class="btn-action btn-delete" onclick="deleteVlog('${v.id}', '${v.title.replace(/'/g, "")}')">🗑️ Delete</button>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading vlogs:', error);
    grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #FCA5A5; grid-column: 1/-1;">Error loading vlogs</div>';
  }
}

// Open Add Modal
function openAddVlogModal() {
  document.getElementById('vlogModalTitle').textContent = 'Add New Vlog';
  document.getElementById('vlogForm').reset();
  document.getElementById('editVlogId').value = '';
  document.getElementById('youtubePreview').classList.remove('active');
  document.getElementById('previewIframe').src = '';
  document.getElementById('vlogOrder').value = '1';
  document.getElementById('vlogActive').value = 'true';
  document.getElementById('vlogModal').classList.add('active');
}

// Edit Vlog
function editVlog(vlog) {
  document.getElementById('vlogModalTitle').textContent = 'Edit Vlog';
  document.getElementById('editVlogId').value = vlog.id;
  document.getElementById('vlogYoutubeUrl').value = vlog.youtube_url || '';
  document.getElementById('vlogTitle').value = vlog.title || '';
  document.getElementById('vlogDescription').value = vlog.description || '';
  document.getElementById('vlogCategory').value = vlog.category || 'showcase';
  document.getElementById('vlogOrder').value = vlog.display_order || 1;
  document.getElementById('vlogActive').value = vlog.is_active ? 'true' : 'false';
  
  previewYoutube();
  document.getElementById('vlogModal').classList.add('active');
}

// Close Modal
function closeVlogModal() {
  document.getElementById('vlogModal').classList.remove('active');
}

// Save Vlog
document.getElementById('vlogForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const editId = document.getElementById('editVlogId').value;
  const isEdit = !!editId;
  
  const youtubeUrl = document.getElementById('vlogYoutubeUrl').value.trim();
  const youtubeId = extractYoutubeId(youtubeUrl);
  
  if (!youtubeId) {
    alert('❌ Invalid YouTube URL. Please check and try again.\n\nExample: https://youtu.be/42KGVLHppaY');
    return;
  }
  
  const vlogData = {
    title: document.getElementById('vlogTitle').value.trim(),
    description: document.getElementById('vlogDescription').value.trim() || null,
    youtube_url: youtubeUrl,
    youtube_id: youtubeId,
    category: document.getElementById('vlogCategory').value,
    display_order: parseInt(document.getElementById('vlogOrder').value) || 1,
    is_active: document.getElementById('vlogActive').value === 'true'
  };
  
  try {
    const url = isEdit 
      ? `${SUPABASE_URL}/rest/v1/vlogs?id=eq.${editId}`
      : `${SUPABASE_URL}/rest/v1/vlogs`;
    
    const method = isEdit ? 'PATCH' : 'POST';
    
    const res = await fetch(url, {
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(vlogData)
    });
    
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    
    alert('✅ Vlog ' + (isEdit ? 'updated' : 'added') + ' successfully!');
    closeVlogModal();
    loadVlogs();
    
  } catch (error) {
    console.error('Save error:', error);
    alert('❌ Error: ' + error.message);
  }
});

// Delete Vlog
async function deleteVlog(id, title) {
  if (!confirm(`Delete vlog "${title}"?\n\nThis action cannot be undone.`)) return;
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vlogs?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!res.ok) throw new Error('Delete failed');
    
    alert('✅ Vlog deleted');
    loadVlogs();
    
  } catch (error) {
    alert('❌ Error: ' + error.message);
  }
}

// Close modal on outside click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('vlogModal');
  if (e.target === modal) closeVlogModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeVlogModal();
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  loadVlogs();
  console.log('✅ Admin Vlogs loaded');
});