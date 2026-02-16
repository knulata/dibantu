# Dibantu — Business Model Plan

## Executive Summary

Dibantu is a multi-tenant WhatsApp AI assistant SaaS targeting Indonesian UMKM (micro, small & medium enterprises). The platform automates customer service, content generation, competitor monitoring, and admin tasks via WhatsApp — the dominant messaging channel in Indonesia.

This document outlines the optimal business model based on unit economics analysis, competitive landscape research, and the Indonesian UMKM market context.

---

## 1. Market Context

### Target Market
- **64+ million** UMKM in Indonesia, contributing >60% of GDP
- **27 million** SMEs being brought online via the government's UMKM Go Digital program
- Indonesian SaaS market growing at **15–17% CAGR** for the SME segment through 2031
- WhatsApp is the dominant business communication channel in Indonesia

### Key Market Characteristics
- **Price-sensitive** — UMKM operators are cost-conscious; predictable pricing is preferred
- **WhatsApp-first** — 83% of Indonesian consumers expect immediate WhatsApp replies from businesses
- **Low digital literacy** — self-serve setup must be simple; many prefer assisted onboarding
- **High mobile penetration** — 275M+ internet users, overwhelmingly mobile-first

### Competitive Landscape
| Competitor | Type | Pricing (Monthly) | Notes |
|---|---|---|---|
| Kata.ai | Enterprise chatbot | Custom (enterprise) | Serves banks, telcos; overkill for UMKM |
| Botika | WhatsApp + GPT | Custom | GPay/Grab integration; mid-market focus |
| EVA.id | Multi-channel chatbot | From Rp 500k+ | Dashboard + ticketing; not AI-first |
| SleekFlow | BSP + inbox | From Rp 2.39M | Expensive for small UMKM |
| Maxchat | BSP platform | From Rp 850k | Basic; no AI auto-reply |
| WATI | WhatsApp support | ~$49–99/mo | Global; limited Bahasa optimization |

**Dibantu's positioning:** The affordable, AI-native WhatsApp assistant built specifically for Indonesian UMKM. Competitors either target enterprise (Kata.ai, Botika) or are generic global tools (WATI, SleekFlow) — Dibantu fills the gap for small businesses that want AI-powered CS without enterprise complexity or pricing.

---

## 2. Unit Economics

### Variable Cost Per Message (Customer-Initiated CS Reply)

| Cost Component | Per Message | Notes |
|---|---|---|
| WhatsApp API (service reply) | **Rp 0** | Free — replies within 24hr customer service window are free since Nov 2024 |
| OpenAI GPT-4o-mini (input ~4,200 tokens) | Rp ~10 | System prompt + context + history + message |
| OpenAI GPT-4o-mini (output ~300 tokens) | Rp ~3 | AI-generated reply |
| **Total per CS reply** | **~Rp 13** | Approximately $0.0008 USD |

### Variable Cost Per Outbound Marketing Message

| Cost Component | Per Message | Notes |
|---|---|---|
| WhatsApp API (marketing template) | **Rp 597** | Meta's rate for Indonesian numbers |
| OpenAI (if AI-generated) | Rp ~13 | Only if content is AI-generated |
| **Total per marketing message** | **~Rp 610** | Approximately $0.038 USD |

### Gross Margin Analysis Per Tier

| Tier | Monthly Revenue | Est. CS Messages | AI Cost | Gross Margin |
|---|---|---|---|---|
| Starter (Rp 500k) | Rp 500,000 | 500 msgs | Rp 6,500 | **98.7%** |
| Growth (Rp 1.5jt) | Rp 1,500,000 | 3,000 msgs | Rp 39,000 | **97.4%** |
| Pro (Rp 3jt) | Rp 3,000,000 | 10,000 msgs | Rp 130,000 | **95.7%** |

> Gross margins are exceptionally high because GPT-4o-mini is very cheap and WhatsApp service replies are free. The main costs are fixed: infrastructure, support, and customer acquisition.

