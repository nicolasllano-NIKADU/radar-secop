# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Founder & Bid Team at NIKADU IA & CERABELA**: Needs immediate awareness of state tenders and public/private funding in Colombia without manual daily searches.
- **Mobile First Operator**: Consults tenders from a smartphone on the move; requires quick glanceability, 44px+ touch ergonomics, and push notifications on high-value matches.

## Product Purpose

Radar SECOP is an autonomous opportunity monitoring system and Progressive Web App (PWA) that continually indexes, scores, and delivers high-relevance Colombian procurement tenders (SECOP II via Socrata SODA API) and grant funding (Fondo Emprender SENA, MinCiencias, MinTIC, Artesanías de Colombia) for two business verticals:
1. **NIKADU IA**: AI agents, machine learning, process automation, RPA, deep tech grants.
2. **CERABELA**: Handcrafted artisan candles, aromatics, corporate gifts, souvenirs, decorative crafts, and creative economy grants.

Success means zero missed relevant public tenders or grants, with immediate Telegram push notifications and a friction-free mobile review workflow.

## Positioning

Unlike generic government tender aggregators, Radar SECOP provides real-time dual-profile intelligence calibrated specifically for NIKADU IA and CERABELA with negative-filter disambiguation (eliminating transit agents and artisanal fishing), calculating instant affinity scores and routing opportunities to mobile via Telegram.

## Operating Context

- Mobile browser / installed PWA on iOS Safari and Android Chrome.
- Background hourly autonomous cron scanner querying official open data portals (`datos.gov.co` Socrata SODA API and Cheerio scrapers).
- Telegram Bot API webhook/push delivery for real-time mobile notifications.

## Capabilities and Constraints

- **Autonomous 1-Hour Scan**: Scheduled daemon running `0 * * * *` with manual trigger option.
- **Dual Business Switcher**: Instant switching between NIKADU IA, CERABELA, and Unified view.
- **Filtering & Search**: Real-time debounce search, affinity scoring, and specific category chips.
- **Favorites & Notifications**: Persistent SQLite favorites and one-touch Telegram push dispatch.
- **No Store Dependencies**: Native Progressive Web App with offline caching and home screen installation.

## Brand Commitments

- **Two Distinct Brand Worlds**:
  - *NIKADU IA*: Verdigris Patina (`oklch(72% 0.14 185)`), precise, technical, analytical.
  - *CERABELA*: Kinpaku Gold (`oklch(84% 0.19 80.46)`), warm, artisanal, handcrafted amber aura.
- **Lacquer Surfaces**: Warm deep black lacquer backgrounds (`oklch(7% 0.006 95)`).
- **Impeccable Craft**: No emoji icons (clean uniform 1.75px SVG vectors), tabular numbers on financial currency, 44px touch targets.

## Evidence on Hand

- Live populated SQLite database `radar_secop.db` with over 200 real opportunities from SECOP II (`datos.gov.co` dataset `p6dx-8zbt`) and Fondo Emprender.
- Working Telegram Bot integration (`server/notifier.js`).
- Working SODA query client and Cheerio scraper.

## Product Principles

1. **Instant Clarity**: Budget, entity, deadline, and affinity score visible in the first glance.
2. **Zero Fatigue**: Negative filters block irrelevant noise so every alert is actionable.
3. **Single-Hand Ergonomics**: All interactive elements sized for thumb accessibility on phones.
4. **Resilient Autonomy**: Background scanner logs silently and persists data reliably in native SQLite.
