# Supabase and Vercel setup

The browser-only demo remains available when Supabase environment variables are absent. With both Supabase variables configured, the application uses authenticated accounts and database-backed marketplace data; the demo role switch is removed in that mode. The local project settings are stored in the ignored `.env.local` file.

## Supabase database

1. In Supabase, open **SQL Editor** and run the SQL files in filename order: [`supabase/migrations/20261028000000_marketplace.sql`](./supabase/migrations/20261028000000_marketplace.sql), then [`supabase/migrations/20261028010000_business_reviews.sql`](./supabase/migrations/20261028010000_business_reviews.sql). If the marketplace tables are already installed, run only the new business-reviews migration. The application cannot load live data until both features are installed.
2. Register the first user through the application, then promote that user's profile to administrator in SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'your-admin-email@example.com';
   ```

3. Configure Supabase **Authentication → URL Configuration** with the Vercel production URL and the local development URL.
4. The publishable key can be used in browser code. Never use a `service_role` or secret key in frontend code or Vercel client-side environment variables.

## Vercel

1. From this project folder, run `npx vercel` and sign in to your Vercel account when prompted. This creates or links the Vercel project.
2. In Vercel project settings, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production and Preview.
3. Publish with `npx vercel --prod`. Vercel will use `npm run build` and the `dist` output directory.
4. Add the deployed domain to Supabase **Authentication → URL Configuration**, then redeploy if environment variables were changed.

The migrations create the marketplace tables and customer ratings, enable row-level security, restrict administrator actions, and provide a transactional `place_order` function that validates stock and prices on the database. Customers can follow shops and submit one rating per approved shop; shop rating averages and counts are maintained by database triggers.
