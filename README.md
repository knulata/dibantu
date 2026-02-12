# Dibantu — Multi-Tenant WhatsApp AI Assistant

Dibantu is a multi-tenant WhatsApp AI assistant platform powered by OpenAI and the official **Meta WhatsApp Cloud API** (via 360dialog as BSP).

Each tenant gets their own WhatsApp Business number with AI-powered auto-replies configured per business context.

## Setup

### 1. Meta Business Account & 360dialog

1. Create a [Meta Business Account](https://business.facebook.com/)
2. Register with [360dialog](https://www.360dialog.com/) as your BSP (Business Solution Provider)
3. Through 360dialog's hub, connect your WhatsApp Business number
4. Obtain your **Phone Number ID** and **Access Token** from the 360dialog dashboard (or Meta's WhatsApp Manager)

### 2. Webhook Configuration

In Meta's App Dashboard (or 360dialog), set your webhook URL to:

```
https://your-domain.vercel.app/api/webhook
```

- **Verify Token**: Set the same value as your `WEBHOOK_VERIFY_TOKEN` environment variable
- **Subscribe to**: `messages` field

Meta will send a GET request to verify the webhook, then POST incoming messages.

### 3. Environment Variables

Set these in Vercel (or `.env` for local dev):

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key (shared across tenants) |
| `ADMIN_API_KEY` | Admin dashboard authentication key |
| `WEBHOOK_VERIFY_TOKEN` | Any random string for Meta webhook verification |

### 4. Deploy

```bash
npx vercel --yes --prod
```

## Architecture

```
api/webhook.js          — Meta webhook (GET verify + POST messages)
api/admin/dashboard.js  — Admin dashboard UI
api/admin/tenants.js    — Tenant CRUD API
api/admin/tenant/[id].js — Tenant detail API
lib/whatsapp.js         — Meta Cloud API client (send, template, markAsRead)
lib/tenant.js           — Tenant resolver (by phoneNumberId)
lib/db.js               — JSON-file database
lib/ai.js               — OpenAI reply generation
lib/context.js          — Business context loader
data/tenants/           — Per-tenant business.json files
```

## Adding a Tenant

Via admin dashboard (`/api/admin/dashboard?key=YOUR_KEY`) or API:

```bash
curl -X POST https://your-domain.vercel.app/api/admin/tenants \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{
    "businessName": "Toko ABC",
    "phoneNumberId": "123456789",
    "whatsappAccessToken": "EAAx...",
    "whatsappNumber": "628123456789",
    "plan": "starter"
  }'
```

## License

MIT
