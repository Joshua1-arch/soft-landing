"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PERSONAS } from "@/lib/qloo/fixtures/personas.ts";

interface AblationPair {
  domain: string;
  domainIcon: string;
  naiveWithoutQloo: {
    recommendation: string;
    whyItFails: string;
    sampleText: string;
  };
  groundedWithQloo: {
    recommendation: string;
    qlooAdvantage: string;
    signals: string;
  };
}

const ABLATION_DATA: Record<string, AblationPair[]> = {
  amara: [
    {
      domain: "Music",
      domainIcon: "🎵",
      naiveWithoutQloo: {
        recommendation: "Play some top Afrobeats hits on YouTube or Spotify UK Top 50.",
        whyItFails: "Generic, no cultural lineage to Fela Kuti, ignores Manchester's specific live music venues and diaspora stations.",
        sampleText: '"Just listen to general pop and search for British songs you might like!"',
      },
      groundedWithQloo: {
        recommendation: "Femi Kuti live acoustic set at Band on the Wall (Northern Quarter, Manchester)",
        qlooAdvantage: "Direct cross-domain lineage from user anchor 'Fela Kuti' (0.82 affinity) grounded to Manchester's historic venue.",
        signals: "Anchor: Fela Kuti (0.82) · Locality: Manchester (0.74)",
      },
    },
    {
      domain: "Food",
      domainIcon: "🍲",
      naiveWithoutQloo: {
        recommendation: "Find a local supermarket or general African grocery store.",
        whyItFails: "Vague, doesn't respect budget constraints, misses local Manchester institutions.",
        sampleText: '"Go to a supermarket and look for canned beans and rice!"',
      },
      groundedWithQloo: {
        recommendation: "Suya Republic in Cheetham Hill + Rice & Three at This & That",
        qlooAdvantage: "Discovers verified halal, low-budget authentic spiced suya and 40-year Mancunian curry canteen.",
        signals: "Anchor: jollof rice (0.88) · Constraint: halal + low budget",
      },
    },
    {
      domain: "Literature",
      domainIcon: "📚",
      naiveWithoutQloo: {
        recommendation: "Read a classic English novel like Charles Dickens.",
        whyItFails: "Alienating, zero empathy for Nigerian post-colonial literature background.",
        sampleText: '"Great Expectations will teach you about British history!"',
      },
      groundedWithQloo: {
        recommendation: "Open Water by Caleb Azumah Nelson + Chetham's Library Reading Circle",
        qlooAdvantage: "Bridges British-Ghanaian contemporary diaspora writing with Manchester's 1653 public library sanctuary.",
        signals: "Anchor: Chimamanda Ngozi Adichie (0.79) · Locality: Manchester (0.69)",
      },
    },
  ],
  dmitri: [
    {
      domain: "Social Places",
      domainIcon: "🏛️",
      naiveWithoutQloo: {
        recommendation: "Visit Lisbon Castle (Castelo de São Jorge).",
        whyItFails: "Generic tourist trap. Does not address an expat tech worker's longing for relaxed community gathering spots.",
        sampleText: '"Go buy a tourist ticket and look at the castle walls!"',
      },
      groundedWithQloo: {
        recommendation: "Miradouro de Santa Catarina sunset acoustic sessions + Clube do Choro in Mouraria",
        qlooAdvantage: "Pins exact Lusophone acoustic gatherings where Brazilian choro meets Portuguese fado guitars.",
        signals: "Anchor: bossa nova (0.84) · Locality: Mouraria, Lisbon (0.78)",
      },
    },
    {
      domain: "Dining",
      domainIcon: "🥩",
      naiveWithoutQloo: {
        recommendation: "Eat Portuguese custard tarts (Pastéis de Nata).",
        whyItFails: "Basic tourist suggestion; ignores Brazilian churrasco background and palate.",
        sampleText: '"Eat pastries at the nearest cafe every morning."',
      },
      groundedWithQloo: {
        recommendation: "Churrasqueira da Paz (Bairro Alto) + Cervejaria Ramiro",
        qlooAdvantage: "Connects Brazilian charcoal barbecue affinity to Lisbon's neighborhood charcoal grills and Atlantic seafood.",
        signals: "Anchor: churrasco (0.86) · Destination: Lisbon (0.72)",
      },
    },
  ],
  yuki: [
    {
      domain: "Places & Accessibility",
      domainIcon: "🏛️",
      naiveWithoutQloo: {
        recommendation: "Walk along High Park trails and climb the steep hills.",
        whyItFails: "Violates limited mobility constraint. Ignores winter weather and wheelchair barriers.",
        sampleText: '"Take a long brisk hike through the forest park!"',
      },
      groundedWithQloo: {
        recommendation: "Toronto PATH & Roy Thomson Hall step-free indoor cultural route",
        qlooAdvantage: "Strictly filters by wheelchair-accessible, climate-controlled barrier-free corridors.",
        signals: "Constraint: limited mobility (Barrier-free verified) · Toronto",
      },
    },
    {
      domain: "Dining",
      domainIcon: "🍲",
      naiveWithoutQloo: {
        recommendation: "Go to any downtown noodle shop.",
        whyItFails: "Fails vegetarian constraint: almost all standard ramen contains pork or bonito fish broth.",
        sampleText: '"Most ramen places have noodles so you will be fine!"',
      },
      groundedWithQloo: {
        recommendation: "Ramen Isshin on College St (Certified Vegetarian Roasted Garlic Sesame Broth)",
        qlooAdvantage: "Discovers verified plant-based authentic broth without animal stock, with step-free street-level entrance.",
        signals: "Anchor: ramen · Constraint: vegetarian (Certified) + accessible",
      },
    },
  ],
};

