"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  PlanWeek,
  PlanItem,
  UserPreferences,
  CultureGapReadout,
  InsightResult,
} from "@/lib/qloo/types.ts";
import {
  loadStateFromStorage,
  saveStateToStorage,
  AppState,
} from "@/lib/state.ts";
import { handleItemRating, sequencePlan } from "@/lib/sequence.ts";
import { PERSONAS } from "@/lib/qloo/fixtures/personas.ts";

import { Suspense } from "react";

function PlanContent() {
  const searchParams = useSearchParams();
  const personaParam = searchParams.get("persona");

  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<PlanWeek[]>([]);
  const [user, setUser] = useState<UserPreferences | null>(null);
  const [gapReadout, setGapReadout] = useState<CultureGapReadout | null>(null);
  const [candidatePool, setCandidatePool] = useState<InsightResult[]>([]);
  const [adventure, setAdventure] = useState<number>(50);
  const [selectedItem, setSelectedItem] = useState<PlanItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(true);

  // Initialize state on load
  useEffect(() => {
    async function init() {
      // 1. Try localStorage first
      const stored = loadStateFromStorage();
      if (stored && (!personaParam || stored.personaId === personaParam)) {
        setWeeks(stored.weeks);
        setUser(stored.user);
        setGapReadout(stored.gapReadout);
        setCandidatePool(stored.candidatePool);
        setAdventure(stored.user.adventure);
        setLoading(false);
        return;
      }

      // 2. Otherwise bootstrap from personaParam or default Amara
      const chosenPersona = personaParam && PERSONAS[personaParam] ? personaParam : "amara";
      try {
        const res = await fetch("/api/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personaId: chosenPersona }),
        });
        if (res.ok) {
          const data = await res.json();
          setWeeks(data.weeks);
          setUser(data.user);
          setGapReadout(data.gapReadout);
          setCandidatePool(data.candidatePool);
          setAdventure(data.user.adventure);
          setIsMock(data.isMock);

          saveStateToStorage({
            version: 1,
            personaId: chosenPersona,
            user: data.user,
            gapReadout: data.gapReadout,
            weeks: data.weeks,
            candidatePool: data.candidatePool,
            lastUpdated: Date.now(),
          });
        }
      } catch (err) {
        console.error("Failed to load bootstrap data:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [personaParam]);

  // Showstopper #2: Live Adventure Slider re-sequencing in <300ms locally with NO network call
  const handleAdventureChange = (newVal: number) => {
    setAdventure(newVal);

    if (!user || candidatePool.length === 0) return;

    startTransition(() => {
      const updatedUser: UserPreferences = {
        ...user,
        adventure: newVal,
      };
      setUser(updatedUser);

      // Re-sequence unrated weeks locally from candidate pool
      // Find current active week (first week that has unrated items)
      const currentActiveWeek =
        weeks.find((w) => w.items.some((it) => it.rating === "unrated"))?.weekNumber || 1;

      const resequenced = sequencePlan({
        user: updatedUser,
        candidatePool,
        startWeek: currentActiveWeek,
        existingWeeks: weeks,
      });

      setWeeks(resequenced);

      // Persist
      if (gapReadout) {
        saveStateToStorage({
          version: 1,
          personaId: personaParam || undefined,
          user: updatedUser,
          gapReadout,
          weeks: resequenced,
          candidatePool,
          lastUpdated: Date.now(),
        });
      }
    });
  };

  // Feedback loop & rating handler
  const onRateItem = (weekNumber: number, itemId: string, rating: "loved" | "notForMe") => {
    if (!user || candidatePool.length === 0) return;

    const result = handleItemRating(
      weeks,
      weekNumber,
      itemId,
      rating,
      user,
      candidatePool
    );

    setWeeks(result.updatedWeeks);
    setUser(result.updatedUser);
    setAdventure(result.updatedUser.adventure);
    setToastMessage(result.toastMessage);
    setTimeout(() => setToastMessage(null), 3500);

    // Persist
    if (gapReadout) {
      saveStateToStorage({
        version: 1,
        personaId: personaParam || undefined,
        user: result.updatedUser,
        gapReadout,
        weeks: result.updatedWeeks,
        candidatePool,
        lastUpdated: Date.now(),
      });
    }
  };

  const toggleWeekExpand = (weekNum: number) => {
    setWeeks((prev) =>
      prev.map((w) => (w.weekNumber === weekNum ? { ...w, isExpanded: !w.isExpanded } : w))
    );
  };

  // Progress stats
  const totalRated = weeks.reduce(
    (acc, w) => acc + w.items.filter((it) => it.rating !== "unrated").length,
    0
  );
  const activeWeekNum =
    weeks.find((w) => w.items.some((it) => it.rating === "unrated"))?.weekNumber || 12;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] p-6 max-w-4xl mx-auto flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1E4D3B] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-[#14171A]">Sequencing Your 12-Week On-Ramp...</h2>
        <p className="text-xs text-[#535C68] mt-1">Calibrating Qloo taste graph cross-domain affinity</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#14171A] pb-28">
      {/* Fallback Banner */}
      {isMock && (
        <aside aria-label="Demo notice" className="bg-[#EBF3EF] border-b border-[#D0E2D8] px-4 py-2 text-xs text-[#1E4D3B] text-center font-medium">
          Showing demo data — live Qloo API key is unset or operating in mock fallback.
        </aside>
      )}

      {/* Top Header */}
      <header className="border-b border-[#E2DDD5] bg-white px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-decoration-none">
            <span className="w-8 h-8 rounded-full bg-[#1E4D3B] text-white flex items-center justify-center font-bold text-sm">
              SL
            </span>
            <span className="font-semibold tracking-tight text-lg text-[#14171A]">Soft Landing</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/ablation"
              className="text-xs font-semibold text-[#535C68] hover:text-[#1E4D3B] underline underline-offset-4"
            >
              Why Qloo? (Ablation)
            </Link>
            {user && (
              <span className="text-xs bg-[#F2EFE9] text-[#535C68] px-2.5 py-1 rounded-full font-mono font-medium">
                {user.originCity.split(",")[0]} → {user.destinationCity.split(",")[0]}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Showstopper #1: Culture-Gap Readout */}
        {gapReadout && (
          <section
            aria-labelledby="gap-title"
            className="mb-8 rounded-2xl bg-white border border-[#E2DDD5] p-5 sm:p-6 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 id="gap-title" className="text-xs font-bold uppercase tracking-wider text-[#535C68]">
                  Culture-Gap Readout: {gapReadout.originCity} → {gapReadout.destinationCity}
                </h2>
                <p className="text-xs text-[#535C68] mt-0.5">{gapReadout.summarySentence}</p>
              </div>
              <span className="self-start sm:self-auto text-xs font-mono font-bold bg-[#EBF3EF] text-[#1E4D3B] px-3 py-1 rounded-full">
                Overlap: {Math.round(gapReadout.overallOverlap * 100)}% (Computed)
              </span>
            </div>

            <div className="space-y-2 mt-4 text-sm text-[#383E48]">
              {gapReadout.breakdown.map((item) => (
                <div
                  key={item.category}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 border-b border-[#F2EFE9] last:border-0 gap-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#14171A] w-24">{item.label}</span>
                    <span className="font-mono text-xs text-[#535C68]">
                      {item.overlap.toFixed(2)} overlap
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      item.level === "steep"
                        ? "text-[#B25E16]"
                        : item.level === "easy"
                        ? "text-[#1E4D3B]"
                        : "text-[#535C68]"
                    }`}
                  >
                    {item.verdict}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Showstopper #2: Live Adventure Slider */}
        <section
          aria-label="Adventure calibration"
          className="mb-8 bg-white border border-[#E2DDD5] rounded-2xl p-5 shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label htmlFor="plan-adventure-slider" className="text-sm font-bold text-[#14171A]">
                Adventure Dose: {adventure}/100
              </label>
              {isPending && (
                <span className="text-[10px] text-[#1E4D3B] font-mono animate-pulse">
                  Re-sequencing live...
                </span>
              )}
            </div>
            <span className="text-xs font-mono font-semibold text-[#1E4D3B]">
              {adventure < 35
                ? "Keep me comfortable"
                : adventure > 70
                ? "Throw me in the deep end"
                : "Balanced calibration"}
            </span>
          </div>
          <input
            id="plan-adventure-slider"
            type="range"
            min="0"
            max="100"
            value={adventure}
            onChange={(e) => handleAdventureChange(Number(e.target.value))}
            className="w-full h-2.5 bg-[#F2EFE9] rounded-lg appearance-none cursor-pointer accent-[#1E4D3B]"
          />
          <div className="flex justify-between text-[11px] text-[#535C68] mt-1.5 font-mono">
            <span>0 (Familiar comfort)</span>
            <span>50 (Standard on-ramp)</span>
            <span>100 (Deep immersion)</span>
          </div>
        </section>

        {/* The 12-Week Timeline */}
        <section aria-labelledby="timeline-header">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 id="timeline-header" className="text-xl sm:text-2xl font-bold tracking-tight text-[#14171A]">
                Your 12-Week Cultural Sequence
              </h1>
              <p className="text-xs text-[#535C68] mt-0.5">
                3 small cultural acts per week · Ramped from familiar to unfamiliar
              </p>
            </div>
            <span className="text-xs font-mono font-semibold bg-[#EBF3EF] text-[#1E4D3B] px-3 py-1 rounded-full">
              {totalRated} of 36 rated
            </span>
          </div>

          <div className="space-y-5">
            {weeks.map((week) => {
              const weekRatedCount = week.items.filter((it) => it.rating !== "unrated").length;
              const isWeekComplete = weekRatedCount === 3;

              return (
                <article
                  key={week.weekNumber}
                  className={`bg-white rounded-2xl border transition-all ${
                    week.weekNumber === activeWeekNum
                      ? "border-[#1E4D3B] ring-2 ring-[#1E4D3B]/10 shadow-sm"
                      : "border-[#E2DDD5] shadow-xs"
                  }`}
                >
                  {/* Week Card Header */}
                  <div
                    className="p-5 flex items-center justify-between cursor-pointer select-none"
                    onClick={() => toggleWeekExpand(week.weekNumber)}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                          isWeekComplete
                            ? "bg-[#1E4D3B] text-white"
                            : "bg-[#F2EFE9] text-[#14171A]"
                        }`}
                      >
                        {isWeekComplete ? "✓" : week.weekNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-[#14171A]">
                            Week {week.weekNumber}: {week.themeTitle}
                          </h2>
                          {week.weekNumber === activeWeekNum && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1E4D3B] text-white px-1.5 py-0.5 rounded font-mono">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#535C68] mt-0.5">{week.themeSummary}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-[#535C68] hidden sm:inline">
                        Target Novelty: {Math.round(week.targetNovelty * 100)}%
                      </span>
                      <button
                        type="button"
                        aria-label={week.isExpanded ? "Collapse week" : "Expand week"}
                        className="text-xs text-[#535C68] font-bold p-1 hover:text-[#1E4D3B]"
                      >
                        {week.isExpanded ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {/* Week Items (Expanded View) */}
                  {week.isExpanded && (
                    <div className="px-5 pb-5 pt-0 space-y-3 border-t border-[#F2EFE9]">
                      <div className="pt-3" />
                      {week.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl border border-[#E2DDD5] bg-[#FBF9F5] hover:border-[#1E4D3B]/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div
                            className="flex items-start gap-3 cursor-pointer flex-1"
                            onClick={() => setSelectedItem(item)}
                          >
                            <span
                              className="text-2xl p-2 bg-white rounded-lg border border-[#E2DDD5] shrink-0"
                              aria-hidden="true"
                            >
                              {item.categoryIcon}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-[#14171A] hover:text-[#1E4D3B]">
                                  {item.title}
                                </h3>
                                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-[#EBF3EF] text-[#1E4D3B]">
                                  {item.category}
                                </span>
                              </div>
                              <p className="text-xs text-[#535C68] mt-0.5">{item.subtitle}</p>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                }}
                                className="text-[11px] text-[#1E4D3B] font-semibold underline underline-offset-2 mt-1 inline-flex items-center gap-1"
                              >
                                Why this? (Explainability breakdown)
                              </button>
                            </div>
                          </div>

                          {/* Action Buttons: Loved / Not for me */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => onRateItem(week.weekNumber, item.id, "loved")}
                              aria-label={`Mark ${item.title} as loved`}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                                item.rating === "loved"
                                  ? "bg-[#1E4D3B] text-white border-[#1E4D3B]"
                                  : "bg-white text-[#14171A] border-[#E2DDD5] hover:bg-[#EBF3EF]"
                              }`}
                            >
                              Loved
                            </button>
                            <button
                              type="button"
                              onClick={() => onRateItem(week.weekNumber, item.id, "notForMe")}
                              aria-label={`Mark ${item.title} as not for me`}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                                item.rating === "notForMe"
                                  ? "bg-[#B25E16] text-white border-[#B25E16]"
                                  : "bg-white text-[#14171A] border-[#E2DDD5] hover:bg-[#F2EFE9]"
                              }`}
                            >
                              Not for me
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {/* Showstopper #3: Why This? Explainability Side Panel */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="why-title"
          className="fixed inset-0 bg-black/40 z-50 flex justify-end animate-fadeIn"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#E2DDD5] pb-3 mb-4">
                <span className="text-xs uppercase font-mono font-bold text-[#1E4D3B] bg-[#EBF3EF] px-2.5 py-1 rounded">
                  Why this? (Qloo Taste Graph Attribution)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 rounded-full hover:bg-[#F2EFE9] flex items-center justify-center font-bold text-gray-500"
                  aria-label="Close why this panel"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl" aria-hidden="true">{selectedItem.categoryIcon}</span>
                <h2 id="why-title" className="text-lg font-bold text-[#14171A]">{selectedItem.title}</h2>
              </div>
              <p className="text-xs text-[#535C68] mb-6">{selectedItem.subtitle}</p>

              <h3 className="text-xs font-bold uppercase tracking-wider text-[#535C68] mb-3">
                Contributing Taste Graph Signals
              </h3>
              <div className="space-y-4">
                {selectedItem.explanation && selectedItem.explanation.length > 0 ? (
                  selectedItem.explanation.map((exp, idx) => (
                    <div key={idx} className="bg-[#FBF9F5] p-3.5 rounded-xl border border-[#E2DDD5]">
                      <div className="flex justify-between text-xs font-semibold text-[#14171A] mb-1.5">
                        <span>{exp.reasonText}</span>
                        <span className="font-mono text-[#1E4D3B]">{exp.score}</span>
                      </div>
                      <div className="w-full bg-[#E2DDD5] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#1E4D3B] h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.round(exp.score * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#535C68]">Why: similar audience affinity in destination metro</p>
                )}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#E2DDD5]">
              <a
                href={selectedItem.searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-[#1E4D3B] text-white text-center font-bold text-xs block hover:bg-[#15382B]"
              >
                Search on External Services (Spotify / Maps / Watch) →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <aside
        aria-label="Overall progression"
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2DDD5] py-3 px-4 z-20 shadow-lg"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1E4D3B]" />
            <span className="font-bold text-[#14171A]">Week {activeWeekNum} of 12</span>
          </div>
          <span className="text-[#535C68] font-mono">
            {totalRated} of 36 items rated ({Math.round((totalRated / 36) * 100)}%)
          </span>
          <button
            type="button"
            onClick={() => {
              // Trigger a soft re-sequence toast
              setToastMessage("Re-plan active: Weeks 2–12 continuously adapt to rated feedback.");
              setTimeout(() => setToastMessage(null), 3000);
            }}
            className="px-3 py-1.5 bg-[#1E4D3B] text-white rounded-lg text-xs font-bold hover:bg-[#15382B]"
          >
            Re-plan Status
          </button>
        </div>
      </aside>

      {/* Re-plan Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-16 left-1/2 -translate-x-1/2 bg-[#14171A] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-2xl z-50 animate-bounce"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] p-6 max-w-4xl mx-auto flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#1E4D3B] border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-base font-bold text-[#14171A]">Loading Cultural On-Ramp...</h2>
        </div>
      }
    >
      <PlanContent />
    </Suspense>
  );
}
