import { playUiSound, setSoundsEnabled, soundsEnabled } from "./sounds.js";

const seedBusinesses = [
  { id: "moonlight", name: "Moonlight Cafe", handle: "@moonlight.cafe", category: "Cafe & dining", kind: "cafe", theme: "coffee", description: "Coffee, comfort food & slow mornings", distance: "0.4 km", rating: "4.9", reviews: 128, verified: true, offer: "Free cookie with any coffee", hours: "Open today · 8:00 am – 7:00 pm", branches: ["12th Main Street", "HAL 2nd Stage"], products: [{ id: "flatwhite", name: "Honey oat flat white", details: "Double espresso · oat milk · local honey", category: "Coffee & tea", price: 180, emoji: "☕", stock: 18 }, { id: "croissant", name: "Almond croissant", details: "Freshly baked every morning", category: "Fresh bakes", price: 145, emoji: "🥐", stock: 12 }, { id: "avocado", name: "Avocado toast", details: "Sourdough · chilli flakes · greens", category: "Breakfast", price: 260, emoji: "🥑", stock: 8 }, { id: "coldbrew", name: "Orange cold brew", details: "Slow-steeped for 18 hours", category: "Coffee & tea", price: 210, emoji: "🧋", stock: 10 }] },
  { id: "wildflower", name: "Wildflower Studio", category: "Flowers & gifts", kind: "flower", emoji: "💐", description: "Thoughtful bouquets, made by hand", distance: "0.7 km", rating: "4.8", reviews: 86, verified: true, offer: "10% off this week", branches: ["CMH Road"], products: [{ id: "bunch", name: "The Sunday bunch", details: "Seasonal blooms, wrapped with care", price: 650, emoji: "💐", stock: 6 }, { id: "tulips", name: "Colourful tulips", details: "A bright bunch of 8 stems", price: 520, emoji: "🌷", stock: 12 }] },
  { id: "bakehouse", name: "Sunday Bakehouse", handle: "@sunday.bakes", category: "Bakery", kind: "bakery", theme: "coffee", description: "Small-batch breads & buttery bakes", distance: "1.1 km", rating: "4.9", reviews: 204, verified: true, offer: "Fresh sourdough at 4 pm", hours: "Open today · 7:00 am – 6:00 pm", branches: ["Jeevan Bima Nagar", "Indiranagar"], products: [{ id: "sourdough", name: "Country sourdough loaf", details: "Naturally leavened · 700 g", category: "Breads", price: 290, emoji: "🍞", stock: 9 }, { id: "cinnamon", name: "Cinnamon morning bun", details: "Brown sugar · cinnamon · butter", category: "Pastries", price: 125, emoji: "🥮", stock: 15 }] },
  { id: "greengrocer", name: "The Good Grocer", handle: "@thegoodgrocer", category: "Groceries", kind: "grocery", theme: "green", description: "Fresh produce from nearby farms", distance: "0.8 km", rating: "4.7", reviews: 92, verified: true, offer: "Farm box from ₹299", hours: "Open today · 8:00 am – 8:00 pm", branches: ["Indiranagar"], products: [{ id: "farmbox", name: "Weekend farm box", details: "Seasonal vegetables · serves 2", category: "Vegetables", price: 399, emoji: "🥬", stock: 14 }, { id: "strawberries", name: "Ooty strawberries", details: "Fresh-picked · 250 g", category: "Fruits", price: 180, emoji: "🍓", stock: 11 }] },
  { id: "papertrail", name: "Paper Trail Stationery", handle: "@papertrail.indiranagar", category: "Stationery", kind: "book", theme: "maroon", description: "Notebooks, paper goods & thoughtful gifts", distance: "1.3 km", rating: "4.9", reviews: 67, verified: true, offer: "Buy 2, get 10% off", hours: "Open today · 10:00 am – 8:00 pm", branches: ["100 Feet Road"], products: [{ id: "book", name: "The Art of Noticing", details: "A lovely little book for slow days", category: "Books", price: 499, emoji: "📖", stock: 7 }, { id: "journal", name: "Everyday journal", details: "Recycled paper · 160 pages", category: "Notebooks", price: 320, emoji: "📔", stock: 20 }] },
  { id: "littleclay", name: "Little Clay Things", category: "Home & living", kind: "art", emoji: "🏺", description: "Handmade ceramics, made close by", distance: "1.5 km", rating: "4.8", reviews: 51, verified: false, offer: "New collection just arrived", branches: ["Domlur"], products: [{ id: "mug", name: "Speckled morning mug", details: "Hand-thrown stoneware · 300 ml", price: 780, emoji: "🍵", stock: 4 }] }
];

const initialOrders = [
  { id: "NL-24021", shopId: "moonlight", date: "Just now", customer: "Rohan Mehta", phone: "98765 12000", items: [{ productId: "flatwhite", name: "Honey oat flat white", qty: 1, price: 180 }, { productId: "croissant", name: "Almond croissant", qty: 2, price: 145 }], total: 470, status: "New", branch: "12th Main Street", fulfillment: "Pickup" },
  { id: "NL-24018", shopId: "moonlight", date: "Today, 9:42 am", customer: "Ananya Rao", customerId: "demo-customer", phone: "98765 43210", items: [{ productId: "flatwhite", name: "Honey oat flat white", qty: 2, price: 180 }, { productId: "croissant", name: "Almond croissant", qty: 1, price: 145 }], total: 505, status: "Accepted", branch: "12th Main Street", fulfillment: "Pickup" },
  { id: "NL-24011", shopId: "bakehouse", date: "Today, 8:16 am", customer: "Ananya Rao", customerId: "demo-customer", items: [{ productId: "sourdough", name: "Country sourdough loaf", qty: 1, price: 290 }], total: 290, status: "Ready", branch: "Indiranagar", fulfillment: "Pickup" },
  { id: "NL-23984", shopId: "wildflower", date: "Yesterday, 4:30 pm", customer: "Ananya Rao", customerId: "demo-customer", items: [{ productId: "bunch", name: "The Sunday bunch", qty: 1, price: 650 }], total: 650, status: "Completed", branch: "CMH Road", fulfillment: "Delivery" }
];

const getSaved = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn(`Could not load ${key} from local storage.`, error);
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    toast("Could not save your changes in this browser.");
    console.error(`Could not save ${key} to local storage.`, error);
  }
};

let businesses = getSaved("neighbourly-businesses", seedBusinesses);
let orders = getSaved("neighbourly-orders", initialOrders);
let following = getSaved("neighbourly-following", ["moonlight", "wildflower", "papertrail"]);
let cart = getSaved("neighbourly-cart", []);
let currentPage = "home";
let categoryFilter = "";
let profileSection = "overview";
let profile = getSaved("neighbourly-demo-profile", {
  name: "Ananya Rao",
  email: "ananya.rao@example.com",
  phone: "+91 98765 43210",
  location: "Indiranagar, Bengaluru"
});
let activeShop = null;
let activeShopId = "";
let catalogCategory = "All";
let shopBranch = "";
let checkoutMode = false;
let ownerBranch = "All branches";
let role = getSaved("neighbourly-demo-role", "guest");
let ownerSection = "orders";
let adminSection = "approvals";
let ads = getSaved("neighbourly-ads", [
  { id: "ad-1", shopId: "moonlight", title: "Coffee & a cookie on us", text: "Enjoy a free cookie with any coffee today.", status: "Live" },
  { id: "ad-2", shopId: "moonlight", title: "Sunday brunch, around the corner", text: "A new neighbourhood brunch menu is coming soon.", status: "Pending" },
  { id: "ad-3", shopId: "bakehouse", title: "Fresh sourdough at 4 pm", text: "Warm sourdough, baked fresh every afternoon.", status: "Pending" }
]);
let adminUsers = getSaved("neighbourly-demo-users", [
  { id: "ananya", name: "Ananya Rao", email: "ananya@example.test", role: "Customer" },
  { id: "moonlight-owner", name: "Mira Shah", email: "mira@moonlight.demo", role: "Business owner" },
  { id: "reviewer", name: "Dev Kapoor", email: "dev@neighbourly.demo", role: "Administrator" }
]);
if (!orders.some((order) => order.id === "NL-24021")) {
  orders.unshift(initialOrders[0]);
  save("neighbourly-orders", orders);
}

