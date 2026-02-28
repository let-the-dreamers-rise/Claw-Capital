# 👑 Claw Capital — Autonomous Capital Allocation Engine

> *No manual scoring. No hidden intervention. Full capital autonomy.*

**Claw Capital** is a sovereign autonomous capital allocation engine that discovers, evaluates, and invests in AI agent ventures — all without human intervention.

Built for the **SURGE x OpenClaw Hackathon**.

![Moltbook Live](https://img.shields.io/badge/Moltbook-LIVE-orange?style=for-the-badge)
![Gemini 3.1 Pro](https://img.shields.io/badge/Gemini-3.1%20Pro%20Preview-blue?style=for-the-badge)
![SURGE](https://img.shields.io/badge/SURGE-Solana-green?style=for-the-badge)

---

## 🧠 What It Does

| Step | Action | Powered By |
|------|--------|------------|
| 1️⃣ | **Discover** high-potential AI agent ventures | Autonomous scanning |
| 2️⃣ | **Evaluate** with 7-criteria institutional scoring | Gemini 3.1 Pro Preview |
| 3️⃣ | **Deploy** on-chain capital into approved projects | SURGE on Solana |
| 4️⃣ | **Disclose** every action publicly | Moltbook (lablab submolt) |
| 5️⃣ | **Compound** treasury through strategic allocation | Autonomous cycles |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              CLAW CAPITAL ENGINE            │
├──────────┬──────────┬──────────┬────────────┤
│ Gemini   │ SURGE    │ Moltbook │ Treasury   │
│ 3.1 Pro  │ Solana   │ lablab   │ Manager    │
│ Evaluator│ Wallet   │ Posts    │ Portfolio  │
├──────────┴──────────┴──────────┴────────────┤
│           Premium Dark Dashboard            │
│        (Aave/CoinMarketCap inspired)        │
└─────────────────────────────────────────────┘
```

---

## 🔌 Real Integrations

### Gemini 3.1 Pro Preview (AI Evaluation)
- 7-criteria scoring: Autonomy, Revenue, Token Utility, Moat, Ecosystem, Feasibility, Risk
- Score ≥ 7.5 → **INVEST** | Score ≥ 6.0 → **CONDITIONAL** | Score < 6.0 → **REJECT**

### SURGE (On-Chain Capital)
- Wallet creation, funding, and balance checks
- Token launches, buys, sells, and transfers on Solana
- Transaction status tracking and trade history

### Moltbook (Public Disclosure)
- Auto-posts every investment decision to `lablab` submolt
- Verification challenge solver (obfuscated math problems)
- Live profile: [moltbook.com/u/clawcapitalengine](https://www.moltbook.com/u/clawcapitalengine)

### OpenClaw (Agent Framework)
- `openclaw/SKILL.md` — Full SURGE skill definition
- `openclaw/agent.json` — Agent configuration
- Compatible with OpenClaw gateway and TUI

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/let-the-dreamers-rise/Claw-Capital.git
cd Claw-Capital

# Install
npm install

# Configure
cp .env.example .env
# Add your API keys to .env

# Run
node server.js
# → Dashboard at http://localhost:3000
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `SURGE_API_KEY` | Optional | SURGE API key for on-chain ops |
| `MOLTBOOK_API_KEY` | Optional | Auto-registers if not set |
| `PORT` | Optional | Server port (default: 3000) |

---

## 📁 Project Structure

```
claw-capital/
├── server.js              # Express server + Moltbook init
├── public/
│   ├── index.html         # Premium dark dashboard
│   ├── styles.css         # Glassmorphism + crypto-native UI
│   └── app.js             # Frontend logic
├── src/
│   ├── engine/
│   │   ├── evaluator.js   # Gemini 3.1 Pro scoring engine
│   │   ├── surge.js       # SURGE API client
│   │   ├── moltbook.js    # Moltbook posting + verification
│   │   ├── treasury.js    # Treasury management
│   │   └── memory.js      # JSON persistence
│   └── routes/
│       └── api.js         # REST API endpoints
├── data/                  # Persistent JSON state
├── openclaw/
│   ├── agent.json         # OpenClaw agent config
│   └── SKILL.md           # SURGE skill definition
└── .env.example           # Environment template
```

---

## 🎯 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/treasury` | Treasury state |
| `GET` | `/api/portfolio` | Investment portfolio |
| `GET` | `/api/transactions` | Transaction log |
| `GET` | `/api/moltbook` | Moltbook posts |
| `GET` | `/api/status` | Integration health |
| `POST` | `/api/evaluate` | Evaluate a project |
| `POST` | `/api/cycle` | Run autonomous cycle |
| `POST` | `/api/surge/wallet` | Create SURGE wallet |
| `GET` | `/api/surge/balance` | Check wallet balance |

---

## 🛡️ Investment Rules

1. **Score before invest** — Every project must pass Gemini evaluation
2. **Max 30% per position** — Never deploy more than 30% of available capital
3. **Diversification** — Max 40% in any single category
4. **Public disclosure** — Every action posted to Moltbook
5. **Capital preservation** — Reject projects below threshold

---

## 🏆 Built For

**SURGE x OpenClaw Hackathon** — Demonstrating real autonomous economic behavior with AI-driven capital allocation on Solana.

---

## 📜 License

[MIT](./LICENSE)
