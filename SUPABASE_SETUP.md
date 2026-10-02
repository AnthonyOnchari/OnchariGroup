# Supabase setup

## Connect the site

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project's API settings. The anon/publishable key is intended for browser use with row-level security; never put a service-role key in this site.
3. Run `supabase/migrations/20261002000000_customer_workspace.sql` once in the Supabase SQL editor.
4. In Authentication settings, enable Google OAuth and Phone/SMS, configure the Google OAuth client and an SMS provider, then add `http://localhost:5173/account.html`, `http://127.0.0.1:5173/account.html` and the production account URL to the allowed redirect URLs.
5. Run `npm run dev` for local testing and `npm run build` for production output.

## Staff access and document sequence

New accounts receive the `customer` role. After signing in once, promote the business account that will manage bookings by running this in the SQL editor, replacing the email:

```sql
update public.profiles p
set role = 'staff'
from auth.users u
where p.id = u.id and u.email = 'your-business-email@example.com';
```

Staff use `admin.html` to create estimated-quote PDFs in the private `customer-documents` bucket. A customer accepts an estimate from their account. Staff can then issue a matching invoice. After checking payment with the payment provider or bank, staff records the payment through `record_invoice_payment`; the database creates the receipt only after that check. Customers can see their booking history, messages, issued PDFs and deliverables in their account.

The website does not process payments or verify a payment reference by itself. A live payment gateway/webhook and production OAuth/SMS credentials must be configured separately before automated payment confirmation is possible.