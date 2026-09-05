// Methodology display metadata.
//
// The authoritative registry — schemas, applicability gates, deterministic
// compute and instructions — lives in the Python service at
// `ai/app/registry.py`. This file carries only what the UI needs to render a
// label before the service has answered, and is kept honest by
// `src/test/parity.test.ts`, which asserts these ids against the same
// fixture the Python suite uses.
//
// The service is still the source of truth at runtime: `fetchRegistry()`
// returns the live list, and anything here is the offline fallback.

import type { MethodologyFamily } from "./types";

export interface MethodologyMeta {
  id: string;
  name: string;
  family: MethodologyFamily;
  purpose: string;
}

export const METHODOLOGY_META: MethodologyMeta[] = [
  {
    id: "market_analysis",
    name: "Market Analysis",
    family: "market",
    purpose: "Separates a large market from a large number in a deck.",
  },
  {
    id: "competitive_analysis",
    name: "Competitive Analysis",
    family: "competitive",
    purpose: "Distinguishes a genuine moat from a head start.",
  },
  {
    id: "team_traction",
    name: "Team & Traction",
    family: "team",
    purpose: "Separates demonstrated demand from claimed interest.",
  },
  {
    id: "business_model_canvas",
    name: "Business Model Canvas",
    family: "business_model",
    purpose: "Exposes where the business model is asserted rather than designed.",
  },
  {
    id: "readiness_levels",
    name: "Readiness Levels (TRL / CRL / FRL)",
    family: "readiness",
    purpose: "Shows whether technology, market and capital are advancing together.",
  },
  {
    id: "financial_analysis",
    name: "Financial Analysis",
    family: "financial",
    purpose: "Establishes whether the company can survive long enough to prove its thesis.",
  },
  {
    id: "berkus",
    name: "Berkus Method",
    family: "valuation",
    purpose: "Prices the de-risking that has actually happened, not the projections.",
  },
  {
    id: "scorecard",
    name: "Scorecard Method",
    family: "valuation",
    purpose: "Anchors valuation to what comparable companies actually raise at.",
  },
  {
    id: "risk_factor",
    name: "Risk Factor Summation",
    family: "valuation",
    purpose: "Prices the specific risks of this company rather than its upside.",
  },
  {
    id: "vc_method",
    name: "VC Method",
    family: "valuation",
    purpose: "Answers what an investor can pay today and still clear their target return.",
  },
  {
    id: "first_chicago",
    name: "First Chicago Method",
    family: "valuation",
    purpose: "Makes the distribution of outcomes visible instead of collapsing it to a point.",
  },
  {
    id: "risk_analysis",
    name: "Risk Analysis",
    family: "risk",
    purpose: "Forces the failure modes into the open.",
  },
];

const BY_ID = new Map(METHODOLOGY_META.map((meta) => [meta.id, meta]));

export const getMethodology = (id: string): MethodologyMeta | undefined => BY_ID.get(id);

export const methodologyName = (id: string): string => BY_ID.get(id)?.name ?? id;

export const isValuationMethodology = (id: string): boolean => BY_ID.get(id)?.family === "valuation";
