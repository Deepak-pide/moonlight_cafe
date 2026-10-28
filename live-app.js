import { createClient } from "@supabase/supabase-js";
import { playUiSound } from "./sounds.js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
const main = document.getElementById("main-content");
const modalRoot = document.getElementById("modal-root");
const toastRegion = document.getElementById("toast-region");
const money = (value) => `₹${Number(value).toLocaleString("en-IN")}`;
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const themeValues = {
  coffee: ["#79533b", "#f4ece6", "#38271d"],
  green: ["#347a4b", "#eaf4ec", "#214d30"],
  maroon: ["#783446", "#f5e9ec", "#4d202d"]
};

let session = null;
let profile = null;
let businesses = [];
let businessCategories = [];
let shopCategories = [];
let orders = [];
let ads = [];
let follows = [];
let reviews = [];
let members = [];
let partnerApplications = [];
let currentPartnerApplication = null;
let page = "home";
let category = "";
let selectedShopId = "";
let selectedCatalogCategory = "";
let ownerSection = "overview";
let adminSection = "approvals";
let adminCategoryBusinessId = "";
let partnerSection = "deliveries";
let ownerProductCategory = "";
let cart = loadCart();
let guestBrowsing = false;
let authMode = "sign-in";
let authNotice = "";
let loading = false;
let realtimeChannel = null;
let realtimeRefresh = false;
let storefrontPreviewObjectUrl = "";
let storefrontPreviewFile = null;

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem("neighbourly-live-cart") || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.warn("Could not read the saved cart.", error);
    return [];
  }
}

function saveCart() {
  localStorage.setItem("neighbourly-live-cart", JSON.stringify(cart));
}

function fail(error) {
  console.error(error);
  notify(error?.message || "That action could not be completed. Please try again.");
}

function notify(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 3500);
}

function shopById(id) {
  return businesses.find((business) => business.id === id);
}

function myBusiness() {
  return businesses.find((business) => business.owner_id === session?.user?.id);
}

function businessThemeColors(business) {
  const saved = business.theme_colors || {};
  const defaults = themeValues[business.theme] || themeValues.coffee;
  const validColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
  return {
    accent: validColor(saved.accent, defaults[0]),
    surface: validColor(saved.surface, defaults[1]),
    ink: validColor(saved.ink, defaults[2])
  };
}

async function loadData() {
  const [businessResult, categoryResult, shopCategoryResult, adsResult, reviewResult] = await Promise.all([
    supabase.from("businesses").select("*, products(*)").order("created_at"),
    supabase.from("business_categories").select("*").order("name"),
    supabase.from("shop_categories").select("*").order("name"),
    supabase.from("ads").select("*").order("created_at", { ascending: false }),
    supabase.from("business_reviews").select("id,business_id,customer_id,rating,review,created_at,updated_at").order("created_at", { ascending: false })
  ]);
  if (businessResult.error) throw businessResult.error;
  if (categoryResult.error) throw categoryResult.error;
  if (shopCategoryResult.error) throw shopCategoryResult.error;
  if (adsResult.error) throw adsResult.error;
  if (reviewResult.error) throw reviewResult.error;
  businesses = businessResult.data || [];
  businessCategories = categoryResult.data || [];
  shopCategories = shopCategoryResult.data || [];
  for (const business of businesses) {
    const savedCategories = businessCategories
      .filter((entry) => entry.business_id === business.id)
      .map((entry) => entry.name);
    business.categories = [...new Set([
      ...savedCategories,
      ...(business.products || []).map((product) => product.category)
    ])].sort((first, second) => first.localeCompare(second));
  }
  ads = adsResult.data || [];
  reviews = reviewResult.data || [];
  orders = [];
  follows = [];
  members = [];

  if (!session) {
    profile = null;
    currentPartnerApplication = null;
    return;
  }

  const profileResult = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  if (profileResult.error) throw profileResult.error;
  profile = profileResult.data;

  const requests = [
    supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
    supabase.from("follows").select("business_id"),
    supabase.from("delivery_partner_applications").select("*").eq("user_id", session.user.id).maybeSingle()
  ];
  if (profile.role === "admin") {
    requests.push(supabase.from("profiles").select("id,email,full_name,role").order("created_at"));
    requests.push(supabase.from("delivery_partner_applications").select("*, profiles(id,email,full_name,phone)").order("created_at", { ascending: false }));
  }
  const results = await Promise.all(requests);
  for (const result of results) {
    if (result.error) throw result.error;
  }
  orders = results[0].data || [];
  follows = (results[1].data || []).map((entry) => entry.business_id);
  currentPartnerApplication = results[2].data;
  if (profile.role === "admin") {
    members = results[3].data || [];
    partnerApplications = results[4].data || [];
  }
}

function header(title, subtitle, eyebrow = "YOUR NEIGHBOURHOOD") {
  return `<div class="page-title-row"><div><div class="eyebrow">${escape(eyebrow)}</div><h1>${escape(title)}</h1><p>${escape(subtitle)}</p></div></div>`;
}

function empty(title, detail) {
  return `<div class="empty-state" style="grid-column:1/-1"><span>🌿</span><strong>${escape(title)}</strong>${escape(detail)}</div>`;
}

function categoryClass(name) {
  if (["Grocery", "Groceries"].includes(name)) return "category-grocery";
  if (name === "Stationery") return "category-stationery";
  return "category-cafe";
}

function categoryIcon(name) {
  if (/grocer|food|market/i.test(name)) return "🥬";
  if (/station|book|paper/i.test(name)) return "✏️";
  if (/flower|gift/i.test(name)) return "💐";
  if (/bakery|bake/i.test(name)) return "🥐";
  return "☕";
}

function categoryDescription(name) {
  if (/grocer|food|market/i.test(name)) return "Fresh everyday picks";
  if (/station|book|paper/i.test(name)) return "Paper goods & more";
  if (/flower|gift/i.test(name)) return "Thoughtful local gifts";
  if (/bakery|bake/i.test(name)) return "Fresh from the oven";
  return "Neighbourhood favourites";
}

function skeletonCards(count = 3) {
  return `<div class="business-grid" aria-label="Loading shops">${Array.from({ length: count }, () => `<div class="skeleton-card" aria-hidden="true"><div class="skeleton skeleton-cover"></div><div class="skeleton-copy"><div class="skeleton skeleton-line skeleton-line-wide"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line skeleton-line-short"></div></div></div>`).join("")}</div>`;
}

function renderLoading() {
  main.innerHTML = `<div class="page-container">${header("Finding your neighbourhood…","We’re loading local shops and catalogues.")}<div class="explore-category-grid">${Array.from({ length: 4 }, () => `<div class="skeleton-category" aria-hidden="true"><span class="skeleton"></span><span class="skeleton skeleton-line"></span></div>`).join("")}</div>${skeletonCards(5)}</div>`;
}

function renderAuth() {
  document.body.classList.add("auth-screen");
  const isSignUp = authMode === "sign-up";
  const isReset = authMode === "reset";
  const title = isReset ? "Reset your password" : isSignUp ? "Join your neighbourhood" : "Welcome back";
  const description = isReset
    ? "We’ll email you a secure password reset link."
    : isSignUp ? "Create an account to follow local shops and place orders." : "Sign in to discover and order from shops nearby.";
  main.innerHTML = `<section class="auth-layout">
    <div class="auth-story"><a class="brand auth-brand" href="#" data-auth-action="home"><span class="brand-mark">P<span>.</span></span><span class="brand-name">Pussore</span></a><div class="auth-story-copy"><span class="auth-kicker">GOOD THINGS GROW CLOSE TO HOME</span><h1>Your neighbourhood,<br>closer than ever.</h1><p>Discover local favourites, order from their catalogues, and support the people just around the corner.</p><div class="auth-feature"><span>☕</span><span><strong>Find something lovely</strong><small>Explore cafes, groceries, stationery and more.</small></span></div><div class="auth-feature"><span>♡</span><span><strong>Keep it local</strong><small>Follow your neighbourhood shops and offers.</small></span></div></div><small class="auth-story-foot">A little more local. A little more connected.</small></div>
    <div class="auth-panel"><div class="auth-mobile-brand"><span class="brand-mark">P<span>.</span></span><span class="brand-name">Pussore</span></div><div class="auth-form-wrap"><span class="auth-eyebrow">${isReset ? "ACCOUNT RECOVERY" : isSignUp ? "CREATE YOUR ACCOUNT" : "YOUR NEIGHBOURHOOD IS WAITING"}</span><h2>${title}</h2><p class="auth-description">${description}</p>${authNotice ? `<div class="auth-notice" role="status">${escape(authNotice)}</div>` : ""}<form id="auth-form" class="auth-form" data-auth-mode="${authMode}">${isSignUp ? `<label class="auth-field">Full name<input name="full_name" required autocomplete="name" maxlength="100" placeholder="Your name"></label>` : ""}<label class="auth-field">Email address<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>${!isReset ? `<label class="auth-field">Password<input name="password" type="password" minlength="8" required autocomplete="${isSignUp ? "new-password" : "current-password"}" placeholder="At least 8 characters"></label>` : ""}${!isSignUp && !isReset ? `<button class="auth-text-button auth-forgot" type="button" data-auth-action="reset">Forgot password?</button>` : ""}<button class="auth-submit" type="submit">${isReset ? "Send reset link" : isSignUp ? "Create account" : "Sign in"} <span>→</span></button></form><div class="auth-switch">${isReset ? `<button class="auth-text-button" data-auth-action="sign-in">Back to sign in</button>` : isSignUp ? `Already have an account? <button class="auth-text-button" data-auth-action="sign-in">Sign in</button>` : `New to Pussore? <button class="auth-text-button" data-auth-action="sign-up">Create an account</button>`}</div><div class="auth-divider"><span>OR</span></div><button class="auth-guest" data-auth-action="guest">Explore as a guest</button><small class="auth-terms">By continuing, you agree to keep our neighbourhood welcoming.</small></div></div>
  </section>`;
}

function card(business) {
  const followed = follows.includes(business.id);
  const product = (business.products || []).slice(0, 1);
  return `<article class="business-card" data-shop-card="${business.id}" tabindex="0" role="group" aria-label="Open ${escape(business.name)} catalog">
    <div class="business-cover">${business.image_url ? `<img class="cover-photo" src="${escape(business.image_url)}" alt="">` : `<span class="cover-emoji">${escape(business.category === "Groceries" ? "🥬" : business.category === "Stationery" ? "📚" : "☕")}</span>`}<span class="cover-shade"></span>${business.offer ? `<span class="cover-tag">${escape(business.offer)}</span>` : ""}<button class="follow-button ${followed ? "following" : ""}" data-follow="${business.id}">${followed ? "♥" : "♡"}</button></div>
    <div class="business-info"><div class="business-title-row"><h3>${escape(business.name)}</h3>${business.verified ? '<span class="verified">✓</span>' : ""}</div><p>${escape(business.description)}</p><div class="business-meta"><span>${escape(business.category)}</span><span class="rating">★ ${Number(business.rating) > 0 ? Number(business.rating).toFixed(1) : "New"} <span style="color:#9aa3b2;font-weight:400">(${business.reviews || 0})</span></span></div><div class="business-card-bottom"><span>⌖ ${escape(business.branches?.[0] || "")}</span><button data-shop="${business.id}">View shop →</button></div>${product.length ? `<small>${escape(product[0].name)} · ${money(product[0].price)}</small>` : ""}</div>
  </article>`;
}

