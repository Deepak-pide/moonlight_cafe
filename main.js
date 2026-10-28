const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey || url.includes("your-project")) {
  document.body.classList.add("auth-screen");
  document.getElementById("main-content").innerHTML = `
    <section class="setup-message">
      <div class="brand-mark">n<span>.</span></div>
      <p class="eyebrow">ONE LAST SETUP STEP</p>
      <h1>Connect your neighbourhood</h1>
      <p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to the local <code>.env.local</code> file and your hosting provider’s environment settings.</p>
    </section>`;
} else {
  import("./live-app.js").catch((error) => {
    console.error("Could not start the Supabase application.", error);
    document.body.classList.add("auth-screen");
    document.getElementById("main-content").innerHTML =
      '<section class="setup-message"><h1>Neighbourly could not start</h1><p>Refresh the page. If the problem persists, check the Supabase settings.</p></section>';
  });
}
