# Dibantu — WhatsApp AI Assistant for Indonesian Sellers

**Dibantu** (Indonesian for "helped") is an AI-powered WhatsApp assistant that helps online sellers automate customer conversations. It integrates with [Fonnte](https://fonnte.com) for WhatsApp messaging and uses OpenAI for intelligent, context-aware replies in Bahasa Indonesia.

## 🚀 Features

- **Automated WhatsApp replies** — Responds to customer messages 24/7
- **AI-powered conversations** — Uses GPT to understand intent and generate natural replies
- **Customizable business context** — Configure your products, FAQs, tone, and operating hours
- **Bahasa Indonesia first** — All responses are in Indonesian by default
- **Serverless on Vercel** — Zero infrastructure to manage, scales automatically
- **Fonnte integration** — Reliable WhatsApp API with easy setup

## 📁 Project Structure

```
dibantu/
├── api/
│   ├── webhook.js       # Fonnte webhook handler
│   └── health.js        # Health check endpoint
├── lib/
│   ├── ai.js            # AI response generation (OpenAI)
│   ├── fonnte.js        # Fonnte API wrapper
│   └── context.js       # Business context loader
├── data/
│   └── business-example.json  # Example business configuration
├── index.html           # Landing page
├── vercel.json          # Vercel routing config
└── package.json
```

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/knulata/dibantu.git
cd dibantu
npm install
```

### 2. Configure Your Business

```bash
cp data/business-example.json data/business.json
```

Edit `data/business.json` with your business details — name, products, FAQs, etc.

### 3. Set Environment Variables

Create a `.env` file or set these in your Vercel dashboard:

| Variable | Description |
|---|---|
| `FONNTE_TOKEN` | Your Fonnte API token |
| `OPENAI_API_KEY` | OpenAI API key |
| `WEBHOOK_SECRET` | (Optional) Secret to validate webhook requests |

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

### 5. Set Webhook in Fonnte

In your [Fonnte dashboard](https://md.fonnte.com), set the webhook URL to:

```
https://your-domain.vercel.app/api/webhook
```

## 🔧 How It Works

1. Customer sends a WhatsApp message
2. Fonnte forwards it to your `/api/webhook` endpoint
3. The AI processes the message with your business context
4. A response is generated and sent back via Fonnte
5. Customer receives the reply on WhatsApp

## 📝 Customizing the AI

Edit `data/business.json` to control:

- **Business name & description** — So the AI knows who it represents
- **Products/services** — With names, prices, and descriptions
- **FAQs** — Common questions and their answers
- **Tone** — Formal, casual, friendly, etc.
- **Operating hours** — AI can inform customers when you're available
- **Greeting & closing messages** — Consistent brand voice

## 📄 License

MIT
