// Human-in-the-loop follow-up.
//
// The analyst ends every report by naming what it could not establish. This is
// where the user answers those questions, or pushes back on a conclusion, and
// sends the analysis round again with the new information treated as
// founder-provided evidence rather than model inference.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareWarning, RotateCcw } from "lucide-react";
import type { GapItem } from "@/lib/analyst/types";
import { USER_CHALLENGE_KEY } from "@/lib/analyst/service";
import { Eyebrow, Panel } from "./primitives";

export const FollowUpPanel = ({
  gaps, existingAnswers, onSubmit, disabled,
}: {
  gaps: GapItem[];
  existingAnswers: Record<string, string>;
  onSubmit: (answers: Record<string, string>) => void;
  disabled?: boolean;
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [challenge, setChallenge] = useState("");

  const filled = Object.values(answers).filter((value) => value.trim()).length;
  const hasChallenge = challenge.trim().length > 0;
  const canSubmit = (filled > 0 || hasChallenge) && !disabled;

  const submit = () => {
    const payload: Record<string, string> = { ...existingAnswers };
    Object.entries(answers).forEach(([question, answer]) => {
      if (answer.trim()) payload[question] = answer.trim();
    });
    if (hasChallenge) payload[USER_CHALLENGE_KEY] = challenge.trim();
    onSubmit(payload);
  };

  return (
    <Panel
      title="Answer the analyst"
      subtitle="Anything you add here is treated as founder-provided evidence and the analysis is re-run from the start."
    >
      {gaps.length > 0 && (
        <div className="space-y-4">
          <Eyebrow>Open questions</Eyebrow>
          {gaps.slice(0, 8).map((gap, i) => (
            <div key={`${gap.field}-${i}`} className="space-y-1.5">
              <p className="text-sm text-foreground/85">{gap.question}</p>
              <p className="text-[11px] font-light leading-relaxed text-muted-foreground">{gap.why}</p>
              <Textarea
                value={answers[gap.question] ?? ""}
                onChange={(event) =>
                  setAnswers((prev) => ({ ...prev, [gap.question]: event.target.value }))
                }
                placeholder="Your answer, or leave blank if you cannot answer it yet"
                className="min-h-[64px] resize-y text-sm"
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      )}

      <div className={gaps.length > 0 ? "mt-6 border-t border-[var(--rule)] pt-5" : ""}>
        <div className="flex items-center gap-2">
          <MessageSquareWarning className="h-3.5 w-3.5 text-[var(--caution)]" />
          <Eyebrow>Challenge a conclusion</Eyebrow>
        </div>
        <p className="mt-1.5 text-[11px] font-light leading-relaxed text-muted-foreground">
          Say what you think the analyst got wrong and why. The critic is required to address it explicitly on the next
          pass rather than repeat the original conclusion.
        </p>
        <Textarea
          value={challenge}
          onChange={(event) => setChallenge(event.target.value)}
          placeholder="e.g. The market sizing is too conservative — we sell to procurement teams, not just IT, which triples the addressable spend."
          className="mt-2.5 min-h-[80px] resize-y text-sm"
          disabled={disabled}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--rule)] pt-4">
        <p className="text-[11px] text-muted-foreground">
          {filled > 0 && `${filled} answer${filled === 1 ? "" : "s"}`}
          {filled > 0 && hasChallenge && " · "}
          {hasChallenge && "1 challenge"}
          {!filled && !hasChallenge && "Nothing to send yet"}
        </p>
        <Button className="gap-2 rounded-lg" disabled={!canSubmit} onClick={submit}>
          <RotateCcw className={`h-3.5 w-3.5 ${disabled ? "animate-spin" : ""}`} />
          Re-analyse with this
        </Button>
      </div>
    </Panel>
  );
};

export default FollowUpPanel;