function renderHome() {
  const categories = shopCategories.map((entry) => entry.name).slice(0, 6);
  const popular = businesses.filter((business) => business.status === "approved").slice(0, 3);
  main.innerHTML = `<div class="page-container">${header("Good things grow close to home.", "Find lovely local shops, their latest offers and things to order.")}<section class="hero"><div class="hero-copy"><div class="eyebrow">MEET YOUR NEIGHBOURHOOD</div><h2>Support local. Find something wonderful.</h2><p>Browse nearby businesses and order directly from their catalogues.</p><button class="primary-button" data-page="explore">Explore nearby shops →</button></div><div class="hero-art" aria-hidden="true"><div class="hero-sun"></div><div class="hero-window"></div><span class="hero-cup">☕</span><span class="hero-plant">🪴</span></div></section><div class="section-heading"><div><h2>Shop by category</h2><p>Find the kind of local business you need</p></div><button class="text-button" data-page="explore">Browse shops →</button></div><div class="home-category-grid">${categories.map((name) => `<button class="home-category-card ${categoryClass(name)}" data-category="${escape(name)}"><span class="home-category-icon">${categoryIcon(name)}</span><strong>${escape(name)}</strong><small>${categoryDescription(name)}</small></button>`).join("") || empty("Categories coming soon","Local business categories will appear here.")}</div><div class="section-heading"><div><h2>Local shops nearby</h2><p>Neighbourhood businesses</p></div><button class="text-button" data-page="explore">See all shops →</button></div><div class="business-grid">${popular.map(card).join("") || `<div class="empty-state" style="grid-column:1/-1"><span>🏡</span><strong>No local businesses yet</strong><p>Register your business or check back when local shops join.</p>${session && profile?.role === "customer" ? '<button class="primary-button" data-action="apply-business">Register your business</button>' : !session ? '<button class="primary-button" data-action="sign-in">Sign in to register your business</button>' : ""}</div>`}</div><div class="section-heading"><div><h2>A little love from local</h2><p>Offers approved by neighbourhood administrators</p></div></div><div class="feed-layout"><div>${ads.filter((ad) => ad.status === "live").slice(0, 3).map((ad) => `<article class="update-card"><div class="update-avatar">📣</div><div class="update-content"><strong>${escape(shopById(ad.business_id)?.name || "Local shop")}</strong><small>Approved neighbourhood offer</small><p><strong>${escape(ad.title)}</strong><br>${escape(ad.message)}</p>${ad.link_url ? `<a class="ad-link" href="${escape(ad.link_url)}" target="_blank" rel="noopener noreferrer">Visit promotion →</a>` : ""}</div></article>`).join("") || empty("No live offers","Check back for new neighbourhood promotions.")}</div></div></div>`;
}

function visibleBusinesses() {
  return businesses.filter((business) => {
    return (!category || business.category === category)
      && (business.status === "approved" || business.owner_id === session?.user?.id);
  });
}

function renderExplore() {
  const results = visibleBusinesses();
  const noBusinesses = businesses.length === 0;
  const emptyResults = noBusinesses
    ? `<div class="empty-state" style="grid-column:1/-1"><span>🏡</span><strong>No local businesses registered yet</strong><p>We haven’t found any approved shops in this neighbourhood. Check back soon, or register your business to get started.</p>${session && profile?.role === "customer" ? '<button class="primary-button" data-action="apply-business">Register your business</button>' : !session ? '<button class="primary-button" data-action="sign-in">Sign in to register your business</button>' : ""}</div>`
    : empty("No shops in this category yet","Try another category or check back later.");
  main.innerHTML = `<div class="page-container">${header("Explore local shops", "Choose a category to find neighbourhood favourites.")}<div class="explore-category-grid">${shopCategories.map(({ name }) => `<button class="explore-category-card ${categoryClass(name)} ${category === name ? "active" : ""}" data-category="${escape(name)}"><span>${categoryIcon(name)}</span><strong>${escape(name)}</strong></button>`).join("")}</div><div class="section-heading" style="margin-top:26px"><div><h2>${category ? `${escape(category)} shops` : "All shops nearby"}</h2><p>${results.length} businesses</p></div>${category ? '<button class="text-button" data-clear-category>Clear filter →</button>' : ""}</div><div class="business-grid">${results.map(card).join("") || emptyResults}</div></div>`;
}

function renderCategory() {
  const results = visibleBusinesses();
  main.innerHTML = `<div class="page-container category-page">${header(category, `Local ${category.toLocaleLowerCase()} businesses nearby.`)}<button class="text-button category-back" data-page="home">← All categories</button><div class="business-grid">${results.map(card).join("") || empty("No shops in this category yet","Check back soon for local businesses.")}</div></div>`;
}

function renderShop() {
  const business = shopById(selectedShopId);
  if (!business) {
    page = "explore";
    render();
    return;
  }
  const [accent, pale, ink] = themeValues[business.theme] || themeValues.coffee;
  const products = business.products || [];
  const categories = business.categories || [...new Set(products.map((product) => product.category))];
  const productEmpty = products.length === 0
    ? `<div class="empty-state" style="grid-column:1/-1"><span>🛍️</span><strong>This shop hasn’t added products yet</strong><p>Check back soon to see what’s on the shelf.</p></div>`
    : empty("No items in this category","Choose another category.");
  const businessReviews = reviews.filter((review) => review.business_id === business.id);
  const canReview = profile?.role === "customer" && business.owner_id !== session?.user?.id;
  const myReview = businessReviews.find((review) => review.customer_id === session?.user?.id);
  const reviewAction = canReview
    ? `<button class="secondary-button" data-review="${business.id}">${myReview ? "Edit your rating" : "Rate this shop"}</button>`
    : !session
      ? `<button class="secondary-button" data-action="sign-in">Sign in to rate this shop</button>`
      : "";
  const reviewCards = businessReviews.map((review) => `<article class="review-card"><div class="review-card-heading"><strong>${review.customer_id === session?.user?.id ? "Your review" : "Neighbour"}</strong><span>${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span></div>${review.review ? `<p>${escape(review.review)}</p>` : `<p class="review-empty-copy">Rating only</p>`}<small>${new Date(review.created_at).toLocaleDateString()}</small></article>`).join("");
  const catalogCard = (product) => `<article class="catalog-product"><div class="catalog-product-art">${product.image_url ? `<img src="${escape(product.image_url)}" alt="${escape(product.name)}">` : `<span>${escape(product.emoji || "✨")}</span>`}${product.offer ? `<b>${escape(product.offer)}</b>` : ""}</div><div class="catalog-product-copy"><strong>${escape(product.name)}</strong><p>${escape(product.details)}</p><div class="catalog-product-buy"><strong>${money(product.price)}</strong><button class="catalog-add" data-add="${product.id}" ${product.stock <= 0 ? "disabled" : ""}>${product.stock > 0 ? "＋ Add" : "Sold out"}</button></div></div></article>`;
  const selectedProducts = selectedCatalogCategory === "Offers"
    ? products.filter((product) => product.offer || business.offer)
    : products.filter((product) => product.category === selectedCatalogCategory);
  const catalogSections = selectedCatalogCategory
    ? `<button class="text-button catalog-back" data-catalog-category="">← All categories</button><section class="catalog-category-section"><div class="catalog-category-heading"><h2>${escape(selectedCatalogCategory)}</h2><span>${selectedProducts.length} ${selectedProducts.length === 1 ? "item" : "items"}</span></div><div class="catalog-grid catalog-grid-expanded">${selectedProducts.map(catalogCard).join("") || productEmpty}</div></section>`
    : products.length
    ? categories.map((name) => {
      const entries = products.filter((product) => product.category === name);
      return entries.length
        ? `<section class="catalog-category-section"><div class="catalog-category-heading"><h2>${escape(name)}</h2><span>${entries.length} ${entries.length === 1 ? "item" : "items"}</span></div><div class="catalog-grid catalog-grid-carousel">${entries.map(catalogCard).join("")}</div>${entries.length > 3 ? `<button class="text-button catalog-show-more" data-catalog-category="${escape(name)}">Show more →</button>` : ""}</section>`
        : "";
    }).join("")
    : productEmpty;
  main.innerHTML = `<div class="page-container shop-page" style="--shop-accent:${accent};--shop-pale:${pale};--shop-soft:${pale};--shop-ink:${ink}"><button class="shop-back-button" data-page="explore">← <span>Back to explore</span></button><section class="store-hero">${business.image_url ? `<img class="store-cover-photo" src="${escape(business.image_url)}" alt="">` : ""}<span class="store-cover-shade"></span><div class="store-identity"><span class="store-logo">${business.category === "Groceries" ? "🥬" : business.category === "Stationery" ? "📚" : "☕"}</span><div><span class="store-category">${escape(business.category)}</span><h1>${escape(business.name)} ${business.verified ? '<span class="verified">✓</span>' : ""}</h1><p>${escape(business.handle)} <span>·</span> <strong>★ ${Number(business.rating) > 0 ? Number(business.rating).toFixed(1) : "New"}</strong> <span>(${business.reviews || 0} reviews)</span></p></div></div><button class="store-follow ${follows.includes(business.id) ? "following" : ""}" data-follow="${business.id}" aria-pressed="${follows.includes(business.id)}">${follows.includes(business.id) ? "♥ Following" : "♡ Follow shop"}</button></section><div class="store-meta"><span>⌖ ${escape(business.branches?.join(" · ") || "Indiranagar")}</span><span>◷ ${escape(business.hours || "Opening hours not listed")}</span><span>Pickup · Local delivery</span></div>${business.offer ? `<div class="store-offer"><span>✦ OFFER</span><strong>${escape(business.offer)}</strong></div>` : ""}<div class="catalog-sections">${catalogSections}</div><section class="store-details-panel"><div><small>VISIT US</small><strong>${escape(business.branches?.join(" · ") || "Indiranagar")}</strong></div><div><small>OPENING HOURS</small><strong>${escape(business.hours || "Please contact the shop")}</strong></div><div><small>ORDER OPTIONS</small><strong>Pickup and local delivery</strong></div></section><section class="store-reviews"><div class="store-reviews-heading"><div><small>NEIGHBOURHOOD NOTES</small><h2>Ratings & reviews</h2><p>What people think about this shop</p></div>${reviewAction}</div><div class="store-review-list">${reviewCards || `<p class="review-empty">No ratings yet. Be the first to share your experience.</p>`}</div></section><footer class="storefront-footer"><span>${escape(business.name)} · ${escape(business.handle)}</span><button class="shop-back-button" data-page="explore">← Back to local shops</button></footer></div>`;
}