### Fixed Costs (Monthly Estimate)

| Item | Estimated Cost | Notes |
|---|---|---|
| Vercel hosting | Rp 320,000 (~$20) | Pro plan; scales with usage |
| Domain + DNS | Rp 25,000 | Amortized annually |
| OpenAI base subscription | Rp 0 | Pay-as-you-go only |
| WhatsApp BSP / Meta Cloud | Rp 0 | Using Meta Cloud API directly (free) |
| **Total fixed infra** | **~Rp 345,000/mo** | |

At just **1 Starter customer**, Dibantu covers fixed infrastructure costs. The real costs will be human time for setup, support, and marketing.

---

## 3. Recommended Business Model

### Model: Freemium SaaS + Tiered Subscriptions + Usage-Based Add-ons

This hybrid model optimizes for three goals:
1. **Low-friction acquisition** — freemium tier gets UMKM in the door
2. **Predictable revenue** — monthly subscriptions are the core
3. **Revenue expansion** — usage-based add-ons capture high-value activities

### Pricing Tiers

#### Tier 0: Gratis (Free)
- **Price:** Rp 0/month
- **Purpose:** Market penetration, build trust in price-sensitive market
- **Includes:**
  - 100 AI CS replies/month
  - 1 WhatsApp number
  - Basic business context setup
  - Dibantu branding on replies ("Powered by Dibantu")
- **Why:** Indonesian UMKM need to experience the value before paying. This also creates a viral loop — their customers see the Dibantu branding.

#### Tier 1: Starter
- **Price:** Rp 299,000/month (annual) or Rp 399,000/month (monthly)
- **Purpose:** Solo sellers and micro-businesses
- **Includes:**
  - 1,000 AI CS replies/month
  - 1 WhatsApp number
  - Custom business context / FAQ training
  - Basic analytics dashboard
  - No branding on replies
  - Email support
- **Overage:** Rp 350/message beyond limit

#### Tier 2: Growth
- **Price:** Rp 899,000/month (annual) or Rp 1,199,000/month (monthly)
- **Purpose:** Growing businesses with higher volume
- **Includes:**
  - 5,000 AI CS replies/month
  - 1 WhatsApp number
  - AI content generation (product descriptions, captions)
  - Competitor price monitoring (up to 5 competitors)
  - Smart admin features
  - Analytics + weekly reports
  - WhatsApp + chat support
- **Overage:** Rp 250/message beyond limit

#### Tier 3: Pro
- **Price:** Rp 1,999,000/month (annual) or Rp 2,499,000/month (monthly)
- **Purpose:** Established businesses with serious volume
- **Includes:**
  - 20,000 AI CS replies/month
  - Up to 3 WhatsApp numbers
  - All Growth features
  - Market research & data insights
  - Internal knowledge base
  - Dedicated onboarding & setup
  - Priority WhatsApp support
  - Multi-language replies
- **Overage:** Rp 150/message beyond limit

#### Tier 4: Enterprise (Custom)
- **Price:** Custom pricing starting at Rp 5,000,000/month
- **Purpose:** Large UMKM, franchises, multi-outlet businesses
- **Includes:**
  - Unlimited AI CS replies
  - Unlimited WhatsApp numbers
  - Custom AI model fine-tuning
  - API access for integrations
  - Dedicated account manager
  - SLA guarantee
  - Custom reporting

### Usage-Based Add-ons (Revenue Expansion)

| Add-on | Price | Notes |
|---|---|---|
| WhatsApp marketing broadcasts | Rp 800/message | Covers Meta's Rp 597 fee + Rp 203 margin |
| Additional WhatsApp numbers | Rp 200,000/number/month | For multi-outlet businesses |
| Competitor monitoring slots | Rp 100,000/competitor/month | Beyond plan limits |
| AI content generation credits | Rp 150,000/100 generations | Product descriptions, captions |
| Knowledge base pages | Rp 50,000/10 pages/month | Beyond plan limits |

