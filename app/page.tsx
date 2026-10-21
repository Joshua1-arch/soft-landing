"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PERSONAS } from "@/lib/qloo/fixtures/personas.ts";
import { saveStateToStorage } from "@/lib/state.ts";

const STATIC_CITIES = [
  "Lagos, Nigeria",
  "Manchester, UK",
  "London, UK",
  "São Paulo, Brazil",
  "Lisbon, Portugal",
  "Osaka, Japan",
  "Tokyo, Japan",
  "Toronto, Canada",
  "Berlin, Germany",
  "New York, USA",
  "Accra, Ghana",
  "Nairobi, Kenya",
  "Paris, France",
  "Amsterdam, Netherlands",
];

const CONSTRAINT_OPTIONS = [
  "halal",
  "vegetarian",
  "vegan",
  "no alcohol",
  "low budget",
  "limited mobility",
  "no subtitles",
  "no horror",
];

export default function OnboardingPage() {
  const router = useRouter();

  const [origin, setOrigin] = useState("Lagos, Nigeria");
  const [destination, setDestination] = useState("Manchester, UK");
  const [anchors, setAnchors] = useState<string[]>([
    "Fela Kuti",
    "jollof rice",
    "Nollywood",
    "Arsenal",
    "Chimamanda Ngozi Adichie",
  ]);
  const [anchorInput, setAnchorInput] = useState("");
  const [constraints, setConstraints] = useState<string[]>(["low budget", "halal"]);
  const [adventure, setAdventure] = useState(65);
  const [loading, setLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string | null>("amara");

  const handleSelectPersona = async (key: string) => {
    setSelectedPersona(key);
    const p = PERSONAS[key];
    if (!p) return;
    setOrigin(p.origin);
    setDestination(p.destination);
    setAnchors(p.anchors);
    setConstraints(p.constraints);
    setAdventure(p.adventure);

    // Instant launch demo mode
    await bootstrapAndLaunch(key);
  };

  const handleAddAnchor = () => {
    if (!anchorInput.trim() || anchors.length >= 5) return;
    setAnchors([...anchors, anchorInput.trim()]);
    setAnchorInput("");
  };

  const handleRemoveAnchor = (idx: number) => {
    setAnchors(anchors.filter((_, i) => i !== idx));
  };

  const toggleConstraint = (c: string) => {
    if (constraints.includes(c)) {
      setConstraints(constraints.filter((item) => item !== c));
    } else {
      setConstraints([...constraints, c]);
    }
  };

  const bootstrapAndLaunch = async (forcedPersonaId?: string) => {
    setLoading(true);
    try {
      const payload = {
        personaId: forcedPersonaId || selectedPersona || undefined,
        origin,
        destination,
        anchors,
        constraints,
        adventure,
      };

      const res = await fetch("/api/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Bootstrap failed");
      const data = await res.json();

      // Save to localStorage for instant hydration and reload survival
      saveStateToStorage({
        version: 1,
        personaId: forcedPersonaId || selectedPersona || undefined,
        user: data.user,
        gapReadout: data.gapReadout,
        weeks: data.weeks,
        candidatePool: data.candidatePool,
        lastUpdated: Date.now(),
      });

      const personaParam = forcedPersonaId ? `?persona=${forcedPersonaId}` : "";
      router.push(`/plan${personaParam}`);
    } catch (err) {
      console.error(err);
      alert("Failed to build plan. Falling back to default demo.");
      router.push("/plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#14171A] flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-[#E2DDD5] bg-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#1E4D3B] text-white flex items-center justify-center font-bold text-sm">
              SL
            </span>
            <span className="font-semibold tracking-tight text-lg text-[#14171A]">Soft Landing</span>
          </div>
          <Link
            href="/ablation"
            className="text-xs font-semibold text-[#535C68] hover:text-[#1E4D3B] underline underline-offset-4"
          >
            Why Qloo? (Ablation Demo)
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#EBF3EF] text-[#1E4D3B] mb-2">
            12-Week Cultural On-Ramp
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#14171A]">
            Find your cultural footing in a new country
          </h1>
          <p className="text-sm text-[#535C68] mt-2 max-w-lg mx-auto">
            Not a generic listicle. A weekly, cross-domain plan sequenced by Qloo’s taste graph that ramps from familiar comfort to local immersion.
          </p>
        </div>

        {/* Demo Persona Picker (First-Class) */}
        <section aria-labelledby="persona-picker-heading" className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 id="persona-picker-heading" className="text-xs font-bold uppercase tracking-wider text-[#535C68]">
              Try a seeded demo persona (Instant 1-Click Launch)
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.values(PERSONAS).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPersona(p.id)}
                disabled={loading}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  selectedPersona === p.id
                    ? "border-[#1E4D3B] bg-white ring-2 ring-[#1E4D3B]/20 shadow-xs"
                    : "border-[#E2DDD5] bg-[#FFFFFF] hover:border-[#1E4D3B]/40 hover:bg-[#FBF9F5]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-[#14171A]">{p.name}, {p.age}</span>
                  <span className="text-[10px] font-mono text-[#1E4D3B] bg-[#EBF3EF] px-1.5 py-0.5 rounded font-semibold">
                    {p.adventure}% Adv
                  </span>
                </div>
                <p className="text-xs text-[#1E4D3B] font-medium">{p.origin.split(",")[0]} → {p.destination.split(",")[0]}</p>
                <p className="text-[11px] text-[#535C68] mt-1 line-clamp-2">{p.storyBeat}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Onboarding Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            bootstrapAndLaunch();
          }}
          className="bg-white rounded-2xl border border-[#E2DDD5] p-6 shadow-xs space-y-6"
        >
          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="origin-city" className="block text-xs font-bold uppercase tracking-wider text-[#535C68] mb-1.5">
                Where are you moving from?
              </label>
              <input
                id="origin-city"
                type="text"
                list="city-list"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2DDD5] bg-[#FBF9F5] text-[#14171A] focus:bg-white"
                placeholder="e.g. Lagos, Nigeria"
              />
            </div>
            <div>
              <label htmlFor="destination-city" className="block text-xs font-bold uppercase tracking-wider text-[#535C68] mb-1.5">
                Where are you now?
              </label>
              <input
                id="destination-city"
                type="text"
                list="city-list"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E2DDD5] bg-[#FBF9F5] text-[#14171A] focus:bg-white"
                placeholder="e.g. Manchester, UK"
              />
            </div>
          </div>

          <datalist id="city-list">
            {STATIC_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          {/* 5 Cultural Anchors */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#535C68] mb-1">
              3 to 5 things you already love (Music, food, books, teams, films)
            </label>
            <p className="text-[11px] text-[#535C68] mb-2">
              Resolved to verified Qloo entity & tag IDs.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {anchors.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#EBF3EF] text-[#1E4D3B] border border-[#D0E2D8]"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => handleRemoveAnchor(idx)}
                    className="hover:text-red-600 font-bold ml-0.5"
                    aria-label={`Remove ${item}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {anchors.length < 5 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={anchorInput}
                  onChange={(e) => setAnchorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAnchor();
                    }
                  }}
                  placeholder="e.g. Studio Ghibli, Jollof, Fela Kuti..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-[#E2DDD5] bg-[#FBF9F5] text-[#14171A]"
                />
                <button
                  type="button"
                  onClick={handleAddAnchor}
                  disabled={!anchorInput.trim()}
                  className="px-4 py-2 bg-[#F2EFE9] text-[#14171A] text-xs font-semibold rounded-lg hover:bg-[#E2DDD5] disabled:opacity-50"
                >
                  Add Anchor
                </button>
              </div>
            )}
          </div>

          {/* Constraints Multi-select Chips */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#535C68] mb-2">
              Personal Constraints (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {CONSTRAINT_OPTIONS.map((c) => {
                const active = constraints.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleConstraint(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      active
                        ? "bg-[#1E4D3B] text-white border-[#1E4D3B]"
                        : "bg-[#FBF9F5] text-[#535C68] border-[#E2DDD5] hover:bg-white"
                    }`}
                  >
                    {active ? `✓ ${c}` : c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adventure Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="form-adventure" className="text-xs font-bold uppercase tracking-wider text-[#535C68]">
                How adventurous are you feeling? ({adventure}/100)
              </label>
              <span className="text-xs font-semibold text-[#1E4D3B] font-mono">
                {adventure < 35
                  ? "Keep me comfortable"
                  : adventure > 70
                  ? "Throw me in the deep end"
                  : "Balanced calibration"}
              </span>
            </div>
            <input
              id="form-adventure"
              type="range"
              min="0"
              max="100"
              value={adventure}
              onChange={(e) => setAdventure(Number(e.target.value))}
              className="w-full h-2 bg-[#F2EFE9] rounded-lg appearance-none cursor-pointer accent-[#1E4D3B]"
            />
            <div className="flex justify-between text-[11px] text-[#535C68] mt-1 font-mono">
              <span>0 (High Comfort)</span>
              <span>50 (Standard Curve)</span>
              <span>100 (Deep Immersion)</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || anchors.length < 3}
            className="w-full py-3 px-6 rounded-xl bg-[#1E4D3B] hover:bg-[#15382B] text-white font-bold text-sm tracking-wide shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sequencing your 12 weeks...</span>
              </>
            ) : (
              <span>Build my first 12 weeks →</span>
            )}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2DDD5] bg-white py-4 px-4 text-center text-xs text-[#535C68]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Soft Landing is a cultural orientation tool sequenced by Qloo’s taste graph.</span>
          <div className="flex gap-4">
            <Link href="/ablation" className="hover:text-[#1E4D3B] underline underline-offset-2">
              Ablation: Why Qloo?
            </Link>
            <span className="text-gray-300">|</span>
            <span>Not a clinical or wellbeing tool</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
