# Dibantu — Multi-Tenant WhatsApp AI Assistant Platform

Dibantu is a SaaS platform that lets businesses deploy their own AI-powered WhatsApp assistant. Each tenant gets a personalized chatbot that knows their products, FAQ, and brand voice.

## Architecture

- **Multi-tenant**: Each business is a "tenant" with its own WhatsApp number, Fonnte token, and business context
- **Serverless**: Runs on Vercel as serverless functions
- **AI-powered**: GPT-4o-mini generates contextual replies with conversation memory
- **Admin dashboard**: Manage tenants via a web interface

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/mfranceschi/dibantu.git
cd dibantu
npm install
```

### 2. Environment Variables

Set these in Vercel (or `.env.local` for local dev):

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key (shared across tenants) |
| `ADMIN_API_KEY` | Secret key to access admin endpoints |

### 3. Deploy

```bash
npx vercel --yes --prod
```

### 4. Add a Tenant

1. Open the admin dashboard: `https://your-app.vercel.app/api/admin/dashboard?key=YOUR_ADMIN_KEY`
2. Fill in the business name, WhatsApp number, and Fonnte token
3. Click "Add Tenant"
4. Configure the business context via the tenant detail API

### 5. Configure Business Context

```bash
curl -X PUT https://your-app.vercel.app/api/admin/tenant/TENANT_ID \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{"businessContext": { ... }}'
```

See `data/tenants/example/business.json` for the full schema.

### 6. Set Fonnte Webhook

In your Fonnte dashboard, set the webhook URL to:
```
https://your-app.vercel.app/api/webhook
```

All tenants share the same webhook URL — the system identifies tenants by the `device` field.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/webhook` | POST | Fonnte webhook (incoming messages) |
| `/api/health` | GET | Health check |
| `/api/admin/dashboard?key=KEY` | GET | Admin dashboard UI |
| `/api/admin/tenants` | GET/POST/PUT/DELETE | Tenant CRUD |
| `/api/admin/tenant/:id` | GET/PUT | Tenant details & business context |

## Business Context Schema

```json
{
  "businessName": "Toko ABC",
  "description": "Description of the business",
  "tone": "ramah dan profesional",
  "language": "Bahasa Indonesia",
  "greeting": "Fallback greeting if AI fails",
  "operatingHours": { "days": "Senin - Sabtu", "hours": "08:00 - 20:00", "timezone": "WIB" },
  "products": [{ "name": "...", "price": 100000, "description": "...", "stock": true }],
  "paymentMethods": ["BCA Transfer", "GoPay"],
  "faq": [{ "question": "...", "answer": "..." }],
  "additionalInstructions": "Custom AI instructions"
}
```

## File Structure

```
├── api/
│   ├── webhook.js          # Fonnte webhook handler
│   ├── health.js            # Health check
│   └── admin/
│       ├── dashboard.js     # Admin dashboard HTML
│       ├── tenants.js       # Tenant CRUD API
│       └── tenant/[id].js   # Tenant detail API
├── lib/
│   ├── ai.js               # AI reply generation
│   ├── db.js               # JSON-file database
│   ├── fonnte.js            # Fonnte API client
│   ├── tenant.js            # Tenant resolver
│   └── context.js           # Legacy context loader
├── data/
│   └── tenants/example/     # Example business config
├── index.html               # Landing page
└── vercel.json              # Vercel routing config
```

## License

MIT
