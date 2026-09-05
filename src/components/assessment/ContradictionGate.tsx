// The interruption.
//
// When two answers cannot both be true, the interview stops and says so. It
// quotes both sides, states what each implies, and offers exactly three ways
// out: change one answer, change the other, or explain. There is no
// "continue anyway" — but "explain" is a real option, because sometimes the
// founder is right and the rule is too blunt.

import { useState } from "react";
import { AlertTriangle, PenLine } from "lucide-react";

import { QUESTION_BY_ID, type Contradiction, type Resolution } from "@/lib/assessment";

interface ContradictionGateProps {
  contradiction: Contradiction;
  onRevise: (questionId: string) => void;
  onResolve: (outcome: Resolution["outcome"], note?: string) => void;
}

export const ContradictionGate = ({ contradiction, onRevise, onResolve }: ContradictionGateProps) => {
  const [note, setNote] = useState("");
  const [explaining, setExplaining] = useState(false);

  return (
    <section className="enter-up" aria-live="polite">
      <p className="kicker flex items-center gap-2" style={{ color: "var(--caution)" }}>
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Possible inconsistency
      </p>

      <h2 className="mt-4 max-w-[28ch] text-[26px] font-medium leading-[1.25] tracking-[-0.025em] text-[var(--ink-1)] sm:text-[30px]">
        {contradiction.title}
      </h2>

      <p className="measure mt-4 text-[15px] leading-[1.7] text-[var(--ink-2)]">{contradiction.message}</p>

      <div
        className="mt-6 border-l-2 py-1 pl-4"
        style={{ borderColor: "var(--caution)" }}
      >
        <p className="text-[15px] leading-[1.6] text-[var(--ink-1)]">{contradiction.clarification}</p>
      </div>

      <div className="mt-8">
        <p className="kicker">Settle it</p>
        <div className="mt-3 space-y-2">
          {contradiction.questionIds.map((questionId) => {
            const question = QUESTION_BY_ID[questionId];
            if (!question) return null;
            return (
              <button
                key={questionId}
                type="button"
                onClick={() => onRevise(questionId)}
                className="flex w-full items-start gap-3 border border-[var(--rule)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--rule-strong)] hover:bg-[var(--band)]"
              >
                <PenLine className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" aria-hidden />
                <span>
                  <span className="block text-[13.5px] text-[var(--ink-1)]">Change my answer to:</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-[var(--ink-3)]">{question.prompt}</span>
                </span>
              </button>
            );
          })}

          {explaining ? (
            <div className="border border-[var(--rule)] bg-[var(--surface)] p-4">
              <label htmlFor="contradiction-note" className="block text-[13.5px] text-[var(--ink-1)]">
                Both answers are right. Here is why:
              </label>
              <textarea
                id="contradiction-note"
                autoFocus
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="mt-3 w-full resize-none border border-[var(--rule)] bg-[var(--page)] p-3 text-[13.5px] leading-relaxed text-[var(--ink-1)] outline-none focus:border-[var(--accent-ink)]"
                placeholder="One customer account covers many individual users, so seats exceed signups."
              />
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-3)]">
                Your explanation is recorded and shown on the results page. Confidence in the affected scores stays
                below where it would sit if the figures simply agreed.
              </p>
              <button
                type="button"
                onClick={() => onResolve("explained", note.trim() || undefined)}
                disabled={note.trim().length < 8}
                className="mt-4 bg-[var(--accent-ink)] px-5 py-2.5 text-[13px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
              >
                Record and continue
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setExplaining(true)}
              className="flex w-full items-start gap-3 border border-[var(--rule)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--rule-strong)] hover:bg-[var(--band)]"
            >
              <PenLine className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--ink-3)]" aria-hidden />
              <span className="text-[13.5px] text-[var(--ink-1)]">
                Both are correct — let me explain why
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default ContradictionGate;
