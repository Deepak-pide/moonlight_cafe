# Supabase and Vercel setup

The application uses authenticated accounts and database-backed marketplace data. There is no demo-mode fallback or seeded sample shop data. The local project settings are stored in the ignored `.env.local` file.

## Supabase database

1. In Supabase **SQL Editor**, run these migrations in order: [`supabase/migrations/20261028000000_marketplace.sql`](./supabase/migrations/20261028000000_marketplace.sql), [`supabase/migrations/20261028010000_business_reviews.sql`](./supabase/migrations/20261028010000_business_reviews.sql), [`supabase/migrations/20261028020000_storefront_customization.sql`](./supabase/migrations/20261028020000_storefront_customization.sql), [`supabase/migrations/20261028030000_catalog_images_categories.sql`](./supabase/migrations/20261028030000_catalog_images_categories.sql), [`supabase/migrations/20261028040000_order_statuses.sql`](./supabase/migrations/20261028040000_order_statuses.sql), [`supabase/migrations/20261028050000_marketplace_realtime_partners.sql`](./supabase/migrations/20261028050000_marketplace_realtime_partners.sql), [`supabase/migrations/20261028060000_ad_promotion_links.sql`](./supabase/migrations/20261028060000_ad_promotion_links.sql), and [`supabase/migrations/20261028070000_guest_checkout.sql`](./supabase/migrations/20261028070000_guest_checkout.sql). Run each migration only once. If the marketplace tables already exist, do not rerun the initial marketplace migration; apply only later migrations that have not yet been run.
2. Create the administrator account using **Create an account** in the app. Confirm the email first if Supabase email confirmation is enabled. In SQL Editor, promote that account's profile:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'your-admin-email@example.com';
   ```

   Sign in through the normal app sign-in form with that same email and password. There is no separate administrator password or pre-created admin account; the admin workspace appears after the profile role is promoted. Keep this SQL operation restricted to trusted administrators.

3. Business owners create a normal account, sign in, and submit **Apply to join** from their profile. Once approved, they can manage their products, product categories, orders, promotions, shop details, branches, and storefront colors/styles. Owners can use an image URL or upload a JPG, PNG, GIF, or WebP (up to 5 MB) for their shop and products. Uploaded images use the public `business-images` Supabase Storage bucket created by the catalogue migration. Owners can edit only their own approved business; approval and ratings remain administrator-controlled.
4. Administrators manage public shop categories and set the delivery fee for each category. Customers see the category fee at checkout; only delivery orders are charged the fee. Approved shop owners can manage their own product categories, and administrators can manage product categories for any shop.
5. Business owners can edit pending promotions and include an optional web URL. Administrators approve promotions before they appear publicly; customers can open the promotion URL from the feed.
6. Customers can apply to become delivery partners from their profile. An administrator must approve each application before partner tools are enabled. Approved partners see ready delivery orders grouped by shop category, can accept a request (the first acceptance assigns it), and update the status to **On the way** and **Completed**. Customers, shops, and partners receive live order updates without reloading; this uses Supabase Realtime.
7. Orders can progress through New, Accepted, Preparing, Ready, and (for delivery) On the way before completion.
8. Configure Supabase **Authentication → URL Configuration** with the Vercel production URL and the local development URL.
9. The publishable key can be used in browser code. Never use a `service_role` or secret key in frontend code or Vercel client-side environment variables.

## Vercel

1. From this project folder, run `npx vercel` and sign in to your Vercel account when prompted. This creates or links the Vercel project.
2. In Vercel project settings, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production and Preview.
3. Publish with `npx vercel --prod`. Vercel will use `npm run build` and the `dist` output directory.
4. Add the deployed domain to Supabase **Authentication → URL Configuration**, then redeploy if environment variables were changed.

The migrations create the marketplace tables and customer ratings, enable row-level security, restrict administrator actions, and provide a transactional `place_order` function that validates stock and prices in the database. Guests can place orders without an account by entering their name, phone number, and shop location at checkout. Customers can follow shops and submit one rating per approved shop; shop rating averages and counts are maintained by database triggers. Business owners' custom product categories are public catalogue filters. The catalogue migration removes the known seeded sample shops, products, and promotion from existing databases; a seeded shop with order history is preserved so order records remain intact. Later migrations add category-based delivery fees, delivery partner applications and assignment, realtime publication for marketplace updates, promotion URLs, and guest checkout.
