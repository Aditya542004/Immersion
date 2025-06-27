async function fetchProducts(url) {
  const res = await fetch(url);
  const data = await res.json();
  return data.products;
}

function sortProducts(products, order) {
  if (order === 'asc') {
    return products.sort((a, b) => a.price - b.price);
  } else if (order === 'desc') {
    return products.sort((a, b) => b.price - a.price);
  }
  return products;
}

function renderProducts(products) {
  const container = document.getElementById('productContainer');
  container.innerHTML = '';
  if (products.length === 0) {
    container.innerHTML = '<p>No products found.</p>';
    return;
 }
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img class="product-image" src="${product.thumbnail}" alt="${product.title}">
      <div class="product-title">${product.title}</div>
      <div class="product-name">${product.brand}</div>
      <div class="product-price">$${product.price}</div>
    `;
    container.appendChild(card);
  });
}

async function searchProducts() {
  const query = document.getElementById('searchInput').value.trim();
  const sortOrder = document.getElementById('sortSelect').value;
  const url = query 
    ? `https://dummyjson.com/products/search?q=${encodeURIComponent(query)}`
    : 'https://dummyjson.com/products';
  let products = await fetchProducts(url);
  products = sortProducts(products, sortOrder);
  renderProducts(products);
}

window.onload = searchProducts;