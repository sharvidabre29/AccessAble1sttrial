Instructions to apply migrations and regenerate Supabase types

1) Apply the new migration to your Supabase project

- From the repository root run (adjust path and environment as needed):

```bash
# Using supabase CLI
supabase db push --file supabase/migrations/20260418090000_add_request_and_donation_fields.sql
# Or run psql against your DB
psql $DATABASE_URL -f supabase/migrations/20260418090000_add_request_and_donation_fields.sql
```

- After applying, refresh the Supabase API and re-deploy any functions or cached schema if you use Supabase Studio.

2) Regenerate TypeScript types

- Run the Supabase types generator and save to `src/integrations/supabase/types.ts` (this repo already contains an updated file, but for exact 1:1 regeneration use):

```bash
# Replace <project-ref> with your Supabase project ref (found in Supabase dashboard)
supabase gen types typescript --project-id <project-ref> > src/integrations/supabase/types.ts
```

3) Optional: run local type checks and build

```bash
pnpm install
pnpm build
pnpm run typecheck # if configured
```

4) Notes and cautions

- The migration enables RLS on `service_requests` and `donations` and adds policies. If you already have custom policies, review the SQL before applying.
- We intentionally make donors insert `donations` only; organizations (request creators) are expected to update `service_requests.funding_raised` and status when they reconcile incoming funds.
- If you want automatic recomputation on insert, consider creating a Postgres trigger or an RPC that validates and performs the update as a privileged function.

If you want, I can also create a small SQL trigger now that recomputes `funding_raised` on `donations` insert and runs with `SECURITY DEFINER` so org-controlled updates remain protected while still keeping accurate totals. Ask and I'll draft it.
