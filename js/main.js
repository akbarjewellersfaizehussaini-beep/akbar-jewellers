// ===== SHAH REHAN JEWELLERS – MAIN JS =====

// ===== CLOUDINARY CONFIG =====
const CLOUDINARY_CLOUD_NAME = 'mo7txjdn';
const CLOUDINARY_UPLOAD_PRESET = 'shah-rehan-jewellers';

const WEIGHT = {
  tola: 11.664,
  masha: 0.972,
  ratti: 0.1215,
  gram: 1
};

const KARAT_PURITY = {
  '24K': 1.0, '22K': 0.9167, '21K': 0.875, '18K': 0.75,
  '16K': 0.6667, '14K': 0.5833, '12K': 0.5, '10K': 0.4167, '8K': 0.3333
};

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

// ===== HELPERS =====
function getRateForKarat(karat) {
  if (currentRatesPerGram[karat]) return currentRatesPerGram[karat];
  const ratePerTola = LIVE_RATES.gold[karat] || 0;
  return Math.round(ratePerTola / WEIGHT.tola);
}

function toGrams(value, unit) { return value * WEIGHT[unit]; }
function formatPKR(amount) { return 'Rs ' + Math.round(amount).toLocaleString('en-PK'); }

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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gold_rates?select=*&order=karat.asc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const rates = await res.json();
    if (!rates || rates.length === 0) { console.log('⚠️ No rates in DB'); return; }

    rates.forEach(r => {
      if (r.rate_per_tola) LIVE_RATES.gold[r.karat] = parseFloat(r.rate_per_tola);
      if (r.rate_per_gram) {
        currentRatesPerGram[r.karat] = parseFloat(r.rate_per_gram);
      } else if (r.rate_per_tola) {
        currentRatesPerGram[r.karat] = Math.round(parseFloat(r.rate_per_tola) / WEIGHT.tola);
      }
    });

    const lastUpdated = rates[0]?.updated_at;
    const timeEl = document.getElementById('lastUpdated');
    if (timeEl && lastUpdated) timeEl.textContent = new Date(lastUpdated).toLocaleString('en-PK');

    const rate24K = LIVE_RATES.gold['24K'] || 0;
    const pathoorRate = LIVE_RATES.gold['Pathoor'] || Math.round(rate24K - 5500);

    const top24KEl = document.getElementById('top24K');
    const topPathoorEl = document.getElementById('topPathoor');
    if (top24KEl) top24KEl.textContent = `Rs ${rate24K.toLocaleString()}`;
    if (topPathoorEl) topPathoorEl.textContent = `Rs ${pathoorRate.toLocaleString()}`;

    console.log('✅ Live rates loaded:', rates.length);
    renderBiscuitUnits();
    renderGoldRates();
    renderSilverRates();

    setTimeout(() => { initGoldChart(); initSilverChart(); }, 100);
  } catch (error) { console.error('⚠️ Rate fetch failed:', error); }
}

// ===== CAROUSEL =====
let carouselInterval = null;
let currentSlide = 0;
let carouselCount = 0;

function startKaratCarousel(total) {
  carouselCount = total;
  currentSlide = 0;
  if (carouselInterval) clearInterval(carouselInterval);
  carouselInterval = setInterval(() => {
    currentSlide = (currentSlide + 1) % total;
    showSlide(currentSlide);
  }, 3000);
}

function showSlide(index) {
  const slides = document.querySelectorAll('.karat-slide');
  const dots = document.querySelectorAll('.carousel-dots .dot');
  slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
  dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  currentSlide = index;
}

function goToSlide(index) {
  if (carouselInterval) clearInterval(carouselInterval);
  showSlide(index);
  carouselInterval = setInterval(() => {
    currentSlide = (currentSlide + 1) % carouselCount;
    showSlide(currentSlide);
  }, 3000);
}

