// ===== AKBAR JEWELLERS – CATEGORY JS =====

// ===== CLOUDINARY CONFIG =====
const CLOUDINARY_CLOUD_NAME = 'olpbssol';
const CLOUDINARY_UPLOAD_PRESET = 'akbar-jewellers';

const WEIGHT = {
  tola: 11.664,
  masha: 0.972,
  ratti: 0.1215,
  gram: 1
};

// Default fallback rates
const LIVE_RATES = {
  usdToPkr: 276.95,
  gold: {
    '24K': 430000, '22K': 394167, '21K': 376250, '18K': 322500,
    '16K': 286667, '14K': 250833, '12K': 215000, '10K': 179167, '8K': 143333,
    'Pathoor': 424500
  },
  silver: {
    perGram: 570.10,
    per10Gram: 5701,
    perTola: 6651
  }
};

let currentRatesPerGram = {};
let selectedBiscuitPayment = 'easypaisa';
let allProducts = [];
let currentCategory = '';
let currentProduct = null;
let cart = JSON.parse(localStorage.getItem('akbar_cart') || '[]');

// ===== HELPERS =====
function getRateForKarat(karat) {
  if (currentRatesPerGram[karat]) return currentRatesPerGram[karat];
  const ratePerTola = LIVE_RATES.gold[karat] || 0;
  return Math.round(ratePerTola / WEIGHT.tola);
}

function toGrams(value, unit) { return value * WEIGHT[unit]; }
function formatPKR(amount) { return 'Rs ' + Math.round(amount || 0).toLocaleString('en-PK'); }

function getProductImage(p) {
  if (p.images && Array.isArray(p.images) && p.images.length > 0) return p.images[0];
  if (p.image_url) return p.image_url;
  return 'images/placeholder.svg';
}

function getProductPrice(p) {
  return p.sale_price || p.price || 0;
}

// ===== CLOUDINARY UPLOAD =====
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST', body: formData
  });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url;
}

