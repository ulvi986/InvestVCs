// The assessment surfaces.
//
// The load-bearing assertion in this file is the negative one: while a
// founder is answering, nothing on screen reveals what an answer is worth. If
// a score or a dollar figure ever leaks into the interview, the whole
// evidence-based design collapses into a form people optimise against.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";

import QuestionCard from "@/components/assessment/QuestionCard";
import SectionRail from "@/components/assessment/SectionRail";
import ContradictionGate from "@/components/assessment/ContradictionGate";

import {
  QUESTION_BY_ID,
  collectSignals,
  detectContradictions,
  evaluate,
  progress,
  type AnswerMap,
} from "@/lib/assessment";

const at = new Date("2026-01-01T00:00:00.000Z").toISOString();
const pick = (map: AnswerMap, id: string, ...selected: string[]): AnswerMap => ({
  ...map,
  [id]: { questionId: id, selected, answeredAt: at },
});
const enter = (map: AnswerMap, id: string, value: number): AnswerMap => ({
  ...map,
  [id]: { questionId: id, value, answeredAt: at },
});

/** A plausible seed-stage company, answered consistently. */
function sampleAnswers(): AnswerMap {
  let answers: AnswerMap = {};
  answers = pick(answers, "stage_state", "paying");
  answers = pick(answers, "sector", "saas_b2b");
  answers = enter(answers, "months_active", 20);
  answers = pick(answers, "legal_base", "clean");
  answers = pick(answers, "team_track", "launched_paid");
  answers = enter(answers, "team_fulltime", 2);
  answers = pick(answers, "team_commitment", "left_jobs");
  answers = pick(answers, "team_technical", "founder");
  answers = pick(answers, "team_prior", "employee_early");
  answers = pick(answers, "team_domain", "lived");
  answers = pick(answers, "team_gaps", "engineering", "design", "sales");
  answers = pick(answers, "team_retention", "none");
  answers = pick(answers, "market_basis", "bottom_up");
  answers = enter(answers, "market_sam", 180_000_000);
  answers = pick(answers, "market_buyers", "role_precise");
  answers = pick(answers, "market_growth", "growing_evidenced");
  answers = pick(answers, "market_timing", "tech");
  answers = pick(answers, "product_external_use", "production");
  answers = pick(answers, "product_completeness", "onboarded");
  answers = pick(answers, "tech_difficulty", "many_months");
  answers = pick(answers, "tech_ip", "trade_secret");
  answers = pick(answers, "tech_dependency", "swap");
  answers = enter(answers, "users_total", 2400);
  answers = enter(answers, "users_active", 610);
  answers = pick(answers, "usage_pattern", "weekly");
  answers = pick(answers, "repeat_share", "about_half");
  answers = pick(answers, "retention_measure", "analytics");
  answers = enter(answers, "revenue_mrr", 14_000);
  answers = enter(answers, "paying_customers", 22);
  answers = pick(answers, "revenue_evidence", "bank");
  answers = pick(answers, "revenue_growth", "grew");
  answers = pick(answers, "churn", "most");
  answers = pick(answers, "revenue_concentration", "under_30");
  answers = pick(answers, "gross_margin", "good");
  answers = pick(answers, "channel_repeatable", "outbound");
  answers = pick(answers, "cac_known", "measured");
  answers = pick(answers, "ltv_cac", "two_three");
  answers = pick(answers, "sales_cycle", "weeks");
  answers = pick(answers, "competitors_named", "few_direct");
  answers = pick(answers, "alternative_today", "spreadsheets");
  answers = pick(answers, "competitor_copy", "switching");
  answers = pick(
    answers, "moat_rank",
    "switching_costs", "proprietary_data", "network_effects", "technology", "brand", "execution_speed",
  );
  answers = pick(answers, "win_loss", "budget");
  answers = enter(answers, "runway", 11);
  answers = enter(answers, "burn", 32_000);
  answers = pick(answers, "funding_history", "angel");
  answers = enter(answers, "raise_usd" in QUESTION_BY_ID ? "raise_usd" : "raise_amount", 1_500_000);
  answers = pick(answers, "books", "software");
  answers = pick(answers, "partners", "pilot");
  answers = pick(answers, "key_person", "slow");
  answers = pick(answers, "regulatory", "none");
  answers = pick(
    answers, "biggest_risk",
    "distribution", "demand", "capital", "competition", "build", "team",
  );
  answers = pick(answers, "assumption_test", "specific_test");
  return answers;
}