const main = document.getElementById("main-content");
const overlay = document.getElementById("overlay");
const cartPanel = document.getElementById("cart-panel");
const modalRoot = document.getElementById("modal-root");
const currency = (amount) => `₹${Number(amount).toLocaleString("en-IN")}`;
const shopById = (id) => businesses.find((business) => business.id === id);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const shopPhotos = {
  moonlight: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&auto=format&fit=crop&q=80",
  wildflower: "https://images.unsplash.com/photo-1494972308805-463bc619d34e?w=900&auto=format&fit=crop&q=80",
  bakehouse: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&auto=format&fit=crop&q=80",
  greengrocer: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=900&auto=format&fit=crop&q=80",
  papertrail: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900&auto=format&fit=crop&q=80",
  littleclay: "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=900&auto=format&fit=crop&q=80"
};
const photoForShop = (business) => shopPhotos[business.id] || "";

function toast(message) {
  const region = document.getElementById("toast-region");
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  region.append(item);
  window.setTimeout(() => item.remove(), 3000);
}

function getCartCount() { return cart.reduce((total, item) => total + item.qty, 0); }
function persistCart() { save("neighbourly-cart", cart); updateCartButton(); }

function updateCartButton() {
  const account = document.getElementById("account-button");
  if (!document.getElementById("cart-open-button")) {
    const button = document.createElement("button");
    button.id = "cart-open-button";
    button.className = "soft-button";
    button.innerHTML = `Bag <span id="cart-count">${getCartCount()}</span>`;
    button.addEventListener("click", openCart);
    account?.before(button);
  }
  const count = document.getElementById("cart-count");
  if (count) count.textContent = getCartCount();
}

function updateSoundToggle() {
  const button = document.getElementById("sound-toggle");
  if (!button) return;
  const enabled = soundsEnabled();
  button.textContent = enabled ? "🔊" : "🔇";
  button.setAttribute("aria-pressed", String(enabled));
  button.setAttribute("aria-label", enabled ? "Turn interface sounds off" : "Turn interface sounds on");
  button.title = enabled ? "Turn interface sounds off" : "Turn interface sounds on";
}