// ===== RENDER GOLD RATES =====
function renderGoldRates() {
  const container = document.getElementById('goldRatesContainer');
  if (!container) return;

  const karats = ['24K', '22K', '21K', '18K', '16K', '14K', '12K', '10K', '8K', 'Pathoor'];

  const slides = karats.map((karat, index) => {
    const pkrPerTola = LIVE_RATES.gold[karat] || 0;
    const pkrPerGram = currentRatesPerGram[karat] || Math.round(pkrPerTola / WEIGHT.tola);
    const pkrPerMasha = Math.round(pkrPerTola / 12);
    const pkrPerRatti = Math.round(pkrPerTola / 96);
    const isPathoor = karat === 'Pathoor';
    const logoImg = isPathoor ? 'images/pathoor-logo.jpg' : 'images/gold-logo.jpg';

    return `
      <div class="karat-slide ${index === 0 ? 'active' : ''} ${isPathoor ? 'pathoor-slide' : ''}">
        <div class="karat-box">
          <div class="sparkle sparkle-1"></div>
          <div class="sparkle sparkle-2"></div>
          <div class="sparkle sparkle-3"></div>
          <div class="karat-header">
            <img src="${logoImg}" alt="${isPathoor ? '24K Pathoor' : 'Gold'}" class="karat-logo" onerror="this.style.display='none'">
            <span class="karat-title">${isPathoor ? '24K PATHOOR GOLD' : karat + ' GOLD'}</span>
          </div>
          <div class="karat-main-rate">
            <div class="rate-label">Per Tola</div>
            <div class="rate-tola">Rs ${Math.round(pkrPerTola).toLocaleString()}</div>
          </div>
          <div class="karat-details">
            <div class="detail-item"><div class="detail-label">Per Gram</div><div class="detail-value">Rs ${pkrPerGram.toLocaleString()}</div></div>
            <div class="detail-item"><div class="detail-label">Per Masha</div><div class="detail-value">Rs ${pkrPerMasha.toLocaleString()}</div></div>
            <div class="detail-item"><div class="detail-label">Per Ratti</div><div class="detail-value">Rs ${pkrPerRatti}</div></div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="karat-carousel">${slides}</div>
    <div class="carousel-dots" id="carouselDots">
      ${karats.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></span>`).join('')}
    </div>
  `;
  startKaratCarousel(karats.length);
}

// ===== RENDER SILVER RATES =====
function renderSilverRates() {
  const container = document.getElementById('silverRatesContainer');
  if (!container) return;
  const silver = LIVE_RATES.silver;
  const usdPerGram = (silver.perGram / LIVE_RATES.usdToPkr).toFixed(2);

  container.innerHTML = `
    <div class="karat-carousel">
      <div class="karat-slide active silver-slide">
        <div class="karat-box silver-box">
          <div class="sparkle sparkle-1"></div>
          <div class="sparkle sparkle-2"></div>
          <div class="sparkle sparkle-3"></div>
          <div class="karat-header">
            <img src="images/silver-logo.jpg" alt="Silver" class="karat-logo" onerror="this.style.display='none'">
            <span class="karat-title">SILVER RATE</span>
          </div>
          <div class="karat-main-rate">
            <div class="rate-label">Per Tola</div>
            <div class="rate-tola">Rs ${silver.perTola.toLocaleString()}</div>
          </div>
          <div class="karat-details">
            <div class="detail-item"><div class="detail-label">Per Gram</div><div class="detail-value">Rs ${silver.perGram.toFixed(2)}</div></div>
            <div class="detail-item"><div class="detail-label">Per 10 Gram</div><div class="detail-value">Rs ${silver.per10Gram.toLocaleString()}</div></div>
            <div class="detail-item"><div class="detail-label">USD/Gram</div><div class="detail-value">$${usdPerGram}</div></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===== TAB SWITCHING =====
function switchRateTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');

  const goldTab = document.getElementById('goldRatesTab');
  const silverTab = document.getElementById('silverRatesTab');
  const biscuitsTab = document.getElementById('biscuitsTab');

  if (goldTab) goldTab.classList.add('hidden');
  if (silverTab) silverTab.classList.add('hidden');
  if (biscuitsTab) biscuitsTab.classList.add('hidden');

  if (tab === 'gold' && goldTab) {
    goldTab.classList.remove('hidden');
    if (carouselInterval) clearInterval(carouselInterval);
    startKaratCarousel(carouselCount);
    setTimeout(() => initGoldChart(), 100);
  } else if (tab === 'silver' && silverTab) {
    silverTab.classList.remove('hidden');
    setTimeout(() => initSilverChart(), 100);
  } else if (tab === 'biscuits' && biscuitsTab) {
    biscuitsTab.classList.remove('hidden');
    renderBiscuitUnits();
  }
}

// ===== UPDATE USD / CART =====
function updateUsdRate() {
  const usdEl = document.getElementById('usdRate');
  if (usdEl) usdEl.textContent = LIVE_RATES.usdToPkr;
}

function updateCartCount() {
  const cartData = JSON.parse(localStorage.getItem('srj_cart') || '[]');
  const el = document.getElementById('cartCount');
  if (el) el.textContent = cartData.length;
}

