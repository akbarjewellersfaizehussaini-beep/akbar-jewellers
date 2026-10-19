// ===== SHAH REHAN JEWELLERS – CATEGORY PAGE JS =====

let currentProduct = null;
let allProducts = [];
let currentCategory = '';
let cart = JSON.parse(localStorage.getItem('srj_cart') || '[]');
let currentSlide = 0;
let carouselInterval = null;

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

const BASE_RATE_24K = 430000;
const SILVER_RATE_PER_TOLA = 6651;

let currentRatesPerGram = {};

function getRateForKarat(karat) {
  if (currentRatesPerGram[karat]) return currentRatesPerGram[karat];
  return Math.round((BASE_RATE_24K * KARAT_PURITY[karat]) / WEIGHT.tola);
}

function toGrams(value, unit) { return value * WEIGHT[unit]; }
function formatPKR(amount) { return 'Rs ' + Math.round(amount).toLocaleString('en-PK'); }

function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = cart.length;
}

// ===== CALCULATE PRODUCT PRICE (For Gold/Silver) =====
function calculateGoldSilverPrice(product) {
  const isSilver = product.category === 'silver';
  const weight = product.weight || 0;
  if (!weight) return product.price || 0;
  
  const ratePerGram = isSilver 
    ? (SILVER_RATE_PER_TOLA / WEIGHT.tola) 
    : getRateForKarat(product.karat || '24K');
  const metalValue = ratePerGram * weight;
  const making = metalValue * 0.15;
  const polish = metalValue * 0.10;
  const subtotal = metalValue + making + polish;
  const gst = subtotal * 0.03;
  return Math.round(subtotal + gst);
}

// ===== PRICE CALC FOR ANY PRODUCT =====
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
      if (mrp > calculated) {
        originalPrice = mrp;
        discountedPrice = calculated;
      } else {
        originalPrice = calculated;
        discountedPrice = mrp;
      }
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

// ===== FETCH LIVE RATES =====
async function fetchLiveRates() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gold_rates?select=*&order=karat.asc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    const rates = await res.json();
    rates.forEach(r => {
      if (r.rate_per_tola) {
        currentRatesPerGram[r.karat] = r.rate_per_gram ? parseFloat(r.rate_per_gram) : Math.round(parseFloat(r.rate_per_tola) / WEIGHT.tola);
      }
    });
  } catch (error) {
    console.warn('⚠️ Using fallback rates');
  }
}

// ===== LOAD PRODUCTS =====
async function loadCategoryProducts(category) {
  currentCategory = category;
  const grid = document.getElementById('categoryProductsGrid');
  if (!grid) return;
  
  grid.innerHTML = '<div class="loading-spinner">Loading products...</div>';
  
  try {
    await fetchLiveRates();
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&category=eq.${category}&is_active=eq.true&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    allProducts = await res.json();
    
    if (!allProducts || allProducts.length === 0) {
      grid.innerHTML = `<div class="loading-spinner">No ${category} products found</div>`;
      return;
    }
    
    renderProducts(allProducts);
  } catch (error) {
    console.error('Error:', error);
    grid.innerHTML = '<div class="loading-spinner">Error loading products</div>';
  }
}

