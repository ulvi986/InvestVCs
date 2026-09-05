// Business Model Canvas analysis.
//
// The nine block keys are shared with `src/pages/VentureAnalysis.tsx`, so a
// canvas the founder filled in there feeds this agent directly.


export const BMC_BLOCK_KEYS = [
  "key_partners", "key_activities", "key_resources", "value_propositions",
  "customer_relationships", "channels", "customer_segments",
  "cost_structure", "revenue_streams",
] as const;

export type BmcBlockKey = (typeof BMC_BLOCK_KEYS)[number];

export function bmcFilledBlocks(canvas: Record<string, string> | null | undefined): BmcBlockKey[] {
  return BMC_BLOCK_KEYS.filter((key) => String(canvas?.[key] ?? "").trim().length > 0);
}
