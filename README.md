# Dibantu — WhatsApp agent for Indonesian regulatory paperwork

Dibantu is a multi-tenant WhatsApp agent that helps Indonesian UMKM prepare
and renew applications for:

- **BPOM** — pangan olahan MD/ML, notifikasi kosmetik, obat tradisional /
  suplemen / obat kuasi (OTSK), and PIRT coaching
- **Kemenkes ("Depkes")** — PKRT (Kelas 1 & 2), alat kesehatan (Kelas A–D),
  IPAK, Sertifikat Produksi (SPPKRT / SPAK / CPAKB), SIP nakes, and izin
  apotek / toko obat / klinik
- **LKPP e-Katalog** — penyedia onboarding (SIKaP → LPSE), profil
  perusahaan, product listing, TKDN self-declare

Everything happens through WhatsApp. Each tenant has their own WA Business
number. Every draft goes through a human QS review checkpoint before it
reaches the user as "final" — regulatory work is not a place to let an LLM
hallucinate.

## Architecture

```
api/
  webhook.js              Meta WhatsApp webhook — HMAC verify, idempotency,
                          media download, dispatch to agent, QS review routing,
                          admin approval commands (/approve, /revise)
  health.js               liveness + config summary
  admin/
    dashboard.js          Multi-tenant control panel (skills, drafts, QS)
    seed.js               One-shot default tenant seeder
    tenants.js            Tenant CRUD
    tenant/[id].js        Tenant detail + business context

lib/
  agent.js                Core agent loop — OpenAI tool calling, skill
                          dispatch, conversation history, QS review hooks
  db.js                   Upstash Redis persistence (tenants, sessions,
                          conversations, drafts, idempotency)
  hmac.js                 Meta webhook signature verification
  media.js                Meta Graph Media API download
  vision.js               Indonesian company-document OCR (NIB, NPWP, akta,
                          sertifikat, label, CoA) via OpenAI Vision
  whatsapp.js             Meta Cloud API send (text / interactive buttons /
                          template) + markAsRead
  tenant.js               Tenant resolver by phoneNumberId
  skills/
    index.js              Skill registry
    ekatalog/
      index.js            Tools: cek_dokumen, simpan_profil, tambah_produk,
                          extract_document, lookup_knowledge_ekatalog
      knowledge.js        LKPP documents, rejections, TKDN, helpdesk, v6
      prompts.js          Profil rewrite + produk extract LLM prompts
    bpom/
      index.js            Tools: classify_jalur, cek_dokumen, siapkan_draft,
                          lookup_knowledge_bpom
      knowledge.js        PIRT / MD / ML / Notifkos / OTSK jalur, documents,
                          rejections, helpdesk, cheat sheet
    kemenkes/
      index.js            Tools: classify_jalur, cek_dokumen, siapkan_draft,
                          lookup_knowledge_kemenkes
      knowledge.js        PKRT / Alkes A–D / IPAK / SIP / apotek, documents,
                          rejections, helpdesk, cheat sheet
```

## Setup

### 1. Upstash Redis

Create an Upstash Redis database and copy the REST credentials. Free tier is
enough for testing. Skip this only for local dev — the in-memory fallback
kicks in automatically but loses data between restarts.

### 2. Meta WhatsApp Cloud API

1. Create a Meta Business App and add the **WhatsApp** product.
2. Get a **Phone Number ID** and a long-lived **Access Token** from the
   WhatsApp Manager. 360dialog as BSP also works.
3. Set the Meta webhook URL to `https://your-domain.vercel.app/api/webhook`
   and subscribe to `messages`.
4. Copy the **App Secret** for HMAC verification.

### 3. OpenAI

Get an API key with access to `gpt-4o-mini` (tool calling + vision).

### 4. Environment Variables

