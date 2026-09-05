// One question, asked the way an analyst would ask it.
//
// The rule this component enforces: nothing on screen tells the founder what
// an answer is worth. No scores, no dollar figures beside options, no
// ordering that makes the "best" answer obvious — several questions
// deliberately put the strongest option in the middle of the list.

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, CornerDownLeft } from "lucide-react";

import { SECTION_BY_KEY, type Answer, type Question } from "@/lib/assessment";

const LETTERS = "ABCDEFGH".split("");

interface QuestionCardProps {
  question: Question;
  /** Present when the founder has come back to change an answer. */
  existing?: Answer;
  index: number;
  onAnswer: (value: Omit<Answer, "questionId" | "answeredAt">) => void;
}

export const QuestionCard = ({ question, existing, index, onAnswer }: QuestionCardProps) => {
  const section = SECTION_BY_KEY[question.section];

  return (
    <article key={question.id} className="enter-up">
      <p className="kicker">
        {section?.label ?? question.section} · Question {index}
      </p>

      <h2 className="mt-4 max-w-[24ch] text-[26px] font-medium leading-[1.25] tracking-[-0.025em] text-[var(--ink-1)] sm:max-w-[32ch] sm:text-[30px]">
        {question.prompt}
      </h2>

      {question.helper && (
        <p className="measure mt-3 text-[13.5px] leading-relaxed text-[var(--ink-3)]">{question.helper}</p>
      )}

      <div className="mt-8">
        {question.kind === "single" && <SingleChoice question={question} existing={existing} onAnswer={onAnswer} />}
        {question.kind === "multi" && <MultiChoice question={question} existing={existing} onAnswer={onAnswer} />}
        {question.kind === "number" && <NumberEntry question={question} existing={existing} onAnswer={onAnswer} />}
        {question.kind === "rank" && <RankOrder question={question} existing={existing} onAnswer={onAnswer} />}
      </div>
    </article>
  );
};

/* ── Shared option row ────────────────────────────────────────────────── */

const OptionRow = ({
  letter, label, detail, selected, multi, onSelect,
}: {
  letter: string;
  label: string;
  detail?: string;
  selected: boolean;
  multi?: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className="group flex w-full items-start gap-4 border border-[var(--rule)] bg-[var(--surface)] p-4 text-left transition-colors duration-150 hover:border-[var(--rule-strong)] hover:bg-[var(--band)]"
    style={
      selected
        ? {
            borderColor: "var(--accent-ink)",
            background: "var(--accent-wash)",
          }
        : undefined
    }
  >
    <span
      className={`mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] font-medium ${
        multi ? "" : "rounded-full"
      }`}
      style={{
        borderColor: selected ? "var(--accent-ink)" : "var(--rule-strong)",
        background: selected ? "var(--accent-ink)" : "transparent",
        color: selected ? "#fff" : "var(--ink-3)",
      }}
      aria-hidden
    >
      {selected ? <Check className="h-3 w-3" /> : letter}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[14.5px] leading-[1.55] text-[var(--ink-1)]">{label}</span>
      {detail && <span className="mt-1 block text-[12.5px] leading-relaxed text-[var(--ink-3)]">{detail}</span>}
    </span>
  </button>
);

const Continue = ({ disabled, onClick, label = "Continue" }: { disabled: boolean; onClick: () => void; label?: string }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="mt-6 inline-flex items-center gap-2 bg-[var(--accent-ink)] px-5 py-2.5 text-[13px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
  >
    {label}
    <CornerDownLeft className="h-3.5 w-3.5" aria-hidden />
  </button>
);

/* ── Single choice ────────────────────────────────────────────────────── */

const SingleChoice = ({
  question, existing, onAnswer,
}: Pick<QuestionCardProps, "question" | "existing" | "onAnswer">) => {
  const options = useMemo(() => question.options ?? [], [question.options]);

  // Number keys pick an option. The interview is long; keyboard answering
  // makes it feel like a test rather than a form.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const position = Number(event.key);
      if (!Number.isInteger(position) || position < 1 || position > options.length) return;
      onAnswer({ selected: [options[position - 1].id] });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, onAnswer]);

  return (
    <div className="space-y-2">
      {options.map((option, i) => (
        <OptionRow
          key={option.id}
          letter={LETTERS[i]}
          label={option.label}
          detail={option.detail}
          selected={existing?.selected?.[0] === option.id}
          onSelect={() => onAnswer({ selected: [option.id] })}
        />
      ))}
    </div>
  );
};