// =====================================================
// PRODUCT SYSTEM
// =====================================================

let currentProduct = null;
let cart = JSON.parse(localStorage.getItem('srj_cart') || '[]');

function calculateGoldSilverPrice(product) {
  const isSilver = product.category === 'silver';
  const weight = product.weight || 0;
  if (!weight) return product.price || 0;

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
    const mrp = product.price || 0;
    if (product.discount_percent && product.discount_percent > 0) {
      originalPrice = mrp || calculated;
      discountPct = product.discount_percent;
      discountedPrice = Math.round(originalPrice * (1 - discountPct/100));
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
    originalPrice = product.price || 0;
    discountPct = product.discount_percent || 5;
    discountedPrice = Math.round(originalPrice * (1 - discountPct/100));
  }
  return { originalPrice, discountedPrice, discountPct };
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&is_active=eq.true&order=created_at.desc&limit=12`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const products = await res.json();
    if (!products || products.length === 0) {
      grid.innerHTML = '<div class="loading-spinner">No products found</div>';
      return;
    }

    grid.innerHTML = products.map(p => {
      const { originalPrice, discountedPrice, discountPct } = getProductPrices(p);
      return `
        <div class="product-card" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
          <div class="product-image-wrapper">
            <img src="${p.image_url || 'images/placeholder.svg'}" alt="${p.name}" loading="lazy" onerror="this.src='images/placeholder.svg'">
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
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    grid.innerHTML = '<div class="loading-spinner">Error loading products</div>';
  }
}

function openProductModal(product) {
  currentProduct = product;
  document.getElementById('modalImage').src = product.image_url || 'images/placeholder.svg';
  document.getElementById('modalProductName').textContent = product.name;
  document.getElementById('modalProductCode').textContent = `Code: SRJ-${product.id.slice(0, 6).toUpperCase()}`;
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
  if (currentProduct.category === 'silver') ratePerGram = (LIVE_RATES.silver.perGram || 570.10) / 1;
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
    image: currentProduct.image_url,
    category: currentProduct.category
  };
  cart.push(cartItem);
  localStorage.setItem('srj_cart', JSON.stringify(cart));
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
  message += `💰 Total: ${total}%0A%0APlease confirm karein.%0A%0ASHAH REHAN JEWELLERS`;
  window.open(`https://wa.me/923266501314?text=${message}`, '_blank');
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
    image: currentProduct.image_url,
    category: currentProduct.category
  };
  cart.push(cartItem);
  localStorage.setItem('srj_cart', JSON.stringify(cart));
  updateCartCount();
  alert('✅ Added to cart!\n\n' + currentProduct.name + '\nPrice: Rs ' + discountedPrice.toLocaleString());
  closeProductModal();
}

function whatsappReadymade() {
  if (!currentProduct) return;
  const { discountedPrice } = getProductPrices(currentProduct);
  let message = `Assalam o Alaikum,%0A%0AMujhe yeh product order karni hai:%0A%0A`;
  message += `📿 Product: ${currentProduct.name}%0A`;
  if (currentProduct.karat) message += `🔸 Karat: ${currentProduct.karat}%0A`;
  if (currentProduct.weight) message += `⚖️ Weight: ${currentProduct.weight}g%0A`;
  if (currentProduct.size) message += `📏 Size: ${currentProduct.size}%0A`;
  message += `💰 Price: Rs ${discountedPrice.toLocaleString()}%0A%0APlease confirm karein.%0A%0ASHAH REHAN JEWELLERS`;
  window.open(`https://wa.me/923266501314?text=${message}`, '_blank');
}

// =====================================================
// BISCUITS SYSTEM
// =====================================================

const BISCUIT_UNITS = {
  gold: [
    { label: '1 Gram', grams: 1 }, { label: '5 Gram', grams: 5 }, { label: '10 Gram', grams: 10 },
    { label: '1 Tola', grams: 11.664 }, { label: '5 Tola', grams: 58.32 }, { label: '10 Tola', grams: 116.64 }
  ],
  pathoor: [
    { label: '1 Gram', grams: 1 }, { label: '5 Gram', grams: 5 }, { label: '10 Gram', grams: 10 },
    { label: '1 Tola', grams: 11.664 }, { label: '5 Tola', grams: 58.32 }, { label: '10 Tola', grams: 116.64 }
  ],
  silver: [
    { label: '1 Tola', grams: 11.664 }, { label: '5 Tola', grams: 58.32 }, { label: '10 Tola', grams: 116.64 },
    { label: '50 Tola', grams: 583.20 }, { label: '100 Tola', grams: 1166.40 }
  ]
};

