"use client";

import { useEffect, useState } from "react";

type Theme = { slug: string; name: string; colourHex: string };
type State = { code: string | null; name: string };

const STORAGE_KEY = "cat-contribute-draft";
const SCALE_OPTIONS: { value: string; label: string }[] = [
  { value: "pilot", label: "Pilot" },
  { value: "block", label: "Block" },
  { value: "district", label: "District" },
  { value: "multi_district", label: "Multi-district" },
  { value: "state", label: "State" },
  { value: "multi_state", label: "Multi-state" },
  { value: "national", label: "National" },
];

type FormState = {
  email: string;
  organisation: string;
  title: string;
  tagline: string;
  themeSlug: string;
  stateCode: string;
  scaleBand: string;
  startYear: string;
  context: string;
  whatWasAttempted: string;
  whatWasAchieved: string;
  whatWorked: string;
  whatDidNotWork: string;
  sourceUrls: string;
};

const initialState: FormState = {
  email: "",
  organisation: "",
  title: "",
  tagline: "",
  themeSlug: "",
  stateCode: "",
  scaleBand: "",
  startYear: "",
  context: "",
  whatWasAttempted: "",
  whatWasAchieved: "",
  whatWorked: "",
  whatDidNotWork: "",
  sourceUrls: "",
};

