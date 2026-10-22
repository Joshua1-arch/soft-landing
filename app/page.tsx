"use client";

import React, { useState } from "react";
import TasteMap from "@/components/TasteMap.tsx";
import type {
  TasteprintResponse,
  AgentTraceStep,
  LocatedVenue,
  CrossDomainRecommendation,
} from "@/lib/tasteprint/types.ts";

const PRESET_LOVES = [
  {
    name: "Afrobeat & Gripping Noir",
    loves: ["Fela Kuti", "Breaking Bad", "jollof rice", "Nike"],
    city: "London",
  },
  {
    name: "Auteur Cinema & Melancholy",
    loves: ["Spirited Away", "Soundgarden", "sushi", "A24"],
    city: "New York",
  },
  {
    name: "Global Groove & Street Pulse",
    loves: ["Burna Boy", "The Wire", "street food", "Stüssy"],
    city: "Toronto",
  },
];

const POPULAR_CITIES = [
  "London",
  "New York",
  "Toronto",
  "Lagos",
  "Tokyo",
  "Paris",
  "Berlin",
  "São Paulo",
];

export default function TasteprintPage() {
  const [love1, setLove1] = useState("Fela Kuti");
  const [love2, setLove2] = useState("Breaking Bad");
  const [love3, setLove3] = useState("jollof rice");
  const [love4, setLove4] = useState("Nike");
  const [location, setLocation] = useState("London");

  const [loading, setLoading] = useState(false);
  const [activeTraceStep, setActiveTraceStep] = useState<string | null>(null);
  const [result, setResult] = useState<TasteprintResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<LocatedVenue | undefined>();
  const [copiedShare, setCopiedShare] = useState(false);
  const [showTraceDrawer, setShowTraceDrawer] = useState(true);

  const applyPreset = (preset: typeof PRESET_LOVES[0]) => {
    setLove1(preset.loves[0] || "");
    setLove2(preset.loves[1] || "");
    setLove3(preset.loves[2] || "");
    setLove4(preset.loves[3] || "");
    setLocation(preset.city);
    setErrorMsg(null);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const loves = [love1, love2, love3, love4].map((s) => s.trim()).filter(Boolean);
    if (loves.length === 0) {
      setErrorMsg("Please enter at least one favorite thing (up to 4).");
      return;
    }

    setLoading(true);
    setActiveTraceStep("Perceiving Free-Text Inputs...");

    try {
      const res = await fetch("/api/tasteprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loves,
          location: location.trim() || "London",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to generate Tasteprint.");
      } else {
        setResult(data);
        if (data.venues?.length > 0) {
          setSelectedVenue(data.venues[0]);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
      setActiveTraceStep(null);
    }
  };

  const copyShareText = () => {
    if (!result) return;
    const shareText = `Tasteprint Portrait: "${result.portrait.archetype}"\n` +
      `Themes: ${result.portrait.topThemes.map((t) => t.theme).join(" • ")}\n` +
      `Based on my 4 favorites: ${result.portrait.loves.join(", ")}\n` +
      `Generated with live cultural intelligence graph: https://tasteprint.ai`;

    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#14171A]">
      {/* Top Banner Navigation */}
      <header className="border-b border-[#E2DDD5] bg-[#FFFFFF]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E4D3B] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              T
            </div>
            <div>
              <span className="font-bold tracking-tight text-base text-[#14171A]">TASTEPRINT</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-[#1E4D3B] bg-[#EBF3EF] px-2 py-0.5 rounded">
                Live Qloo Taste AI™
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EBF3EF] border border-[#1E4D3B]/20 text-[#1E4D3B] font-semibold text-xs">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>Taste AI™ Agent Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-10 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF3EF] text-[#1E4D3B] text-xs font-semibold mb-4 border border-[#1E4D3B]/20">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          Autonomous Cross-Domain Cultural Agent
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#14171A] leading-tight">
          Tell me four things you love.
        </h1>
        <p className="mt-3 text-base sm:text-lg text-[#535C68] max-w-2xl mx-auto">
          I’ll show you <strong className="text-[#14171A]">who you are</strong>,{" "}
          <strong className="text-[#14171A]">what you’d love next</strong>, and{" "}
          <strong className="text-[#14171A]">where to find it near you</strong>.
        </p>

        {/* 1-Click Inspiration Presets */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-[#535C68] font-medium">Try inspiration seeds:</span>
          {PRESET_LOVES.map((p, idx) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-3 py-1 bg-white hover:bg-[#F2EFE9] border border-[#E2DDD5] rounded-full text-[#14171A] font-medium shadow-xs transition cursor-pointer"
            >
              ✨ {p.name}
            </button>
          ))}
        </div>
      </section>

      {/* Input Form Card */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
        <form
          onSubmit={handleGenerate}
          className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2DDD5] shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#535C68]">
              Your Four Loves (Free-Text • Any Genre, Dish, Show, or Brand)
            </h2>
            <span className="text-[11px] text-[#535C68]">Free text • No dropdowns</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#14171A] mb-1">
                1. Music Artist / Song
              </label>
              <input
                type="text"
                value={love1}
                onChange={(e) => setLove1(e.target.value)}
                placeholder="e.g. Fela Kuti, Burna Boy, Taylor Swift"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2DDD5] focus:border-[#1E4D3B] focus:ring-1 focus:ring-[#1E4D3B] text-sm text-[#14171A] bg-[#FBF9F5] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#14171A] mb-1">
                2. Film / TV Series
              </label>
              <input
                type="text"
                value={love2}
                onChange={(e) => setLove2(e.target.value)}
                placeholder="e.g. Breaking Bad, Spirited Away, Succession"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2DDD5] focus:border-[#1E4D3B] focus:ring-1 focus:ring-[#1E4D3B] text-sm text-[#14171A] bg-[#FBF9F5] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#14171A] mb-1">
                3. Dish / Food / Restaurant
              </label>
              <input
                type="text"
                value={love3}
                onChange={(e) => setLove3(e.target.value)}
                placeholder="e.g. jollof rice, sushi, street food, tacos"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2DDD5] focus:border-[#1E4D3B] focus:ring-1 focus:ring-[#1E4D3B] text-sm text-[#14171A] bg-[#FBF9F5] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#14171A] mb-1">
                4. Brand / Book / Shop
              </label>
              <input
                type="text"
                value={love4}
                onChange={(e) => setLove4(e.target.value)}
                placeholder="e.g. Nike, Chimamanda Ngozi Adichie, Zara"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2DDD5] focus:border-[#1E4D3B] focus:ring-1 focus:ring-[#1E4D3B] text-sm text-[#14171A] bg-[#FBF9F5] outline-none"
              />
            </div>
          </div>

          {/* Location Selector */}
          <div className="mt-5 pt-5 border-t border-[#E2DDD5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[#14171A] mb-1">
                Where should I map venues near you?
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. London, New York, Toronto, Lagos, Tokyo"
                  className="flex-1 max-w-xs px-3.5 py-2 rounded-xl border border-[#E2DDD5] text-xs text-[#14171A] bg-[#FBF9F5]"
                />
                <div className="hidden lg:flex gap-1 text-[11px]">
                  {POPULAR_CITIES.slice(0, 4).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setLocation(c)}
                      className={`px-2 py-1 rounded-md border text-xs cursor-pointer ${
                        location.toLowerCase() === c.toLowerCase()
                          ? "bg-[#1E4D3B] text-white border-[#1E4D3B]"
                          : "bg-white text-[#535C68] border-[#E2DDD5]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                loading ? "bg-[#535C68] cursor-not-allowed" : "bg-[#1E4D3B] hover:bg-[#15382B]"
              }`}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Agent Reasoning...
                </>
              ) : (
                <>
                  <span>Reveal My Tasteprint</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              ⚠️ {errorMsg}
            </div>
          )}
        </form>
      </section>

      {/* Live Agent Reasoning Trace Section */}
      {(loading || (result && result.trace?.length > 0)) && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-10">
          <div className="bg-[#14171A] text-white rounded-2xl p-5 border border-[#2D3740] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-white/90">
                  Autonomous Agent Reasoning Trace
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTraceDrawer(!showTraceDrawer)}
                className="text-xs text-white/60 hover:text-white underline cursor-pointer"
              >
                {showTraceDrawer ? "Collapse Trace ▲" : "Expand Trace ▼"}
              </button>
            </div>

            {showTraceDrawer && (
              <div className="mt-3 space-y-2.5 font-mono text-xs max-h-60 overflow-y-auto pr-2">
                {result?.trace?.map((step: AgentTraceStep, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 text-white/80">
                    <span className="text-[#10B981] font-bold">[{step.step.toUpperCase()}]</span>
                    <div>
                      <span className="font-semibold text-white">{step.title}</span>
                      <p className="text-white/60 text-[11px] mt-0.5 leading-relaxed">
                        {step.details}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-[#10B981] animate-pulse">
                    <span>⚡</span>
                    <span>{activeTraceStep || "Agent running autonomous loop..."}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Main Answers Screen (Three Answers on One Screen) */}
      {result && result.success && (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 space-y-12">
          {/* ========================================================= */}
          {/* ANSWER 1: WHO AM I? — THE TASTEPRINT SHAREABLE PORTRAIT */}
          {/* ========================================================= */}
          <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E2DDD5] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#1E4D3B]/10 to-transparent rounded-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2DDD5]">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#1E4D3B] bg-[#EBF3EF] px-3 py-1 rounded-full">
                  Answer 1 • Who Am I?
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-[#14171A] mt-2 tracking-tight">
                  {result.portrait.archetype}
                </h2>
                <p className="text-sm font-medium text-[#535C68] mt-1">
                  {result.portrait.headline}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyShareText}
                  className="px-4 py-2 bg-[#1E4D3B] hover:bg-[#15382B] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>{copiedShare ? "✓ Copied to Clipboard!" : "Copy Share Card"}</span>
                </button>
              </div>
            </div>

            {/* Recurring Themes Grid */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#535C68] mb-3">
                Connecting Themes Across Your Loves
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {result.portrait.topThemes.map((theme, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#E2DDD5]"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-[#1E4D3B] mb-1">
                      <span>{theme.theme}</span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-[#E2DDD5]">
                        {theme.count} of 4 loves
                      </span>
                    </div>
                    <p className="text-[11px] text-[#535C68] mb-2">
                      Traced across: <strong className="text-[#14171A]">{theme.originSeeds.join(", ")}</strong>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {theme.sampleTags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] bg-white text-[#535C68] px-2 py-0.5 rounded border border-[#E2DDD5]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Narrative Prose Portrait */}
            <div className="mt-8 pt-6 border-t border-[#E2DDD5]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#535C68] mb-2">
                The Tasteprint Synthesis
              </h3>
              <div className="prose prose-sm text-[#14171A] leading-relaxed max-w-none whitespace-pre-line text-sm sm:text-base">
                {result.portrait.proseSummary}
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* ANSWER 2: WHAT'S NEXT? — CROSS-DOMAIN RECOMMENDATIONS */}
          {/* ========================================================= */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#1E4D3B] bg-[#EBF3EF] px-3 py-1 rounded-full">
                  Answer 2 • What's Next?
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#14171A] mt-2 tracking-tight">
                  Cross-Domain Recommendations
                </h2>
                <p className="text-xs sm:text-sm text-[#535C68] mt-0.5">
                  Every recommendation leaps across domains (Film, Books, Music, Brands) with an honest, audited "because".
                </p>
              </div>
              <span className="text-xs font-mono text-[#535C68] hidden sm:block">
                {result.recommendations.length} verified leaps
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.recommendations.map((rec: CrossDomainRecommendation, i: number) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-5 border border-[#E2DDD5] shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E4D3B] bg-[#EBF3EF] px-2.5 py-0.5 rounded">
                        {rec.targetDomainName}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#14171A]">
                        {(rec.score * 100).toFixed(0)}% Affinity
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-[#14171A]">{rec.name}</h4>

                    {rec.description && (
                      <p className="text-xs text-[#535C68] mt-1 line-clamp-2">
                        {rec.description}
                      </p>
                    )}

                    {/* Honest "Because" Callout */}
                    <div className="mt-3 p-3 rounded-xl bg-[#FBF9F5] border border-[#E2DDD5]">
                      <div className="flex items-start gap-1.5 text-xs text-[#14171A]">
                        <span className="text-[#10B981] font-bold">✓</span>
                        <span className="leading-snug">
                          <strong>Because:</strong> {rec.explainability.reason}
                        </span>
                      </div>
                    </div>
                  </div>

                  {rec.tags.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#F2EFE9] flex flex-wrap gap-1">
                      {rec.tags.slice(0, 4).map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] text-[#535C68] bg-[#F2EFE9] px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ========================================================= */}
          {/* ANSWER 3: WHERE IS IT? — REAL VENUES NEAR YOU MAPPED */}
          {/* ========================================================= */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[#1E4D3B] bg-[#EBF3EF] px-3 py-1 rounded-full">
                  Answer 3 • Where Is It?
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#14171A] mt-2 tracking-tight">
                  Real Spaces Near You in {result.location.query}
                </h2>
                <p className="text-xs sm:text-sm text-[#535C68] mt-0.5">
                  Physical venues matching your collective tasteprint, verified with real Qloo geo-coordinates.
                </p>
              </div>
            </div>

            {/* Interactive Geo-Coordinate Map */}
            <TasteMap
              venues={result.venues}
              city={result.location.query}
              selectedVenueId={selectedVenue?.entityId}
              onSelectVenue={(v) => setSelectedVenue(v)}
            />

            {/* Venues Ranked List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              {result.venues.map((venue: LocatedVenue, idx: number) => {
                const isSelected = selectedVenue?.entityId === venue.entityId;
                return (
                  <div
                    key={venue.entityId}
                    onClick={() => setSelectedVenue(venue)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#EBF3EF]/40 border-[#1E4D3B] ring-2 ring-[#1E4D3B]/20"
                        : "bg-white border-[#E2DDD5] hover:border-[#1E4D3B]"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold text-[#1E4D3B] uppercase tracking-wider">
                          #{idx + 1} • {venue.genre}
                        </span>
                        {venue.businessRating && (
                          <span className="text-xs font-bold text-amber-600">
                            ★ {venue.businessRating}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-[#14171A]">{venue.name}</h4>
                      <p className="text-xs text-[#535C68] mt-1 flex items-start gap-1">
                        <span>📍</span>
                        <span>{venue.address}</span>
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#E2DDD5] flex items-center justify-between text-[11px]">
                      <span className="font-mono text-[10px] text-[#535C68]">
                        {venue.lat.toFixed(3)}°, {venue.lon.toFixed(3)}°
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.name + " " + venue.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1E4D3B] hover:underline font-semibold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Navigate ↗
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Trust & Transparency Guarantee */}
          <footer className="mt-16 pt-8 border-t border-[#E2DDD5] text-center text-xs text-[#535C68] space-y-2">
            <p>
              Built for the <strong>Qloo Taste AI™ Hackathon</strong> • Zero fabricated reasons • Real explainability attributions.
            </p>
            <p className="text-[11px] text-[#535C68]/80">
              Cross-domain intelligence powered by <code>/v2/insights</code>, <code>/search</code>, and <code>/v2/analysis/compare</code>.
            </p>
          </footer>
        </main>
      )}
    </div>
  );
}