function renderBiscuitUnits() {
  const goldContainer = document.getElementById('goldBiscuitUnits');
  if (goldContainer) {
    const goldRatePerGram = (LIVE_RATES.gold['24K'] || 0) / WEIGHT.tola;
    goldContainer.innerHTML = BISCUIT_UNITS.gold.map(unit => {
      const metalValue = Math.round(goldRatePerGram * unit.grams);
      return `<button class="unit-btn gold-unit" onclick='openBiscuitPopup("gold", "${unit.label}", ${unit.grams}, ${metalValue}, "24K Gold")'><span class="unit-label">${unit.label}</span><span class="unit-price">Rs ${metalValue.toLocaleString()}</span></button>`;
    }).join('');
  }
  const pathoorContainer = document.getElementById('pathoorBiscuitUnits');
  if (pathoorContainer) {
    const pathoorRate = LIVE_RATES.gold['Pathoor'] || (LIVE_RATES.gold['24K'] - 5500);
    const pathoorRatePerGram = pathoorRate / WEIGHT.tola;
    pathoorContainer.innerHTML = BISCUIT_UNITS.pathoor.map(unit => {
      const metalValue = Math.round(pathoorRatePerGram * unit.grams);
      return `<button class="unit-btn pathoor-unit" onclick='openBiscuitPopup("pathoor", "${unit.label}", ${unit.grams}, ${metalValue}, "24K Pathoor Gold")'><span class="unit-label">${unit.label}</span><span class="unit-price">Rs ${metalValue.toLocaleString()}</span></button>`;
    }).join('');
  }
  const silverContainer = document.getElementById('silverBiscuitUnits');
  if (silverContainer) {
    const silverPerGram = LIVE_RATES.silver.perGram || 570.10;
    silverContainer.innerHTML = BISCUIT_UNITS.silver.map(unit => {
      const metalValue = Math.round(silverPerGram * unit.grams);
      return `<button class="unit-btn silver-unit" onclick='openBiscuitPopup("silver", "${unit.label}", ${unit.grams}, ${metalValue}, "Silver")'><span class="unit-label">${unit.label}</span><span class="unit-price">Rs ${metalValue.toLocaleString()}</span></button>`;
    }).join('');
  }
}