export function ContributeForm({ themes, states }: { themes: Theme[]; states: State[] }) {
  const [v, setV] = useState<FormState>(initialState);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"ok" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setV({ ...initialState, ...JSON.parse(raw) });
    } catch {}
  }, []);

  // Autosave with 600ms debounce
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
        setSavedAt(new Date());
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [v]);

  function update<K extends keyof FormState>(k: K, val: FormState[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(v),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error ?? "Submission failed");
        setDone("error");
      } else {
        setDone("ok");
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
      setDone("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (done === "ok") {
    return (
      <div className="max-w-[60ch]">
        <span className="eyebrow">Thank you</span>
        <h2 className="font-serif text-[32px] font-normal text-ink mt-3 leading-[1.15]">
          Your submission is in the editor&apos;s queue.
        </h2>
        <p className="font-serif italic text-[17px] text-ink-soft leading-[1.5] mt-4 font-light">
          We&apos;ll write when we decide. If the editor has questions, they&apos;ll reach
          you at the email you provided. Typical turnaround is two weeks.
        </p>
        <a
          href="/"
          className="inline-block mt-7 font-mono text-[11px] uppercase tracking-[0.16em] text-deep-teal border-b-2 border-amber pb-1 hover:border-amber-deep transition-colors"
        >
          ← Back to the landing
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 lg:gap-12">
      <div className="space-y-7 max-w-[60ch]">
        <Field
          label="Your email"
          required
          help="Used only to reach you about this submission. Not published."
        >
          <input
            type="email"
            required
            value={v.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Lead organisation" required>
          <input
            type="text"
            required
            value={v.organisation}
            onChange={(e) => update("organisation", e.target.value)}
            className={inputCls}
            placeholder="The organisation running the programme"
          />
        </Field>

        <div className="border-t border-line-soft pt-6">
          <span className="eyebrow block mb-3">About the programme</span>

          <Field label="Title" required help="Max 120 characters. Plain, descriptive.">
            <input
              type="text"
              required
              maxLength={120}
              value={v.title}
              onChange={(e) => update("title", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label="One-line description (tagline)"
            required
            help="Max 200 characters. What the programme is and what's notable about it. No marketing words."
          >
            <input
              type="text"
              required
              maxLength={200}
              value={v.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Primary theme" required>
              <select
                required
                value={v.themeSlug}
                onChange={(e) => update("themeSlug", e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                {themes.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Primary state" required>
              <select
                required
                value={v.stateCode}
                onChange={(e) => update("stateCode", e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                {states.map((s) => (
                  <option key={s.code} value={s.code ?? ""}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Scale" required>
              <select
                required
                value={v.scaleBand}
                onChange={(e) => update("scaleBand", e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                {SCALE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Start year" required>
            <input
              type="number"
              required
              min={1900}
              max={2050}
              value={v.startYear}
              onChange={(e) => update("startYear", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="border-t border-line-soft pt-6">
          <span className="eyebrow block mb-3">The four narrative blocks</span>
          <p className="font-serif italic text-[14.5px] text-ink-soft leading-[1.55] mb-5 max-w-[58ch] font-light">
            Plain language. Short sentences. Voice over jargon. The &quot;what did not work&quot;
            block is required design infrastructure on this Platform.
          </p>

          <Field label="Context" required help="100-500 words. Background, why this programme exists.">
            <textarea
              required
              rows={5}
              value={v.context}
              onChange={(e) => update("context", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="What was attempted" required help="100-300 words.">
            <textarea
              required
              rows={4}
              value={v.whatWasAttempted}
              onChange={(e) => update("whatWasAttempted", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="What was achieved" required help="150-500 words.">
            <textarea
              required
              rows={5}
              value={v.whatWasAchieved}
              onChange={(e) => update("whatWasAchieved", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="What worked" required help="150-500 words.">
            <textarea
              required
              rows={5}
              value={v.whatWorked}
              onChange={(e) => update("whatWorked", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field
            label="What did not work"
            help="50-300 words. Strongly suggested. The Platform's editorial bar treats this as required. Be specific."
            error={v.whatDidNotWork.length > 0 && v.whatDidNotWork.length < 50 ? "At least 50 characters." : null}
          >
            <textarea
              rows={4}
              value={v.whatDidNotWork}
              onChange={(e) => update("whatDidNotWork", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field
          label="Source URLs"
          help="One per line. Reports, annual updates, evaluation studies, press coverage, partner pages."
        >
          <textarea
            rows={3}
            value={v.sourceUrls}
            onChange={(e) => update("sourceUrls", e.target.value)}
            className={inputCls}
            placeholder="https://example.org/report&#10;https://state.gov.in/programme"
          />
        </Field>

        {errorMsg && (
          <div className="bg-[rgba(184,80,66,0.06)] border-l-2 border-red-alert px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-red-alert">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-4 bg-deep-teal text-paper font-mono text-[11px] uppercase tracking-[0.16em] font-semibold rounded-[2px] hover:bg-teal transition-colors disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit for editorial review →"}
        </button>
      </div>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <div className="border-l-2 border-amber-deep pl-4">
          <span className="eyebrow block mb-2">Status</span>
          <p className="font-mono text-[10.5px] text-ink-soft leading-[1.55]">
            {savedAt ? `Saved locally · ${savedAt.toLocaleTimeString("en-GB")}` : "Autosaves locally as you type"}
          </p>
        </div>
        <div className="border-l-2 border-teal pl-4">
          <span className="eyebrow block mb-2">After you submit</span>
          <ul className="list-none p-0 m-0 flex flex-col gap-2 text-[13.5px] text-ink-soft leading-[1.55]">
            <li>1. Lands in the editor queue.</li>
            <li>2. A CAT editor reads it against your sources.</li>
            <li>3. We may ask clarifying questions by email.</li>
            <li>4. Decision: approved as CAT-endorsed, listed for transparency, or returned for edits.</li>
          </ul>
        </div>
      </aside>
    </form>
  );
}

const inputCls =
  "w-full mt-1.5 px-4 py-3 bg-cream border border-line rounded-[2px] font-serif text-[15px] leading-[1.55] text-ink focus:outline-2 focus:outline-teal focus:bg-paper transition-colors";

function Field({
  label,
  required,
  help,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-5 last:mb-0">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold flex items-center gap-1.5">
        {label}
        {required && <span className="text-amber-deep">*</span>}
      </span>
      {children}
      {help && (
        <span className="block font-serif italic text-[13px] text-muted mt-1.5 font-light">
          {help}
        </span>
      )}
      {error && (
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-red-alert mt-1.5">
          {error}
        </span>
      )}
    </label>
  );
}