function renderProfile() {
  if (!session) {
    main.innerHTML = `<div class="page-container profile-page">${header("Your neighbourhood account","Keep track of local orders, follow shops and save your favourites.")}<section class="guest-profile-card"><span class="guest-profile-icon">☕</span><div><span class="eyebrow">A LITTLE MORE LOCAL</span><h2>Your orders, all in one place.</h2><p>Sign in to see order updates from local shops, follow your favourite businesses and keep your details ready for checkout.</p><button class="primary-button" data-action="sign-in">Sign in to your account</button></div></section><section class="profile-shortcuts"><button class="profile-shortcut" data-page="explore"><span>⌕</span><strong>Explore local shops</strong><small>Find something lovely nearby</small><b>→</b></button><button class="profile-shortcut" data-auth-action="sign-up"><span>♡</span><strong>Create an account</strong><small>Save shops and track orders</small><b>→</b></button></section><section class="profile-order-preview"><div class="profile-section-heading"><div><h2>Order updates</h2><p>Accepted, preparing, ready and delivery updates appear here.</p></div><span class="profile-order-icon">↗</span></div><div class="guest-order-placeholder"><span>▤</span><strong>Your order timeline is waiting</strong><small>Sign in after placing an order to follow it from confirmation through completion.</small></div></section></div>`;
    return;
  }
  const myOrders = orders.filter((order) => order.customer_id === session?.user?.id);
  const activeOrders = myOrders.filter((order) => !["Completed", "Cancelled"].includes(order.status)).length;
  const completedOrders = myOrders.filter((order) => order.status === "Completed").length;
  main.innerHTML = `<div class="page-container profile-page">${header(`Welcome back, ${profile?.full_name?.split(" ")[0] || "Neighbour"}`, "Your local orders and favourite shops, together.")}<section class="profile-card"><span class="avatar profile-avatar">${escape(profile?.full_name?.[0] || session.user.email[0]).toUpperCase()}</span><div class="profile-card-copy"><h2>${escape(profile?.full_name || "Neighbour")}</h2><p>${escape(profile?.email || session.user.email)}</p><span>⌖ ${escape(profile?.neighbourhood || "Indiranagar, Bengaluru")}</span></div><button class="secondary-button" data-action="edit-profile">Edit profile</button></section><section class="profile-stat-grid"><article><span>↗</span><small>In progress</small><strong>${activeOrders}</strong></article><article><span>✓</span><small>Completed orders</small><strong>${completedOrders}</strong></article><article><span>♡</span><small>Following</small><strong>${follows.length}</strong></article></section><div class="profile-section-heading"><div><h2>My orders</h2><p>Follow every order from confirmation to collection or delivery.</p></div><button class="text-button" data-page="explore">Explore shops →</button></div><section class="orders-list customer-orders">${myOrders.map(orderCard).join("") || empty("Your first local order starts here","Explore neighbourhood shops and your order updates will appear here.")}</section>${profile?.role === "customer" ? `<section class="dashboard-panel profile-business-prompt"><span>🏪</span><div><h2>Run a neighbourhood shop?</h2><p>Apply to list your business. An administrator reviews each application.</p></div><button class="secondary-button" data-action="apply-business">Apply to join</button></section>${currentPartnerApplication ? `<section class="partner-application-status"><span>🚲</span><div><strong>Delivery partner application</strong><small>Application status: ${escape(currentPartnerApplication.status)}</small></div></section>` : `<section class="dashboard-panel profile-business-prompt"><span>🚲</span><div><h2>Deliver for your neighbourhood</h2><p>Apply to become a delivery partner. An administrator will review your application.</p></div><button class="secondary-button" data-action="apply-delivery-partner">Apply to partner</button></section>`}` : ""}</div>`;
}

function orderCard(order, owner = false) {
  const shop = shopById(order.business_id);
  const orderSteps = ["New", "Accepted", "Preparing", "Ready", ...(order.fulfillment === "Delivery" ? ["On the way"] : []), "Completed"];
  const currentStep = orderSteps.indexOf(order.status);
  const nextStatus = order.status === "New" ? "Accepted"
    : order.status === "Accepted" ? "Preparing"
      : order.status === "Preparing" ? "Ready"
        : order.status === "Ready" && order.fulfillment === "Pickup" ? "Completed" : "";
  const progress = order.status === "Cancelled"
    ? `<div class="order-cancelled-note">This order was cancelled.</div>`
    : `<ol class="order-progress" aria-label="Order progress">${orderSteps.map((step, index) => `<li class="${index < currentStep ? "complete" : index === currentStep ? "current" : ""}"><span>${index < currentStep ? "✓" : index + 1}</span><small>${step}</small></li>`).join("")}</ol>`;
  const items = (order.order_items || []).map((item) => `<li><span>${item.quantity} × ${escape(item.product_name)}</span><strong>${money(item.unit_price * item.quantity)}</strong></li>`).join("");
  return `<article class="order-row ${owner ? "owner-order-card" : "customer-order-card"}"><div class="order-card-heading"><div><div class="order-id">ORDER ${escape(order.id.slice(0, 8).toUpperCase())}</div><strong class="order-shop">${escape(owner ? order.customer_name : shop?.name || "Local shop")}</strong></div><span class="status-pill ${escape(order.status.replaceAll(" ", "-"))}">${escape(order.status)}</span></div>${progress}<div class="order-card-meta"><span>⌖ ${escape(order.branch)}</span><span>${escape(order.fulfillment)}</span>${order.fulfillment === "Delivery" && order.delivery_address ? `<span>Delivery to ${escape(order.delivery_address)}</span>` : ""}<span>${new Date(order.created_at).toLocaleString()}</span></div><ul class="order-items">${items}</ul><div class="order-card-footer"><strong class="order-total">${money(order.total)}${order.delivery_fee ? `<small> includes ${money(order.delivery_fee)} delivery</small>` : ""}</strong><div class="order-actions"><button class="small-button" data-invoice="${order.id}">View bill</button>${owner ? `<button class="small-button" data-share-bill="${order.id}">Share bill</button>` : ""}${owner && nextStatus ? `<button class="small-button blue" data-order-status="${order.id}" data-next-status="${nextStatus}">Mark ${nextStatus}</button>` : ""}${owner && order.status === "New" ? `<button class="small-button" data-cancel-order="${order.id}">Decline</button>` : ""}</div></div></article>`;
}

function deliveryOrderCard(order) {
  const business = shopById(order.business_id);
  const claimed = order.delivery_partner_id === session?.user?.id;
  const items = (order.order_items || []).map((item) => `<li>${item.quantity} × ${escape(item.product_name)}</li>`).join("");
  const action = !claimed
    ? `<button class="primary-button" data-claim-delivery="${order.id}">Accept delivery</button>`
    : order.status === "Ready"
      ? `<button class="primary-button" data-delivery-status="${order.id}" data-next-status="On the way">Start delivery</button>`
      : order.status === "On the way"
        ? `<button class="primary-button" data-delivery-status="${order.id}" data-next-status="Completed">Mark delivered</button>`
        : "";
  return `<article class="delivery-job-card ${claimed ? "claimed" : ""}"><div class="delivery-job-heading"><div><span class="delivery-category">${categoryIcon(business?.category || "")} ${escape(business?.category || "Local shop")}</span><h3>${escape(business?.name || "Local shop")}</h3><small>Order ${escape(order.id.slice(0, 8).toUpperCase())}</small></div><span class="status-pill ${escape(order.status.replaceAll(" ", "-"))}">${claimed ? order.status : "Ready for pickup"}</span></div><div class="delivery-job-details"><div><small>CUSTOMER</small><strong>${escape(order.customer_name)}</strong><a href="tel:${escape(order.phone)}">${escape(order.phone)}</a></div><div><small>PICKUP</small><strong>${escape(order.branch)}</strong></div><div><small>DELIVER TO</small><strong>${escape(order.delivery_address || "No delivery address provided")}</strong></div></div><ul class="delivery-job-items">${items}</ul><div class="delivery-job-footer"><span>Delivery fee · ${money(order.delivery_fee)} <small>Order total ${money(order.total)}</small></span>${action}</div></article>`;
}

function renderPartner() {
  if (partnerSection === "profile") {
    main.innerHTML = `<div class="page-container">${header("Delivery partner profile","Keep your contact details current for delivery updates.","DELIVERY PARTNER")}<section class="profile-card"><span class="avatar profile-avatar">${escape(profile?.full_name?.[0] || session.user.email[0]).toUpperCase()}</span><div class="profile-card-copy"><h2>${escape(profile?.full_name || "Delivery partner")}</h2><p>${escape(profile?.email || session.user.email)}</p><span>⌖ ${escape(profile?.neighbourhood || "Neighbourhood not set")}</span></div><button class="secondary-button" data-action="edit-profile">Edit profile</button></section><section class="dashboard-panel partner-contact-card"><h2>Partner contact details</h2><p>Customers and shops use your phone number to coordinate deliveries.</p><strong>${escape(profile?.phone || "Add a phone number to your profile")}</strong></section></div>`;
    return;
  }
  const partnerOrders = orders.filter((order) => order.fulfillment === "Delivery"
    && ((order.status === "Ready" && !order.delivery_partner_id)
      || order.delivery_partner_id === session?.user?.id));
  const grouped = shopCategories.map((entry) => ({
    ...entry,
    orders: partnerOrders.filter((order) => shopById(order.business_id)?.category === entry.name)
  })).filter((entry) => entry.orders.length);
  main.innerHTML = `<div class="page-container">${header("Neighbourhood deliveries","Accept ready orders and keep each customer updated.","DELIVERY PARTNER")}<section class="delivery-summary"><span>🚲</span><div><strong>${partnerOrders.length} delivery ${partnerOrders.length === 1 ? "request" : "requests"}</strong><small>Ready orders appear as soon as the shop prepares them.</small></div><button class="secondary-button" data-live-nav="profile">Your profile</button></section><div class="delivery-category-groups">${grouped.map((group) => `<section class="delivery-category-group"><div class="delivery-category-heading"><h2>${categoryIcon(group.name)} ${escape(group.name)}</h2><span>${group.orders.length} ${group.orders.length === 1 ? "order" : "orders"}</span></div><div class="delivery-job-list">${group.orders.map(deliveryOrderCard).join("")}</div></section>`).join("") || empty("No delivery requests right now","We’ll notify you when a ready delivery is available.")}</div></div>`;
}

function updateStorefrontPreview(form) {
  const preview = main.querySelector("[data-storefront-preview]");
  if (!preview || !form) return;
  const values = new FormData(form);
  const categoryName = String(values.get("category") || "");
  preview.querySelector("[data-preview-category]").textContent = categoryName;
  preview.querySelector("[data-preview-name]").textContent = String(values.get("name") || "Your shop name");
  preview.querySelector("[data-preview-description]").textContent = String(values.get("description") || "Your shop description will appear here.");
  preview.querySelector("[data-preview-branches]").textContent = String(values.get("branches") || "").split(/\r?\n/).map((branch) => branch.trim()).find(Boolean) || "Add a branch";
  preview.style.setProperty("--preview-accent", String(values.get("accent") || themeValues.coffee[0]));
  preview.style.setProperty("--preview-surface", String(values.get("surface") || themeValues.coffee[1]));
  preview.style.setProperty("--preview-ink", String(values.get("ink") || themeValues.coffee[2]));
  preview.dataset.themeStyle = String(values.get("theme_style") || "solid");
  const file = form.elements.namedItem("image_file").files[0];
  if (file !== storefrontPreviewFile) {
    if (storefrontPreviewObjectUrl) URL.revokeObjectURL(storefrontPreviewObjectUrl);
    storefrontPreviewObjectUrl = file ? URL.createObjectURL(file) : "";
    storefrontPreviewFile = file || null;
  }
  const enteredUrl = String(values.get("image_url") || "").trim();
  const imageUrl = storefrontPreviewObjectUrl || (/^https?:\/\//i.test(enteredUrl) ? enteredUrl : "");
  const image = preview.querySelector("[data-preview-image]");
  image.hidden = !imageUrl;
  if (imageUrl) image.src = imageUrl;
  preview.querySelector("[data-preview-icon]").hidden = Boolean(imageUrl);
}

function openInvoice(orderId) {
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) return;
  const shop = shopById(order.business_id);
  const rows = (order.order_items || []).map((item) => `<tr><td>${escape(item.product_name)}</td><td>${item.quantity}</td><td>${money(item.unit_price)}</td><td>${money(item.unit_price * item.quantity)}</td></tr>`).join("");
  const deliveryDetails = order.fulfillment === "Delivery"
    ? `<br><span class="muted">Delivery to: ${escape(order.delivery_address || "Address not provided")}</span>`
    : "";
  const deliveryChargeRow = order.delivery_fee
    ? `<tr><td colspan="3">Delivery fee</td><td>${money(order.delivery_fee)}</td></tr>`
    : "";
  const invoice = `<html><head><title>Pussore bill ${escape(order.id.slice(0, 8))}</title><style>body{font:14px Arial,sans-serif;color:#17233b;max-width:760px;margin:50px auto;padding:0 30px}h1{font-size:26px}header{display:flex;justify-content:space-between;border-bottom:2px solid #4268e9;padding-bottom:18px}.muted{color:#788398;font-size:12px}table{width:100%;border-collapse:collapse;margin:35px 0}th,td{text-align:left;padding:12px;border-bottom:1px solid #e9edf4}th{background:#f6f7fb;color:#657187}td:last-child,th:last-child{text-align:right}.total{text-align:right;font-size:18px;font-weight:bold}.foot{margin-top:50px;color:#788398;font-size:12px}@media print{body{margin:0}}</style></head><body><header><div><h1>${escape(shop?.name || "Pussore shop")}</h1><div class="muted">${escape(order.branch)} · Bengaluru</div></div><div><h2>BILL</h2><div class="muted">${escape(order.id.slice(0, 8).toUpperCase())}<br>${escape(new Date(order.created_at).toLocaleString())}</div></div></header><p><strong>Bill to:</strong> ${escape(order.customer_name)}<br><span class="muted">${escape(order.fulfillment)} order · ${escape(order.status)}</span>${deliveryDetails}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}${deliveryChargeRow}</tbody></table><div class="total">Total ${money(order.total)}</div><p class="foot">Thank you for shopping local. Taxes are not configured in this marketplace.</p><script>window.onload=()=>window.print()<\\/script></body></html>`;
  const printWindow = window.open("", "_blank");
  if (!printWindow) { notify("Allow pop-ups to print or save your bill."); return; }
  printWindow.document.write(invoice);
  printWindow.document.close();
}