function openBiscuitPopup(metalType, unitLabel, grams, metalValue, metalName) {
  const serviceCharges = Math.round(metalValue * 0.01);
  const subtotal = metalValue + serviceCharges;
  const gst = Math.round(subtotal * 0.03);
  const total = subtotal + gst;

  let popup = document.getElementById('biscuitPopup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'biscuitPopup';
    popup.className = 'modal-overlay';
    document.body.appendChild(popup);
  }

  popup.innerHTML = `
    <div class="modal-content biscuit-modal">
      <button class="modal-close" onclick="closeBiscuitPopup()">×</button>
      <h2 class="modal-title">🪙 Purchase Biscuit</h2>
      <div class="biscuit-popup-body">
        <div class="biscuit-popup-header">
          <div class="biscuit-metal-name">${metalName}</div>
          <div class="biscuit-unit-info">${unitLabel} • ${grams.toFixed(3)} grams</div>
        </div>
        <div class="biscuit-breakdown">
          <div class="breakdown-row"><span>Metal Value</span><span>Rs ${metalValue.toLocaleString()}</span></div>
          <div class="breakdown-row"><span>Service Charges (1%)</span><span>Rs ${serviceCharges.toLocaleString()}</span></div>
          <div class="breakdown-row subtotal-row"><span>Subtotal</span><span>Rs ${subtotal.toLocaleString()}</span></div>
          <div class="breakdown-row"><span>GST (3%)</span><span>Rs ${gst.toLocaleString()}</span></div>
          <div class="breakdown-row total-row"><span>TOTAL</span><span>Rs ${total.toLocaleString()}</span></div>
        </div>

        <div class="payment-notice">
          <div class="notice-icon">💯</div>
          <div class="notice-text">
            <strong>100% Advance Payment</strong>
            <p>Choose your payment method below</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
          <div id="payCard-easypaisa" style="cursor: pointer; text-align: center; padding: 15px 10px; background: rgba(255,215,0,0.1); border: 2px solid #FFD700; border-radius: 12px;" onclick="selectBiscuitPayment('easypaisa')">
            <img src="images/easypaisa.jpg" alt="Easypaisa" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin: 0 auto 8px; display: block; border: 2px solid #25D366;" onerror="this.src='images/placeholder.svg'">
            <div style="color: #FFD700; font-weight: 700; font-size: 0.8rem;">Easypaisa</div>
          </div>
          <div id="payCard-jazzcash" style="cursor: pointer; text-align: center; padding: 15px 10px; background: #0A0A0A; border: 2px solid rgba(255,215,0,0.3); border-radius: 12px;" onclick="selectBiscuitPayment('jazzcash')">
            <img src="images/jazzcash.jpg" alt="JazzCash" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin: 0 auto 8px; display: block; border: 2px solid #DC2626;" onerror="this.src='images/placeholder.svg'">
            <div style="color: #FFD700; font-weight: 700; font-size: 0.8rem;">JazzCash</div>
          </div>
          <div id="payCard-bank" style="cursor: pointer; text-align: center; padding: 15px 10px; background: #0A0A0A; border: 2px solid rgba(255,215,0,0.3); border-radius: 12px;" onclick="selectBiscuitPayment('bank')">
            <img src="images/bank.jpg" alt="Bank Transfer" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin: 0 auto 8px; display: block; border: 2px solid #3B82F6;" onerror="this.src='images/placeholder.svg'">
            <div style="color: #FFD700; font-weight: 700; font-size: 0.8rem;">Bank Transfer</div>
          </div>
        </div>

        <div id="biscuitPaymentDetails" style="background: linear-gradient(135deg, #0F5132, #128C7E); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <h4 style="color: #FFF8DC; margin-bottom: 10px; font-size: 1rem;">💚 Pay via Easypaisa</h4>
          <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 0.75rem; color: #B8B8B8;">Account Number</div>
              <strong style="color: #FFD700; font-size: 1.1rem;">03266501314</strong>
            </div>
            <button type="button" onclick="copyBiscuitNumber()" style="background: #FFD700; color: #0A0A0A; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">📋 Copy</button>
          </div>
          <div style="font-size: 0.85rem; color: #FFF8DC;">Account Title: <strong>Syed Ahmed Bilal</strong></div>
          <div style="font-size: 0.85rem; color: #FFF8DC; margin-top: 4px;">Amount: <strong>Rs ${total.toLocaleString()}</strong></div>
        </div>

        <div class="customer-form">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Full Name *</label><input type="text" id="biscuitName" class="form-input" placeholder="Your name"></div>
            <div class="form-group"><label class="form-label">WhatsApp *</label><input type="tel" id="biscuitPhone" class="form-input" placeholder="03XXXXXXXXX"></div>
          </div>
          <div class="form-group"><label class="form-label">Email (Optional)</label><input type="email" id="biscuitEmail" class="form-input" placeholder="your@email.com"></div>
          <div class="form-group"><label class="form-label">Address *</label><input type="text" id="biscuitAddress" class="form-input" placeholder="Full address"></div>
        </div>

        <div class="form-group">
          <label class="form-label">Transaction ID (TID) *</label>
          <input type="text" id="biscuitTID" class="form-input" placeholder="Enter transaction ID">
        </div>
        <div class="form-group">
          <label class="form-label">Upload Payment Screenshot *</label>
          <input type="file" id="biscuitScreenshot" class="form-input" accept="image/*" style="padding: 10px;">
        </div>

        <button onclick='confirmBiscuitOrder("${metalType}", "${metalName}", "${unitLabel}", ${grams}, ${metalValue}, ${serviceCharges}, ${gst}, ${total})' class="btn-gold" style="width: 100%; padding: 15px; font-size: 1.1rem;">
          ✅ Confirm Purchase
        </button>
        <p class="urdu-tagline urdu" dir="rtl">آپ کا آرڈر رازداری کے ساتھ آپ تک پہنچایا جائے گا</p>
      </div>
    </div>
  `;

  // Call this AFTER popup.innerHTML is set
  selectedBiscuitPayment = 'easypaisa';
  selectBiscuitPayment('easypaisa');

  popup.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function selectBiscuitPayment(method) {
  selectedBiscuitPayment = method;

  const cards = {
    easypaisa: document.getElementById('payCard-easypaisa'),
    jazzcash: document.getElementById('payCard-jazzcash'),
    bank: document.getElementById('payCard-bank')
  };

  Object.keys(cards).forEach(k => {
    if (cards[k]) {
      const isActive = (k === method);
      cards[k].style.borderColor = isActive ? '#FFD700' : 'rgba(255,215,0,0.3)';
      cards[k].style.background = isActive ? 'rgba(255,215,0,0.1)' : '#0A0A0A';
    }
  });

  const details = document.getElementById('biscuitPaymentDetails');
  if (!details) return;

  const methods = {
    easypaisa: { title: '💚 Pay via Easypaisa', bg: 'linear-gradient(135deg, #0F5132, #128C7E)', number: '03266501314', label: 'Account Number' },
    jazzcash: { title: '🔴 Pay via JazzCash', bg: 'linear-gradient(135deg, #7F1D1D, #DC2626)', number: '03266501314', label: 'Account Number' },
    bank: { title: '🏦 Bank Transfer', bg: 'linear-gradient(135deg, #1E3A8A, #3B82F6)', number: 'PK36MEZN0001234567890123', label: 'IBAN' }
  };
  const m = methods[method];
  if (!m) return;

  details.style.background = m.bg;
  details.innerHTML = `
    <h4 style="color: #FFF8DC; margin-bottom: 10px; font-size: 1rem;">${m.title}</h4>
    <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 0.75rem; color: #B8B8B8;">${m.label}</div>
        <strong style="color: #FFD700; font-size: 1.1rem;">${m.number}</strong>
      </div>
      <button type="button" onclick="copyBiscuitNumber()" style="background: #FFD700; color: #0A0A0A; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">📋 Copy</button>
    </div>
    <div style="font-size: 0.85rem; color: #FFF8DC;">Account Title: <strong>Syed Ahmed Bilal</strong></div>
  `;
}

function closeBiscuitPopup() {
  const popup = document.getElementById('biscuitPopup');
  if (popup) popup.classList.remove('active');
  document.body.style.overflow = '';
}

function copyBiscuitNumber() {
  const details = document.getElementById('biscuitPaymentDetails');
  const numberMatch = details?.innerHTML.match(/<strong[^>]*>([^<]+)<\/strong>/);
  const number = numberMatch ? numberMatch[1] : '03266501314';
  navigator.clipboard.writeText(number);
  alert('✅ Number copied: ' + number);
}

async function confirmBiscuitOrder(metalType, metalName, unitLabel, grams, metalValue, serviceCharges, gst, total) {
  const name = document.getElementById('biscuitName').value.trim();
  const phone = document.getElementById('biscuitPhone').value.trim();
  const email = document.getElementById('biscuitEmail').value.trim();
  const address = document.getElementById('biscuitAddress').value.trim();
  const tid = document.getElementById('biscuitTID').value.trim();
  const screenshot = document.getElementById('biscuitScreenshot').files[0];
  const paymentMethod = selectedBiscuitPayment;

  if (!name || !phone || !address || !tid || !screenshot) {
    alert('❌ Please fill all required fields');
    return;
  }

  let screenshotUrl = '';
  try {
    screenshotUrl = await uploadToCloudinary(screenshot);
    console.log('✅ Screenshot uploaded:', screenshotUrl);
  } catch (err) {
    alert('❌ Screenshot upload failed: ' + err.message);
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const orderNumber = `SRJ-BIS-${dateStr}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

  const orderData = {
    order_number: orderNumber,
    customer_name: name,
    customer_whatsapp: phone,
    customer_email: email || null,
    customer_address: address,
    items: [{
      name: `${metalName} Biscuit - ${unitLabel}`,
      weight: grams,
      unit: 'gram',
      karat: metalType === 'silver' ? null : '24K',
      total: `Rs ${total.toLocaleString()}`
    }],
    subtotal: metalValue + serviceCharges,
    gst_amount: gst,
    total_amount: total,
    advance_type: 'full',
    advance_amount: total,
    remaining_amount: 0,
    payment_method: paymentMethod,
    transaction_id: tid,
    payment_screenshot_url: screenshotUrl,
    order_status: 'pending',
    notes: `Biscuit Order - ${metalName} (${unitLabel})`,
    expected_delivery: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderData)
    });

    if (!res.ok) { const err = await res.text(); throw new Error(err); }

    localStorage.setItem('srj_last_biscuit_order', JSON.stringify(orderData));

    const ownerMsg = `🔔 *NEW BISCUIT ORDER*%0A%0AOrder #: ${orderNumber}%0ACustomer: ${name}%0AWhatsApp: ${phone}%0AEmail: ${email || 'N/A'}%0A%0A🪙 Item: ${metalName} - ${unitLabel}%0A⚖️ Weight: ${grams.toFixed(3)} grams%0A💰 Total: Rs ${total.toLocaleString()}%0A💳 Payment: ${paymentMethod}%0A📝 TID: ${tid}%0A🖼️ Screenshot: ${screenshotUrl}%0A%0AFull payment received. Please verify and confirm.`;
    window.open(`https://wa.me/923266501314?text=${ownerMsg}`, '_blank');

    const customerMsg = `Assalam o Alaikum ${name},%0A%0AAap ka biscuit order receive ho gaya!%0A%0A📋 Order #: ${orderNumber}%0A🪙 Item: ${metalName} - ${unitLabel}%0A⚖️ Weight: ${grams.toFixed(3)} grams%0A💰 Total: Rs ${total.toLocaleString()}%0A%0AAap ki payment verify hone ke baad order confirm ho jayega.%0A%0AShukriya!%0ASHAH REHAN JEWELLERS`;
    setTimeout(() => { window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${customerMsg}`, '_blank'); }, 1000);

    alert(`✅ Order Confirmed!\n\nOrder #: ${orderNumber}\nTotal: Rs ${total.toLocaleString()}\n\nWhatsApp confirmation sent.`);
    closeBiscuitPopup();
    window.location.href = 'order-success.html';

  } catch (error) {
    console.error('Order error:', error);
    alert('❌ Error: ' + error.message);
  }
}

// =====================================================
// GOLD/SILVER RATE GRAPH
// =====================================================

let goldChart = null;
let silverChart = null;

function generateHistoricalData(currentRate, days = 30) {
  const data = [], highData = [], lowData = [], labels = [];
  const today = new Date();
  let rate = currentRate * 0.96;
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.48) * 0.025;
    rate = rate * (1 + change);
    if (i < 5) rate = rate + (currentRate - rate) * 0.5;
    const dayHigh = Math.round(rate * (1 + Math.random() * 0.008));
    const dayLow = Math.round(rate * (1 - Math.random() * 0.008));
    const dayClose = Math.round(rate);
    data.push(dayClose);
    highData.push(dayHigh);
    lowData.push(dayLow);
    labels.push(date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }));
  }
  data[data.length - 1] = currentRate;
  highData[highData.length - 1] = currentRate;
  lowData[lowData.length - 1] = currentRate;
  return { data, highData, lowData, labels };
}