/* ── Multi choice ─────────────────────────────────────────────────────── */

const MultiChoice = ({
  question, existing, onAnswer,
}: Pick<QuestionCardProps, "question" | "existing" | "onAnswer">) => {
  const [selected, setSelected] = useState<string[]>(existing?.selected ?? []);
  const noneId = question.multi?.noneOption;

  const toggle = (id: string) => {
    setSelected((previous) => {
      if (id === noneId) return previous.includes(id) ? [] : [id];
      const without = previous.filter((value) => value !== noneId);
      return without.includes(id) ? without.filter((value) => value !== id) : [...without, id];
    });
  };

  return (
    <div>
      <div className="space-y-2">
        {(question.options ?? []).map((option, i) => (
          <OptionRow
            key={option.id}
            letter={LETTERS[i]}
            label={option.label}
            detail={option.detail}
            selected={selected.includes(option.id)}
            multi
            onSelect={() => toggle(option.id)}
          />
        ))}
      </div>
      <Continue disabled={!selected.length} onClick={() => onAnswer({ selected })} />
    </div>
  );
};

/* ── Number entry ─────────────────────────────────────────────────────── */

const NumberEntry = ({
  question, existing, onAnswer,
}: Pick<QuestionCardProps, "question" | "existing" | "onAnswer">) => {
  const [raw, setRaw] = useState(existing?.value !== undefined ? String(existing.value) : "");
  const numeric = question.numeric!;

  const parsed = raw.trim() === "" ? null : Number(raw.replace(/[,\s$]/g, ""));
  const valid =
    parsed !== null &&
    isFinite(parsed) &&
    parsed >= (numeric.min ?? 0) &&
    (numeric.max === undefined || parsed <= numeric.max);

  const submit = () => {
    if (valid) onAnswer({ value: parsed! });
  };

  return (
    <div>
      <div className="flex max-w-md items-baseline gap-3 border-b border-[var(--rule-strong)] pb-3">
        <input
          autoFocus
          inputMode="numeric"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder={numeric.placeholder}
          aria-label={question.prompt}
          className="w-full bg-transparent text-[32px] font-medium tabular-nums tracking-[-0.03em] text-[var(--ink-1)] outline-none placeholder:text-[var(--rule-strong)]"
        />
        <span className="shrink-0 text-[13px] text-[var(--ink-3)]">{numeric.unit}</span>
      </div>

      <p className="mt-3 text-[12px] text-[var(--ink-3)]">
        An honest figure is worth more than a flattering one — every number here is cross-checked against your other answers.
      </p>

      <Continue disabled={!valid} onClick={submit} />
    </div>
  );
};

/* ── Ranking ──────────────────────────────────────────────────────────── */

const RankOrder = ({
  question, existing, onAnswer,
}: Pick<QuestionCardProps, "question" | "existing" | "onAnswer">) => {
  const items = question.rank!.items;
  const initial = useMemo(() => {
    const seed = existing?.selected?.filter((id) => items.some((item) => item.id === id)) ?? [];
    return [...seed, ...items.map((item) => item.id).filter((id) => !seed.includes(id))];
  }, [existing, items]);

  const [order, setOrder] = useState<string[]>(initial);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  return (
    <div>
      <ul className="space-y-2">
        {order.map((id, index) => {
          const item = items.find((entry) => entry.id === id)!;
          return (
            <li
              key={id}
              className="flex items-center gap-4 border border-[var(--rule)] bg-[var(--surface)] p-3.5"
            >
              <span className="w-5 shrink-0 text-center text-[12px] tabular-nums text-[var(--ink-3)]">{index + 1}</span>
              <span className="min-w-0 flex-1 text-[14.5px] text-[var(--ink-1)]">{item.label}</span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${item.label} up`}
                  className="border border-[var(--rule)] p-1.5 text-[var(--ink-3)] transition-colors hover:border-[var(--rule-strong)] hover:text-[var(--ink-1)] disabled:opacity-25"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === order.length - 1}
                  aria-label={`Move ${item.label} down`}
                  className="border border-[var(--rule)] p-1.5 text-[var(--ink-3)] transition-colors hover:border-[var(--rule-strong)] hover:text-[var(--ink-1)] disabled:opacity-25"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <Continue disabled={false} onClick={() => onAnswer({ selected: order })} label="Confirm order" />
    </div>
  );
};

export default QuestionCard;