// ===== FETCH LIVE RATES =====
async function loadLiveRates() {
  try {
    const goldRes = await fetch(`${SUPABASE_URL}/rest/v1/gold_rates?select=*&order=rate_date.desc&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const goldRows = await goldRes.json();

    if (goldRows && goldRows.length > 0) {
      const g = goldRows[0];
      if (g.rate_24k) LIVE_RATES.gold['24K'] = parseFloat(g.rate_24k);
      if (g.rate_22k) LIVE_RATES.gold['22K'] = parseFloat(g.rate_22k);
      if (g.rate_21k) LIVE_RATES.gold['21K'] = parseFloat(g.rate_21k);
      if (g.rate_18k) LIVE_RATES.gold['18K'] = parseFloat(g.rate_18k);
      if (g.rate_pathoor) LIVE_RATES.gold['Pathoor'] = parseFloat(g.rate_pathoor);

      const base24 = LIVE_RATES.gold['24K'];
      LIVE_RATES.gold['16K'] = Math.round(base24 * 0.6667);
      LIVE_RATES.gold['14K'] = Math.round(base24 * 0.5833);
      LIVE_RATES.gold['12K'] = Math.round(base24 * 0.5);
      LIVE_RATES.gold['10K'] = Math.round(base24 * 0.4167);
      LIVE_RATES.gold['8K'] = Math.round(base24 * 0.3333);
    }

    const silverRes = await fetch(`${SUPABASE_URL}/rest/v1/silver_rates?select=*&order=rate_date.desc&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const silverRows = await silverRes.json();

    if (silverRows && silverRows.length > 0) {
      const s = silverRows[0];
      if (s.rate_999) {
        LIVE_RATES.silver.perGram = parseFloat(s.rate_999);
        LIVE_RATES.silver.per10Gram = Math.round(parseFloat(s.rate_999) * 10);
        LIVE_RATES.silver.perTola = Math.round(parseFloat(s.rate_999) * WEIGHT.tola);
      }
    }

    Object.keys(LIVE_RATES.gold).forEach(k => {
      currentRatesPerGram[k] = Math.round(LIVE_RATES.gold[k] / WEIGHT.tola);
    });

    console.log('✅ Live rates loaded (category)');
  } catch (error) { console.error('⚠️ Rate fetch failed:', error); }
}

// ===== CALCULATE GOLD/SILVER PRICE =====
function calculateGoldSilverPrice(product) {
  const isSilver = product.category === 'silver';
  const weight = product.weight || 0;
  if (!weight) return getProductPrice(product);

  const ratePerGram = isSilver ? (LIVE_RATES.silver.perGram || 570.10) : getRateForKarat(product.karat || '24K');
  const metalValue = ratePerGram * weight;
  const making = metalValue * 0.15;
  const polish = metalValue * 0.10;
  const subtotal = metalValue + making + polish;
  const gst = subtotal * 0.03;
  return Math.round(subtotal + gst);
}

function getProductPrices(product) {
  const isGold = product.category === 'gold';
  const isSilver = product.category === 'silver';
  let originalPrice, discountedPrice, discountPct;

  if (isGold || isSilver) {
    const calculated = calculateGoldSilverPrice(product);
    const mrp = getProductPrice(product);
    if (product.discount_percent && product.discount_percent > 0) {
      originalPrice = mrp || calculated;
      discountPct = product.discount_percent;
      discountedPrice = Math.round(originalPrice * (1 - discountPct / 100));
    } else if (mrp > 0 && calculated > 0 && mrp !== calculated) {
      if (mrp > calculated) { originalPrice = mrp; discountedPrice = calculated; }
      else { originalPrice = calculated; discountedPrice = mrp; }
      discountPct = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
    } else {
      originalPrice = calculated || mrp;
      discountedPrice = originalPrice;
      discountPct = 0;
    }
  } else {
    originalPrice = getProductPrice(product);
    discountPct = product.discount_percent || 5;
    discountedPrice = Math.round(originalPrice * (1 - discountPct / 100));
  }
  return { originalPrice, discountedPrice, discountPct };
}

// ===== INIT CATEGORY PAGE =====
async function initCategoryPage(category) {
  currentCategory = category;
  console.log('🚀 Loading AKBAR category:', category);

  await loadLiveRates();
  await loadCategoryProducts();
  loadReviews();
  updateCartCount();

  console.log('✅ Category page loaded');
}

// ===== LOAD PRODUCTS (Category specific) =====
async function loadCategoryProducts() {
  const grid = document.getElementById('categoryProductsGrid');
  if (!grid) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&category=eq.${currentCategory}&is_active=eq.true&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const products = await res.json();

    if (!products || products.length === 0) {
      grid.innerHTML = '<div class="loading-spinner">No products found in this category</div>';
      allProducts = [];
      return;
    }

    allProducts = products;
    renderProducts(products);
  } catch (error) {
    console.error('Product load error:', error);
    grid.innerHTML = '<div class="loading-spinner">Error loading products</div>';
  }
}