function initGoldChart() {
  const canvas = document.getElementById('goldRateChart');
  if (!canvas) return;
  const currentRate = LIVE_RATES.gold['24K'] || 430000;
  const { data, highData, lowData, labels } = generateHistoricalData(currentRate);
  const todayClose = data[data.length - 1];
  const todayHigh = highData[highData.length - 1];
  const todayLow = lowData[lowData.length - 1];
  const yesterdayClose = data[data.length - 2];
  const change = todayClose - yesterdayClose;
  const changePct = ((change / yesterdayClose) * 100).toFixed(2);
  const overallHigh = Math.max(...highData);
  const overallLow = Math.min(...lowData);
  const setEl = (id, val, color) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = val; if (color) el.style.color = color; }
  };
  setEl('graphToday', `Rs ${todayClose.toLocaleString()}`);
  setEl('graphChange', `${change >= 0 ? '+' : ''}${change.toLocaleString()} (${changePct}%)`, change >= 0 ? '#25D366' : '#DC2626');
  setEl('graphHigh', `Rs ${overallHigh.toLocaleString()}`);
  setEl('graphLow', `Rs ${overallLow.toLocaleString()}`);
  setEl('todayHigh', `Rs ${todayHigh.toLocaleString()}`);
  setEl('todayLow', `Rs ${todayLow.toLocaleString()}`);
  if (goldChart) goldChart.destroy();
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 350);
  gradient.addColorStop(0, 'rgba(255, 215, 0, 0.35)');
  gradient.addColorStop(1, 'rgba(255, 215, 0, 0.0)');
  goldChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: '24K Gold (Rs/Tola)', data: data, borderColor: '#FFD700', backgroundColor: gradient, borderWidth: 2.5, fill: true, tension: 0.3, pointBackgroundColor: '#FFD700', pointBorderColor: '#0A0A0A', pointBorderWidth: 1.5, pointRadius: 2, pointHoverRadius: 6 },
        { label: 'Daily High', data: highData, borderColor: 'rgba(37, 211, 102, 0.6)', borderWidth: 1.5, borderDash: [5, 5], fill: false, tension: 0.3, pointRadius: 0, pointHoverRadius: 4 },
        { label: 'Daily Low', data: lowData, borderColor: 'rgba(220, 38, 38, 0.6)', borderWidth: 1.5, borderDash: [5, 5], fill: false, tension: 0.3, pointRadius: 0, pointHoverRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 300, easing: 'easeOutQuart' },
      animations: { x: { duration: 250 }, y: { duration: 250 } },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: true, position: 'top', labels: { color: '#FFF8DC', font: { family: 'Poppins', size: 11, weight: '500' }, padding: 12, usePointStyle: true, pointStyle: 'line' } },
        tooltip: {
          backgroundColor: 'rgba(10, 10, 10, 0.96)', titleColor: '#FFD700', bodyColor: '#FFF8DC', borderColor: '#FFD700', borderWidth: 1, padding: 12, cornerRadius: 8,
          titleFont: { family: 'Poppins', size: 12, weight: '600' }, bodyFont: { family: 'Poppins', size: 12 }, displayColors: true,
          callbacks: { title: function(items) { return '📅 ' + items[0].label; }, label: function(context) { return context.dataset.label + ': Rs ' + context.parsed.y.toLocaleString(); } }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,215,0,0.06)', drawBorder: false }, ticks: { color: '#B8B8B8', font: { family: 'Poppins', size: 10 }, maxTicksLimit: 8, maxRotation: 0 } },
        y: { grid: { color: 'rgba(255,215,0,0.06)', drawBorder: false }, ticks: { color: '#FFD700', font: { family: 'Poppins', size: 11, weight: '600' }, callback: function(value) { if (value >= 100000) return 'Rs ' + (value/100000).toFixed(2) + 'L'; if (value >= 1000) return 'Rs ' + (value/1000).toFixed(0) + 'k'; return 'Rs ' + value; } } }
      }
    }
  });
}

