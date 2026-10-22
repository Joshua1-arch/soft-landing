# Soft Landing 🌍

> **A 12-week cultural on-ramp for people who just moved countries — sequenced by Qloo's taste graph, built on the fact that familiarity is a dose you can calibrate.**

Soft Landing is an intelligent cultural orientation agent for someone in their first 0–12 months in a new city (international students, relocated professionals, trailing spouses, immigrants). It replaces generic newcomer lists with an intentional, week-by-week sequence that begins with comfort (~80% familiar) and progressively ramps toward host city immersion (~50% novel) across six domains: **Music, Food, Film/TV, Books, Podcasts, and Local Places**.

---

## ⚡ The Five Hackathon Showstoppers

1. **Culture-Gap Readout** (`/analysis/compare`):
   Immediately evaluates the quantified cultural distance between the user's origin city and destination city across each domain (e.g. *Music: 0.62 overlap — "You'll find your feet here fast"* vs *Food: 0.31 overlap — "Expect this to be the steepest stretch"*).
2. **Live Adventure Slider** (`0–100`):
   Dragging the adventure slider re-calculates the target novelty curve and **re-sequences all unrated weeks in real-time (<300ms, 60fps)** with zero network lag, computing locally from the fetched candidate pool.
3. **"Why This?" Explainability Panel** (`feature.explainability=true`):
   Clicking any item reveals the transparent taste graph attribution signals with attribution score bars (e.g. *Because you love Fela Kuti (0.82)* and *Popular in Manchester cultural circles*).
4. **Side-by-Side Ablation Study** (`/ablation`):
   Direct contrast demonstrating why a standalone LLM hallucinates or produces generic advice (e.g. *"eat food at a supermarket"*), whereas Qloo connects real cultural lineages and verified constraint filters (halal, vegetarian, budget, step-free access).
5. **Three Seeded Personas**:
   - **Amara (24, Lagos → Manchester)**: Student, tight budget, Afrobeats, jollof, Nollywood, Arsenal, Adichie. (Music is seamless; food is the hurdle).
   - **Dmitri (38, São Paulo → Lisbon)**: Relocated engineer, bossa nova, churrasco, Wong Kar-wai, tech podcasts. (Language-adjacent, but faces social isolation).
   - **Yuki (29, Osaka → Toronto)**: Trailing spouse, vegetarian, limited mobility, Studio Ghibli, ramen, Murakami, city-pop. (Hard constraints require verified accessible and vegetarian options).

---

## 🧠 Why Qloo is Load-Bearing

If you remove Qloo, Soft Landing ceases to function. A generic LLM cannot:
- **Compute cross-domain affinity**: Connect an Afrobeats artist to a specific West African spiced grill spot and a historic library reading room in Northern England.
- **Quantify cultural distance**: Measure the empirical overlap between two cultural centers to identify where newcomers will experience the steepest adjustment.
- **Attribute recommendations**: Provide mathematical contribution scores linking a user's known anchors to new recommendations.
- **Enforce grounded constraints**: Filter places and dining options by verified tags (halal, vegetarian, price level, wheelchair accessibility) rather than plausible-sounding hallucinations.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (tested on Node v24)
- npm or pnpm

### Installation

```bash
git clone https://github.com/your-username/soft-landing.git
cd soft-landing
npm install
```

### Running Locally

Soft Landing runs in **Mock Mode** by default when no API key is present:

```bash
# Run with demo mock data (zero configuration required)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to explore the onboarding flow and 1-click persona demos.

### Running with Live Qloo API

When your hackathon API key arrives, configure `.env.local`:

```env
QLOO_API_KEY=your_issued_api_key_here
QLOO_BASE_URL=https://hackathon.api.qloo.com
QLOO_MODE=live
```

Then start the server:

```bash
npm run dev
```

---

## 🧪 Testing & Verification

Run the test suite verifying mathematical monotonicity, endpoint cases, and determinism:

```bash
npm test
```

### Security & Bundle Hygiene

Soft Landing ensures the API key remains strictly server-side:

```bash
# Verify no API keys exist in client bundles
Get-ChildItem -Path .next/static -Recurse | Select-String "QLOO_API_KEY"

# Verify no sensitive env files are tracked in git
git status --porcelain | Select-String "env"
```

---

## 📐 Architecture & Math

### Familiarity Curve Formula
For week $w \in [1, 12]$:
$$\text{ramp}(w) = \frac{w - 1}{11}$$
$$\text{ease} = \text{ramp}^{0.85}$$
$$\text{lo} = 0.15 + 0.10 \times \left(\frac{A}{100}\right)$$
$$\text{hi} = 0.45 + 0.25 \times \left(\frac{A}{100}\right)$$
$$N(w) = \text{lo} + (\text{hi} - \text{lo}) \times \text{ease}$$

At $A=50$: $N(1) = 0.20$, $N(12) = 0.575$.

---

## ⚠️ Important Limitations

Soft Landing is strictly an informational **cultural orientation and acculturation tool**. It makes **no clinical, therapeutic, mental health, or wellbeing claims**. It does not guarantee integration outcomes or replace community and social support networks.

### Live Qloo Data & Dietary Constraints
Real Qloo place responses accurately capture venue taxonomy, neighborhood location, and physical accessibility attributes (e.g., `"Wheelchair accessible entrance"`). However, explicit dietary certification tags (such as `"halal"` or `"vegetarian"`) are sparse in general city dining responses. To prevent emptying the food category while preserving user safety, Soft Landing strictly excludes items containing explicit meat or conflicting tags (`bbq`, `kebab`, `steak`, `pork`, `beef`, etc.), while items lacking explicit dietary certification tags are prominently flagged in the UI as *"Not confirmed vegetarian"* rather than silently assumed compliant.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
