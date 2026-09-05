// Contradiction rules.
//
// Every rule reads signals that came from *different* questions. A founder
// who wants a higher number has to keep a consistent story across the whole
// interview, and the places where the story does not hold are surfaced rather
// than quietly averaged away.
//
// A rule never guesses which side is true. It states both, says what it
// implies, and asks. Resolution is the founder's job.

import type { ContradictionRule, SignalState } from "../types";

const n = (state: SignalState, key: string): number | null => {
  const value = state[key];
  return typeof value === "number" && isFinite(value) ? value : null;
};

const usd = (value: number): string => `$${Math.round(value).toLocaleString("en-US")}`;

export const CONTRADICTION_RULES: ContradictionRule[] = [
  {
    id: "active_exceeds_total",
    title: "Active users exceed total users",
    severity: "high",
    affects: ["traction"],
    penalty: 0.45,
    detect: ({ signals }) => {
      const total = n(signals, "users_total");
      const active = n(signals, "users_active");
      if (total === null || active === null || active <= total) return null;
      return {
        message: `You reported ${active.toLocaleString()} users in the last 30 days but ${total.toLocaleString()} users ever. The 30-day figure cannot be larger than the all-time figure.`,
        questionIds: ["users_total", "users_active"],
        clarification: "Which of the two figures is right, and what does the other one count?",
      };
    },
  },
  {
    id: "retention_vs_pattern",
    title: "Repeat usage conflicts with the usage pattern",
    severity: "high",
    affects: ["traction", "product"],
    penalty: 0.5,
    detect: ({ signals, answerLabel }) => {
      const repeat = n(signals, "repeat_ratio");
      const pattern = signals.usage_pattern;
      if (repeat === null) return null;
      const weakPattern = pattern === "one_off" || pattern === "prompted";
      if (repeat >= 0.5 && weakPattern) {
        return {
          message: `You said ${Math.round(repeat * 100)}% of users come back, but described the usage pattern as "${answerLabel("usage_pattern")}". Those two describe different products.`,
          questionIds: ["repeat_share", "usage_pattern"],
          clarification: "Do most users return on their own, or do they mostly return because you contact them?",
        };
      }
      if (repeat <= 0.1 && (pattern === "habitual" || pattern === "recurring")) {
        return {
          message: `You described usage as "${answerLabel("usage_pattern")}", but reported that under 10% of users ever come back a second time.`,
          questionIds: ["repeat_share", "usage_pattern"],
          clarification: "Is the habitual usage true of a small core group rather than of users overall?",
        };
      }
      return null;
    },
  },
  {
    id: "revenue_without_customers",
    title: "Revenue without paying customers",
    severity: "high",
    affects: ["traction", "financial"],
    penalty: 0.4,
    detect: ({ signals }) => {
      const mrr = n(signals, "mrr_usd");
      const customers = n(signals, "paying_customers");
      if (mrr === null || customers === null) return null;
      if (mrr > 0 && customers === 0) {
        return {
          message: `You reported ${usd(mrr)} collected last month but zero customers paying last month.`,
          questionIds: ["revenue_mrr", "paying_customers"],
          clarification: "Was that revenue a one-off, or from customers who paid in an earlier month?",
        };
      }
      if (mrr === 0 && customers > 0) {
        return {
          message: `You reported ${customers} paying customers last month but nothing collected.`,
          questionIds: ["revenue_mrr", "paying_customers"],
          clarification: "Have those customers been invoiced but not yet paid?",
        };
      }
      return null;
    },
  },
  {
    id: "paying_exceeds_users",
    title: "More paying customers than users",
    severity: "medium",
    affects: ["traction"],
    penalty: 0.6,
    detect: ({ signals }) => {
      const customers = n(signals, "paying_customers");
      const total = n(signals, "users_total");
      if (customers === null || total === null || customers <= total) return null;
      return {
        message: `You reported ${customers.toLocaleString()} paying customers but ${total.toLocaleString()} people who have ever used the product.`,
        questionIds: ["paying_customers", "users_total"],
        clarification: "Do accounts cover multiple users each — one customer, many seats?",
      };
    },
  },
  {
    id: "launch_claim_vs_state",
    title: "Stated progress conflicts with product state",
    severity: "high",
    affects: ["product", "team", "traction"],
    penalty: 0.45,
    detect: ({ signals, answerLabel }) => {
      const claimsPaid = signals.claims_paying_launch === true;
      const usage = n(signals, "external_usage");
      if (claimsPaid && !signals.has_revenue) {
        return {
          message: `The team's last twelve months were described as launching a product paying customers use, but the product's current state was given as "${answerLabel("stage_state")}".`,
          questionIds: ["team_track", "stage_state"],
          clarification: "Are there customers paying today, or did that revenue stop?",
        };
      }
      if (claimsPaid && usage !== null && usage <= 1) {
        return {
          message: `You reported launching to paying customers, but also that the product has only been demonstrated by the team rather than used independently.`,
          questionIds: ["team_track", "product_external_use"],
          clarification: "Do customers run the product themselves, or does the team operate it for them?",
        };
      }
      return null;
    },
  },
  {
    id: "large_market_weak_basis",
    title: "Large market from a weak basis",
    severity: "medium",
    affects: ["market"],
    penalty: 0.55,
    detect: ({ signals }) => {
      const sam = n(signals, "sam_usd");
      const basis = signals.market_basis;
      if (sam === null || sam < 1_000_000_000) return null;
      if (basis !== "estimate" && basis !== "interviews") return null;
      return {
        message: `A reachable market of ${usd(sam)} was entered, sourced from ${basis === "estimate" ? "your own estimate" : "extrapolated interviews"}. At that size the figure carries the weight of the method behind it, and that method cannot support it.`,
        questionIds: ["market_sam", "market_basis"],
        clarification: "Can you rebuild this bottom-up: how many buyers can you name, and what would each pay per year?",
      };
    },
  },
  {
    id: "unit_economics_vs_churn",
    title: "Unit economics conflict with retention",
    severity: "medium",
    affects: ["gtm", "financial"],
    penalty: 0.6,
    detect: ({ signals, answerLabel }) => {
      const ltv = n(signals, "ltv_cac_band");
      const retention = n(signals, "retention_band");
      if (ltv === null || retention === null || retention < 0) return null;
      if (ltv >= 3 && retention <= 1) {
        return {
          message: `Customers were reported to pay more than three times their acquisition cost, while six-month retention was given as "${answerLabel("churn")}". A lifetime value that high needs customers who stay.`,
          questionIds: ["ltv_cac", "churn"],
          clarification: "Over how many months is that lifetime value calculated, and what retention does it assume?",
        };
      }
      return null;
    },
  },
  {
    id: "commitment_vs_fulltime",
    title: "Commitment conflicts with full-time headcount",
    severity: "medium",
    affects: ["team"],
    penalty: 0.6,
    detect: ({ signals }) => {
      const fulltime = n(signals, "founders_fulltime");
      const commitment = n(signals, "commitment_level");
      if (fulltime === null || commitment === null) return null;
      if (fulltime === 0 && commitment >= 3) {
        return {
          message: `You reported that founders left salaried jobs to do this, and separately that no founder currently works on it full-time.`,
          questionIds: ["team_fulltime", "team_commitment"],
          clarification: "How many founders are working on this as their main occupation this month?",
        };
      }
      if (fulltime >= 2 && commitment === 1) {
        return {
          message: `You reported ${fulltime} full-time founders, and separately that the company runs alongside full-time employment.`,
          questionIds: ["team_fulltime", "team_commitment"],
          clarification: "Which is it today — full-time on this, or alongside other jobs?",
        };
      }
      return null;
    },
  },
  {
    id: "growth_without_base",
    title: "Growth reported without a base to grow from",
    severity: "medium",
    affects: ["traction"],
    penalty: 0.65,
    detect: ({ signals }) => {
      const growth = n(signals, "growth_band");
      const mrr = n(signals, "mrr_usd");
      if (growth === null || mrr === null) return null;
      if (growth >= 3 && mrr < 500) {
        return {
          message: `Strong revenue growth was reported on ${usd(mrr)} collected last month. At that level a percentage change describes a handful of dollars rather than a trend.`,
          questionIds: ["revenue_growth", "revenue_mrr"],
          clarification: "What were the actual dollar figures for each of the last three months?",
        };
      }
      return null;
    },
  },
  {
    id: "no_competition_claim",
    title: "No competition claimed alongside a large market",
    severity: "medium",
    affects: ["competition", "market"],
    penalty: 0.6,
    detect: ({ signals }) => {
      const sam = n(signals, "sam_usd");
      if (signals.claims_no_competition !== true) return null;
      if (sam === null || sam < 100_000_000) return null;
      return {
        message: `You reported a reachable market of ${usd(sam)} with nobody else serving it. A market that size with no competitor usually means either the market is smaller than stated, or the competitors are not being counted.`,
        questionIds: ["competitors_named", "market_sam"],
        clarification: "What do the customers you spoke to use today instead — including manual processes and spreadsheets?",
      };
    },
  },
  {
    id: "revenue_exceeds_market",
    title: "Revenue exceeds the market you described",
    severity: "high",
    affects: ["market", "traction"],
    penalty: 0.5,
    detect: ({ signals }) => {
      const mrr = n(signals, "mrr_usd");
      const sam = n(signals, "sam_usd");
      if (mrr === null || sam === null || mrr <= 0 || sam <= 0) return null;
      const arr = mrr * 12;
      if (arr <= sam * 0.5) return null;
      return {
        message: `Annualised revenue of ${usd(arr)} sits against a reachable market you sized at ${usd(sam)}. Either the market figure is far too small, or the revenue figure includes something the market figure does not.`,
        questionIds: ["revenue_mrr", "market_sam"],
        clarification: "Does the market figure cover everything you currently sell, or only one product line?",
      };
    },
  },
  {
    id: "runway_without_source",
    title: "Runway without a funding source",
    severity: "low",
    affects: ["financial"],
    penalty: 0.7,
    detect: ({ signals }) => {
      const runway = n(signals, "runway_months");
      const burn = n(signals, "burn_usd");
      const mrr = n(signals, "mrr_usd") ?? 0;
      if (runway === null || burn === null || burn <= 0) return null;
      if (runway < 12) return null;
      const implied = runway * burn;
      if (signals.prior_funding !== "founders" || implied < 250_000 || mrr > burn) return null;
      return {
        message: `${runway} months at ${usd(burn)} a month implies about ${usd(implied)} in the bank, funded from founder savings alone with no offsetting revenue.`,
        questionIds: ["runway", "burn", "funding_history"],
        clarification: "Where is the cash for that runway coming from — savings, revenue, or an expected raise?",
      };
    },
  },
  {
    id: "usage_unmeasured_but_precise",
    title: "Precise usage figures without instrumentation",
    severity: "low",
    affects: ["traction"],
    penalty: 0.75,
    detect: ({ signals }) => {
      if (signals.usage_estimated !== true) return null;
      const total = n(signals, "users_total");
      if (total === null || total < 1000) return null;
      return {
        message: `Usage numbers in the thousands were given, alongside an answer saying they are estimated rather than tracked.`,
        questionIds: ["users_total", "retention_measure"],
        clarification: "Is there any system — a database, a login table — that could produce the real count?",
      };
    },
  },
];