function initSilverChart() {
  const canvas = document.getElementById('silverRateChart');
  if (!canvas) return;
  const currentRate = LIVE_RATES.silver.perTola || 6651;
  const { data, highData, lowData, labels } = generateHistoricalData(currentRate);
  if (silverChart) silverChart.destroy();
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 350);
  gradient.addColorStop(0, 'rgba(192, 192, 192, 0.4)');
  gradient.addColorStop(1, 'rgba(192, 192, 192, 0.0)');
  silverChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Silver (Rs/Tola)', data: data, borderColor: '#C0C0C0', backgroundColor: gradient, borderWidth: 2.5, fill: true, tension: 0.3, pointBackgroundColor: '#C0C0C0', pointBorderColor: '#0A0A0A', pointBorderWidth: 1.5, pointRadius: 2, pointHoverRadius: 6 },
        { label: 'Daily High', data: highData, borderColor: 'rgba(37, 211, 102, 0.6)', borderWidth: 1.5, borderDash: [5, 5], fill: false, tension: 0.3, pointRadius: 0 },
        { label: 'Daily Low', data: lowData, borderColor: 'rgba(220, 38, 38, 0.6)', borderWidth: 1.5, borderDash: [5, 5], fill: false, tension: 0.3, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 300, easing: 'easeOutQuart' },
      animations: { x: { duration: 250 }, y: { duration: 250 } },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: true, position: 'top', labels: { color: '#FFF8DC', font: { family: 'Poppins', size: 11, weight: '500' }, padding: 12, usePointStyle: true, pointStyle: 'line' } },
        tooltip: {
          backgroundColor: 'rgba(10, 10, 10, 0.96)', titleColor: '#C0C0C0', bodyColor: '#FFF8DC', borderColor: '#C0C0C0', borderWidth: 1, padding: 12,
          callbacks: { title: function(items) { return '📅 ' + items[0].label; }, label: function(context) { return context.dataset.label + ': Rs ' + context.parsed.y.toLocaleString(); } }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(192,192,192,0.06)' }, ticks: { color: '#B8B8B8', font: { family: 'Poppins', size: 10 }, maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(192,192,192,0.06)' }, ticks: { color: '#C0C0C0', font: { family: 'Poppins', size: 11, weight: '600' }, callback: function(value) { return 'Rs ' + value.toLocaleString(); } } }
      }
    }
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Loading SHAH REHAN JEWELLERS...');
  await loadLiveRates();
  renderGoldRates();
  renderSilverRates();
  updateUsdRate();
  loadProducts();
  updateCartCount();
  renderBiscuitUnits();
  console.log('✅ SHAH REHAN JEWELLERS Loaded');
});

setInterval(async () => {
  console.log('🔄 Auto-refreshing rates...');
  await loadLiveRates();
  renderGoldRates();
  renderSilverRates();
  initGoldChart();
  initSilverChart();
}, 15 * 60 * 1000);