export default function AblationPage() {
  const [selectedPersona, setSelectedPersona] = useState<string>("amara");
  const pairs = ABLATION_DATA[selectedPersona] || ABLATION_DATA.amara;

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#14171A] pb-16">
      {/* Header */}
      <header className="border-b border-[#E2DDD5] bg-white px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#1E4D3B] text-white flex items-center justify-center font-bold text-sm">
              SL
            </span>
            <span className="font-semibold tracking-tight text-lg text-[#14171A]">Soft Landing</span>
          </Link>

          <Link
            href="/plan"
            className="text-xs font-bold text-[#1E4D3B] bg-[#EBF3EF] px-3 py-1.5 rounded-lg hover:bg-[#D0E2D8]"
          >
            ← Back to Plan
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-[#EBF3EF] text-[#1E4D3B] mb-2">
            Showstopper #4: Ablation Study
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#14171A]">
            Why Qloo is Load-Bearing (Side-by-Side Comparison)
          </h1>
          <p className="text-sm text-[#535C68] mt-2 max-w-xl mx-auto">
            Illustration of the difference: What a naive LLM recommends alone versus recommendations grounded in Qloo’s Cultural Taste Graph.
          </p>
        </div>

        {/* Persona Selector Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {Object.values(PERSONAS).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPersona(p.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedPersona === p.id
                  ? "bg-[#1E4D3B] text-white border-[#1E4D3B] shadow-xs"
                  : "bg-white text-[#535C68] border-[#E2DDD5] hover:bg-[#F2EFE9]"
              }`}
            >
              {p.name} ({p.origin.split(",")[0]} → {p.destination.split(",")[0]})
            </button>
          ))}
        </div>

        {/* Comparison Columns */}
        <div className="space-y-6">
          {pairs.map((pair, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-[#E2DDD5] p-5 shadow-xs overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#F2EFE9]">
                <span className="text-2xl" aria-hidden="true">{pair.domainIcon}</span>
                <h2 className="text-base font-bold text-[#14171A]">{pair.domain} Domain Comparison</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: Without Qloo (Naive) */}
                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E8E4DC] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#B25E16] bg-[#FDF0E6] px-2 py-0.5 rounded">
                        Without Qloo (Naive Prompt)
                      </span>
                    </div>
                    <p className="text-xs text-[#535C68] italic mb-3">{pair.naiveWithoutQloo.sampleText}</p>
                    <h3 className="text-sm font-semibold text-[#14171A] mb-1">
                      {pair.naiveWithoutQloo.recommendation}
                    </h3>
                  </div>
                  <div className="mt-4 pt-2 border-t border-[#E8E4DC] text-xs text-[#B25E16] font-medium">
                    ⚠️ <strong>Why it fails:</strong> {pair.naiveWithoutQloo.whyItFails}
                  </div>
                </div>

                {/* Right: With Qloo (Grounded) */}
                <div className="bg-[#F4F9F6] p-4 rounded-xl border border-[#D0E2D8] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1E4D3B] bg-[#EBF3EF] px-2 py-0.5 rounded">
                        With Qloo Taste Graph (Grounded)
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#14171A] mb-1">
                      {pair.groundedWithQloo.recommendation}
                    </h3>
                    <p className="text-xs text-[#383E48] mt-1">{pair.groundedWithQloo.qlooAdvantage}</p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-[#D0E2D8] text-[11px] font-mono text-[#1E4D3B]">
                    ✓ <strong>Grounded Signals:</strong> {pair.groundedWithQloo.signals}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Framing & Integrity Notice */}
        <div className="mt-8 p-4 rounded-xl bg-white border border-[#E2DDD5] text-xs text-[#535C68] text-center">
          <p>
            <strong>Note on Methodology:</strong> Naive responses represent typical zero-shot LLM outputs when requested for newcomer guidance without entity resolution. Grounded responses use Qloo’s entity taste graph, constraint filters, and locality scoping.
          </p>
        </div>
      </main>
    </div>
  );
}
