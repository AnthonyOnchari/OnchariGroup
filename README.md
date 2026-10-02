# Onchari Group

Multi-page website for Onchari Group. The customer workspace uses Supabase for sign-in, booking history, project messages, PDFs and deliverable files.

## Local development

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` to create production output in `dist/`.

## Supabase

Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md) to configure the project URL and public anon key in `.env.local`, run the database migration, enable Google and SMS sign-in, and assign staff access. The site does not expose a service-role key or process payments. Until Supabase is configured, booking requests can only be prepared as email drafts and account history is unavailable.