// ===== RENDER PRODUCTS =====
function renderProducts(products) {
  const grid = document.getElementById('categoryProductsGrid');
  
  if (!products || products.length === 0) {
    grid.innerHTML = '<div class="loading-spinner">No products match your filter</div>';
    return;
  }
  
  grid.innerHTML = products.map(p => {
    const isSilver = p.category === 'silver';
    const isArtificial = p.category === 'artificial';
    
    const { originalPrice, discountedPrice, discountPct } = getProductPrices(p);
    
    const soldQty = p.sold_qty || Math.floor(Math.random() * 50) + 10;
    const weight = p.weight || 0;
    const goldQuality = p.karat || (isSilver ? 'Silver' : (isArtificial ? 'Artificial' : '24K'));
    
    return `
      <div class="product-card" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
        <div class="product-image-wrapper">
          <img src="${p.image_url || 'images/placeholder.svg'}" alt="${p.name}" loading="lazy" onerror="this.src='images/placeholder.svg'">
          ${discountPct > 0 ? `
            <div class="discount-ball">
              <span class="discount-percent">${discountPct}%</span>
              <span class="discount-text">OFF</span>
            </div>
          ` : ''}
        </div>
        <div class="product-info">
          <span class="category-tag">${goldQuality}</span>
          <h3>${p.name}</h3>
          
          <div class="price-display-block">
            ${discountPct > 0 ? `
              <div class="original-price-line">
                <span class="original-price-text">Rs ${originalPrice.toLocaleString()}</span>
                <span class="cut-line"></span>
              </div>
            ` : ''}
            <div class="final-price-highlight">
              <span class="final-price-value">Rs ${discountedPrice.toLocaleString()}</span>
              ${discountPct > 0 ? `<span class="inline-discount-tag">${discountPct}% OFF</span>` : ''}
            </div>
          </div>
          
          ${weight > 0 ? `<p class="product-weight-info">⚖️ ${weight}g</p>` : ''}
          <p class="sold-qty">🛒 ${soldQty} sold</p>
          
          <div class="readymade-buttons" onclick="event.stopPropagation()">
            <button class="btn-readymade-cart" onclick='quickAddToCart(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
              🛒 Add to Cart
            </button>
            <button class="btn-readymade-wa" onclick='quickWhatsApp(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
              📱 WhatsApp
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== QUICK ADD TO CART =====
function quickAddToCart(product) {
  const { discountedPrice } = getProductPrices(product);
  const isSilver = product.category === 'silver';
  
  const cartItem = {
    id: product.id,
    name: product.name,
    karat: product.karat || (isSilver ? 'Silver' : 'N/A'),
    weight: product.weight || 0,
    unit: 'gram',
    size: product.size || 'Standard',
    color: product.color || '',
    total: 'Rs ' + discountedPrice.toLocaleString(),
    image: product.image_url,
    category: product.category
  };
  
  cart.push(cartItem);
  localStorage.setItem('srj_cart', JSON.stringify(cart));
  updateCartCount();
  alert('✅ Added to cart!\n\n' + product.name + '\nPrice: Rs ' + discountedPrice.toLocaleString() + '\n\nItems in cart: ' + cart.length);
}

// ===== QUICK WHATSAPP =====
function quickWhatsApp(product) {
  const { discountedPrice } = getProductPrices(product);
  
  let message = `Assalam o Alaikum,%0A%0AMujhe yeh product order karni hai:%0A%0A`;
  message += `📿 Product: ${product.name}%0A`;
  if (product.karat) message += `🔸 Karat: ${product.karat}%0A`;
  if (product.weight) message += `⚖️ Weight: ${product.weight}g%0A`;
  if (product.size) message += `📏 Size: ${product.size}%0A`;
  if (product.color) message += `🎨 Color: ${product.color}%0A`;
  message += `💰 Price: Rs ${discountedPrice.toLocaleString()}%0A%0APlease confirm karein.%0A%0ASHAH REHAN JEWELLERS`;
  
  window.open(`https://wa.me/923266501314?text=${message}`, '_blank');
}

// ===== FILTERS =====
function filterByKarat(karat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (!karat) { renderProducts(allProducts); return; }
  renderProducts(allProducts.filter(p => p.karat === karat));
}

function filterBySubcategory(sub, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (!sub) { renderProducts(allProducts); return; }
  renderProducts(allProducts.filter(p => p.subcategory === sub));
}

function sortProducts(order) {
  let sorted = [...allProducts];
  if (order === 'low') sorted.sort((a, b) => a.price - b.price);
  else if (order === 'high') sorted.sort((a, b) => b.price - a.price);
  else if (order === 'new') sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  renderProducts(sorted);
}

// ===== MODAL OPEN =====
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
        ${product.weight ? `
          <div class="detail-box">
            <div class="detail-box-label">Weight</div>
            <div class="detail-box-value">${product.weight}g</div>
          </div>
        ` : ''}
        ${product.karat ? `
          <div class="detail-box">
            <div class="detail-box-label">Quality</div>
            <div class="detail-box-value">${product.karat}</div>
          </div>
        ` : ''}
        ${product.color ? `
          <div class="detail-box">
            <div class="detail-box-label">Color</div>
            <div class="detail-box-value">${product.color}</div>
          </div>
        ` : ''}
        ${product.size ? `
          <div class="detail-box">
            <div class="detail-box-label">Size</div>
            <div class="detail-box-value">${product.size}</div>
          </div>
        ` : ''}
        <div class="detail-box">
          <div class="detail-box-label">Sold</div>
          <div class="detail-box-value">${soldQty}</div>
        </div>
      </div>
      
      <div class="popup-price-display">
        ${discountPct > 0 ? `
          <div class="popup-original-price">
            <span class="popup-original-text">Rs ${originalPrice.toLocaleString()}</span>
            <span class="popup-cut-line"></span>
          </div>
        ` : ''}
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
  if (autoPrice) {
    autoPrice.innerHTML = '';
    autoPrice.style.display = 'none';
  }
  
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
    if (isArtificial || isDiamond) {
      karatSection.style.display = 'none';
    } else {
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

// ===== READYMADE BUY =====
function buyReadymade() {
  if (!currentProduct) return;
  quickAddToCart(currentProduct);
  closeProductModal();
}

function whatsappReadymade() {
  if (!currentProduct) return;
  quickWhatsApp(currentProduct);
}

// ===== TOGGLE CUSTOM WEIGHT =====
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

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
  document.body.style.overflow = '';
  currentProduct = null;
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('productModal');
  if (e.target === modal) closeProductModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeProductModal();
});

// ===== SIZE OPTIONS =====
function getSizeOptions(category, subcategory) {
  const sub = (subcategory || '').toLowerCase();
  
  if (sub.includes('ring') || sub.includes('baby ring')) {
    if (sub.includes('baby')) {
      return ['1','2','3','4','5','6','7','8','9'].map(s => `<option value="${s}">${s}</option>`).join('');
    }
    return ['10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25']
      .map(s => `<option value="${s}">${s}</option>`).join('');
  }
  if (sub.includes('bangle') || sub.includes('kara') || sub.includes('choori')) {
    return ['2.2','2.4','2.6','2.8','2.10','2.12'].map(s => `<option value="${s}">${s}</option>`).join('');
  }
  if (sub.includes('bracelet')) {
    return ['6"','6.5"','7"','7.5"','8"','8.5"'].map(s => `<option value="${s}">${s}</option>`).join('');
  }
  if (sub.includes('chain')) {
    return ['14"','16"','18"','20"','22"','24"','26"','30"'].map(s => `<option value="${s}">${s}</option>`).join('');
  }
  if (sub.includes('anklet') || sub.includes('payal')) {
    return ['9"','10"','11"','12"'].map(s => `<option value="${s}">${s}</option>`).join('');
  }
  if (sub.includes('necklace') || sub.includes('haar') || sub.includes('choker')) {
    return ['14"','16"','18"','20"','22"','24"'].map(s => `<option value="${s}">${s}</option>`).join('');
  }
  if (sub.includes('earring') || sub.includes('jhumka')) {
    return `<option value="Stud">Stud</option><option value="Drop">Drop</option><option value="Jhumka">Jhumka</option><option value="Chandbali">Chandbali</option><option value="Hoop">Hoop</option>`;
  }
  if (sub.includes('pendant')) {
    return ['16"','18"','20"','22"'].map(s => `<option value="${s}">${s}</option>`).join('');
  }
  if (sub.includes('coin')) {
    return ['1g','2g','2.5g','5g','10g','20g','50g','100g'].map(s => `<option value="${s}">${s}</option>`).join('');
  }
  if (sub.includes('bridal')) {
    return `<option value="Standard">Standard</option>`;
  }
  return ['Small','Medium','Large','Standard'].map(s => `<option value="${s}">${s}</option>`).join('');
}

// ===== CALCULATE PRICE (Custom Weight) =====
function calculatePrice() {
  if (!currentProduct) return;
  
  const weight = parseFloat(document.getElementById('modalWeight').value);
  const unit = document.getElementById('modalUnit').value;
  
  if (!weight || weight <= 0) {
    alert('Please enter a valid weight');
    return;
  }
  
  const weightInGrams = toGrams(weight, unit);
  
  let karat = '24K';
  const karatInput = document.querySelector('input[name="karat"]:checked');
  if (karatInput) karat = karatInput.value;
  
  let ratePerGram;
  if (currentProduct.category === 'silver') {
    ratePerGram = SILVER_RATE_PER_TOLA / WEIGHT.tola;
  } else {
    ratePerGram = getRateForKarat(karat);
  }
  
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

// ===== ADD TO CART (Custom weight) =====
function addToCart() {
  if (!currentProduct) return;
  
  if (document.getElementById('priceBreakdown').classList.contains('hidden')) {
    alert('Please calculate price first');
    return;
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

// ===== WHATSAPP ORDER =====
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

// =====================================================
// REVIEWS CAROUSEL – 20 PAKISTANI CUSTOMERS
// =====================================================

function initReviewCarousel() {
  const container = document.getElementById('reviewCarousel');
  if (!container) return;
  
  const reviews = [
    { name: 'Ahmed Khan', img: 'images/reviewer-1.jpg', text: 'Best gold jewellery in Lahore! Quality is outstanding and prices are very reasonable.', stars: 5, city: 'Lahore' },
    { name: 'Fatima Bibi', img: 'images/reviewer-2.jpg', text: 'Bought a bridal set for my daughter. Excellent workmanship, highly recommended!', stars: 5, city: 'Karachi' },
    { name: 'Muhammad Ali', img: 'images/reviewer-3.jpg', text: 'Delivered on time with beautiful packaging. The gold quality is 100% pure.', stars: 5, city: 'Islamabad' },
    { name: 'Ayesha Siddiqui', img: 'images/reviewer-4.jpg', text: 'Very professional staff. They customized the design exactly as I wanted.', stars: 5, city: 'Lahore' },
    { name: 'Hassan Raza', img: 'images/reviewer-5.jpg', text: 'Great rates and pure gold. My wife loved the necklace I bought!', stars: 5, city: 'Faisalabad' },
    { name: 'Sana Tariq', img: 'images/reviewer-6.jpg', text: 'Trustworthy shop. Delivered with complete secrecy and security.', stars: 5, city: 'Lahore' },
    { name: 'Bilal Ahmed', img: 'images/reviewer-7.jpg', text: 'Ordered silver jewellery for my sister. Quality is amazing!', stars: 5, city: 'Multan' },
    { name: 'Hina Shahid', img: 'images/reviewer-8.jpg', text: 'The custom weight option is brilliant. Got exactly what I wanted.', stars: 5, city: 'Karachi' },
    { name: 'Imran Yousaf', img: 'images/reviewer-9.jpg', text: 'Best price in Lahore Cantt. Highly satisfied with the service.', stars: 5, city: 'Lahore' },
    { name: 'Rabia Khan', img: 'images/reviewer-10.jpg', text: 'Bought gold biscuits as investment. Delivery was quick and secure.', stars: 5, city: 'Islamabad' },
    { name: 'Usman Malik', img: 'images/reviewer-11.jpg', text: 'Family has been shopping here for 10 years. Always trust them.', stars: 5, city: 'Lahore' },
    { name: 'Maryam Nawaz', img: 'images/reviewer-12.jpg', text: 'Received my order with a certificate of purity. Very happy!', stars: 5, city: 'Rawalpindi' },
    { name: 'Zeeshan Iqbal', img: 'images/reviewer-13.jpg', text: 'Very reasonable making charges. Best jeweller in Lahore.', stars: 5, city: 'Lahore' },
    { name: 'Nadia Ali', img: 'images/reviewer-14.jpg', text: 'Love the artificial jewellery collection. So affordable and pretty!', stars: 5, city: 'Peshawar' },
    { name: 'Kamran Sheikh', img: 'images/reviewer-15.jpg', text: 'Diamond ring was exactly as shown. My fiancee is very happy.', stars: 5, city: 'Karachi' },
    { name: 'Amna Hamid', img: 'images/reviewer-16.jpg', text: 'Excellent customer service. Answered all my queries via WhatsApp.', stars: 5, city: 'Lahore' },
    { name: 'Faisal Iqbal', img: 'images/reviewer-17.jpg', text: 'Fast delivery, secure packaging. Will shop again for sure.', stars: 5, city: 'Gujranwala' },
    { name: 'Zainab Rizvi', img: 'images/reviewer-18.jpg', text: 'Authentic gold, verified by hallmark. Best jeweller in Lahore!', stars: 5, city: 'Lahore' },
    { name: 'Shahid Mehmood', img: 'images/reviewer-19.jpg', text: 'Bought silver anklets. Beautiful design and quick delivery.', stars: 5, city: 'Sialkot' },
    { name: 'Mehwish Aslam', img: 'images/reviewer-20.jpg', text: 'The gold rate transparency is amazing. Best experience ever!', stars: 5, city: 'Lahore' }
  ];
  
  container.innerHTML = `
    <div class="reviews-track" id="reviewsTrack">
      ${reviews.map(r => `
        <div class="review-card">
          <img src="${r.img}" alt="${r.name}" class="review-photo" onerror="this.src='images/reviewer-placeholder.svg'">
          <div class="review-stars">${'⭐'.repeat(r.stars)}</div>
          <p class="review-text">"${r.text}"</p>
          <div class="review-name">— ${r.name}</div>
          <div class="review-city">📍 ${r.city}</div>
        </div>
      `).join('')}
    </div>
    <div class="reviews-dots" id="reviewsDots">
      ${reviews.map((_, i) => `<span class="rev-dot ${i === 0 ? 'active' : ''}" onclick="goToReview(${i})"></span>`).join('')}
    </div>
  `;
  
  startReviewCarousel(reviews.length);
}

function startReviewCarousel(total) {
  currentSlide = 0;
  if (carouselInterval) clearInterval(carouselInterval);
  carouselInterval = setInterval(() => {
    currentSlide = (currentSlide + 1) % total;
    showReview(currentSlide);
  }, 5000);
}

function showReview(index) {
  const track = document.getElementById('reviewsTrack');
  const dots = document.querySelectorAll('.rev-dot');
  if (track) track.style.transform = `translateX(-${index * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === index));
  currentSlide = index;
}

function goToReview(index) {
  if (carouselInterval) clearInterval(carouselInterval);
  showReview(index);
  const totalDots = document.querySelectorAll('.rev-dot').length;
  startReviewCarousel(totalDots || 20);
}

// ===== SUBMIT REVIEW =====
function submitReview(e) {
  e.preventDefault();
  const name = document.getElementById('reviewName').value.trim();
  const text = document.getElementById('reviewText').value.trim();
  const rating = document.getElementById('reviewRating').value;
  
  if (!name || !text) { alert('Please fill name and review'); return; }
  
  const reviews = JSON.parse(localStorage.getItem('srj_reviews') || '[]');
  reviews.push({ name, text, rating: parseInt(rating), date: new Date().toISOString(), status: 'pending' });
  localStorage.setItem('srj_reviews', JSON.stringify(reviews));
  
  const msg = `⭐ NEW REVIEW%0A%0AName: ${name}%0ARating: ${rating}/5%0AReview: ${text}`;
  window.open(`https://wa.me/923266501314?text=${msg}`, '_blank');
  
  alert('✅ Thank you for your review!');
  e.target.reset();
}

// ===== INIT =====
function initCategoryPage(category) {
  loadCategoryProducts(category);
  updateCartCount();
  initReviewCarousel();
}

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
});