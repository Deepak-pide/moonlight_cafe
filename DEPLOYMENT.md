# Supabase and Vercel setup

The application uses authenticated accounts and database-backed marketplace data. There is no demo-mode fallback or seeded sample shop data. The local project settings are stored in the ignored `.env.local` file.

## Supabase database

1. In Supabase **SQL Editor**, run the migrations in order: [`supabase/migrations/20261028000000_marketplace.sql`](./supabase/migrations/20261028000000_marketplace.sql), [`supabase/migrations/20261028010000_business_reviews.sql`](./supabase/migrations/20261028010000_business_reviews.sql), [`supabase/migrations/20261028020000_storefront_customization.sql`](./supabase/migrations/20261028020000_storefront_customization.sql), then [`supabase/migrations/20261028030000_catalog_images_categories.sql`](./supabase/migrations/20261028030000_catalog_images_categories.sql). Run the marketplace migration only once. If its tables are already installed, skip it and run any migrations that have not yet been applied.
2. Create the administrator account using **Create an account** in the app. Confirm the email first if Supabase email confirmation is enabled. In SQL Editor, promote that account's profile:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'your-admin-email@example.com';
   ```

   Sign in through the normal app sign-in form with that same email and password. There is no separate administrator password or pre-created admin account; the admin workspace appears after the profile role is promoted. Keep this SQL operation restricted to trusted administrators.

3. Business owners also create a normal account, sign in, and submit **Apply to join** from their profile. Once an administrator approves the application, that account gets the business workspace to manage products, product categories, orders, promotions, shop details, branches, and storefront colors/styles. Owners can use an image URL or upload a JPG, PNG, GIF, or WebP (up to 5 MB) for their shop and products. Uploaded images use the public `business-images` Supabase Storage bucket created by the final migration. Owners can edit only their own approved business; approval and ratings remain administrator-controlled.

4. Configure Supabase **Authentication → URL Configuration** with the Vercel production URL and the local development URL.
5. The publishable key can be used in browser code. Never use a `service_role` or secret key in frontend code or Vercel client-side environment variables.

## Vercel

1. From this project folder, run `npx vercel` and sign in to your Vercel account when prompted. This creates or links the Vercel project.
2. In Vercel project settings, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production and Preview.
3. Publish with `npx vercel --prod`. Vercel will use `npm run build` and the `dist` output directory.
4. Add the deployed domain to Supabase **Authentication → URL Configuration**, then redeploy if environment variables were changed.

The migrations create the marketplace tables and customer ratings, enable row-level security, restrict administrator actions, and provide a transactional `place_order` function that validates stock and prices on the database. Customers can follow shops and submit one rating per approved shop; shop rating averages and counts are maintained by database triggers. Business owners' custom product categories are public catalogue filters. The final migration removes the known seeded sample shops, products, and promotion from existing databases; a seeded shop with order history is preserved so order records remain intact.