const answers = sampleAnswers();
const result = evaluate(answers);

/* ── The interview ────────────────────────────────────────────────────── */

describe("interview", () => {
  it("asks the question and shows nothing about what an answer is worth", () => {
    const question = QUESTION_BY_ID.team_track;
    const { container } = render(
      <QuestionCard question={question} index={4} onAnswer={() => {}} />,
    );

    expect(screen.getByText(question.prompt)).toBeInTheDocument();
    for (const option of question.options ?? []) {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    }

    // No dollar figures, no "n/10", no percentages beside options.
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toMatch(/\d+\s*(points?|pts|\/\s*(5|10|100))/i);
    expect(text).not.toMatch(/\bscore\b/i);
  });

  it("returns the chosen option", () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={QUESTION_BY_ID.team_track} index={1} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("Built a working MVP with active users"));
    expect(onAnswer).toHaveBeenCalledWith({ selected: ["mvp_users"] });
  });

  it("holds a multi-select until the founder confirms, and honours the escape hatch", () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={QUESTION_BY_ID.team_gaps} index={1} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByText("Engineering"));
    fireEvent.click(screen.getByText("Finance and operations"));
    expect(onAnswer).not.toHaveBeenCalled();

    // "None of these" clears everything else rather than adding to it.
    fireEvent.click(screen.getByText("None of these are covered full-time yet"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onAnswer).toHaveBeenCalledWith({ selected: ["none"] });
  });

  it("refuses an out-of-range figure and accepts a valid one", () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={QUESTION_BY_ID.team_fulltime} index={1} onAnswer={onAnswer} />);

    const field = screen.getByRole("textbox");
    fireEvent.change(field, { target: { value: "99" } }); // max is 10
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();

    fireEvent.change(field, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onAnswer).toHaveBeenCalledWith({ value: 2 });
  });

  it("reorders a ranking and submits the full order", () => {
    const onAnswer = vi.fn();
    render(<QuestionCard question={QUESTION_BY_ID.moat_rank} index={1} onAnswer={onAnswer} />);

    fireEvent.click(screen.getByLabelText("Move Proprietary data up"));
    fireEvent.click(screen.getByRole("button", { name: /confirm order/i }));

    const submitted = onAnswer.mock.calls[0][0].selected as string[];
    expect(submitted[0]).toBe("proprietary_data");
    expect(submitted).toHaveLength(6);
  });

  it("shows progress against the branch actually being asked", () => {
    const partial = pick({}, "stage_state", "concept");
    render(
      <SectionRail progress={progress(partial, collectSignals(partial))} currentSection="team" />,
    );
    expect(screen.getByText("Traction")).toBeInTheDocument();
    expect(screen.getByLabelText("Assessment progress")).toBeInTheDocument();
  });

  it("interrupts on a contradiction and offers both answers for revision", () => {
    let conflicting = pick({}, "stage_state", "live_free");
    conflicting = enter(conflicting, "users_total", 50);
    conflicting = enter(conflicting, "users_active", 1000);
    const contradiction = detectContradictions(conflicting)[0];

    const onRevise = vi.fn();
    const onResolve = vi.fn();
    render(
      <ContradictionGate contradiction={contradiction} onRevise={onRevise} onResolve={onResolve} />,
    );

    expect(screen.getByText(contradiction.message)).toBeInTheDocument();
    expect(screen.getByText(contradiction.clarification)).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Change my answer to:")[0]);
    expect(onRevise).toHaveBeenCalledWith(contradiction.questionIds[0]);

    // Explaining requires an actual explanation.
    fireEvent.click(screen.getByText(/both are correct/i));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "One account covers a whole team of users." },
    });
    fireEvent.click(screen.getByRole("button", { name: /record and continue/i }));
    expect(onResolve).toHaveBeenCalledWith("explained", "One account covers a whole team of users.");
  });
});