Set in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | yes | OpenAI API key (shared across tenants) |
| `ADMIN_API_KEY` | yes | Admin dashboard auth key |
| `WEBHOOK_VERIFY_TOKEN` | yes | Random string — must match what you set in Meta |
| `META_APP_SECRET` | recommended | Meta App Secret for HMAC verification |
| `UPSTASH_REDIS_REST_URL` | yes in prod | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | yes in prod | Upstash REST token |

### 5. Deploy

```bash
npx vercel --prod
```

### 6. Seed the first tenant

```bash
curl -X POST https://your-domain.vercel.app/api/admin/seed \
  -H "X-Admin-Key: YOUR_ADMIN_KEY"
```

Then open `/api/admin/dashboard?key=YOUR_ADMIN_KEY`, edit the seeded tenant,
and paste the real Meta `phoneNumberId` + `whatsappAccessToken`.

## QS review loop

The agent can prepare drafts (checklist results, profile rewrites, product
listings, BPOM / Kemenkes form summaries) but never treats them as final.
Every draft triggers `request_qs_review`, which:

1. Stashes the draft in Upstash under `dibantu:draft:<tenantId>:<draftId>`
2. Sends a WA notification to `tenant.adminWhatsappNumber` with the draft
   summary and inline approve / revise commands
3. Tells the user the draft is pending review

Admin replies from the admin WA number run through the webhook as admin
commands:

```
/approve <draftId>            → user gets the approved draft + next steps
/revise <draftId> <note>      → user gets the revision note
```

This mirrors the QS workflow pattern from the Bangun RAB project.

## Tools the agent can call

All tools are OpenAI functions exposed by skills in `lib/skills/*/index.js`.
The agent decides which to call based on the conversation; you do not need
to write explicit state machines.

**Cross-cutting**

- `set_active_skill` — pin the conversation to ekatalog / bpom / kemenkes
- `reset_conversation` — clear session + go back to menu
- `request_qs_review` — submit a draft for admin approval

**ekatalog**

- `cek_dokumen_ekatalog` — walk the penyedia document checklist
- `simpan_profil_ekatalog` — capture + AI-rewrite company profile
- `tambah_produk_ekatalog` — parse product description into a listing
- `extract_document` — OCR on NIB / NPWP / akta / label
- `lookup_knowledge_ekatalog` — rejections, TKDN, validity, helpdesk, v6 diff

**bpom**

- `classify_jalur_bpom` — PIRT / MD / ML / Notifkos / OTSK router
- `cek_dokumen_bpom` — per-jalur document checklist
- `siapkan_draft_bpom` — compile final draft (followed by QS review)
- `lookup_knowledge_bpom` — cheat sheet, rejections, helpdesk, dokumen

**kemenkes**

- `classify_jalur_kemenkes` — PKRT / Alkes A-D / IPAK / SIP / apotek router
- `cek_dokumen_kemenkes` — per-jalur document checklist
- `siapkan_draft_kemenkes` — compile final draft (followed by QS review)
- `lookup_knowledge_kemenkes` — cheat sheet, rejections, helpdesk, dokumen

## Running locally

```bash
npm install
vercel dev
```

Without `UPSTASH_REDIS_REST_URL`, a warning prints and an in-memory store is
used. Fine for manual testing, not persistent between restarts.

## Known limitations

- No public BPOM / Kemenkes / LKPP API exists. The agent prepares drafts
  and walks the user through the portal; final submission always happens on
  the user's side.
- Kosmetik notifikasi validity is 3 years (not 5). The agent always checks
  this before telling the user their renewal window.
- Alkes Kelas C/D requires pre-clinical & clinical studies. The agent will
  push back if a user tries to treat a high-risk product as Kelas A.
- PIRT is issued by Dinkes Kabupaten/Kota via OSS, **not** by BPOM. The
  agent routes users away from a BPOM flow when their product qualifies for
  PIRT, and away from PIRT toward MD when their product is high-risk (AMDK,
  daging olahan, susu, makanan bayi, kaleng).

## License

MIT