// ===== RENDER PRODUCTS =====
function renderProducts(products) {
  const grid = document.getElementById('categoryProductsGrid');
  if (!grid) return;

  if (!products || products.length === 0) {
    grid.innerHTML = '<div class="loading-spinner">No products found</div>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const { originalPrice, discountedPrice, discountPct } = getProductPrices(p);
    const imgUrl = getProductImage(p);
    return `
      <div class="product-card" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
        <div class="product-image-wrapper">
          <img src="${imgUrl}" alt="${p.name}" loading="lazy" onerror="this.src='images/placeholder.svg'">
          ${discountPct > 0 ? `<div class="discount-ball"><span class="discount-percent">${discountPct}%</span><span class="discount-text">OFF</span></div>` : ''}
        </div>
        <div class="product-info">
          <span class="category-tag">${p.category}</span>
          <h3>${p.name}</h3>
          <div class="price-display-block">
            ${discountPct > 0 ? `<div class="original-price-line"><span class="original-price-text">Rs ${originalPrice.toLocaleString()}</span><span class="cut-line"></span></div>` : ''}
            <div class="final-price-highlight">
              <span class="final-price-value">Rs ${discountedPrice.toLocaleString()}</span>
              ${discountPct > 0 ? `<span class="inline-discount-tag">${discountPct}% OFF</span>` : ''}
            </div>
          </div>
          ${p.weight ? `<div class="product-weight-info">⚖️ ${p.weight}g ${p.karat ? '• ' + p.karat : ''}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ===== FILTERS =====
function filterByKarat(karat) {
  if (!karat) {
    renderProducts(allProducts);
    return;
  }
  const filtered = allProducts.filter(p => p.karat === karat);
  renderProducts(filtered);
}

function filterBySubcategory(subcategory) {
  if (!subcategory) {
    renderProducts(allProducts);
    return;
  }
  const filtered = allProducts.filter(p => (p.subcategory || '').toLowerCase().includes(subcategory.toLowerCase()));
  renderProducts(filtered);
}

function filterByWeight(weightLabel) {
  if (!weightLabel) {
    renderProducts(allProducts);
    return;
  }
  const grams = parseFloat(weightLabel);
  const filtered = allProducts.filter(p => Math.abs((p.weight || 0) - grams) < 1);
  renderProducts(filtered);
}

function sortProducts(sortType) {
  let sorted = [...allProducts];
  if (sortType === 'low') {
    sorted.sort((a, b) => getProductPrices(a).discountedPrice - getProductPrices(b).discountedPrice);
  } else if (sortType === 'high') {
    sorted.sort((a, b) => getProductPrices(b).discountedPrice - getProductPrices(a).discountedPrice);
  } else {
    sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  renderProducts(sorted);
}

// ===== PRODUCT MODAL =====
function openProductModal(product) {
  currentProduct = product;
  document.getElementById('modalImage').src = getProductImage(product);
  document.getElementById('modalProductName').textContent = product.name;
  document.getElementById('modalProductCode').textContent = `Code: AKBAR-${(product.id || '').slice(0, 6).toUpperCase()}`;
  document.getElementById('modalDescription').textContent = product.description || '';

  const isArtificial = product.category === 'artificial';
  const isDiamond = product.category === 'diamond';
  const isGold = product.category === 'gold';
  const isSilver = product.category === 'silver';
  const { originalPrice, discountedPrice, discountPct } = getProductPrices(product);
  const detailsBox = document.getElementById('productDetailsBox');
  const soldQty = product.sold_qty || Math.floor(Math.random() * 50) + 10;

  if (detailsBox) {
    detailsBox.innerHTML = `
      <div class="product-details-grid">
        ${product.weight ? `<div class="detail-box"><div class="detail-box-label">Weight</div><div class="detail-box-value">${product.weight}g</div></div>` : ''}
        ${product.karat ? `<div class="detail-box"><div class="detail-box-label">Quality</div><div class="detail-box-value">${product.karat}</div></div>` : ''}
        ${product.color ? `<div class="detail-box"><div class="detail-box-label">Color</div><div class="detail-box-value">${product.color}</div></div>` : ''}
        ${product.size ? `<div class="detail-box"><div class="detail-box-label">Size</div><div class="detail-box-value">${product.size}</div></div>` : ''}
        <div class="detail-box"><div class="detail-box-label">Sold</div><div class="detail-box-value">${soldQty}</div></div>
      </div>
      <div class="popup-price-display">
        ${discountPct > 0 ? `<div class="popup-original-price"><span class="popup-original-text">Rs ${originalPrice.toLocaleString()}</span><span class="popup-cut-line"></span></div>` : ''}
        <div class="popup-final-price">
          <span class="popup-price-label">${discountPct > 0 ? '🎉 Discounted Price' : '💰 Price'}</span>
          <span class="popup-final-value">Rs ${discountedPrice.toLocaleString()}</span>
          ${discountPct > 0 ? `<span class="popup-discount-tag">Save ${discountPct}%</span>` : ''}
        </div>
      </div>
    `;
    detailsBox.style.display = 'block';
  }

  const autoPrice = document.getElementById('autoPriceDisplay');
  if (autoPrice) { autoPrice.innerHTML = ''; autoPrice.style.display = 'none'; }

  const sizeSelect = document.getElementById('modalSize');
  if (sizeSelect) {
    const options = getSizeOptions(product.category, product.subcategory);
    sizeSelect.innerHTML = '<option value="">Select Size</option>' + options;
    if (product.size) {
      const option = Array.from(sizeSelect.options).find(o => o.value === product.size);
      if (option) sizeSelect.value = product.size;
    }
  }

  const karatSection = document.getElementById('karatSection');
  if (karatSection) {
    if (isArtificial || isDiamond) karatSection.style.display = 'none';
    else {
      karatSection.style.display = 'block';
      if (product.karat) {
        const radio = document.querySelector(`input[name="karat"][value="${product.karat}"]`);
        if (radio) radio.checked = true;
      }
    }
  }

  const colorSection = document.getElementById('colorSection');
  if (colorSection) {
    colorSection.style.display = isArtificial ? 'block' : 'none';
    if (product.color && isArtificial && document.getElementById('modalColor')) {
      document.getElementById('modalColor').value = product.color;
    }
  }

  const customWeightBtn = document.getElementById('customWeightBtn');
  const customWeightBox = document.getElementById('customWeightBox');
  const priceBreakdown = document.getElementById('priceBreakdown');

  if (customWeightBtn) {
    if (isGold || isSilver) {
      customWeightBtn.style.display = 'block';
      if (customWeightBox) customWeightBox.style.display = 'none';
      customWeightBtn.innerHTML = '⚖️ Apni Marzi ka Wazan Banwain';
    } else {
      customWeightBtn.style.display = 'none';
    }
  }

  const weightSection = document.getElementById('weightSection');
  if (weightSection) weightSection.style.display = 'none';
  if (priceBreakdown) priceBreakdown.classList.add('hidden');

  const readymadeButtons = document.getElementById('readymadeButtons');
  if (readymadeButtons) readymadeButtons.style.display = 'grid';

  document.getElementById('productModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
  document.body.style.overflow = '';
  currentProduct = null;
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('productModal');
  if (e.target === modal) closeProductModal();
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeProductModal(); });

function getSizeOptions(category, subcategory) {
  const sub = (subcategory || '').toLowerCase();
  if (sub.includes('ring') || sub.includes('baby ring')) {
    if (sub.includes('baby')) return ['1','2','3','4','5','6','7','8','9'].map(s => `<option value="${s}">${s}</option>`).join('');
    return ['10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25'].map(s => `<option value="${s}">${s}</option>`).join('');
  }
  if (sub.includes('bangle') || sub.includes('kara') || sub.includes('choori')) return ['2.2','2.4','2.6','2.8','2.10','2.12'].map(s => `<option value="${s}">${s}</option>`).join('');
  if (sub.includes('bracelet')) return ['6"','6.5"','7"','7.5"','8"','8.5"'].map(s => `<option value="${s}">${s}</option>`).join('');
  if (sub.includes('chain')) return ['14"','16"','18"','20"','22"','24"','26"','30"'].map(s => `<option value="${s}">${s}</option>`).join('');
  if (sub.includes('anklet') || sub.includes('payal')) return ['9"','10"','11"','12"'].map(s => `<option value="${s}">${s}</option>`).join('');
  if (sub.includes('necklace') || sub.includes('haar') || sub.includes('choker')) return ['14"','16"','18"','20"','22"','24"'].map(s => `<option value="${s}">${s}</option>`).join('');
  if (sub.includes('earring') || sub.includes('jhumka')) return `<option value="Stud">Stud</option><option value="Drop">Drop</option><option value="Jhumka">Jhumka</option><option value="Chandbali">Chandbali</option><option value="Hoop">Hoop</option>`;
  if (sub.includes('pendant')) return ['16"','18"','20"','22"'].map(s => `<option value="${s}">${s}</option>`).join('');
  if (sub.includes('coin')) return ['1g','2g','2.5g','5g','10g','20g','50g','100g'].map(s => `<option value="${s}">${s}</option>`).join('');
  if (sub.includes('bridal')) return `<option value="Standard">Standard</option>`;
  return ['Small','Medium','Large','Standard'].map(s => `<option value="${s}">${s}</option>`).join('');
}

function toggleCustomWeight() {
  const customWeightBox = document.getElementById('customWeightBox');
  const customWeightBtn = document.getElementById('customWeightBtn');
  const weightSection = document.getElementById('weightSection');
  const calculateBtn = document.getElementById('calculateBtn');
  const modalButtons = document.getElementById('modalButtons');
  const priceBreakdown = document.getElementById('priceBreakdown');
  const readymadeButtons = document.getElementById('readymadeButtons');

  if (customWeightBox.style.display === 'none' || !customWeightBox.style.display) {
    customWeightBox.style.display = 'block';
    weightSection.style.display = 'block';
    if (calculateBtn) calculateBtn.style.display = 'block';
    if (modalButtons) modalButtons.style.display = 'grid';
    if (readymadeButtons) readymadeButtons.style.display = 'none';
    customWeightBtn.innerHTML = '❌ Close Custom Weight';
    if (priceBreakdown) priceBreakdown.classList.add('hidden');
  } else {
    customWeightBox.style.display = 'none';
    weightSection.style.display = 'none';
    if (calculateBtn) calculateBtn.style.display = 'none';
    if (modalButtons) modalButtons.style.display = 'none';
    if (readymadeButtons) readymadeButtons.style.display = 'grid';
    customWeightBtn.innerHTML = '⚖️ Apni Marzi ka Wazan Banwain';
    if (priceBreakdown) priceBreakdown.classList.add('hidden');
  }
}

function calculatePrice() {
  if (!currentProduct) return;
  const weight = parseFloat(document.getElementById('modalWeight').value);
  const unit = document.getElementById('modalUnit').value;
  if (!weight || weight <= 0) { alert('Please enter a valid weight'); return; }
  const weightInGrams = toGrams(weight, unit);

  let karat = '24K';
  const karatInput = document.querySelector('input[name="karat"]:checked');
  if (karatInput) karat = karatInput.value;

  let ratePerGram;
  if (currentProduct.category === 'silver') ratePerGram = (LIVE_RATES.silver.perGram || 570.10);
  else ratePerGram = getRateForKarat(karat);

  const metalValue = ratePerGram * weightInGrams;
  const making = metalValue * 0.15;
  const polish = metalValue * 0.10;
  const subtotal = metalValue + making + polish;
  const gst = subtotal * 0.03;
  const total = subtotal + gst;

  document.getElementById('pRate').textContent = formatPKR(ratePerGram) + '/g';
  document.getElementById('pWeight').textContent = weightInGrams.toFixed(3) + ' g';
  document.getElementById('pGold').textContent = formatPKR(metalValue);
  document.getElementById('pMaking').textContent = formatPKR(making);
  document.getElementById('pPolish').textContent = formatPKR(polish);
  document.getElementById('pGST').textContent = formatPKR(gst);
  document.getElementById('pTotal').textContent = formatPKR(total);
  document.getElementById('priceBreakdown').classList.remove('hidden');
}

function addToCart() {
  if (!currentProduct) return;
  if (document.getElementById('priceBreakdown').classList.contains('hidden')) {
    alert('Please calculate price first'); return;
  }
  const cartItem = {
    id: currentProduct.id,
    name: currentProduct.name,
    karat: document.querySelector('input[name="karat"]:checked')?.value || currentProduct.karat || 'N/A',
    weight: parseFloat(document.getElementById('modalWeight').value),
    unit: document.getElementById('modalUnit').value,
    size: document.getElementById('modalSize')?.value || 'Standard',
    color: '',
    total: document.getElementById('pTotal').textContent,
    image: getProductImage(currentProduct),
    category: currentProduct.category
  };
  cart.push(cartItem);
  localStorage.setItem('akbar_cart', JSON.stringify(cart));
  updateCartCount();
  alert('✅ Added to cart!\n\nItems in cart: ' + cart.length);
  closeProductModal();
}

function whatsappOrder() {
  if (!currentProduct) return;
  const isCustomWeight = document.getElementById('customWeightBox')?.style.display === 'block';
  let total, weight;
  if (isCustomWeight) {
    total = document.getElementById('pTotal').textContent;
    weight = document.getElementById('modalWeight').value + ' ' + document.getElementById('modalUnit').value;
  } else {
    const { discountedPrice } = getProductPrices(currentProduct);
    total = 'Rs ' + discountedPrice.toLocaleString();
    weight = currentProduct.weight + ' grams';
  }
  const size = document.getElementById('modalSize')?.value || 'Standard';
  const karat = document.querySelector('input[name="karat"]:checked')?.value || currentProduct.karat || 'N/A';
  let message = `Assalam o Alaikum,%0A%0AMujhe yeh product order karni hai:%0A%0A`;
  message += `📿 Product: ${currentProduct.name}%0A`;
  message += `🔸 Karat: ${karat}%0A`;
  message += `⚖️ Weight: ${weight}%0A`;
  if (size) message += `📏 Size: ${size}%0A`;
  message += `💰 Total: ${total}%0A%0APlease confirm karein.%0A%0AAKBAR JEWELLERS`;
  window.open(`https://wa.me/923234086439?text=${message}`, '_blank');
}

function buyReadymade() {
  if (!currentProduct) return;
  const { discountedPrice } = getProductPrices(currentProduct);
  const cartItem = {
    id: currentProduct.id,
    name: currentProduct.name,
    karat: currentProduct.karat || 'N/A',
    weight: currentProduct.weight || 0,
    unit: 'gram',
    size: currentProduct.size || 'Standard',
    color: currentProduct.color || '',
    total: 'Rs ' + discountedPrice.toLocaleString(),
    image: getProductImage(currentProduct),
    category: currentProduct.category
  };
  cart.push(cartItem);
  localStorage.setItem('akbar_cart', JSON.stringify(cart));
  updateCartCount();
  alert('✅ Added to cart!\n\n' + currentProduct.name + '\nPrice: Rs ' + discountedPrice.toLocaleString());
  closeProductModal();
}

function whatsappReadymade() {
  if (!currentProduct) return;
  const { discountedPrice } = getProductPrices(currentProduct);
  let message = `Assalam o Alaalam,%0A%0AMujhe yeh product order karni hai:%0A%0A`;
  message += `📿 Product: ${currentProduct.name}%0A`;
  if (currentProduct.karat) message += `🔸 Karat: ${currentProduct.karat}%0A`;
  if (currentProduct.weight) message += `⚖️ Weight: ${currentProduct.weight}g%0A`;
  if (currentProduct.size) message += `📏 Size: ${currentProduct.size}%0A`;
  message += `💰 Price: Rs ${discountedPrice.toLocaleString()}%0A%0APlease confirm karein.%0A%0AAKBAR JEWELLERS`;
  window.open(`https://wa.me/923234086439?text=${message}`, '_blank');
}

function updateCartCount() {
  const cartData = JSON.parse(localStorage.getItem('akbar_cart') || '[]');
  const el = document.getElementById('cartCount');
  if (el) el.textContent = cartData.length;
}

// ===== REVIEWS =====
let reviewCarouselIndex = 0;
let reviewsData = [];

async function loadReviews() {
  const container = document.getElementById('reviewCarousel');
  if (!container) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=*&is_approved=eq.true&order=created_at.desc&limit=10`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const reviews = await res.json();

    if (!reviews || reviews.length === 0) {
      container.innerHTML = '<p style="color:#B8B8B8; text-align:center; padding:30px;">No reviews yet. Be the first to review!</p>';
      return;
    }

    reviewsData = reviews;
    renderReviews();
  } catch (e) {
    console.error('Reviews load error:', e);
  }
}

function renderReviews() {
  const container = document.getElementById('reviewCarousel');
  if (!container) return;

  container.innerHTML = `
    <div class="reviews-track" style="transform: translateX(-${reviewCarouselIndex * 100}%)">
      ${reviewsData.map(r => `
        <div class="review-card">
          ${r.customer_photo ? `<img src="${r.customer_photo}" class="review-photo" onerror="this.style.display='none'">` : '<div class="review-photo" style="background:#2A2A2A; display:flex; align-items:center; justify-content:center; font-size:2rem;">👤</div>'}
          <div class="review-stars">${'⭐'.repeat(r.rating || 5)}</div>
          <p class="review-text">"${r.review_text || ''}"</p>
          <div class="review-name">${r.customer_name}</div>
          ${r.city ? `<div class="review-city">${r.city}</div>` : ''}
        </div>
      `).join('')}
    </div>
    <div class="reviews-dots">
      ${reviewsData.map((_, i) => `<span class="rev-dot ${i === reviewCarouselIndex ? 'active' : ''}" onclick="goToReview(${i})"></span>`).join('')}
    </div>
  `;
}

function goToReview(index) {
  reviewCarouselIndex = index;
  renderReviews();
}

async function submitReview(event) {
  event.preventDefault();
  const name = document.getElementById('reviewName')?.value.trim();
  const rating = parseInt(document.getElementById('reviewRating')?.value) || 5;
  const text = document.getElementById('reviewText')?.value.trim();

  if (!name || !text) { alert('❌ Name and review required'); return; }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: name,
        rating: rating,
        review_text: text,
        is_approved: false
      })
    });

    alert('✅ Thank you! Your review will be published after approval.');
    document.querySelector('.review-form')?.reset();
  } catch (e) {
    alert('❌ Error submitting review: ' + e.message);
  }
}

// Auto-rotate reviews
setInterval(() => {
  if (reviewsData.length > 1) {
    reviewCarouselIndex = (reviewCarouselIndex + 1) % reviewsData.length;
    renderReviews();
  }
}, 5000);

// ===== COINS PAGE =====
async function loadCoins() {
  currentCategory = 'coins';
  await loadLiveRates();
  await loadCategoryProducts();
  updateCartCount();
}