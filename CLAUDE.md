# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design System

Always make sure any new components are perfect in alignment with the existing design system and more importantly looks just like Linear.app. Use shadcn/ui + Radix UI primitives with Tailwind CSS. The design should match Linear's clean, minimal aesthetic.

## Commands

```bash
npm run dev          # Start dev server with Turbopack (localhost:3000)
npm run build        # Next.js production build
npm run build:worker # Build for Cloudflare Pages (OpenNextJS)
npm run preview      # Local Cloudflare Pages preview
npm run deploy       # Deploy to Cloudflare Pages
npm run lint         # ESLint
npm run generate-og  # Generate OG images with Puppeteer
```

There are no tests configured in this project.

## Environment

Copy `.env.example` to `.env.local`. Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY` — base64-encoded 256-bit key (`openssl rand -base64 32`)
- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` — for custom domain verification
- `NEXT_PUBLIC_APP_DOMAIN` — e.g. `linear.gratis`
- `DISABLE_SIGNUPS` — set to `"true"` to prevent new user registrations (existing users can still sign in)

## Architecture

**linear-gratis** is a Next.js 15 App Router app that lets users create customer feedback forms that submit directly to Linear. Deployed to Cloudflare Pages via OpenNextJS.

### Key patterns

**Token security:** Linear API tokens are AES-encrypted (CryptoJS) before storing in Supabase. Decryption only happens server-side via `/api/decrypt-token`. Never expose raw tokens to the client.

**Auth:** Supabase Auth (email magic link + GitHub OAuth). Auth state lives in `src/contexts/auth-context.tsx`. Use `src/lib/supabase/server.ts` for server components and `src/lib/supabase/client.ts` for client components.

**Public forms:** `/form/[slug]` and `/view/[slug]` are the public-facing pages. They call `/api/public-view/` routes which decrypt tokens and submit to Linear using `@linear/sdk`.

**Branding:** Users can customize form appearance and add custom domains. Branding state flows through `src/contexts/branding-context.tsx`. Custom domain verification uses Cloudflare API + DNS TXT records (`src/lib/dns.ts`).

**Database:** Supabase PostgreSQL with migrations in `supabase/migrations/`. Run them in order (001–010). Key tables: `customer_request_forms`, `branding_settings`, `custom_domains`, `roadmaps`.

**Deployment:** `wrangler.jsonc` configures Cloudflare Pages. Node.js compatibility is enabled. The `next.config.ts` polyfills Node builtins (`crypto`, `fs`, `stream`) for edge compatibility.

### Path alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).