### Annual Billing Incentive
- **25% discount** for annual prepayment
- Reduces churn and improves cash flow predictability
- Standard practice in Indonesian SaaS (Mekari, Majoo use similar discounts)

---

## 4. Revenue Projections

### Conservative Scenario (Year 1)

Assumptions: Organic growth via WhatsApp word-of-mouth, minimal paid marketing.

| Month | Free | Starter | Growth | Pro | MRR |
|---|---|---|---|---|---|
| 1-3 | 50 | 5 | 2 | 0 | Rp 3,793,000 |
| 4-6 | 150 | 20 | 5 | 1 | Rp 15,967,000 |
| 7-9 | 400 | 50 | 15 | 3 | Rp 43,895,000 |
| 10-12 | 800 | 100 | 30 | 8 | Rp 91,750,000 |

**Year 1 total revenue: ~Rp 560 million (~$35,000 USD)**

### Moderate Scenario (Year 1)

Assumptions: Active content marketing, WhatsApp community building, referral program.

| Month | Free | Starter | Growth | Pro | MRR |
|---|---|---|---|---|---|
| 1-3 | 100 | 15 | 5 | 1 | Rp 12,483,000 |
| 4-6 | 400 | 60 | 20 | 5 | Rp 57,930,000 |
| 7-9 | 1,000 | 150 | 50 | 15 | Rp 149,775,000 |
| 10-12 | 2,000 | 300 | 100 | 30 | Rp 299,550,000 |

**Year 1 total revenue: ~Rp 1.56 billion (~$97,500 USD)**

### Key Metrics Targets (Year 1)
| Metric | Target |
|---|---|
| Free → Paid conversion rate | 10–15% |
| Monthly churn rate (paid) | < 5% |
| Average Revenue Per User (paid) | Rp 750,000 |
| Customer Acquisition Cost | < Rp 500,000 |
| Lifetime Value (12-month) | Rp 6,750,000 |
| LTV:CAC Ratio | > 13:1 |

---

## 5. Go-to-Market Strategy

### Phase 1: Validation (Month 1–3)
- **Manual onboarding** for first 20 paying customers
- **Direct WhatsApp outreach** to Shopee/Tokopedia sellers
- **Free tier launch** to build user base and collect testimonials
- **Content:** Short-form TikTok/Reels showing before/after of manual CS vs. Dibantu
- **Goal:** 5 paying customers, validate product-market fit

### Phase 2: Growth Engine (Month 4–6)
- **Referral program:** Give 1 month free for every referral that converts
- **WhatsApp community group** for users to share tips (creates network effect)
- **Marketplace seller communities:** Join Shopee/Tokopedia seller groups, provide value
- **Testimonial-driven marketing:** Case studies from Phase 1 customers
- **Goal:** 25 paying customers, <5% monthly churn

### Phase 3: Scale (Month 7–12)
- **Self-serve onboarding flow** — reduce human setup dependency
- **Paid ads:** Instagram/TikTok ads targeting "jualan online" and "UMKM" keywords
- **Partnership:** Approach Tokopedia/Shopee for seller tool partnerships
- **BSP partnership:** Potentially become or partner with a WhatsApp BSP for margin
- **Goal:** 100+ paying customers, positive unit economics

### Distribution Channels (Priority Order)
1. **WhatsApp word-of-mouth** — customers' customers see the AI replies, ask "how did you do this?"
2. **TikTok/Instagram Reels** — show compelling demos of AI auto-reply in action
3. **Marketplace seller communities** — Facebook groups, Telegram groups for Shopee/Tokopedia sellers
4. **Google Search** — "chatbot WhatsApp untuk UMKM", "auto reply WhatsApp bisnis"
5. **Partnerships** — marketplace platforms, payment providers, logistic partners

---

## 6. Monetization Roadmap

### Now (Core)
- Monthly SaaS subscriptions
- Freemium → paid conversion

