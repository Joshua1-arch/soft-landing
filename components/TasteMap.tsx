"use client";

import React, { useState } from "react";
import type { LocatedVenue } from "@/lib/tasteprint/types.ts";

interface TasteMapProps {
  venues: LocatedVenue[];
  city: string;
  selectedVenueId?: string;
  onSelectVenue?: (v: LocatedVenue) => void;
}

export default function TasteMap({
  venues,
  city,
  selectedVenueId,
  onSelectVenue,
}: TasteMapProps) {
  const validVenues = venues.filter((v) => v.lat !== 0 && v.lon !== 0);

  // If no venues have coordinates, show a clean message
  if (validVenues.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E2DDD5] p-6 text-center text-[#535C68]">
        <p className="font-medium">No verified coordinates returned for this location.</p>
        <p className="text-xs mt-1">Venues are displayed in the list below with verified addresses.</p>
      </div>
    );
  }

  // Calculate bounding box and center
  const lats = validVenues.map((v) => v.lat);
  const lons = validVenues.map((v) => v.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  // Selected venue
  const activeVenue = validVenues.find((v) => v.entityId === selectedVenueId) || validVenues[0];

  // Map viewport dimensions
  const width = 800;
  const height = 450;
  const padding = 60;

  // Normalize lat/lon to SVG coordinate space
  const latSpan = maxLat - minLat || 0.05;
  const lonSpan = maxLon - minLon || 0.05;

  const project = (lat: number, lon: number) => {
    const x = padding + ((lon - minLon) / lonSpan) * (width - 2 * padding);
    // Invert Y for latitude (higher lat = higher on screen)
    const y = height - padding - ((lat - minLat) / latSpan) * (height - 2 * padding);
    return { x, y };
  };

  return (
    <div className="relative bg-[#1A2228] text-white rounded-2xl overflow-hidden border border-[#2D3740] shadow-xl">
      {/* Map Header Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-[#14171A]/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
        <span className="text-xs font-semibold tracking-wide uppercase text-white/90">
          Real Qloo Geo-Coordinates • {city}
        </span>
        <span className="text-xs text-white/50 border-l border-white/20 pl-2">
          {validVenues.length} mapped spaces
        </span>
      </div>

      {/* SVG Interactive Cartographic View */}
      <div className="relative w-full h-[360px] md:h-[440px] bg-[#141A1F] overflow-hidden flex items-center justify-center">
        {/* Subtle grid pattern background */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full object-cover select-none"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </pattern>
            <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1E4D3B" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#141A1F" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid background */}
          <rect width={width} height={height} fill="#141A1F" />
          <rect width={width} height={height} fill="url(#mapGlow)" />
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Connective taste web between pins */}
          {validVenues.map((v, i) => {
            const p1 = project(v.lat, v.lon);
            const next = validVenues[(i + 1) % validVenues.length];
            const p2 = project(next.lat, next.lon);
            return (
              <line
                key={`line-${v.entityId}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="rgba(30, 77, 59, 0.4)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Pins */}
          {validVenues.map((v, idx) => {
            const { x, y } = project(v.lat, v.lon);
            const isSelected = activeVenue?.entityId === v.entityId;

            return (
              <g
                key={v.entityId}
                className="cursor-pointer transition-all duration-200"
                onClick={() => onSelectVenue && onSelectVenue(v)}
              >
                {/* Ping ring if selected */}
                {isSelected && (
                  <circle cx={x} cy={y} r="22" fill="none" stroke="#10B981" strokeWidth="2" opacity="0.6">
                    <animate attributeName="r" from="12" to="28" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.8" to="0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Pin shadow */}
                <circle cx={x} cy={y + 3} r="10" fill="rgba(0,0,0,0.5)" />

                {/* Main pin circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 13 : 9}
                  fill={isSelected ? "#10B981" : "#1E4D3B"}
                  stroke="#FFFFFF"
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all duration-300"
                />

                {/* Index label */}
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={isSelected ? "11" : "9"}
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {idx + 1}
                </text>

                {/* Label badge */}
                <text
                  x={x}
                  y={y - (isSelected ? 18 : 14)}
                  textAnchor="middle"
                  fill={isSelected ? "#10B981" : "#E2DDD5"}
                  fontSize={isSelected ? "11" : "9"}
                  fontWeight="600"
                  className="pointer-events-none"
                >
                  {v.name.length > 20 ? v.name.slice(0, 18) + "…" : v.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Venue Float Card */}
        {activeVenue && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-[#14171A]/95 backdrop-blur-md rounded-xl p-4 border border-white/15 shadow-2xl transition-all">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded">
                  {activeVenue.genre}
                </span>
                <h4 className="text-sm font-semibold text-white mt-1">{activeVenue.name}</h4>
              </div>
              {activeVenue.businessRating && (
                <span className="text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                  ★ {activeVenue.businessRating}
                </span>
              )}
            </div>

            <p className="text-xs text-white/70 mt-1.5 flex items-start gap-1">
              <span className="text-[#10B981]">📍</span>
              <span>{activeVenue.address}</span>
            </p>

            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
              <span className="font-mono text-[10px]">
                {activeVenue.lat.toFixed(4)}° N, {Math.abs(activeVenue.lon).toFixed(4)}° {activeVenue.lon >= 0 ? "E" : "W"}
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeVenue.name + " " + activeVenue.address)}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#10B981] hover:underline font-medium inline-flex items-center gap-1"
              >
                Directions ↗
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