function shareInvoice(orderId) {
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) return;
  const shop = shopById(order.business_id);
  const details = (order.order_items || []).map((item) => `${item.quantity} x ${item.product_name}`).join(", ");
  const message = `Hello ${order.customer_name}, your ${shop?.name || "local shop"} bill for ${order.id.slice(0, 8).toUpperCase()} is ${money(order.total)}. Items: ${details}.`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function renderFollowing() {
  const followed = businesses.filter((business) => follows.includes(business.id));
  main.innerHTML = `<div class="page-container">${header("The ones you love","A little update from the neighbourhood shops you follow.")}<div class="business-grid">${followed.map(card).join("") || empty("Your circle is waiting","Explore nearby shops and follow a few favourites.")}</div></div>`;
}

function renderBusiness() {
  const business = myBusiness();
  if (!business) {
    main.innerHTML = `<div class="page-container">${header("Your business application","Submit your shop details for administrator review.","BUSINESS WORKSPACE")}<section class="dashboard-panel"><p>No approved business is linked to this account yet.</p><button class="primary-button" data-action="apply-business">Submit a business application</button></section></div>`;
    return;
  }
  if (ownerSection === "orders") {
    const shopOrders = orders.filter((order) => order.business_id === business.id);
    main.innerHTML = `<div class="page-container">${header("Orders from your neighbours","Confirm requests and keep customers in the loop.","BUSINESS WORKSPACE")}<div class="workspace-tabs">${ownerTabs()}</div><section class="dashboard-panel">${shopOrders.map((order) => orderCard(order, true)).join("") || empty("No orders yet","Customer orders will appear here.")}</section></div>`;
  } else if (ownerSection === "products") {
    main.innerHTML = `<div class="page-container">${header("Your product shelf","Keep products organized into categories customers can browse.","BUSINESS WORKSPACE")}<div class="workspace-tabs">${ownerTabs()}</div>${renderOwnerProducts(business)}</div>`;
  } else if (ownerSection === "storefront") {
    const colors = businessThemeColors(business);
    main.innerHTML = `<div class="page-container">${header("Shop appearance","Preview storefront changes as you make them.","BUSINESS WORKSPACE")}<div class="workspace-tabs">${ownerTabs()}</div><section class="storefront-live-preview" data-storefront-preview><span class="storefront-preview-label">LIVE SHOP PREVIEW</span><div class="storefront-preview-cover"><img data-preview-image alt="" hidden><span data-preview-icon>${categoryIcon(business.category)}</span></div><div class="storefront-preview-copy"><small data-preview-category>${escape(business.category)}</small><h2 data-preview-name>${escape(business.name)}</h2><p data-preview-description>${escape(business.description)}</p><span data-preview-branches>${escape(business.branches?.[0] || "Add a branch")}</span></div></section><section class="dashboard-panel storefront-settings"><form id="storefront-form" class="checkout-form" data-storefront-live><label class="form-field">Business display name<input name="name" required value="${escape(business.name)}"></label><label class="form-field">Shop ID / handle<input name="handle" required value="${escape(business.handle)}"></label><label class="form-field">Category<select name="category">${shopCategories.map(({ name }) => `<option ${business.category === name ? "selected" : ""}>${escape(name)}</option>`).join("")}</select></label><label class="form-field">Short description<input name="description" required value="${escape(business.description)}"></label><label class="form-field">Public storefront image URL<input name="image_url" type="url" value="${escape(business.image_url || "")}" placeholder="https://..."></label><label class="form-field">Or upload a storefront image<input name="image_file" type="file" accept="image/jpeg,image/png,image/gif,image/webp"><small>JPG, PNG, GIF or WebP; maximum 5 MB.</small></label><label class="form-field">Neighbourhood offer<input name="offer" value="${escape(business.offer)}"></label><label class="form-field">Opening hours<input name="hours" value="${escape(business.hours)}"></label><label class="form-field">Branches (one per line)<textarea name="branches" rows="3" required>${escape((business.branches || []).join("\n"))}</textarea></label><label class="form-field">Store theme<select name="theme"><option value="coffee" ${business.theme === "coffee" ? "selected" : ""}>Coffee brown</option><option value="green" ${business.theme === "green" ? "selected" : ""}>Fresh green</option><option value="maroon" ${business.theme === "maroon" ? "selected" : ""}>Stationery maroon</option></select></label><label class="form-field">Storefront finish<select name="theme_style"><option value="solid" ${business.theme_style === "solid" ? "selected" : ""}>Solid</option><option value="gradient" ${business.theme_style === "gradient" ? "selected" : ""}>Gradient</option><option value="glass" ${business.theme_style === "glass" ? "selected" : ""}>Glass</option></select></label><div class="theme-color-fields"><label>Accent<input type="color" name="accent" value="${colors.accent}"></label><label>Surface<input type="color" name="surface" value="${colors.surface}"></label><label>Text<input type="color" name="ink" value="${colors.ink}"></label></div><button class="primary-button">Save storefront preferences</button></form></section></div>`;
    updateStorefrontPreview(main.querySelector("#storefront-form"));
  } else if (ownerSection === "ads") {
    main.innerHTML = `<div class="page-container">${header("Tell the neighbourhood","Promotions need administrator approval before they appear publicly.","BUSINESS WORKSPACE")}<div class="workspace-tabs">${ownerTabs()}</div><button class="primary-button" data-action="add-promotion">＋ Create promotion</button><section class="dashboard-panel">${ads.filter((ad) => ad.business_id === business.id).map((ad) => adCard(ad, false, true)).join("") || empty("No promotions yet","Create one to tell the neighbourhood what’s new.")}</section></div>`;
  } else {
    const shopOrders = orders.filter((order) => order.business_id === business.id);
    main.innerHTML = `<div class="page-container">${header(`${business.name} at a glance`,"Manage incoming orders, your product shelf and local promotions.","BUSINESS WORKSPACE")}<div class="workspace-tabs">${ownerTabs()}</div><div class="owner-stats"><div class="stat-card"><small>Orders</small><strong>${shopOrders.length}</strong></div><div class="stat-card"><small>Needs confirmation</small><strong>${shopOrders.filter((order) => order.status === "New").length}</strong></div><div class="stat-card"><small>Products</small><strong>${business.products?.length || 0}</strong></div><div class="stat-card"><small>Promotions</small><strong>${ads.filter((ad) => ad.business_id === business.id).length}</strong></div></div><section class="dashboard-panel">${shopOrders.filter((order) => order.status === "New").map((order) => orderCard(order, true)).join("") || empty("No new requests","Incoming customer orders will appear here.")}</section></div>`;
  }
}

function renderOwnerProducts(business) {
  const products = business.products || [];
  const categoryNames = [...new Set([...(business.categories || []), ...products.map((product) => product.category)])]
    .sort((a, b) => a.localeCompare(b));
  const categoryCount = (name) => products.filter((product) => product.category === name).length;
  const categoryFilters = [
    `<button class="owner-product-filter ${ownerProductCategory === "" ? "active" : ""}" data-owner-product-category="">All <span>${products.length}</span></button>`,
    ...categoryNames.map((name) => `<button class="owner-product-filter ${ownerProductCategory === name ? "active" : ""}" data-owner-product-category="${escape(name)}">${escape(name)} <span>${categoryCount(name)}</span></button>`)
  ].join("");
  const sections = categoryNames
    .filter((name) => !ownerProductCategory || ownerProductCategory === name)
    .map((name) => {
      const entries = products.filter((product) => product.category === name);
      return `<section class="owner-product-group" data-owner-product-group><div class="owner-product-group-heading"><div><span class="eyebrow">${escape(name)}</span><h2>${entries.length} ${entries.length === 1 ? "product" : "products"}</h2></div><button class="small-button" data-action="add-product" data-product-category="${escape(name)}">＋ Add to ${escape(name)}</button></div><div class="owner-product-grid">${entries.map((product) => `<article class="owner-product-card" data-owner-product-card data-search="${escape(`${product.name} ${product.category} ${product.details || ""}`.toLocaleLowerCase())}"><div class="owner-product-card-art">${product.image_url ? `<img src="${escape(product.image_url)}" alt="">` : `<span>${escape(product.emoji || "✨")}</span>`}${product.offer ? `<b>${escape(product.offer)}</b>` : ""}</div><div class="owner-product-card-copy"><div class="owner-product-card-heading"><h3>${escape(product.name)}</h3><span class="stock-state ${product.stock <= 0 ? "out" : ""}">${product.stock > 0 ? `${product.stock} in stock` : "Unavailable"}</span></div><p>${escape(product.details || "No description added yet.")}</p><div class="owner-product-card-footer"><strong>${money(product.price)}</strong><div class="product-management-actions"><button class="small-button" data-edit-product="${product.id}">Edit</button><button class="small-button" data-stock="${product.id}" data-stock-value="${product.stock}">${product.stock > 0 ? "Set unavailable" : "Restock"}</button><button class="small-button owner-product-remove" data-delete-product="${product.id}">Remove</button></div></div></div></article>`).join("") || `<div class="owner-category-empty">No products in this category yet. Add one to start filling the shelf.</div>`}</div></section>`;
    }).join("");
  return `<section class="owner-product-toolbar"><div class="owner-product-toolbar-copy"><strong>${products.length} ${products.length === 1 ? "product" : "products"}</strong><span>Organized by product category</span></div><button class="primary-button" data-action="add-product">＋ Add product</button><label class="owner-product-search"><span aria-hidden="true">⌕</span><input type="search" data-owner-product-search placeholder="Search your products" aria-label="Search products"></label></section><nav class="owner-product-filters" aria-label="Filter products by category">${categoryFilters}</nav><details class="owner-category-manager" ${categoryNames.length ? "" : "open"}><summary><span>Manage product categories</span><small>${categoryNames.length} ${categoryNames.length === 1 ? "category" : "categories"}</small></summary><div class="owner-category-manager-content"><form id="category-form" class="category-create-form"><label class="form-field">Add a category<input name="name" maxlength="50" required placeholder="e.g. Seasonal specials"></label><button class="secondary-button">Add category</button></form><div class="owner-category-list">${businessCategories.filter((entry) => entry.business_id === business.id).map((entry) => `<span class="owner-category-chip">${escape(entry.name)}<button data-delete-category="${entry.id}" aria-label="Delete ${escape(entry.name)} category">×</button></span>`).join("") || `<small>No custom categories yet. Product categories will still be shown from the items you add.</small>`}</div></div></details><div class="owner-product-groups">${sections || empty("No products yet","Add your first product, then choose a category to organize your catalogue.")}<div class="owner-product-search-empty" hidden>${empty("No matching products","Try another name or category.")}</div></div>`;
}