### Short-term (3–6 months)
- WhatsApp broadcast marketing (usage-based add-on)
- Annual billing with discount
- Referral credit system

### Medium-term (6–12 months)
- Competitor monitoring premium features
- AI content generation credits
- Multi-channel expansion (Instagram DM)
- Marketplace integration add-ons (Shopee/Tokopedia API)

### Long-term (12+ months)
- WhatsApp Commerce (in-chat ordering + payments)
- Transaction fee revenue (% of orders processed through Dibantu)
- Data insights marketplace (anonymized market trend reports)
- White-label / reseller program for agencies
- API access for developers

---

## 7. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Meta changes WhatsApp API pricing | Cost increase erodes margins | Current margins are 95%+; can absorb 10x cost increase. Diversify to other channels. |
| OpenAI raises GPT-4o-mini pricing | Higher per-message costs | At Rp 13/msg, even 5x increase = Rp 65/msg, still <1% of subscription revenue. Can switch to open-source models (Llama, Mistral). |
| Enterprise competitor enters UMKM market | Market share loss | First-mover advantage + deep Bahasa/local optimization + community moat. Enterprise players won't optimize for Rp 300k/mo customers. |
| Low digital literacy blocks adoption | Slow growth | Invest in WhatsApp-based onboarding (onboard via WhatsApp itself), video tutorials in Bahasa, dedicated CS. |
| Churn due to UMKM business failure | High churn rate | Target "growth-stage" UMKM (>6 months operating, >Rp 10M monthly revenue). Offer annual plans for commitment. |
| WhatsApp policy changes | Platform risk | Build multi-channel (Instagram, Telegram, website chat). WhatsApp remains core but not sole channel. |

---

## 8. Recommended Pricing Changes vs. Current

### Current Landing Page Pricing
| Tier | Current Price | Issue |
|---|---|---|
| Starter | Rp 500k/mo | No message limits — potential abuse; no upsell trigger |
| Growth | Rp 1.5jt/mo | Priced higher than necessary for market |
| Pro | Rp 3jt/mo | Priced higher than necessary for market |

### Recommended Changes
1. **Add a Free tier** — Critical for Indonesian market penetration
2. **Lower price points** — Rp 299k–1.99M range is more competitive and still has 95%+ margins
3. **Add message volume caps** — Creates natural upsell triggers and protects against abuse
4. **Add annual billing option** — 25% discount drives commitment and cash flow
5. **Add usage-based add-ons** — Captures revenue from high-value activities (broadcasts, extra numbers)
6. **Remove feature claims not yet built** — Landing page advertises Instagram DM, competitor monitoring, content generation that aren't implemented yet. Sell what exists, roadmap the rest.

---

## 9. Success Metrics Dashboard

Track these weekly:

| Metric | How to Measure |
|---|---|
| New signups (free) | Registration count |
| Free → Paid conversion | % of free users upgrading within 30 days |
| MRR (Monthly Recurring Revenue) | Sum of all active subscriptions |
| Net Revenue Retention | MRR from existing customers vs. last month (incl. upgrades, downgrades, churn) |
| Messages processed | Total AI replies sent across all tenants |
| Cost per message | (Total OpenAI spend + WhatsApp API spend) / total messages |
| Customer Acquisition Cost | Total marketing spend / new paid customers |
| Churn rate | % of paying customers lost per month |
| NPS / CSAT | Customer satisfaction survey |

---

## 10. Immediate Next Steps

1. **Implement the Free tier** — add a "Gratis" plan with 100 msg/month limit + branding
2. **Add message counting & limits** — track messages per tenant, enforce plan limits
3. **Update landing page pricing** — reflect new tier structure with annual/monthly toggle
4. **Build self-serve onboarding** — WhatsApp-based flow to set up business context
5. **Create referral system** — unique referral links with credit tracking
6. **Set up analytics** — track signups, conversions, messages, churn
7. **Prepare 5 case study templates** — to document first customer success stories

---

*Last updated: 2026-02-16*
