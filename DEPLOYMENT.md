# Supabase and Vercel setup

The browser-only demo remains available when Supabase environment variables are absent. With both Supabase variables configured, the application uses authenticated accounts and database-backed marketplace data; the demo role switch is removed in that mode. The local project settings are stored in the ignored `.env.local` file.

## Supabase database

1. In Supabase **SQL Editor**, run [`supabase/migrations/20261028000000_marketplace.sql`](./supabase/migrations/20261028000000_marketplace.sql) first, then [`supabase/migrations/20261028010000_business_reviews.sql`](./supabase/migrations/20261028010000_business_reviews.sql), and then [`supabase/migrations/20261028020000_storefront_customization.sql`](./supabase/migrations/20261028020000_storefront_customization.sql). Run the marketplace migration only once. If its tables are already installed, skip it and run the reviews and storefront-customization migrations. The reviews and storefront migrations are safe to rerun.
2. Create the administrator account using **Create an account** in the app. Confirm the email first if Supabase email confirmation is enabled. In SQL Editor, promote that account's profile:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'your-admin-email@example.com';
   ```

   Sign in through the normal app sign-in form with that same email and password. There is no separate administrator password or pre-created admin account; the admin workspace appears after the profile role is promoted. Keep this SQL operation restricted to trusted administrators.

3. Business owners also create a normal account, sign in, and submit **Apply to join** from their profile. Once an administrator approves the application, that account gets the business workspace to manage products, orders, promotions, shop details, branches, and storefront colors/styles. Owners can edit only their own approved business; approval and ratings remain administrator-controlled.

4. Configure Supabase **Authentication → URL Configuration** with the Vercel production URL and the local development URL.
5. The publishable key can be used in browser code. Never use a `service_role` or secret key in frontend code or Vercel client-side environment variables.

## Vercel

1. From this project folder, run `npx vercel` and sign in to your Vercel account when prompted. This creates or links the Vercel project.
2. In Vercel project settings, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production and Preview.
3. Publish with `npx vercel --prod`. Vercel will use `npm run build` and the `dist` output directory.
4. Add the deployed domain to Supabase **Authentication → URL Configuration**, then redeploy if environment variables were changed.

The migrations create the marketplace tables and customer ratings, enable row-level security, restrict administrator actions, and provide a transactional `place_order` function that validates stock and prices on the database. Customers can follow shops and submit one rating per approved shop; shop rating averages and counts are maintained by database triggers.