function render() {
  document.querySelectorAll("[data-role]").forEach((button) => {
    const active = button.dataset.role === role;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  renderNavigation();
  const followingCount = document.getElementById("following-count");
  if (followingCount) followingCount.textContent = following.length;
  updateCartButton();
  updateSoundToggle();
  document.getElementById("cart-open-button").hidden = role !== "guest";
  document.getElementById("global-search").parentElement.hidden = role !== "guest";
  document.getElementById("account-button").hidden = role !== "guest";
  document.querySelector(".notification-button").hidden = role === "guest";
  if (role === "guest") {
    if (currentPage === "home") renderHome();
    if (currentPage === "explore") renderExplore();
    if (currentPage === "following") renderFollowing();
    if (currentPage === "profile") renderProfile();
    if (currentPage === "shop") renderShopPage();
  } else if (role === "business") renderOwner();
  else renderAdmin();
}

function renderNavigation() {
  const nav = document.getElementById("side-nav");
  const mobile = document.querySelector(".mobile-nav");
  const configs = {
    guest: { label: "YOUR SPACE", links: [["home", "⌂", "Home"], ["explore", "⌕", "Explore"], ["following", "♡", "Following"], ["profile", "☺", "Profile"]] },
    business: { label: "BUSINESS WORKSPACE", links: [["overview", "⌂", "Overview"], ["orders", "▤", "Orders"], ["products", "▧", "Products"], ["storefront", "✦", "Shop appearance"], ["ads", "▤", "Promote your shop"]] },
    administrator: { label: "ADMIN WORKSPACE", links: [["approvals", "✓", "Approvals"], ["ads", "▧", "Ad campaigns"], ["roles", "⚙", "Team & roles"]] }
  };
  const config = configs[role];
  document.getElementById("sidebar-label").textContent = config.label;
  nav.innerHTML = config.links.map(([section, icon, label]) => {
    const selected = role === "business" ? ownerSection === section : role === "administrator" ? adminSection === section : currentPage === section;
    return `<button class="nav-link ${selected ? "active" : ""}" ${role === "guest" ? `data-page="${section}"` : role === "business" ? `data-owner-tab="${section}"` : `data-admin-section="${section}"`}><span class="nav-icon">${icon}</span>${label}</button>`;
  }).join("");
  const mobileLinks = role === "guest"
    ? [["home", "⌂", "Home"], ["explore", "⌕", "Explore"], ["following", "♡", "Following"], ["profile", "☺", "Profile"]]
    : role === "business"
      ? [["overview", "⌂", "Overview"], ["orders", "▤", "Orders"], ["products", "▧", "Products"], ["storefront", "✦", "Shop"], ["ads", "▤", "Ads"]]
      : [["approvals", "✓", "Approvals"], ["ads", "▧", "Ads"], ["roles", "⚙", "Roles"]];
  mobile.innerHTML = mobileLinks.map(([section, icon, label]) => {
    const selected = role === "business" ? ownerSection === section : role === "administrator" ? adminSection === section : currentPage === section;
    return `<button class="${selected ? "active" : ""}" ${role === "guest" ? `data-page="${section}"` : role === "business" ? `data-owner-tab="${section}"` : `data-admin-section="${section}"`}><span>${icon}</span>${label}</button>`;
  }).join("");
  document.getElementById("topbar-greeting").textContent = `Hi, ${profile.name.split(" ")[0]}`;
  document.getElementById("topbar-avatar").textContent = profile.name.charAt(0).toUpperCase();
  document.getElementById("sidebar-profile-name").textContent = profile.name;
  document.getElementById("sidebar-avatar").textContent = profile.name.charAt(0).toUpperCase();
}

function getCategories() {
  return ["Cafe & Bakery", "Grocery", "Stationery"];
}

function categoryForBusiness(business) {
  if (business.category === "Cafe & dining" || business.category === "Bakery") return "Cafe & Bakery";
  if (business.category === "Groceries") return "Grocery";
  if (business.category === "Stationery" || business.category === "Books & gifts") return "Stationery";
  return "";
}

function pageHeader(title, subtitle, eyebrow = "YOUR NEIGHBOURHOOD") {
  return `<div class="page-title-row"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div></div>`;
}

function businessCard(business) {
  const isFollowing = following.includes(business.id);
  return `<article class="business-card" data-shop-card="${business.id}" tabindex="0" role="group" aria-label="Open ${escapeHtml(business.name)} catalog">
    <div class="business-cover cover-${business.kind}">
      <img class="cover-photo" src="${photoForShop(business)}" alt="${escapeHtml(business.name)}" loading="lazy" onerror="this.style.display='none'" /><span class="cover-shade"></span><span class="cover-emoji">${business.emoji}</span>
      ${business.offer ? `<span class="cover-tag">${escapeHtml(business.offer)}</span>` : ""}
      <button class="follow-button ${isFollowing ? "following" : ""}" data-follow="${business.id}" aria-label="${isFollowing ? "Unfollow" : "Follow"} ${escapeHtml(business.name)}">${isFollowing ? "♥" : "♡"}</button>
    </div>
    <div class="business-info">
      <div class="business-title-row"><h3>${escapeHtml(business.name)}</h3>${business.verified ? '<span class="verified" title="Verified">✓</span>' : ""}</div>
      <p>${escapeHtml(business.description)}</p>
      <div class="business-meta"><span>${escapeHtml(business.category)} · ${business.distance}</span><span class="rating">★ ${business.rating} <span style="color:#9aa3b2;font-weight:400">(${business.reviews})</span></span></div>
      <div class="business-card-bottom"><span>⌖ ${escapeHtml(business.branches[0])}</span><button data-shop="${business.id}">View shop →</button></div>
    </div>
  </article>`;
}

function renderHome() {
  const query = document.getElementById("global-search").value;
  const shops = filteredBusinesses(query);
  const popular = businesses.filter((business) => categoryForBusiness(business)).sort((first, second) => Number(second.rating) - Number(first.rating)).slice(0, 3);
  main.innerHTML = `<div class="page-container">
    <div class="welcome-line"><div><div class="eyebrow">YOUR LOCAL GUIDE · INDIRANAGAR</div><h1>Good things grow close to home.</h1><p>Find lovely little shops and the people behind them.</p></div><div class="date-pill">⌖ <span>Indiranagar, Bengaluru</span>⌄</div></div>
    <section class="hero"><div class="hero-copy"><div class="eyebrow">MEET YOUR NEIGHBOURHOOD</div><h2>Support local. Find something wonderful.</h2><p>Thoughtful finds, fresh from the shops just around the corner.</p><button class="primary-button" data-page="explore">Explore nearby shops <span>→</span></button></div><div class="hero-art" aria-hidden="true"><div class="hero-sun"></div><div class="hero-window"></div><span class="hero-cup">☕</span><span class="hero-plant">🪴</span></div></section>
    <div class="section-heading"><div><h2>Shop by categories</h2><p>Pick what you’re looking for</p></div><button class="text-button" data-page="explore">All categories →</button></div>
    <div class="home-category-grid">${[["Cafe & Bakery", "☕", "Fresh coffee & bakes", "category-cafe"], ["Grocery", "🥬", "Fresh everyday picks", "category-grocery"], ["Stationery", "✏️", "Paper goods & more", "category-stationery"]].map(([category, icon, caption, style]) => `<button class="home-category-card ${style}" data-category="${category}"><span class="home-category-icon">${icon}</span><strong>${category}</strong><small>${caption}</small></button>`).join("")}</div>
    <div class="section-heading"><div><h2>Popular dealers nearby</h2><p>Neighbourhood favourites customers love</p></div><button class="text-button" data-page="explore">See all shops →</button></div>
    <div class="business-grid" style="margin-top:13px">${(query ? shops : popular).map(businessCard).join("") || emptyMessage("No shops found", "Try another search.")}</div>
    <div class="section-heading"><div><h2>A little love from local</h2><p>Fresh notes from the people down your street</p></div><button class="text-button" data-page="explore">Discover more →</button></div>
    <div class="feed-layout"><div>${ads.filter((ad) => ad.status === "Live").slice(0, 2).map((ad) => `<article class="update-card" style="margin-bottom:9px"><div class="update-avatar">${shopById(ad.shopId)?.emoji || "📣"}</div><div class="update-content"><strong>${escapeHtml(shopById(ad.shopId)?.name || "Local shop")} <span class="verified">✓</span></strong><small>Sponsored · Neighbourhood update</small><p><strong>${escapeHtml(ad.title)}</strong><br/>${escapeHtml(ad.text)}</p><span class="update-offer">Approved local promotion</span></div></article>`).join("") || '<article class="update-card"><div class="update-avatar">☕</div><div class="update-content"><strong>Moonlight Cafe <span class="verified">✓</span></strong><small>2 hours ago · 12th Main Street</small><p>Our first batch of cinnamon buns just came out of the oven. Pair one with your favourite coffee and make this Wednesday a little sweeter. ☀️</p><span class="update-offer">Today only · Free cookie with any coffee</span></div></article>'}</div><aside class="popular-card"><h3>Neighbourhood favourites</h3>${[businesses[0]?.products[0], businesses[2]?.products[0], businesses[1]?.products[0]].filter(Boolean).map((product) => `<div class="popular-item"><span class="popular-emoji">${product.emoji}</span><span class="popular-copy"><strong>${escapeHtml(product.name)}</strong><small>Made nearby</small></span><span class="popular-price">${currency(product.price)}</span></div>`).join("")}</aside></div>
  </div>`;
}

function filteredBusinesses(searchTerm = document.getElementById("global-search").value) {
  const query = searchTerm.trim().toLowerCase();
  return businesses.filter((business) => {
    const category = categoryForBusiness(business);
    if (!category) return false;
    const matchesCategory = !categoryFilter || categoryForBusiness(business) === categoryFilter;
    const matchesSearch = !query || [business.name, business.category, business.description, ...business.products.map((product) => product.name)].some((value) => value.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });
}

function emptyMessage(title, text) {
  return `<div class="empty-state" style="grid-column:1/-1"><span>🌿</span><strong>${title}</strong>${text}</div>`;
}

function renderExplore() {
  const results = filteredBusinesses();
  main.innerHTML = `<div class="page-container">${pageHeader("Explore local shops", "Choose a category to find nearby neighbourhood favourites.")}<div class="explore-category-grid">${getCategories().map((category) => `<button class="explore-category-card ${categoryFilter === category ? "active" : ""}" data-category="${escapeHtml(category)}"><span>${category === "Cafe & Bakery" ? "☕" : category === "Grocery" ? "🥬" : "✏️"}</span><strong>${escapeHtml(category)}</strong></button>`).join("")}</div><div class="section-heading" style="margin-top:26px"><div><h2>${categoryFilter ? `${escapeHtml(categoryFilter)} shops` : "Popular shops nearby"}</h2><p>${results.length} local ${results.length === 1 ? "shop" : "shops"} near Indiranagar</p></div>${categoryFilter ? '<button class="text-button" data-clear-category>Show all →</button>' : ""}</div><div class="business-grid">${results.map(businessCard).join("") || emptyMessage("No shops in this category yet", "Try another category or check back later.")}</div></div>`;
}

function renderFollowing() {
  const followedShops = businesses.filter((business) => following.includes(business.id));
  main.innerHTML = `<div class="page-container">${pageHeader("The ones you love", "A little update from the neighbourhood shops you follow.")}<div class="section-heading" style="margin-top:0"><div><h2>${followedShops.length} places in your circle</h2><p>Follow a local shop to keep up with their latest news.</p></div><button class="text-button" data-page="explore">Find more shops →</button></div><div class="business-grid">${followedShops.map(businessCard).join("") || emptyMessage("Your circle is waiting", "Explore nearby shops and follow a few favourites.")}</div></div>`;
}

function orderCard(order, owner = false) {
  const shop = shopById(order.shopId);
  return `<div class="order-row"><div><div class="order-id">${escapeHtml(order.id)}</div><div class="order-date">${escapeHtml(order.date)}</div></div><div><div class="order-shop">${escapeHtml(owner ? order.customer : shop?.name || "Local shop")}</div><div class="order-items">${order.items.map((item) => `${item.qty} × ${escapeHtml(item.name)}`).join(", ")}</div></div><div class="order-total">${currency(order.total)}</div><div><span class="status-pill ${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></div><div class="order-actions">${owner ? ownerOrderAction(order) : `<button class="small-button" data-invoice="${order.id}">View bill</button>`}</div></div>`;
}

function ownerOrderAction(order) {
  const next = { New: "Confirm", Accepted: "Mark ready", Ready: "Complete" };
  const statusAction = next[order.status] ? `<button class="small-button blue" data-status="${order.id}">${next[order.status]}</button>` : "";
  const rejectAction = order.status === "New" ? `<button class="small-button" data-reject-order="${order.id}">Decline</button>` : "";
  return `${statusAction}${rejectAction}<button class="small-button" data-invoice="${order.id}">Bill</button><button class="small-button" data-share-bill="${order.id}">Send</button>`;
}

function renderOrders() {
  const sortedOrders = [...orders].sort((a, b) => b.id.localeCompare(a.id));
  main.innerHTML = `<div class="page-container">${pageHeader("Your orders", "All your little local finds, together in one place.")}<div class="orders-list">${sortedOrders.length ? sortedOrders.map((order) => orderCard(order)).join("") : emptyMessage("No orders just yet", "When you place a local order, it will show up here.")}</div></div>`;
}

function renderProfile() {
  const myOrders = [...orders].filter((order) => order.customerId === "demo-customer" || order.customer === profile.name || order.customer === "Ananya Rao").sort((first, second) => second.id.localeCompare(first.id));
  const sections = [["overview", "Profile"], ["orders", "Your orders"], ["following", "Following"], ["settings", "Account details"]];
  const tabs = `<div class="workspace-tabs">${sections.map(([key, title]) => `<button class="workspace-tab ${profileSection === key ? "active" : ""}" data-profile-section="${key}">${title}</button>`).join("")}</div>`;
  const profileCard = `<section class="profile-card"><span class="avatar profile-avatar">${escapeHtml(profile.name.charAt(0).toUpperCase())}</span><div class="profile-card-copy"><h2>${escapeHtml(profile.name)}</h2><p>${escapeHtml(profile.email)}</p><span>Local member · ${escapeHtml(profile.location)}</span></div><button class="secondary-button" data-action="edit-profile">Edit profile</button></section>`;
  let content = "";
  if (profileSection === "overview") {
    content = `<div class="profile-shortcuts"><button class="profile-shortcut" data-profile-section="orders"><span>▤</span><strong>Your orders</strong><small>Check status and view your bills</small><b>→</b></button><button class="profile-shortcut" data-profile-section="following"><span>♡</span><strong>Following</strong><small>${following.length} local shops in your circle</small><b>→</b></button><button class="profile-shortcut" data-profile-section="settings"><span>⚙</span><strong>Account details</strong><small>Manage your contact information</small><b>→</b></button></div><div class="section-heading"><div><h2>Recent orders</h2><p>Your latest local purchases</p></div><button class="text-button" data-profile-section="orders">All orders →</button></div><section class="orders-list">${myOrders.slice(0, 3).map((order) => orderCard(order)).join("") || emptyMessage("No orders yet", "Browse local shops and your orders will appear here.")}</section>`;
  } else if (profileSection === "orders") {
    content = `<div class="section-heading" style="margin-top:0"><div><h2>Your orders</h2><p>Track status and open bills for your local purchases.</p></div></div><section class="orders-list">${myOrders.map((order) => orderCard(order)).join("") || emptyMessage("No orders yet", "Browse local shops and your orders will appear here.")}</section>`;
  } else if (profileSection === "following") {
    const followedShops = businesses.filter((business) => following.includes(business.id));
    content = `<div class="section-heading" style="margin-top:0"><div><h2>Your local circle</h2><p>Shops you follow for offers and neighbourhood updates.</p></div><button class="text-button" data-page="explore">Find more shops →</button></div><div class="business-grid">${followedShops.map(businessCard).join("") || emptyMessage("No followed shops yet", "Explore local businesses and follow your favourites.")}</div>`;
  } else {
    content = `<section class="dashboard-panel profile-details"><div><small>Full name</small><strong>${escapeHtml(profile.name)}</strong></div><div><small>Email address</small><strong>${escapeHtml(profile.email)}</strong></div><div><small>Phone number</small><strong>${escapeHtml(profile.phone)}</strong></div><div><small>Neighbourhood</small><strong>${escapeHtml(profile.location)}</strong></div><button class="primary-button" data-action="edit-profile">Edit profile</button></section>`;
  }
  main.innerHTML = `<div class="page-container">${pageHeader("Your profile", "Your account, local shops and orders in one place.")}${profileCard}${tabs}${content}</div>`;
}

function openEditProfile() {
  openModal(`<section class="modal modal-simple" role="dialog" aria-modal="true" aria-label="Edit profile"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>Edit your profile</h2><p>Update your details for this local demo.</p><form id="edit-profile-form" class="checkout-form"><label class="form-field">Full name<input name="name" required value="${escapeHtml(profile.name)}" /></label><label class="form-field">Email address<input name="email" type="email" required value="${escapeHtml(profile.email)}" /></label><label class="form-field">Phone number<input name="phone" type="tel" required value="${escapeHtml(profile.phone)}" /></label><label class="form-field">Neighbourhood<input name="location" required value="${escapeHtml(profile.location)}" /></label><div class="modal-footer"><button type="button" class="secondary-button" data-close-modal>Cancel</button><button class="primary-button">Save changes</button></div></form></section>`);
}

function renderOwner() {
  const business = shopById("moonlight");
  const shopOrders = orders.filter((order) => order.shopId === business.id && (ownerBranch === "All branches" || order.branch === ownerBranch));
  const pending = shopOrders.filter((order) => order.status === "New").length;
  const todayOrders = shopOrders.filter((order) => order.date.startsWith("Today") || order.date === "Just now");
  const todaySales = todayOrders.filter((order) => order.status !== "Cancelled").reduce((total, order) => total + order.total, 0);
  if (ownerSection === "storefront") { renderStorefrontSettings(business); return; }
  if (ownerSection === "ads") { renderOwnerAds(); return; }
  if (ownerSection === "products") { renderOwnerProducts(business); return; }
  if (ownerSection === "overview") {
    main.innerHTML = `<div class="page-container"><div class="page-title-row"><div><div class="eyebrow">BUSINESS WORKSPACE · MOONLIGHT CAFE</div><h1>Your shop at a glance</h1><p>Manage incoming requests, your product shelf and local promotions.</p></div></div><div class="demo-note">This is a demo owner workspace. Updates are saved in this browser only.</div><div class="owner-stats"><div class="stat-card"><small>Orders today</small><strong>${todayOrders.length}</strong><span>Sample orders</span></div><div class="stat-card"><small>Needs confirmation</small><strong>${pending}</strong><span>Incoming order requests</span></div><div class="stat-card"><small>Products</small><strong>${business.products.length}</strong><span>On your local shelf</span></div><div class="stat-card"><small>Today's order value</small><strong>${currency(todaySales)}</strong><span>Example order total</span></div>${workspaceTabs("overview")}<section class="dashboard-panel">${shopOrders.filter((order) => order.status === "New").map((order) => orderCard(order, true)).join("") || emptyMessage("No new requests", "New customer orders will appear here.")}</section></div>`;
    return;
  }
  main.innerHTML = `<div class="page-container">
    <div class="page-title-row"><div><div class="eyebrow">DEMO WORKSPACE · MOONLIGHT CAFE</div><h1>Orders from your neighbours</h1><p>Confirm requests and keep customers in the loop.</p></div></div>
    ${workspaceTabs("orders")}
    <div class="demo-note">Example order requests. Confirm to start preparing, or decline to return the demo stock.</div>
    <section class="dashboard-panel"><div class="dashboard-heading"><h2>Incoming and recent orders</h2><select id="owner-branch"><option ${ownerBranch === "All branches" ? "selected" : ""}>All branches</option>${business.branches.map((branch) => `<option ${ownerBranch === branch ? "selected" : ""}>${escapeHtml(branch)}</option>`).join("")}</select></div>${shopOrders.length ? shopOrders.map((order) => orderCard(order, true)).join("") : emptyMessage("No orders for this branch", "New customer orders will appear here.")}</section>
  </div>`;
}

function workspaceTabs(active) {
  return `<div class="workspace-tabs">${[["overview","Overview"],["orders","Orders"],["products","Products"],["storefront","Shop appearance"],["ads","Promotions"]].map(([key,label]) => `<button class="workspace-tab ${active === key ? "active" : ""}" data-owner-tab="${key}">${label}</button>`).join("")}</div>`;
}

function renderOwnerProducts(business) {
  main.innerHTML = `<div class="page-container"><div class="page-title-row"><div><div class="eyebrow">DEMO WORKSPACE · MOONLIGHT CAFE</div><h1>Your product shelf</h1><p>Manage the items your neighbours can order.</p></div><button class="primary-button" data-action="add-product">＋ Add a product</button></div>${workspaceTabs("products")}<section class="dashboard-panel">${business.products.map((product) => `<div class="product-management-row"><div class="product-management-name"><span>${product.emoji}</span>${escapeHtml(product.name)} <small>${escapeHtml(productCategory(product))}</small></div><strong>${currency(product.price)}</strong><span class="stock-state ${product.stock <= 0 ? "out" : ""}">${product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</span><button class="small-button" data-stock="${product.id}">${product.stock > 0 ? "Mark unavailable" : "Restock"}</button></div>`).join("")}</section></div>`;
}

function renderStorefrontSettings(business) {
  const tabs = workspaceTabs("storefront");
  main.innerHTML = `<div class="page-container"><div class="page-title-row"><div><div class="eyebrow">BUSINESS WORKSPACE · CUSTOMER VIEW</div><h1>Shop appearance</h1><p>Set the storefront details and colours customers see in your catalogue.</p></div></div>${tabs}<div class="demo-note">Changes are saved in this browser demo and apply to your public shop page.</div><section class="dashboard-panel storefront-settings"><form id="storefront-form" class="checkout-form"><label class="form-field">Business display name<input name="name" required value="${escapeHtml(business.name)}" /></label><label class="form-field">Shop ID / handle<input name="handle" required value="${escapeHtml(business.handle || `@${business.id}`)}" /></label><label class="form-field">Short description<input name="description" required value="${escapeHtml(business.description)}" /></label><label class="form-field">Neighbourhood offer<input name="offer" value="${escapeHtml(business.offer || "")}" placeholder="e.g. 10% off this week" /></label><label class="form-field">Opening hours<input name="hours" value="${escapeHtml(business.hours || "")}" placeholder="Open today · 8:00 am – 7:00 pm" /></label><label class="form-field">Store theme<select name="theme"><option value="coffee" ${catalogThemeKey(business) === "coffee" ? "selected" : ""}>Coffee brown</option><option value="green" ${catalogThemeKey(business) === "green" ? "selected" : ""}>Fresh green</option><option value="maroon" ${catalogThemeKey(business) === "maroon" ? "selected" : ""}>Stationery maroon</option></select></label><div class="storefront-preview"><small>CATALOGUE PREVIEW</small><strong>${escapeHtml(business.name)} ${escapeHtml(business.handle || `@${business.id}`)}</strong><span>Theme colours apply to buttons, category choices and offer details.</span><button type="button" class="catalog-add" data-shop-preview="${business.id}">Preview storefront →</button></div><div><button class="primary-button">Save storefront preferences</button></div></form></section></div>`;
}

function catalogThemeKey(business) {
  if (["coffee", "green", "maroon"].includes(business.theme)) return business.theme;
  return categoryForBusiness(business) === "Grocery" ? "green" : categoryForBusiness(business) === "Stationery" ? "maroon" : "coffee";
}

function adCard(ad, admin = false) {
  const business = shopById(ad.shopId);
  return `<div class="ad-listing"><span class="admin-business-icon">${business?.emoji || "📣"}</span><span class="ad-listing-copy"><strong>${escapeHtml(ad.title)}</strong><small>${escapeHtml(business?.name || "Local business")} · ${escapeHtml(ad.text)}</small></span><span class="ad-status ${escapeHtml(ad.status)}">${escapeHtml(ad.status)}</span>${admin && ad.status === "Pending" ? `<button class="small-button blue" data-approve-ad="${ad.id}">Make live</button>` : ""}${admin && ad.status === "Live" ? `<button class="small-button" data-pause-ad="${ad.id}">Pause</button>` : ""}</div>`;
}

function renderOwnerAds() {
  const business = shopById("moonlight");
  main.innerHTML = `<div class="page-container"><div class="page-title-row"><div><div class="eyebrow">MOONLIGHT CAFE · LOCAL PROMOTIONS</div><h1>Tell the neighbourhood</h1><p>Promotions need administrator approval before they appear publicly.</p></div><button class="primary-button" data-action="add-promotion">＋ Create promotion</button></div>${workspaceTabs("ads")}<div class="demo-note">No ad spend or external messaging is used in this demo. Approved promotions appear in the Guest home feed.</div><section class="dashboard-panel">${ads.filter((ad) => ad.shopId === business.id).map((ad) => adCard(ad)).join("") || emptyMessage("No promotions yet", "Create one to tell the neighbourhood what’s new.")}</section></div>`;
}

function renderAdmin() {
  const pending = [
    { name: "Little Clay Things", category: "Home & living · Domlur", emoji: "🏺", id: "littleclay" },
    { name: "Green Corner Plants", category: "Plants & garden · Koramangala", emoji: "🪴", id: "green-corner" },
    { name: "Mira's Tailoring", category: "Services · Indiranagar", emoji: "🧵", id: "mira-tailoring" }
  ].filter((application) => !getSaved("neighbourly-approved", []).includes(application.id) && !getSaved("neighbourly-rejected", []).includes(application.id));
  if (adminSection === "ads") { renderAdminAds(); return; }
  if (adminSection === "roles") { renderAdminRoles(); return; }
  const sampleOrders = orders.length;
  main.innerHTML = `<div class="page-container">${pageHeader("Approve local businesses", "Review new applications before they join the neighbourhood.", "ADMINISTRATOR WORKSPACE")}<div class="demo-note">Demo administrator access only. Approvals, ad reviews and role changes are stored in this browser and are not security controls.</div><div class="workspace-tabs">${[["approvals","Business approvals"],["ads","Ad campaigns"],["roles","Team & roles"]].map(([key,label]) => `<button class="workspace-tab ${adminSection === key ? "active" : ""}" data-admin-section="${key}">${label}</button>`).join("")}</div><div class="owner-stats"><div class="stat-card"><small>Sample businesses</small><strong>${businesses.length}</strong><span>In this browser demo</span></div><div class="stat-card"><small>Sample members</small><strong>${adminUsers.length}</strong><span>Demo accounts</span></div><div class="stat-card"><small>Sample orders</small><strong>${sampleOrders}</strong><span>Saved in this browser</span></div><div class="stat-card"><small>Awaiting review</small><strong>${pending.length}</strong><span>Business applications</span></div></div><section class="dashboard-panel"><div class="dashboard-heading"><h2>Business applications <span class="nav-count">${pending.length}</span></h2><span style="color:#8c96a7;font-size:9px">Newest first</span></div>${pending.length ? pending.map((application) => `<div class="admin-card"><span class="admin-business-icon">${application.emoji}</span><span class="admin-business-copy"><strong>${escapeHtml(application.name)}</strong><small>${escapeHtml(application.category)} · Sample application</small></span><div class="admin-actions"><button class="small-button" data-reject="${application.id}">Decline</button><button class="small-button blue" data-approve="${application.id}">Approve</button></div></div>`).join("") : emptyMessage("All caught up", "There are no business applications waiting for review.")}</section><div class="section-heading"><div><h2>Neighbourhood categories</h2><p>Categories customers can browse</p></div><button class="text-button" data-action="add-category">＋ Add a category</button></div><div class="category-row">${getCategories().filter((category) => category !== "All").map((category) => `<span class="category-chip">${escapeHtml(category)}</span>`).join("")}</div></div>`;
}

function renderAdminAds() {
  main.innerHTML = `<div class="page-container">${pageHeader("Review local promotions", "Approve campaigns before they show up in the guest discovery feed.", "ADMINISTRATOR WORKSPACE")}<div class="workspace-tabs">${[["approvals","Business approvals"],["ads","Ad campaigns"],["roles","Team & roles"]].map(([key,label]) => `<button class="workspace-tab ${adminSection === key ? "active" : ""}" data-admin-section="${key}">${label}</button>`).join("")}</div><div class="demo-note">Only promotions approved here appear in the Guest home feed. Changes are local demo state.</div><section class="dashboard-panel">${ads.map((ad) => adCard(ad, true)).join("") || emptyMessage("No campaigns", "Business promotions submitted for review will appear here.")}</section></div>`;
}

function renderAdminRoles() {
  main.innerHTML = `<div class="page-container">${pageHeader("Administrator team & roles", "Manage demo account roles for this local preview.", "ADMINISTRATOR WORKSPACE")}<div class="workspace-tabs">${[["approvals","Business approvals"],["ads","Ad campaigns"],["roles","Team & roles"]].map(([key,label]) => `<button class="workspace-tab ${adminSection === key ? "active" : ""}" data-admin-section="${key}">${label}</button>`).join("")}</div><div class="demo-note">Role changes here only update sample data in this browser. Real role permissions must be enforced by an authenticated server.</div><section class="dashboard-panel">${adminUsers.map((user) => `<div class="role-row"><span><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></span><select class="inline-select" data-user-role="${user.id}" aria-label="Role for ${escapeHtml(user.name)}"><option ${user.role === "Customer" ? "selected" : ""}>Customer</option><option ${user.role === "Business owner" ? "selected" : ""}>Business owner</option><option ${user.role === "Administrator" ? "selected" : ""}>Administrator</option></select></div>`).join("")}</section></div>`;
}

function catalogTheme(business) {
  const defaultTheme = categoryForBusiness(business) === "Grocery" ? "green" : categoryForBusiness(business) === "Stationery" ? "maroon" : "coffee";
  const themes = {
    coffee: { accent: "#79533b", pale: "#f6eee7", soft: "#ede0d4", text: "#4b3327" },
    green: { accent: "#347a4b", pale: "#edf5ec", soft: "#dcebd9", text: "#254d32" },
    maroon: { accent: "#783446", pale: "#f7edf0", soft: "#ecdde2", text: "#512532" }
  };
  const selected = themes[business.theme] || themes[defaultTheme];
  return `--shop-accent:${selected.accent};--shop-pale:${selected.pale};--shop-soft:${selected.soft};--shop-ink:${selected.text}`;
}

function productCategory(product) {
  if (product.category) return product.category;
  if (["flatwhite", "coldbrew"].includes(product.id)) return "Coffee & tea";
  if (["croissant", "cinnamon"].includes(product.id)) return "Fresh bakes";
  if (product.id === "avocado") return "Breakfast";
  if (["farmbox", "strawberries"].includes(product.id)) return product.id === "farmbox" ? "Vegetables" : "Fruits";
  if (["book", "journal"].includes(product.id)) return product.id === "book" ? "Books" : "Notebooks";
  return "Shop favourites";
}

function catalogProductCard(product, shopId) {
  const category = productCategory(product);
  return `<article class="catalog-product"><div class="catalog-product-art"><span>${escapeHtml(product.emoji || "✨")}</span>${product.offer ? `<b>${escapeHtml(product.offer)}</b>` : ""}</div><div class="catalog-product-copy"><small>${escapeHtml(category)}</small><strong>${escapeHtml(product.name)}</strong><p>${escapeHtml(product.details)}</p><div class="catalog-product-buy"><strong>${currency(product.price)}</strong><button class="catalog-add" data-add="${product.id}" data-shop-id="${shopId}" ${product.stock <= 0 ? "disabled" : ""}>${product.stock > 0 ? "＋ Add" : "Sold out"}</button></div></div></article>`;
}

function renderShopPage() {
  const business = shopById(activeShopId);
  if (!business) {
    currentPage = "explore";
    renderExplore();
    return;
  }
  activeShop = business;
  const categories = [...new Set(business.products.map(productCategory))];
  const selectedProducts = catalogCategory === "Offers"
    ? business.products.filter((product) => product.offer || business.offer)
    : catalogCategory === "All"
      ? business.products
      : business.products.filter((product) => productCategory(product) === catalogCategory);
  const isFollowing = following.includes(business.id);
  const liveOffer = catalogCategory === "Offers" && business.offer;
  main.innerHTML = `<div class="page-container shop-page" style="${catalogTheme(business)}">
    <button class="shop-back-button" data-page="explore">← <span>Back to explore</span></button>
    <section class="store-hero">
      <img src="${photoForShop(business)}" alt="" class="store-cover-photo" onerror="this.style.display='none'" />
      <span class="store-cover-shade"></span>
      <div class="store-identity"><span class="store-logo">${escapeHtml(business.emoji || "🏪")}</span><div><span class="store-category">${escapeHtml(business.category || "Local shop")}</span><h1>${escapeHtml(business.name || "Neighbourhood shop")} ${business.verified ? '<span class="verified">✓</span>' : ""}</h1><p>${escapeHtml(business.handle || `@${business.id}`)} <span>·</span> <strong>★ ${escapeHtml(business.rating || "New")}</strong> <span>(${business.reviews || 0} reviews)</span></p></div></div>
      <button class="store-follow ${isFollowing ? "following" : ""}" data-follow="${business.id}">${isFollowing ? "♥ Following" : "♡ Follow shop"}</button>
    </section>
    <div class="store-meta"><span>⌖ <strong id="active-branch-name">${escapeHtml(shopBranch || business.branches[0])}</strong>, Indiranagar</span><span>◷ ${escapeHtml(business.hours || "Open today · 8:00 am – 7:00 pm")}</span><span>Pickup · Local delivery</span></div>
    <section class="store-welcome"><div><small>WELCOME TO OUR SHOP</small><p>${escapeHtml(business.description)}</p></div><label class="branch-control">Branch <select id="shop-branch">${business.branches.map((branch) => `<option ${branch === shopBranch ? "selected" : ""}>${escapeHtml(branch)}</option>`).join("")}</select></label></section>
    ${business.offer ? `<button class="store-offer" data-catalog-category="Offers"><span>✦ NEIGHBOURHOOD OFFER</span><strong>${escapeHtml(business.offer)}</strong><small>Tap to see the offer and shop all items →</small></button>` : ""}
    <div class="section-heading store-catalog-heading"><div><h2>Shop the catalogue</h2><p>Choose a category or browse everything</p></div><span class="store-product-count">${business.products.length} items</span></div>
    <div class="catalog-categories"><button class="catalog-chip ${catalogCategory === "All" ? "active" : ""}" data-catalog-category="All">All items</button>${business.offer ? `<button class="catalog-chip ${catalogCategory === "Offers" ? "active" : ""}" data-catalog-category="Offers">✦ Offers</button>` : ""}${categories.map((category) => `<button class="catalog-chip ${catalogCategory === category ? "active" : ""}" data-catalog-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}</div>
    <div class="catalog-grid">${selectedProducts.map((product) => catalogProductCard(product, business.id)).join("") || emptyMessage("No items in this category", "Choose another catalogue category.")}</div>
    <section class="store-details-panel"><div><small>VISIT US</small><strong>${escapeHtml(business.branches.join(" · "))}</strong></div><div><small>OPENING HOURS</small><strong>${escapeHtml(business.hours || "Open today · 8:00 am – 7:00 pm")}</strong></div><div><small>ORDER OPTIONS</small><strong>Pickup and local delivery</strong></div></section>
    ${liveOffer ? `<div class="store-active-offer">✦ ${escapeHtml(business.offer)}</div>` : ""}
  </div>`;
}

function openShop(id) {
  activeShop = shopById(id);
  if (!activeShop) return;
  activeShopId = id;
  catalogCategory = "All";
  shopBranch = activeShop.branches[0];
  currentPage = "shop";
  render();
}

function openCart() {
  checkoutMode = false;
  renderCart();
  overlay.hidden = false;
  cartPanel.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartPanel.classList.remove("open");
  cartPanel.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
}

function renderCart() {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shop = cart.length ? shopById(cart[0].shopId) : null;
  cartPanel.innerHTML = `<div class="cart-header"><h2>${checkoutMode ? "Almost yours" : `Your bag${getCartCount() ? ` · ${getCartCount()}` : ""}`}</h2><button class="close-button" data-close-cart aria-label="Close cart">×</button></div>${checkoutMode && cart.length ? `<form class="cart-content checkout-form" id="checkout-form"><p style="font-size:10px;color:#8590a2;margin:0 0 4px">A few details and it’s yours. This is a local demo order.</p><label class="form-field">Your name<input name="customer" required value="Ananya Rao" /></label><label class="form-field">Phone number<input name="phone" required type="tel" value="98765 43210" /></label><label class="form-field">Choose a branch<select name="branch" required>${shop.branches.map((branch) => `<option ${branch === shopBranch ? "selected" : ""}>${escapeHtml(branch)}</option>`).join("")}</select></label><label class="checkout-option"><input type="radio" name="fulfillment" value="Pickup" checked /> I’ll pick it up</label><label class="checkout-option"><input type="radio" name="fulfillment" value="Delivery" /> Local delivery</label><label class="form-field">Anything we should know?<input name="note" placeholder="Optional note for the shop" /></label></form>` : `<div class="cart-content">${cart.length ? `<p class="cart-shop-name">From ${escapeHtml(shop.name)} · ${escapeHtml(shopBranch || shop.branches[0])}</p>${cart.map((item) => `<div class="cart-item"><span class="product-emoji">${item.emoji}</span><span class="cart-item-copy"><strong>${escapeHtml(item.name)}</strong><small>${currency(item.price)} each</small></span><span class="quantity-control"><button data-quantity="${item.productId}" data-delta="-1" aria-label="Remove one">−</button><span>${item.qty}</span><button data-quantity="${item.productId}" data-delta="1" aria-label="Add one">+</button></span></div>`).join("")}` : emptyMessage("Your bag is taking a breather", "Open a local shop and add something lovely.")}</div>`}<div class="cart-footer"><div class="cart-total-line"><span>Subtotal</span><span>${currency(total)}</span></div><div class="cart-total-line"><span>Neighbourhood delivery</span><span>${cart.length ? "At checkout" : "—"}</span></div><div class="cart-total-line total"><span>Total</span><span>${currency(total)}</span></div>${checkoutMode ? `<button form="checkout-form" class="primary-button" type="submit">Place demo order · ${currency(total)}</button>` : `<button class="primary-button" id="checkout-button" ${cart.length ? "" : "disabled"}>Continue to checkout <span>→</span></button>`}</div>`;
}

function addToCart(shopId, productId) {
  if (cart.length && cart[0].shopId !== shopId) {
    toast("For this demo, check out one local shop at a time.");
    return;
  }
  const shop = shopById(shopId);
  const product = shop?.products.find((item) => item.id === productId);
  if (!product || product.stock < 1) {
    toast("That item is currently unavailable.");
    return;
  }
  const item = cart.find((entry) => entry.shopId === shopId && entry.productId === productId);
  if (item) {
    if (item.qty >= product.stock) { toast("That’s all the stock this shop has right now."); return; }
    item.qty += 1;
  } else cart.push({ shopId, productId, name: product.name, price: product.price, emoji: product.emoji, qty: 1 });
  shopBranch = document.getElementById("shop-branch")?.value || shopBranch || shop.branches[0];
  persistCart();
  toast(`${product.name} added to your bag.`);
  renderCart();
}

function changeQuantity(productId, delta) {
  const item = cart.find((entry) => entry.productId === productId);
  if (!item) return;
  const product = shopById(item.shopId)?.products.find((entry) => entry.id === productId);
  const next = item.qty + delta;
  if (next < 1) cart = cart.filter((entry) => entry.productId !== productId);
  else if (product && next <= product.stock) item.qty = next;
  else { toast("There isn’t enough stock for another one."); return; }
  persistCart();
  renderCart();
}

function placeOrder(form) {
  const values = new FormData(form);
  const shop = shopById(cart[0]?.shopId);
  if (!shop || !cart.length) return;
  const items = cart.map((item) => ({ productId: item.productId, name: item.name, qty: item.qty, price: item.price }));
  items.forEach((item) => {
    const product = shop.products.find((entry) => entry.id === item.productId);
    if (product) product.stock = Math.max(0, product.stock - item.qty);
  });
  const orderNumber = `NL-${Date.now().toString().slice(-6)}`;
  orders.unshift({ id: orderNumber, shopId: shop.id, date: "Just now", customer: String(values.get("customer")), customerId: "demo-customer", phone: String(values.get("phone")), items, total: items.reduce((sum, item) => sum + item.qty * item.price, 0), status: "New", branch: String(values.get("branch")), fulfillment: String(values.get("fulfillment")) });
  save("neighbourly-businesses", businesses);
  save("neighbourly-orders", orders);
  cart = [];
  persistCart();
  checkoutMode = false;
  closeCart();
  toast(`Order ${orderNumber} placed. ${shop.name} has been notified.`);
  currentPage = "profile";
  profileSection = "orders";
  render();
}

function openModal(content) {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div>${content}`;
}

function addProductModal() {
  openModal(`<section class="modal modal-simple" role="dialog" aria-modal="true"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>Add something to your shelf</h2><p>Keep it simple. You can update these details anytime.</p><form id="new-product-form" class="checkout-form"><label class="form-field">Product name<input name="name" placeholder="e.g. Filter coffee" required /></label><label class="form-field">Catalogue category<input name="category" placeholder="e.g. Coffee & tea" required /></label><label class="form-field">Price (₹)<input name="price" type="number" min="1" step="1" placeholder="180" required /></label><label class="form-field">Short description<input name="details" placeholder="What makes it special?" /></label><label class="form-field">Stock available<input name="stock" type="number" min="0" step="1" value="10" required /></label><label class="form-field">Emoji for the demo<input name="emoji" maxlength="4" value="✨" /></label><div class="modal-footer"><button type="button" class="secondary-button" data-close-modal>Cancel</button><button class="primary-button">Add product</button></div></form></section>`);
}

function createInvoice(orderId) {
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) return;
  const shop = shopById(order.shopId);
  const rows = order.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.qty}</td><td>${currency(item.price)}</td><td>${currency(item.price * item.qty)}</td></tr>`).join("");
  const invoice = `<html><head><title>Invoice ${escapeHtml(order.id)}</title><style>body{font:14px Arial,sans-serif;color:#17233b;max-width:760px;margin:50px auto;padding:0 30px}h1{font-size:26px}header{display:flex;justify-content:space-between;border-bottom:2px solid #4268e9;padding-bottom:18px}.muted{color:#788398;font-size:12px}table{width:100%;border-collapse:collapse;margin:35px 0}th,td{text-align:left;padding:12px;border-bottom:1px solid #e9edf4}th{background:#f6f7fb;color:#657187}td:last-child,th:last-child{text-align:right}.total{text-align:right;font-size:18px;font-weight:bold}.foot{margin-top:50px;color:#788398;font-size:12px}@media print{body{margin:0}}</style></head><body><header><div><h1>${escapeHtml(shop?.name || "Neighbourly shop")}</h1><div class="muted">${escapeHtml(order.branch)} · Bengaluru</div></div><div><h2>INVOICE</h2><div class="muted">${escapeHtml(order.id)}<br/>${escapeHtml(order.date)}</div></div></header><p><strong>Bill to:</strong> ${escapeHtml(order.customer)}<br/><span class="muted">${escapeHtml(order.fulfillment)} order · ${escapeHtml(order.status)}</span></p><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total ${currency(order.total)}</div><p class="foot">Thank you for shopping local. This demo invoice has no tax configured.</p><script>window.onload=()=>window.print()<\\/script></body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) { toast("Allow pop-ups to print or save your bill."); return; }
  printWindow.document.write(invoice);
  printWindow.document.close();
}

function shareBill(orderId) {
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) return;
  const shop = shopById(order.shopId);
  const details = order.items.map((item) => `${item.qty} x ${item.name}`).join(", ");
  const message = `Hello ${order.customer}, your ${shop?.name || "local shop"} bill for ${order.id} is ${currency(order.total)}. Items: ${details}. The printable bill is available in the Neighbourly demo.`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  toast("WhatsApp opened with a message draft. Review and send it yourself.");
}

function handleStatus(orderId) {
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) return;
  const transitions = { New: "Accepted", Accepted: "Ready", Ready: "Completed" };
  if (!transitions[order.status]) return;
  order.status = transitions[order.status];
  save("neighbourly-orders", orders);
  render();
  toast(`${order.id} is now ${order.status.toLowerCase()}.`);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, a[data-page], [data-close-modal], [data-shop-card]");
  if (!target) return;
  if (target.dataset.toggleSound !== undefined) {
    const enabled = !soundsEnabled();
    setSoundsEnabled(enabled);
    updateSoundToggle();
    if (enabled) playUiSound("toggle");
    toast(enabled ? "Interface sounds on." : "Interface sounds off.");
    return;
  }
  if (target.dataset.role) {
    role = target.dataset.role;
    save("neighbourly-demo-role", role);
    currentPage = "home";
    if (role === "business") ownerSection = "overview";
    if (role === "administrator") adminSection = "approvals";
    render();
    return;
  }
  if (target.dataset.ownerTab) {
    ownerSection = target.dataset.ownerTab;
    render();
    return;
  }
  if (target.dataset.adminSection) {
    adminSection = target.dataset.adminSection;
    render();
    return;
  }
  if (target.dataset.profileSection) {
    profileSection = target.dataset.profileSection;
    renderProfile();
    return;
  }
  if (target.dataset.shopCard) { openShop(target.dataset.shopCard); return; }
  if (target.dataset.shopPreview) {
    role = "guest";
    activeShopId = target.dataset.shopPreview;
    catalogCategory = "All";
    currentPage = "shop";
    save("neighbourly-demo-role", role);
    render();
    return;
  }
  if (target.dataset.catalogCategory) {
    catalogCategory = target.dataset.catalogCategory;
    renderShopPage();
    return;
  }
  if (target.dataset.page) {
    if (target.matches("a")) event.preventDefault();
    currentPage = target.dataset.page;
    categoryFilter = "";
    render();
    main.focus();
    return;
  }
  if (target.dataset.category) {
    const sound = { "Cafe & Bakery": "cafe", Grocery: "grocery", Stationery: "stationery" }[target.dataset.category] || "tap";
    playUiSound(sound);
    categoryFilter = target.dataset.category;
    currentPage = "explore";
    render();
    return;
  }
  if (target.dataset.clearCategory !== undefined) {
    categoryFilter = "";
    renderExplore();
    return;
  }
  if (target.dataset.shop) { openShop(target.dataset.shop); return; }
  if (target.dataset.follow) {
    const id = target.dataset.follow;
    following = following.includes(id) ? following.filter((entry) => entry !== id) : [...following, id];
    save("neighbourly-following", following);
    render();
    if (activeShop?.id === id && modalRoot.innerHTML) openShop(id);
    else toast(following.includes(id) ? "Added to your local circle." : "Removed from your local circle.");
    return;
  }
  if (target.dataset.add) { addToCart(target.dataset.shopId, target.dataset.add); return; }
  if (target.dataset.closeModal !== undefined) { modalRoot.innerHTML = ""; return; }
  if (target.dataset.closeCart !== undefined) { closeCart(); return; }
  if (target.dataset.quantity) { changeQuantity(target.dataset.quantity, Number(target.dataset.delta)); return; }
  if (target.id === "checkout-button") {
    checkoutMode = true;
    renderCart();
    return;
  }
  if (target.dataset.status) { handleStatus(target.dataset.status); return; }
  if (target.dataset.invoice) { createInvoice(target.dataset.invoice); return; }
  if (target.dataset.shareBill) { shareBill(target.dataset.shareBill); return; }
  if (target.dataset.rejectOrder) {
    const order = orders.find((entry) => entry.id === target.dataset.rejectOrder);
    if (order && order.status === "New") {
      order.status = "Cancelled";
      order.items.forEach((item) => {
        const product = shopById(order.shopId)?.products.find((entry) => entry.id === item.productId);
        if (product) product.stock += item.qty;
      });
      save("neighbourly-orders", orders);
      save("neighbourly-businesses", businesses);
      render();
      toast(`${order.id} declined; demo stock was returned.`);
    }
    return;
  }
  if (target.dataset.approveAd) {
    const ad = ads.find((entry) => entry.id === target.dataset.approveAd);
    if (ad && ad.status === "Pending") {
      ad.status = "Live";
      save("neighbourly-ads", ads);
      render();
      toast("Promotion approved and now live in the Guest feed.");
    }
    return;
  }
  if (target.dataset.pauseAd) {
    const ad = ads.find((entry) => entry.id === target.dataset.pauseAd);
    if (ad && ad.status === "Live") {
      ad.status = "Paused";
      save("neighbourly-ads", ads);
      render();
      toast("Promotion paused.");
    }
    return;
  }
  if (target.dataset.deleteAd) {
    ads = ads.filter((ad) => ad.id !== target.dataset.deleteAd);
    save("neighbourly-ads", ads);
    render();
    toast("Promotion removed.");
    return;
  }
  if (target.dataset.stock) {
    const product = shopById("moonlight").products.find((entry) => entry.id === target.dataset.stock);
    if (product) { product.stock = product.stock > 0 ? 0 : 10; save("neighbourly-businesses", businesses); renderOwner(); toast(product.stock ? "Product restocked." : "Product marked unavailable."); }
    return;
  }
  if (target.dataset.action === "add-product") { addProductModal(); return; }
  if (target.dataset.action === "edit-profile") { openEditProfile(); return; }
  if (target.dataset.action === "add-promotion") {
    openModal(`<section class="modal modal-simple" role="dialog" aria-modal="true"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>Create a local promotion</h2><p>An administrator reviews it before it can appear in the Guest feed.</p><form id="new-ad-form" class="checkout-form"><label class="form-field">Promotion title<input name="title" required maxlength="70" placeholder="e.g. Free cookie with every coffee" /></label><label class="form-field">Short message<input name="text" required maxlength="150" placeholder="Tell neighbours what’s special" /></label><div class="modal-footer"><button type="button" class="secondary-button" data-close-modal>Cancel</button><button class="primary-button">Submit for review</button></div></form></section>`);
    return;
  }
  if (target.dataset.action === "add-category") {
    openModal(`<section class="modal modal-simple" role="dialog" aria-modal="true"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>Add a category</h2><p>Add a simple category label for local shops.</p><form id="category-form" class="checkout-form"><label class="form-field">Category name<input name="category" required placeholder="e.g. Plants & garden" /></label><div class="modal-footer"><button type="button" class="secondary-button" data-close-modal>Cancel</button><button class="primary-button">Add category</button></div></form></section>`);
    return;
  }
  if (target.dataset.approve) {
    const approved = getSaved("neighbourly-approved", []);
    save("neighbourly-approved", [...approved, target.dataset.approve]);
    const business = shopById(target.dataset.approve);
    if (business) {
      business.verified = true;
      save("neighbourly-businesses", businesses);
    }
    renderAdmin();
    toast("Application approved in this local demo.");
    return;
  }
  if (target.dataset.reject) {
    openModal(`<section class="modal modal-simple" role="dialog" aria-modal="true"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>Decline this application?</h2><p>This removes the application from the demo review list.</p><div class="modal-footer"><button class="secondary-button" data-close-modal>Keep reviewing</button><button class="primary-button" data-confirm-reject="${target.dataset.reject}">Decline application</button></div></section>`);
    return;
  }
  if (target.dataset.confirmReject) {
    const rejected = getSaved("neighbourly-rejected", []);
    save("neighbourly-rejected", [...rejected, target.dataset.confirmReject]);
    modalRoot.innerHTML = "";
    renderAdmin();
    toast("Application declined in this local demo.");
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "owner-branch") { ownerBranch = event.target.value; renderOwner(); }
  if (event.target.id === "shop-branch") {
    shopBranch = event.target.value;
    const activeBranchName = document.getElementById("active-branch-name");
    if (activeBranchName) activeBranchName.textContent = shopBranch;
  }
  if (event.target.name === "branch" && event.target.closest("#checkout-form")) shopBranch = event.target.value;
  if (event.target.dataset.userRole) {
    const user = adminUsers.find((entry) => entry.id === event.target.dataset.userRole);
    if (user) {
      user.role = event.target.value;
      save("neighbourly-demo-users", adminUsers);
      toast(`${user.name} is now listed as ${user.role} in this demo.`);
    }
  }
  if (event.target.id === "explore-sort" && event.target.value === "rating") {
    businesses.sort((first, second) => Number(second.rating) - Number(first.rating));
    renderExplore();
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "edit-profile-form") {
    event.preventDefault();
    const values = new FormData(event.target);
    profile = {
      name: String(values.get("name")).trim(),
      email: String(values.get("email")).trim(),
      phone: String(values.get("phone")).trim(),
      location: String(values.get("location")).trim()
    };
    save("neighbourly-demo-profile", profile);
    modalRoot.innerHTML = "";
    render();
    toast("Your profile has been updated.");
  }
  if (event.target.id === "checkout-form") {
    event.preventDefault();
    if (event.target.reportValidity()) placeOrder(event.target);
  }
  if (event.target.id === "new-product-form") {
    event.preventDefault();
    const form = new FormData(event.target);
    const business = shopById("moonlight");
    business.products.unshift({ id: `product-${Date.now()}`, name: String(form.get("name")).trim(), details: String(form.get("details")).trim() || "Fresh from our local shop", category: String(form.get("category")).trim() || "Shop favourites", price: Number(form.get("price")), stock: Number(form.get("stock")), emoji: String(form.get("emoji") || "✨") });
    save("neighbourly-businesses", businesses);
    modalRoot.innerHTML = "";
    renderOwner();
    toast("Your new product is on the shelf.");
  }
  if (event.target.id === "storefront-form") {
    event.preventDefault();
    const values = new FormData(event.target);
    const business = shopById("moonlight");
    business.name = String(values.get("name")).trim();
    business.handle = String(values.get("handle")).trim();
    if (!business.handle.startsWith("@")) business.handle = `@${business.handle}`;
    business.description = String(values.get("description")).trim();
    business.offer = String(values.get("offer")).trim();
    business.hours = String(values.get("hours")).trim();
    business.theme = String(values.get("theme"));
    save("neighbourly-businesses", businesses);
    renderStorefrontSettings(business);
    toast("Shop appearance and catalogue preferences saved.");
  }
  if (event.target.id === "new-ad-form") {
    event.preventDefault();
    const values = new FormData(event.target);
    ads.unshift({ id: `ad-${Date.now()}`, shopId: "moonlight", title: String(values.get("title")).trim(), text: String(values.get("text")).trim(), status: "Pending" });
    save("neighbourly-ads", ads);
    modalRoot.innerHTML = "";
    renderOwnerAds();
    toast("Promotion sent to the administrator for review.");
  }
  if (event.target.id === "category-form") {
    event.preventDefault();
    const name = new FormData(event.target).get("category");
    const categories = getSaved("neighbourly-categories", []);
    save("neighbourly-categories", [...categories, String(name)]);
    modalRoot.innerHTML = "";
    toast(`${name} added to demo categories.`);
  }
});

document.getElementById("global-search").addEventListener("input", (event) => {
  if (currentPage === "home") renderHome();
  else if (currentPage === "explore") renderExplore();
  else { currentPage = "explore"; render(); }
  const search = document.getElementById("global-search");
  search.focus();
  search.setSelectionRange(search.value.length, search.value.length);
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.getElementById("global-search").focus();
  }
  if (event.key === "Escape") { modalRoot.innerHTML = ""; closeCart(); }
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-shop-card]")) {
    event.preventDefault();
    openShop(event.target.dataset.shopCard);
  }
});
overlay.addEventListener("click", closeCart);

render();
