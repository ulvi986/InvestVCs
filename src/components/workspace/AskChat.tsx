// Ask.
//
// A conversation about the company, in the shape people already know: the
// thread fills the panel, the composer sits at the bottom, and the answer
// streams into place under the question.
//
// It answers rather than acts. Nothing typed here starts a run or changes a
// result - that is the Company tab's job - which is what makes it safe to let
// the model answer freely while the pipeline stays structured.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, RotateCcw } from "lucide-react";
import { ServiceError, askAboutCompany, isServiceConfigured } from "@/lib/analyst/service";
import type { AskContext, AskTurn } from "@/lib/analyst/service";

/** Shown on an empty thread. Questions worth asking, not placeholder filler. */
const SUGGESTIONS = [
  "What is the biggest risk here?",
  "Why do the valuation methods disagree?",
  "What would you need to raise your confidence?",
  "Summarise this for an investment committee",
];

export interface AskChatProps {
  /** Everything the answer may be grounded in. Rebuilt by the page as the run
   *  progresses, so a question asked mid-analysis sees what exists so far. */
  context: AskContext;
  /** Name for the empty state. Falls back to neutral wording when unknown. */
  startupName?: string;
  /** True once a run has produced results, which changes what can be asked. */
  hasAnalysis: boolean;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  basis?: string[];
  /** The model could not be reached; the turn is informational, not an answer. */
  degraded?: boolean;
  failed?: boolean;
}

export const AskChat = ({ context, startupName, hasAnalysis }: AskChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(1);
  // Read at send time so a question always carries the newest analysis, without
  // the send handler being re-created on every streamed event.
  const contextRef = useRef(context);
  contextRef.current = context;

  const configured = isServiceConfigured();

  // Pin to the newest turn. Layout effect so the jump happens before paint
  // rather than as a visible scroll.
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages, pending]);

  // Cmd/Ctrl-K puts the cursor here from anywhere in the workspace.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || pending || !configured) return;

    const asked: Message = { id: nextId.current++, role: "user", content: trimmed };
    // Captured before the state update so the model sees the thread as it was
    // when the question was asked, without this turn duplicated in it.
    const history: AskTurn[] = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setMessages((prev) => [...prev, asked]);
    setValue("");
    setPending(true);

    try {
      const reply = await askAboutCompany(trimmed, contextRef.current, history);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "assistant",
          content: reply.answer,
          basis: reply.basis,
          degraded: reply.degraded,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "assistant",
          failed: true,
          content:
            error instanceof ServiceError
              ? error.message
              : "That question could not be answered just now.",
        },
      ]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift-Enter breaks the line: the convention every chat uses.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(value);
    }
  };

  const subject = startupName?.trim() || "this company";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Thread */}
      <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-[560px] pt-6">
            <h2 className="text-[19px] leading-tight tracking-[-0.02em] text-[var(--ink-1)]">
              Ask about {subject}
            </h2>
            <p className="measure mt-2 text-[13.5px] leading-relaxed text-[var(--ink-2)]">
              {hasAnalysis
                ? "Answered from this company's analysis - the methodology results, the critique and the thesis."
                : "No analysis has run yet, so answers come from the description on the Company tab. Run one there for a fuller picture."}
            </p>

            <div className="mt-6 space-y-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  disabled={!configured}
                  className="block w-full rounded-[var(--radius)] border border-[var(--rule)] px-3.5 py-2.5
                             text-left text-[13.5px] text-[var(--ink-2)] transition-colors
                             hover:border-[var(--rule-strong)] hover:bg-[var(--band)]
                             disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[640px] space-y-6">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div
                    className="max-w-[85%] whitespace-pre-wrap rounded-[14px] bg-[var(--band)] px-3.5 py-2.5
                               text-[13.5px] leading-relaxed text-[var(--ink-1)]"
                  >
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="space-y-2.5">
                  <p
                    className={`whitespace-pre-wrap text-[13.5px] leading-relaxed ${
                      message.failed ? "text-[var(--negative)]" : "text-[var(--ink-1)]"
                    }`}
                  >
                    {message.content}
                  </p>

                  {/* What the answer rested on, so a claim can be checked rather
                      than taken on trust. */}
                  {message.basis && message.basis.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {message.basis.map((item, index) => (
                        <span
                          key={index}
                          className="rounded-full border border-[var(--rule)] px-2 py-0.5
                                     text-[11px] text-[var(--ink-3)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            {pending && (
              <div className="flex items-center gap-2 text-[13px] text-[var(--ink-3)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Thinking
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-[var(--rule)] bg-[var(--surface)] px-5 py-4">
        <div className="mx-auto max-w-[640px]">
          <div
            className="flex items-end gap-2 rounded-[var(--radius)] border border-[var(--rule-strong)]
                       bg-[var(--page)] px-3 py-2 focus-within:border-[var(--accent-ink)]"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                // Grow with the question, up to a point, then scroll.
                const el = event.target;
                el.style.height = "auto";
                el.style.height = `${Math.min(160, el.scrollHeight)}px`;
              }}
              onKeyDown={onKeyDown}
              disabled={!configured}
              placeholder={configured ? `Ask about ${subject}…` : "The analyst service is not configured."}
              aria-label="Ask a question about this company"
              className="max-h-[160px] min-h-[24px] flex-1 resize-none bg-transparent text-[13.5px]
                         leading-relaxed text-[var(--ink-1)] placeholder:text-[var(--ink-3)]
                         focus:outline-none disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => void send(value)}
              disabled={!value.trim() || pending || !configured}
              aria-label="Send"
              className="mb-0.5 shrink-0 rounded-full bg-[var(--accent-ink)] p-1.5 text-white
                         transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11.5px] text-[var(--ink-3)]">
              Answers from this company's analysis. It cannot start or change a run.
            </p>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="inline-flex items-center gap-1 text-[11.5px] text-[var(--ink-3)]
                           transition-colors hover:text-[var(--ink-1)]"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AskChat;