function ownerTabs() {
  return [["overview","Overview"],["orders","Orders"],["products","Products"],["storefront","Shop appearance"],["ads","Promotions"]]
    .map(([key,label]) => `<button class="workspace-tab ${ownerSection === key ? "active" : ""}" data-owner-section="${key}">${label}</button>`).join("");
}

function adCard(ad, admin = false, owner = false) {
  const link = ad.link_url ? `<a class="ad-link" href="${escape(ad.link_url)}" target="_blank" rel="noopener noreferrer">Visit promotion →</a>` : "";
  return `<div class="ad-listing"><span class="admin-business-icon">📣</span><span class="ad-listing-copy"><strong>${escape(ad.title)}</strong><small>${escape(shopById(ad.business_id)?.name || "Local business")} · ${escape(ad.message)}</small>${link}</span><span class="ad-status ${escape(ad.status)}">${escape(ad.status)}</span>${owner && ad.status === "pending" ? `<button class="small-button" data-edit-ad="${ad.id}">Edit</button>` : ""}${admin && ad.status === "pending" ? `<button class="small-button blue" data-ad-status="${ad.id}" data-next-status="live">Make live</button>` : ""}${admin && ad.status === "live" ? `<button class="small-button" data-ad-status="${ad.id}" data-next-status="paused">Pause</button>` : ""}</div>`;
}

function renderAdmin() {
  const intro = {
    approvals: ["Business applications", "Review shops before they join the neighbourhood."],
    categories: ["Shop categories & fees", "Manage public shop categories, delivery fees and product categories."],
    deliveries: ["Delivery settings", "Set category-based delivery fees."],
    partners: ["Delivery partner applications", "Review requests to join the delivery team."],
    ads: ["Neighbourhood promotions", "Review business campaigns before they go live."],
    roles: ["Team & roles", "Manage account access and member roles."]
  }[adminSection] || ["Administrator workspace", "Manage the local marketplace."];
  let content = "";
  if (adminSection === "ads") {
    content = `<section class="dashboard-panel">${ads.map((ad) => adCard(ad, true)).join("") || empty("No promotions","Submitted promotions appear here for review.")}</section>`;
  } else if (adminSection === "roles") {
    content = `<section class="dashboard-panel">${members.map((member) => `<div class="product-management-row"><div class="product-management-name">${escape(member.full_name || member.email)} <small>${escape(member.email)}</small></div><select data-member-role="${member.id}"><option value="customer" ${member.role === "customer" ? "selected" : ""}>Customer</option><option value="business" ${member.role === "business" ? "selected" : ""}>Business</option><option value="delivery_partner" ${member.role === "delivery_partner" ? "selected" : ""} disabled>Delivery partner (approve application)</option><option value="admin" ${member.role === "admin" ? "selected" : ""}>Administrator</option></select></div>`).join("") || empty("No members found","New accounts will appear here.")}</section>`;
  } else if (adminSection === "categories" || adminSection === "deliveries") {
    const categoryRows = shopCategories.map((entry) => {
      const inUse = businesses.some((business) => business.category === entry.name);
      return `<article class="admin-category-row"><div class="admin-category-title"><span>${categoryIcon(entry.name)}</span><strong>${escape(entry.name)}</strong></div><form class="admin-delivery-fee-form" data-shop-category-id="${entry.id}"><label>Delivery fee (₹)<input name="delivery_fee" type="number" min="0" step="1" required value="${entry.delivery_fee}"></label><button class="small-button blue">Save fee</button></form><button class="small-button" data-delete-shop-category="${entry.id}" ${inUse ? "disabled title=\"Move shops to another category first\"" : ""}>Delete</button></article>`;
    }).join("");
    const shopOptions = businesses.map((business) => `<option value="${business.id}" ${adminCategoryBusinessId === business.id ? "selected" : ""}>${escape(business.name)}</option>`).join("");
    const chosenBusiness = businesses.find((business) => business.id === adminCategoryBusinessId) || businesses[0];
    if (!adminCategoryBusinessId && chosenBusiness) adminCategoryBusinessId = chosenBusiness.id;
    const productCategoryRows = businessCategories
      .filter((entry) => entry.business_id === chosenBusiness?.id)
      .map((entry) => `<article class="admin-category-row"><div class="admin-category-title"><span>▦</span><strong>${escape(entry.name)}</strong></div><span class="admin-category-owner">${escape(chosenBusiness?.name || "")}</span><button class="small-button" data-delete-category="${entry.id}">Delete</button></article>`)
      .join("");
    const shopCategoryPanel = `<section class="dashboard-panel admin-category-panel"><div class="dashboard-heading"><div><h2>Public shop categories</h2><p>Delivery fees are charged on delivery orders in that shop category.</p></div></div><form id="shop-category-form" class="admin-category-create"><label class="form-field">New shop category<input name="name" required maxlength="60" placeholder="e.g. Tailoring"></label><label class="form-field">Delivery fee (₹)<input name="delivery_fee" type="number" min="0" step="1" value="0" required></label><button class="primary-button">Add shop category</button></form><div class="admin-category-list">${categoryRows || empty("No shop categories","Add a shop category to get started.")}</div></section>`;
    const deliveryFeePanel = `<section class="dashboard-panel admin-category-panel"><div class="dashboard-heading"><div><h2>Fees by shop category</h2><p>Delivery fees apply to each delivery order and are added to its total.</p></div></div><div class="admin-category-list">${categoryRows || empty("No shop categories","Add a shop category in Categories first.")}</div></section>`;
    const businessCategoryPanel = `<section class="dashboard-panel admin-category-panel"><div class="dashboard-heading"><div><h2>Business product categories</h2><p>Manage catalogue filters for a specific shop.</p></div><select data-admin-category-business aria-label="Choose a shop">${shopOptions}</select></div><form id="admin-business-category-form" class="admin-category-create" data-business-id="${chosenBusiness?.id || ""}"><label class="form-field">New product category<input name="name" required maxlength="50" placeholder="e.g. Handmade gifts"></label><button class="primary-button" ${chosenBusiness ? "" : "disabled"}>Add category</button></form><div class="admin-category-list">${productCategoryRows || empty("No product categories","Choose a shop and add its first product category.")}</div></section>`;
    content = adminSection === "categories"
      ? `${shopCategoryPanel}${businessCategoryPanel}`
      : deliveryFeePanel;
  } else if (adminSection === "partners") {
    const pending = partnerApplications.filter((application) => application.status === "pending");
    content = `<section class="dashboard-panel"><div class="dashboard-heading"><h2>Partner applications <span class="nav-count">${pending.length}</span></h2></div>${pending.map((application) => `<div class="admin-card"><span class="admin-business-icon">🚲</span><span class="admin-business-copy"><strong>${escape(application.profiles?.full_name || application.profiles?.email || "Applicant")}</strong><small>${escape(application.profiles?.phone || "No phone number")} · ${escape(application.message || "No additional details")}</small></span><div class="admin-actions"><button class="small-button" data-partner-application="${application.id}" data-next-status="rejected">Decline</button><button class="small-button blue" data-partner-application="${application.id}" data-next-status="approved">Approve partner</button></div></div>`).join("") || empty("No applications waiting","Partner applications will appear here.")}</section>`;
  } else {
    const pending = businesses.filter((business) => business.status === "pending");
    content = `<section class="dashboard-panel"><div class="dashboard-heading"><h2>Business applications <span class="nav-count">${pending.length}</span></h2></div>${pending.map((business) => `<div class="admin-card"><span class="admin-business-icon">🏪</span><span class="admin-business-copy"><strong>${escape(business.name)}</strong><small>${escape(business.category)} · ${escape(business.handle)}</small></span><div class="admin-actions"><button class="small-button" data-business-status="${business.id}" data-next-status="rejected">Decline</button><button class="small-button blue" data-business-status="${business.id}" data-next-status="approved">Approve</button></div></div>`).join("") || empty("All caught up","No business applications are waiting for review.")}</section>`;
  }
  main.innerHTML = `<div class="page-container">${header(intro[0], intro[1], "ADMINISTRATOR WORKSPACE")}<div class="workspace-tabs admin-tabs">${adminTabs()}</div>${content}</div>`;
}

function adminTabs() {
  return [["approvals","Shop approvals"],["categories","Categories"],["deliveries","Delivery fees"],["partners","Delivery partners"],["ads","Promotions"],["roles","Team & roles"]]
    .map(([key,label]) => `<button class="workspace-tab ${adminSection === key ? "active" : ""}" data-admin-section="${key}">${label}</button>`).join("");
}

function updateChrome() {
  document.body.classList.toggle("auth-screen", !session && !guestBrowsing);
  const role = profile?.role || "customer";
  const customerLinks = [["home","⌂","Home"],["explore","⌕","Explore"],["following","♡","Following"]];
  const links = role === "admin"
    ? [["approvals","✓","Approvals"],["categories","▦","Categories"],["deliveries","₹","Delivery fees"],["partners","♧","Partners"],["ads","▧","Promotions"],["roles","⚙","Team & roles"]]
    : role === "business"
      ? [["overview","⌂","Overview"],["orders","▤","Orders"],["products","▧","Products"],["storefront","✦","Shop appearance"],["ads","▤","Promotions"]]
      : role === "delivery_partner"
        ? [["deliveries","↗","Deliveries"],["profile","☺","Profile"]]
      : [...customerLinks, ...(session ? [["profile","☺","Profile"]] : [])];
  document.getElementById("sidebar-label").textContent = role === "admin" ? "ADMIN WORKSPACE" : role === "business" ? "BUSINESS WORKSPACE" : "YOUR SPACE";
  const activeSection = role === "admin" ? adminSection : role === "business" ? ownerSection : role === "delivery_partner" ? partnerSection : page === "shop" || page === "category" ? "explore" : page;
  document.getElementById("side-nav").innerHTML = links.map(([key,icon,label]) => `<button class="nav-link ${key === activeSection ? "active" : ""}" data-live-nav="${key}" ${key === activeSection ? 'aria-current="page"' : ""}><span class="nav-icon">${icon}</span>${label}</button>`).join("");
  const mobile = role === "customer"
    ? [...customerLinks, ...(session ? [["profile","☺","Profile"]] : [])]
    : links;
  document.querySelector(".mobile-nav").innerHTML = mobile.map(([key,icon,label]) => `<button class="${key === activeSection ? "active" : ""}" data-live-nav="${key}" ${key === activeSection ? 'aria-current="page"' : ""}><span>${icon}</span>${label}</button>`).join("");
  const actions = document.querySelector(".topbar-actions");
  actions.innerHTML = session
    ? `<button class="soft-button" data-action="cart">Bucket <span>${cart.reduce((sum,item) => sum + item.quantity,0)}</span></button><button class="account-button" data-live-nav="profile"><span class="avatar avatar-small">${escape(profile?.full_name?.[0] || session.user.email[0]).toUpperCase()}</span><span>${escape(profile?.full_name || session.user.email)}</span></button><button class="small-button" data-action="sign-out">Sign out</button>`
    : guestBrowsing
      ? `<button class="soft-button" data-action="cart">Bucket <span>${cart.reduce((sum,item) => sum + item.quantity,0)}</span></button><button class="primary-button" data-action="sign-in">Sign in</button>`
      : "";
  document.querySelector(".sidebar-profile").hidden = !session && role === "customer";
  document.getElementById("sidebar-profile-name").textContent = profile?.full_name || session?.user?.email || "Neighbour";
  document.querySelector(".sidebar-profile small").textContent = role === "admin" ? "Administrator" : role === "business" ? "Business owner" : role === "delivery_partner" ? "Delivery partner" : "Local member";
}

