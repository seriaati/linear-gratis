# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design System

Always make sure any new components are perfect in alignment with the existing design system and more importantly looks just like Linear.app. Use shadcn/ui + Radix UI primitives with Tailwind CSS. The design should match Linear's clean, minimal aesthetic.

## Commands

Package manager is Bun (`bun.lock`).

```bash
bun run dev          # Start dev server with Turbopack (localhost:3000)
bun run build        # Next.js production build
bun run build:worker # Build for Cloudflare (OpenNextJS)
bun run preview      # Local Cloudflare preview
bun run lint         # ESLint
bun test             # Unit tests in tests/
bun run test:db      # SQL invariant tests in supabase/tests (needs local Supabase)
bun run generate-og  # Generate OG images with Puppeteer
```

## Environment

Copy `.env.example` to `.env.local`. Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY` — base64-encoded 256-bit key (`openssl rand -base64 32`)
- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` — for custom domain verification
- `NEXT_PUBLIC_APP_DOMAIN` — e.g. `linear.gratis`
- `DISABLE_SIGNUPS` — set to `"true"` to prevent new user registrations (existing users can still sign in)

## Architecture

**linear-gratis** is a Next.js 16 App Router app that lets users create customer feedback forms that submit directly to Linear. Deployed to Cloudflare Pages via OpenNextJS.

### Key patterns

**Token security:** Linear API tokens are encrypted with AES-256-GCM (`src/lib/encryption-v2.ts`, legacy v1 tokens rotate lazily) and only ever decrypted server-side. Never expose raw tokens to the client.

**Auth:** Supabase Auth (email magic link + GitHub OAuth). Auth state lives in `src/contexts/auth-context.tsx`. Use `src/lib/supabase/server.ts` for server components and `src/lib/supabase/client.ts` for client components.

**Public forms:** `/form/[slug]` and `/view/[slug]` are the public-facing pages. They call `/api/public-view/` routes which decrypt tokens and submit to Linear using `@linear/sdk`.

**Branding:** Users can customize form appearance and add custom domains. Branding state flows through `src/contexts/branding-context.tsx`. Custom domain verification uses Cloudflare API + DNS TXT records (`src/lib/dns.ts`).

**Database:** Supabase PostgreSQL with migrations in `supabase/migrations/` (applied in order; manual rollbacks live in `supabase/rollbacks/`). Resources are scoped to organisations (`organisations`, `organisation_members`). Key tables: `public_views`, `customer_request_forms`, `issue_forms`, `branding_settings`, `custom_domains`, `roadmaps`.

**Deployment:** `wrangler.jsonc` configures Cloudflare Pages. Node.js compatibility is enabled. The `next.config.ts` polyfills Node builtins (`crypto`, `fs`, `stream`) for edge compatibility.

### Path alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).