function render() {
  document.body.classList.toggle("store-view", page === "shop" && !["admin", "business"].includes(profile?.role));
  updateChrome();
  if (!session && !guestBrowsing) {
    if (page === "profile") authNotice = "Sign in to view your account, orders and bills.";
    renderAuth();
    return;
  }
  if (loading) {
    renderLoading();
    return;
  }
  if (profile?.role === "admin") renderAdmin();
  else if (profile?.role === "business") renderBusiness();
  else if (profile?.role === "delivery_partner") renderPartner();
  else if (page === "explore") renderExplore();
  else if (page === "category") renderCategory();
  else if (page === "shop") {
    renderShop();
    const business = shopById(selectedShopId);
    const storefront = main.querySelector(".shop-page");
    if (business && storefront) {
      const colors = businessThemeColors(business);
      storefront.dataset.themeStyle = business.theme_style || "solid";
      storefront.style.setProperty("--shop-accent", colors.accent);
      storefront.style.setProperty("--shop-pale", colors.surface);
      storefront.style.setProperty("--shop-soft", colors.surface);
      storefront.style.setProperty("--shop-ink", colors.ink);
      storefront.querySelector(":scope > .shop-back-button")?.remove();
      main.insertAdjacentHTML("afterbegin", `<div class="shop-toolbar"><button class="shop-back-button" data-page="explore">← <span>Back to shops</span></button><button class="soft-button" data-action="cart">Bucket <span>${cart.reduce((sum,item) => sum + item.quantity,0)}</span></button></div>`);
    }
  }
  else if (page === "following") renderFollowing();
  else if (page === "profile") renderProfile();
  else renderHome();
}

function checkoutModal() {
  const business = cart.length ? shopById(cart[0].businessId) : null;
  if (!business) return;
  const deliveryFee = shopCategories.find((entry) => entry.name === business.category)?.delivery_fee || 0;
  const subtotal = cart.reduce((sum,item) => sum + item.price * item.quantity,0);
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="modal modal-simple" role="dialog" aria-modal="true" aria-label="Complete order"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>Complete your order</h2><p>Enter your contact details and choose where to collect your order.</p><form id="checkout-form" class="checkout-form" data-subtotal="${subtotal}" data-delivery-fee="${deliveryFee}"><label class="form-field">Your name<input name="customer" required autocomplete="name" value="${escape(profile?.full_name || "")}"></label><label class="form-field">Phone number<input name="phone" required type="tel" autocomplete="tel" value="${escape(profile?.phone || "")}"></label><label class="form-field">Place / branch<select name="branch" required>${(business.branches || []).map((branch) => `<option>${escape(branch)}</option>`).join("")}</select></label><label class="checkout-option"><input type="radio" name="fulfillment" value="Pickup" checked> I’ll pick it up</label><label class="checkout-option"><input type="radio" name="fulfillment" value="Delivery"> Local delivery · ${money(deliveryFee)} fee</label><label class="form-field checkout-delivery-address" hidden>Delivery address<input name="delivery_address" maxlength="300" autocomplete="street-address" placeholder="Street, area and any delivery details"></label><label class="form-field">Note for the shop<input name="note" maxlength="500"></label><div class="checkout-costs"><div><span>Items</span><strong>${money(subtotal)}</strong></div><div class="checkout-delivery-fee" hidden><span>Delivery fee</span><strong>${money(deliveryFee)}</strong></div><div class="cart-total-line"><span>Estimated total</span><strong data-checkout-total>${money(subtotal)}</strong></div></div><button class="primary-button">Place order request</button></form></section>`;
}

function partnerApplicationModal() {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="modal modal-simple" role="dialog" aria-modal="true"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>Become a delivery partner</h2><p>Share a few details for the neighbourhood team to review your application.</p><form id="partner-application-form" class="checkout-form"><label class="form-field">Phone number<input name="phone" type="tel" required value="${escape(profile?.phone || "")}" placeholder="A number customers can reach"></label><label class="form-field">About your availability<textarea name="message" rows="3" maxlength="300" placeholder="When and where can you deliver?"></textarea></label><button class="primary-button">Submit partner application</button></form></section>`;
}
function applyBusinessModal() {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="modal modal-simple" role="dialog" aria-modal="true"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>Apply to join the neighbourhood</h2><p>An administrator reviews each new business before it appears publicly.</p><form id="business-form" class="checkout-form"><label class="form-field">Business name<input name="name" required></label><label class="form-field">Shop handle<input name="handle" required placeholder="@yourshop"></label><label class="form-field">Category<select name="category" required>${shopCategories.map(({ name }) => `<option>${escape(name)}</option>`).join("")}</select></label><label class="form-field">Description<input name="description" required maxlength="250"></label><label class="form-field">Public storefront image URL (optional)<input name="image_url" type="url" placeholder="https://..."></label><label class="form-field">Branch / address<input name="branch" required></label><label class="form-field">Opening hours<input name="hours"></label><button class="primary-button">Submit for review</button></form></section>`;
}

function productModal(product = null, defaultCategory = "") {
  const categories = myBusiness()?.categories || [];
  const selectedCategory = product?.category || defaultCategory;
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="modal modal-simple" role="dialog" aria-modal="true"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>${product ? "Edit product" : "Add a product"}</h2>${categories.length ? `<p>Add the details once and customers will see it under the selected category.</p>` : `<p>Create a product category first to organize your catalogue.</p>`}<form id="product-form" class="checkout-form" ${product ? `data-product-id="${product.id}"` : ""}><label class="form-field">Product name<input name="name" required value="${escape(product?.name || "")}"></label><label class="form-field">Category<select name="category" required><option value="">Choose a category</option>${categories.map((name) => `<option ${selectedCategory === name ? "selected" : ""}>${escape(name)}</option>`).join("")}</select></label><label class="form-field">Price (₹)<input name="price" type="number" min="1" step="1" required value="${product?.price || ""}"></label><label class="form-field">Description<input name="details" value="${escape(product?.details || "")}"></label><label class="form-field">Stock quantity<input name="stock" type="number" min="0" step="1" value="${product?.stock ?? 10}" required></label><label class="form-field">Product image URL<input name="image_url" type="url" value="${escape(product?.image_url || "")}" placeholder="https://..."></label><label class="form-field">Or upload a product image<input name="image_file" type="file" accept="image/jpeg,image/png,image/gif,image/webp"><small>JPG, PNG, GIF or WebP; maximum 5 MB.</small></label><button class="primary-button" ${categories.length ? "" : "disabled"}>${product ? "Save changes" : "Add product"}</button></form></section>`;
}

function promotionModal(ad = null) {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="modal modal-simple" role="dialog" aria-modal="true"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>${ad ? "Edit your promotion" : "Create a local promotion"}</h2><p>${ad ? "Update the promotion details and link. It will remain pending review." : "An administrator must approve it before it appears in the feed."}</p><form id="promotion-form" class="checkout-form" ${ad ? `data-ad-id="${ad.id}"` : ""}><label class="form-field">Promotion title<input name="title" maxlength="70" required value="${escape(ad?.title || "")}"></label><label class="form-field">Short message<input name="message" maxlength="150" required value="${escape(ad?.message || "")}"></label><label class="form-field">Promotion link (optional)<input name="link_url" type="url" maxlength="500" value="${escape(ad?.link_url || "")}" placeholder="https://your-business.com"><small>Customers can open this link from the promotion.</small></label><button class="primary-button">${ad ? "Save changes" : "Submit for review"}</button></form></section>`;
}

function editProfileModal() {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="modal modal-simple" role="dialog" aria-modal="true"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>Edit your profile</h2><form id="profile-form" class="checkout-form"><label class="form-field">Full name<input name="full_name" required value="${escape(profile.full_name)}"></label><label class="form-field">Phone number<input name="phone" value="${escape(profile.phone)}"></label><label class="form-field">Neighbourhood<input name="neighbourhood" value="${escape(profile.neighbourhood)}"></label><button class="primary-button">Save changes</button></form></section>`;
}

function reviewModal(business) {
  const existing = reviews.find((review) => review.business_id === business.id && review.customer_id === session.user.id);
  const rating = existing?.rating || 5;
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="modal modal-simple" role="dialog" aria-modal="true" aria-label="Rate ${escape(business.name)}"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>${existing ? "Update your rating" : "Rate this shop"}</h2><p>Share a quick note about ${escape(business.name)} with your neighbours.</p><form id="review-form" class="checkout-form" data-business-id="${business.id}"><label class="form-field">Your rating<select name="rating" required>${[5, 4, 3, 2, 1].map((value) => `<option value="${value}" ${rating === value ? "selected" : ""}>${"★".repeat(value)}${"☆".repeat(5 - value)} · ${value} ${value === 1 ? "star" : "stars"}</option>`).join("")}</select></label><label class="form-field">Your note (optional)<textarea name="review" rows="4" maxlength="500" placeholder="What should neighbours know?">${escape(existing?.review || "")}</textarea></label><button class="primary-button">${existing ? "Save changes" : "Post rating"}</button></form></section>`;
}

function cartModal() {
  const business = cart.length ? shopById(cart[0].businessId) : null;
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal></div><section class="modal modal-simple" role="dialog" aria-modal="true"><button class="close-button modal-close" data-close-modal aria-label="Close">×</button><h2>Your bag${cart.length ? ` · ${cart.reduce((sum,item) => sum + item.quantity,0)}` : ""}</h2>${business ? `<p>From ${escape(business.name)}</p>${cart.map((item) => `<div class="cart-item"><span class="product-emoji">${escape(item.emoji)}</span><span class="cart-item-copy"><strong>${escape(item.name)}</strong><small>${money(item.price)} each</small></span><span class="quantity-control"><button data-cart-delta="-1" data-product-id="${item.productId}">−</button><span>${item.quantity}</span><button data-cart-delta="1" data-product-id="${item.productId}">+</button></span></div>`).join("")}<div class="cart-total-line"><span>Estimated total</span><strong>${money(cart.reduce((sum,item) => sum + item.price * item.quantity,0))}</strong></div><button class="primary-button" data-action="checkout">Continue to checkout</button>` : empty("Your bucket is taking a breather","Open a local shop and add something lovely.")}</section>`;
}

function getFormValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function validateImageUrl(value) {
  const imageUrl = String(value || "").trim();
  if (!imageUrl) return "";
  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new Error("Enter a valid image URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Image URLs must start with http:// or https://.");
  }
  return parsed.href;
}

function validatePromotionUrl(value) {
  const linkUrl = String(value || "").trim();
  if (!linkUrl) return "";
  let parsed;
  try {
    parsed = new URL(linkUrl);
  } catch {
    throw new Error("Enter a valid promotion URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Promotion links must start with http:// or https://.");
  }
  return parsed.href;
}

async function uploadImage(file, businessId, folder) {
  if (!(file instanceof File) || file.size === 0) return "";
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp"
  };
  const extension = extensions[file.type];
  if (!extension) throw new Error("Choose a JPG, PNG, GIF or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");

  const path = `${businessId}/${folder}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage
    .from("business-images")
    .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
  if (error) throw error;
  return supabase.storage.from("business-images").getPublicUrl(data.path).data.publicUrl;
}

async function onClick(event) {
  const target = event.target.closest("button, a, [data-shop-card], [data-close-modal]");
  if (!target) return;
  if (target.dataset.closeModal !== undefined) { modalRoot.innerHTML = ""; return; }
  if (target.dataset.authAction === "sign-in") { authMode = "sign-in"; authNotice = ""; renderAuth(); return; }
  if (target.dataset.authAction === "sign-up") { authMode = "sign-up"; authNotice = ""; renderAuth(); return; }
  if (target.dataset.authAction === "reset") { authMode = "reset"; authNotice = ""; renderAuth(); return; }
  if (target.dataset.authAction === "guest") {
    guestBrowsing = true;
    page = "home";
    loading = true;
    render();
    try {
      await loadData();
      loading = false;
      render();
    } catch (error) {
      renderStartupError(error);
    }
    return;
  }
  if (target.dataset.authAction === "home") { event.preventDefault(); page = "home"; render(); return; }
  if (target.dataset.action === "sign-in") { authMode = "sign-in"; authNotice = ""; renderAuth(); return; }
  if (target.dataset.action === "sign-up") { authMode = "sign-up"; authNotice = ""; renderAuth(); return; }
  if (target.dataset.action === "sign-out") {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return;
  }
  if (target.dataset.action === "cart") { cartModal(); return; }
  if (target.dataset.action === "checkout") { checkoutModal(); return; }
  if (target.dataset.action === "apply-business") { applyBusinessModal(); return; }
  if (target.dataset.action === "apply-delivery-partner") { partnerApplicationModal(); return; }
  if (target.dataset.ownerProductCategory !== undefined) {
    ownerProductCategory = target.dataset.ownerProductCategory;
    render();
    return;
  }
  if (target.dataset.action === "add-product") { productModal(null, target.dataset.productCategory || ""); return; }
  if (target.dataset.editProduct) {
    const product = (myBusiness()?.products || []).find((item) => item.id === target.dataset.editProduct);
    if (product) productModal(product);
    return;
  }
  if (target.dataset.deleteProduct) {
    if (!window.confirm("Remove this product from your catalogue?")) return;
    const { error } = await supabase.from("products").delete().eq("id", target.dataset.deleteProduct);
    if (error) throw error;
    await loadData();
    render();
    notify("Product removed from your catalogue.");
    return;
  }
  if (target.dataset.action === "add-promotion") { promotionModal(); return; }
  if (target.dataset.editAd) {
    const ad = ads.find((entry) => entry.id === target.dataset.editAd && entry.business_id === myBusiness()?.id);
    if (ad?.status === "pending") promotionModal(ad);
    return;
  }
  if (target.dataset.action === "edit-profile") { editProfileModal(); return; }
  if (target.dataset.review) {
    if (!session) {
      guestBrowsing = false;
      authMode = "sign-in";
      authNotice = "Sign in with a customer account to rate this shop.";
      render();
      return;
    }
    if (profile?.role !== "customer") {
      notify("Only customer accounts can rate a shop.");
      return;
    }
    const business = shopById(target.dataset.review);
    if (business) reviewModal(business);
    return;
  }
  if (target.dataset.liveNav) {
    if (!session && target.dataset.liveNav === "profile") {
      guestBrowsing = false;
      authMode = "sign-in";
      authNotice = "Sign in to view your account, orders and bills.";
      render();
      return;
    }
    if (profile?.role === "admin") adminSection = target.dataset.liveNav;
    else if (profile?.role === "business") ownerSection = target.dataset.liveNav;
    else if (profile?.role === "delivery_partner") partnerSection = target.dataset.liveNav;
    else page = target.dataset.liveNav;
    render();
    return;
  }
  if (target.dataset.ownerSection) { ownerSection = target.dataset.ownerSection; render(); return; }
  if (target.dataset.adminSection) { adminSection = target.dataset.adminSection; render(); return; }
  if (target.dataset.page) {
    if (profile?.role === "delivery_partner") partnerSection = target.dataset.page === "profile" ? "profile" : "deliveries";
    else if (profile?.role === "admin") adminSection = target.dataset.page;
    else page = target.dataset.page;
    category = "";
    render();
    return;
  }
  if (target.dataset.category) {
    const sound = /grocer|food|market/i.test(target.dataset.category) ? "grocery" : /station|book|paper/i.test(target.dataset.category) ? "stationery" : /cafe|bakery|bake/i.test(target.dataset.category) ? "cafe" : "tap";
    playUiSound(sound);
    category = target.dataset.category;
    page = "category";
    render();
    return;
  }
  if (target.dataset.clearCategory !== undefined) { category = ""; renderExplore(); return; }
  if (target.dataset.catalogCategory !== undefined) { selectedCatalogCategory = target.dataset.catalogCategory; renderShop(); return; }
  if (target.dataset.shopCard || target.dataset.shop) {
    selectedShopId = target.dataset.shopCard || target.dataset.shop;
    selectedCatalogCategory = "";
    page = "shop";
    render();
    return;
  }
  if (target.dataset.follow) {
    if (!session) {
      guestBrowsing = false;
      authMode = "sign-in";
      authNotice = "Sign in to follow neighbourhood shops.";
      render();
      return;
    }
    const exists = follows.includes(target.dataset.follow);
    const result = exists
      ? await supabase.from("follows").delete().eq("business_id", target.dataset.follow).eq("customer_id", session.user.id)
      : await supabase.from("follows").insert({ business_id: target.dataset.follow, customer_id: session.user.id });
    if (result.error) throw result.error;
    await loadData();
    render();
    return;
  }
  if (target.dataset.add) {
    playUiSound("add");
    const business = shopById(selectedShopId);
    const product = business?.products?.find((item) => item.id === target.dataset.add);
    if (!product) return;
    if (cart.length && cart[0].businessId !== business.id) {
      notify("Place or clear your current shop order before adding items from another shop.");
      return;
    }
    const existing = cart.find((item) => item.productId === product.id);
    if ((existing?.quantity || 0) >= product.stock) { notify("There isn’t enough stock for another one."); return; }
    if (existing) existing.quantity += 1;
    else cart.push({ businessId: business.id, productId: product.id, name: product.name, emoji: product.emoji, price: product.price, quantity: 1 });
    saveCart();
    updateChrome();
    notify("Added to your bucket.");
    return;
  }
  if (target.dataset.cartDelta) {
    const item = cart.find((entry) => entry.productId === target.dataset.productId);
    const product = businesses.flatMap((business) => business.products || []).find((entry) => entry.id === target.dataset.productId);
    if (!item || !product) return;
    const next = item.quantity + Number(target.dataset.cartDelta);
    if (next <= 0) cart = cart.filter((entry) => entry.productId !== item.productId);
    else if (next <= product.stock) item.quantity = next;
    else { notify("There isn’t enough stock for another one."); return; }
    saveCart();
    cartModal();
    updateChrome();
    return;
  }
  if (target.dataset.orderStatus || target.dataset.cancelOrder) {
    const orderId = target.dataset.orderStatus || target.dataset.cancelOrder;
    const status = target.dataset.cancelOrder ? "Cancelled" : target.dataset.nextStatus;
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) throw error;
    await loadData();
    render();
    notify(`Order updated to ${status.toLowerCase()}.`);
    return;
  }
  if (target.dataset.invoice) { openInvoice(target.dataset.invoice); return; }
  if (target.dataset.shareBill) { shareInvoice(target.dataset.shareBill); return; }
  if (target.dataset.stock) {
    const { error } = await supabase.from("products").update({ stock: Number(target.dataset.stockValue) > 0 ? 0 : 10 }).eq("id", target.dataset.stock);
    if (error) throw error;
    await loadData();
    render();
    return;
  }
  if (target.dataset.businessStatus) {
    const { error } = await supabase.from("businesses").update({ status: target.dataset.nextStatus }).eq("id", target.dataset.businessStatus);
    if (error) throw error;
    await loadData();
    render();
    notify(`Business application ${target.dataset.nextStatus}.`);
    return;
  }
  if (target.dataset.partnerApplication) {
    const { error } = await supabase.from("delivery_partner_applications")
      .update({ status: target.dataset.nextStatus })
      .eq("id", target.dataset.partnerApplication);
    if (error) throw error;
    await loadData();
    render();
    notify(`Delivery partner application ${target.dataset.nextStatus}.`);
    return;
  }
  if (target.dataset.claimDelivery) {
    const { error } = await supabase.rpc("claim_delivery_order", { p_order_id: target.dataset.claimDelivery });
    if (error) throw error;
    await loadData();
    render();
    notify("Delivery accepted. The order is assigned to you.");
    return;
  }
  if (target.dataset.deliveryStatus) {
    const { error } = await supabase.rpc("set_delivery_order_status", {
      p_order_id: target.dataset.deliveryStatus,
      p_status: target.dataset.nextStatus
    });
    if (error) throw error;
    await loadData();
    render();
    notify(`Delivery marked ${target.dataset.nextStatus.toLowerCase()}.`);
    return;
  }
  if (target.dataset.deleteCategory) {
    const { error } = await supabase.rpc("delete_business_category", { p_category_id: target.dataset.deleteCategory });
    if (error) throw error;
    await loadData();
    render();
    notify("Product category removed.");
    return;
  }
  if (target.dataset.deleteShopCategory) {
    const { error } = await supabase.from("shop_categories").delete().eq("id", target.dataset.deleteShopCategory);
    if (error) throw error;
    await loadData();
    render();
    notify("Shop category removed.");
    return;
  }
  if (target.dataset.adStatus) {
    const { error } = await supabase.from("ads").update({ status: target.dataset.nextStatus }).eq("id", target.dataset.adStatus);
    if (error) throw error;
    await loadData();
    render();
    notify(`Promotion ${target.dataset.nextStatus}.`);
  }
}

async function onSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const values = getFormValues(form);
  if (form.id === "auth-form") {
    event.preventDefault();
    const mode = form.dataset.authMode;
    const result = mode === "sign-up"
      ? await supabase.auth.signUp({ email: values.email.trim(), password: values.password, options: { data: { full_name: values.full_name.trim() } } })
      : mode === "reset"
        ? await supabase.auth.resetPasswordForEmail(values.email.trim(), { redirectTo: window.location.origin })
        : await supabase.auth.signInWithPassword({ email: values.email.trim(), password: values.password });
    if (result.error) throw result.error;
    if (mode === "sign-up" && !result.data.session) {
      authMode = "sign-in";
      authNotice = "Your account is ready. Check your email to confirm it, then sign in.";
      renderAuth();
    } else if (mode === "reset") {
      authMode = "sign-in";
      authNotice = "If an account exists for that email, a password reset link is on its way.";
      renderAuth();
    } else {
      modalRoot.innerHTML = "";
      guestBrowsing = false;
      authNotice = "";
      notify("You’re signed in.");
    }
    return;
  }
  if (form.id === "checkout-form") {
    event.preventDefault();
    const businessId = cart[0]?.businessId;
    if (values.fulfillment === "Delivery" && !String(values.delivery_address || "").trim()) {
      form.elements.namedItem("delivery_address").setCustomValidity("Enter the delivery address.");
      form.elements.namedItem("delivery_address").reportValidity();
      return;
    }
    const { data, error } = await supabase.rpc("place_order", {
      p_business_id: businessId,
      p_customer_name: values.customer,
      p_phone: values.phone,
      p_branch: values.branch,
      p_fulfillment: values.fulfillment,
      p_note: values.note || "",
      p_items: cart.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
      p_delivery_address: values.delivery_address || ""
    });
    if (error) throw error;
    cart = [];
    saveCart();
    modalRoot.innerHTML = "";
    await loadData();
    if (session) page = "profile";
    render();
    notify(`Order ${String(data).slice(0, 8).toUpperCase()} placed. The shop will contact you to confirm it.`);
    return;
  }
  if (form.id === "business-form") {
    event.preventDefault();
    const handle = values.handle.startsWith("@") ? values.handle : `@${values.handle}`;
    const { error } = await supabase.from("businesses").insert({
      owner_id: session.user.id,
      name: values.name.trim(),
      handle: handle.trim(),
      category: values.category,
      description: values.description.trim(),
      image_url: validateImageUrl(values.image_url),
      hours: values.hours.trim(),
      branches: [values.branch.trim()],
      status: "pending"
    });
    if (error) throw error;
    modalRoot.innerHTML = "";
    await loadData();
    render();
    notify("Application submitted for administrator review.");
    return;
  }
  if (form.id === "product-form") {
    event.preventDefault();
    const business = myBusiness();
    const imageFile = form.elements.namedItem("image_file").files[0];
    const imageUrl = imageFile
      ? await uploadImage(imageFile, business.id, "products")
      : validateImageUrl(values.image_url);
    const productValues = {
      name: values.name.trim(),
      category: values.category.trim(),
      price: Number(values.price),
      details: values.details.trim(),
      stock: Number(values.stock),
      emoji: values.emoji || "✨",
      image_url: imageUrl
    };
    const query = form.dataset.productId
      ? supabase.from("products").update(productValues).eq("id", form.dataset.productId)
      : supabase.from("products").insert({ ...productValues, business_id: business.id });
    const { error } = await query;
    if (error) throw error;
    modalRoot.innerHTML = "";
    await loadData();
    render();
    notify("Product added to your catalogue.");
    return;
  }
  if (form.id === "category-form") {
    event.preventDefault();
    const business = myBusiness();
    const name = values.name.trim();
    if (business.categories.some((categoryName) => categoryName.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      throw new Error("That category already exists.");
    }
    const { error } = await supabase.from("business_categories").insert({
      business_id: business.id,
      name
    });
    if (error) throw error;
    await loadData();
    render();
    notify("Category added to your public catalogue.");
    return;
  }
  if (form.id === "admin-business-category-form") {
    event.preventDefault();
    const { error } = await supabase.from("business_categories").insert({
      business_id: form.dataset.businessId,
      name: values.name.trim()
    });
    if (error) throw error;
    await loadData();
    render();
    notify("Shop product category added.");
    return;
  }
  if (form.id === "shop-category-form") {
    event.preventDefault();
    const { error } = await supabase.from("shop_categories").insert({
      name: values.name.trim(),
      delivery_fee: Number(values.delivery_fee)
    });
    if (error) throw error;
    await loadData();
    render();
    notify("Shop category added.");
    return;
  }
  if (form.id === "partner-application-form") {
    event.preventDefault();
    const { error: profileError } = await supabase.from("profiles")
      .update({ phone: values.phone.trim() })
      .eq("id", session.user.id);
    if (profileError) throw profileError;
    const { error } = await supabase.from("delivery_partner_applications").insert({
      user_id: session.user.id,
      message: values.message.trim(),
      status: "pending"
    });
    if (error) throw error;
    modalRoot.innerHTML = "";
    await loadData();
    render();
    notify("Partner application sent for review.");
    return;
  }
  if (form.matches("[data-shop-category-id]")) {
    event.preventDefault();
    const { error } = await supabase.from("shop_categories")
      .update({ delivery_fee: Number(values.delivery_fee) })
      .eq("id", form.dataset.shopCategoryId);
    if (error) throw error;
    await loadData();
    render();
    notify("Delivery fee updated.");
    return;
  }
  if (form.id === "promotion-form") {
    event.preventDefault();
    const promotion = {
      title: values.title.trim(),
      message: values.message.trim(),
      link_url: validatePromotionUrl(values.link_url)
    };
    const query = form.dataset.adId
      ? supabase.from("ads").update(promotion).eq("id", form.dataset.adId).eq("business_id", myBusiness().id)
      : supabase.from("ads").insert({ ...promotion, business_id: myBusiness().id, status: "pending" });
    const { error } = await query;
    if (error) throw error;
    modalRoot.innerHTML = "";
    await loadData();
    render();
    notify(form.dataset.adId ? "Promotion changes saved for review." : "Promotion submitted for administrator review.");
    return;
  }
  if (form.id === "review-form") {
    event.preventDefault();
    const { error } = await supabase.from("business_reviews").upsert({
      business_id: form.dataset.businessId,
      customer_id: session.user.id,
      rating: Number(values.rating),
      review: values.review.trim()
    }, { onConflict: "business_id,customer_id" });
    if (error) throw error;
    modalRoot.innerHTML = "";
    await loadData();
    render();
    notify("Thanks for sharing your rating.");
    return;
  }
  if (form.id === "storefront-form") {
    event.preventDefault();
    const handle = values.handle.startsWith("@") ? values.handle : `@${values.handle}`;
    const business = myBusiness();
    const imageFile = form.elements.namedItem("image_file").files[0];
    const imageUrl = imageFile
      ? await uploadImage(imageFile, business.id, "storefront")
      : validateImageUrl(values.image_url);
    const { error } = await supabase.from("businesses").update({
      name: values.name.trim(),
      handle: handle.trim(),
      description: values.description.trim(),
      image_url: imageUrl,
      offer: values.offer.trim(),
      hours: values.hours.trim(),
      category: values.category,
      branches: values.branches.split(/\r?\n/).map((branch) => branch.trim()).filter(Boolean),
      theme: values.theme,
      theme_style: values.theme_style,
      theme_colors: { accent: values.accent, surface: values.surface, ink: values.ink }
    }).eq("id", myBusiness().id);
    if (error) throw error;
    await loadData();
    render();
    notify("Shop appearance saved.");
    return;
  }
  if (form.id === "profile-form") {
    event.preventDefault();
    const { error } = await supabase.from("profiles").update({
      full_name: values.full_name.trim(),
      phone: values.phone.trim(),
      neighbourhood: values.neighbourhood.trim()
    }).eq("id", session.user.id);
    if (error) throw error;
    modalRoot.innerHTML = "";
    await loadData();
    render();
    notify("Your profile has been updated.");
  }
}

async function onChange(event) {
  const target = event.target;
  if (target.matches('[name="fulfillment"]')) {
    const form = target.form;
    const delivery = target.value === "Delivery";
    const addressField = form.querySelector(".checkout-delivery-address");
    const addressInput = form.elements.namedItem("delivery_address");
    const deliveryFeeRow = form.querySelector(".checkout-delivery-fee");
    const total = form.querySelector("[data-checkout-total]");
    addressField.hidden = !delivery;
    addressInput.required = delivery;
    addressInput.setCustomValidity("");
    deliveryFeeRow.hidden = !delivery;
    total.textContent = money(Number(form.dataset.subtotal) + (delivery ? Number(form.dataset.deliveryFee) : 0));
    return;
  }
  if (target.matches("[data-admin-category-business]")) {
    adminCategoryBusinessId = target.value;
    renderAdmin();
    return;
  }
  if (target.dataset.memberRole) {
    const { error } = await supabase.from("profiles").update({ role: target.value }).eq("id", target.dataset.memberRole);
    if (error) throw error;
    await loadData();
    render();
    notify("Member role updated.");
  }
}

async function start() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  session = data.session;
  supabase.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession;
    if (nextSession) guestBrowsing = false;
    window.setTimeout(() => {
      if (!nextSession) {
        setupRealtime();
        profile = null;
        orders = [];
        follows = [];
        members = [];
        page = "home";
        category = "";
        guestBrowsing = true;
        render();
        return;
      }
      loading = true;
      render();
      loadData().then(() => { loading = false; setupRealtime(); render(); }).catch(renderStartupError);
    }, 0);
  });
  if (session) {
    loading = true;
    renderLoading();
    await loadData();
    loading = false;
  } else {
    guestBrowsing = true;
    loading = true;
    render();
    await loadData();
    loading = false;
  }
  setupRealtime();
  render();
}

function renderStartupError(error) {
  console.error("Could not connect to Supabase.", error);
  loading = false;
  document.body.classList.add("auth-screen");
  const databaseMissing = ["PGRST205", "42P01"].includes(error?.code)
    || /schema cache|relation .* does not exist|could not find the table/i.test(error?.message || "");
  main.innerHTML = `<section class="setup-message"><span class="setup-icon">${databaseMissing ? "🛠️" : "☁️"}</span><p class="eyebrow">${databaseMissing ? "DATABASE SETUP NEEDED" : "CONNECTION ISSUE"}</p><h1>${databaseMissing ? "Your shops are almost ready" : "We couldn’t connect"}</h1><p>${databaseMissing ? "Run each required Supabase migration once, in order. If the marketplace tables already exist, do not rerun the initial marketplace migration; continue with later migrations that have not yet been applied." : escape(error?.message || "Check your internet connection and Supabase project settings, then try again.")}</p>${databaseMissing ? '<code>supabase/migrations/20261028000000_marketplace.sql</code><code>supabase/migrations/20261028010000_business_reviews.sql</code><code>supabase/migrations/20261028020000_storefront_customization.sql</code><code>supabase/migrations/20261028030000_catalog_images_categories.sql</code><code>supabase/migrations/20261028040000_order_statuses.sql</code><code>supabase/migrations/20261028050000_marketplace_realtime_partners.sql</code>' : ""}<button class="primary-button" data-action="retry">Try again</button></section>`;
}

function setupRealtime() {
  if (realtimeChannel) {
    void supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  const channel = supabase.channel(`marketplace-${session?.user?.id || "public"}`);
  const tables = ["orders", "businesses", "products", "business_categories", "shop_categories", "delivery_partner_applications", "business_reviews", "follows", "profiles", "ads"];
  for (const table of tables) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
      if (table === "orders") {
        const order = payload.new;
        if (profile?.role === "delivery_partner" && order?.fulfillment === "Delivery" && order?.status === "Ready" && !order.delivery_partner_id) {
          playUiSound("add");
          notify("A neighbourhood delivery is ready to accept.");
        } else if (profile?.role === "business" && order?.business_id === myBusiness()?.id && order?.status === "New") {
          notify("A new customer order has arrived.");
        } else if (session?.user?.id === order?.customer_id && order?.status) {
          notify(`Your order status is now ${order.status.toLowerCase()}.`);
        }
      } else if (table === "delivery_partner_applications" && profile?.role === "admin" && payload.new?.status === "pending") {
        notify("A new delivery partner application needs review.");
      }
      if (realtimeRefresh) return;
      realtimeRefresh = true;
      window.setTimeout(async () => {
        realtimeRefresh = false;
        try {
          await loadData();
          const editing = document.activeElement?.closest("form");
          if (editing) {
            document.body.dataset.pendingRealtimeRender = "true";
            return;
          }
          render();
        } catch (error) {
          fail(error);
        }
      }, 180);
    });
  }
  realtimeChannel = channel.subscribe((status) => {
    if (channel !== realtimeChannel) return;
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      console.error(`Marketplace realtime channel ${status.toLowerCase()}.`);
    }
  });
}

document.addEventListener("input", (event) => {
  const form = event.target.form;
  if (form?.hasAttribute("data-storefront-live")) updateStorefrontPreview(form);
  if (event.target.matches("[data-owner-product-search]")) {
    const query = event.target.value.trim().toLocaleLowerCase();
    let visibleProducts = 0;
    main.querySelectorAll("[data-owner-product-group]").forEach((group) => {
      let groupVisible = 0;
      group.querySelectorAll("[data-owner-product-card]").forEach((card) => {
        const visible = card.dataset.search.includes(query);
        card.hidden = !visible;
        if (visible) groupVisible++;
      });
      group.hidden = query !== "" && groupVisible === 0;
      visibleProducts += groupVisible;
    });
    const noMatches = main.querySelector(".owner-product-search-empty");
    if (noMatches) noMatches.hidden = query === "" || visibleProducts > 0;
  }
});
document.addEventListener("change", (event) => {
  const form = event.target.form;
  if (form?.hasAttribute("data-storefront-live")) updateStorefrontPreview(form);
});
document.addEventListener("focusout", (event) => {
  if (event.target.closest("form") && document.body.dataset.pendingRealtimeRender === "true") {
    window.setTimeout(() => {
      if (document.activeElement?.closest("form")) return;
      delete document.body.dataset.pendingRealtimeRender;
      render();
    }, 0);
  }
});

document.addEventListener("click", (event) => { onClick(event).catch(fail); });
document.addEventListener("submit", (event) => { onSubmit(event).catch(fail); });
document.addEventListener("change", (event) => { onChange(event).catch(fail); });

document.addEventListener("click", (event) => {
  if (event.target.closest('[data-action="retry"]')) window.location.reload();
});

start().catch(renderStartupError);
