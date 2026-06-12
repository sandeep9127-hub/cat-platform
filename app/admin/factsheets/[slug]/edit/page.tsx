import Link from "next/link";
import { notFound } from "next/navigation";
import { getFactSheet } from "@/lib/factsheet/generate";
import { CATEGORIES } from "@/lib/data/categories";

export const dynamic = "force-dynamic";

const SCALE_BANDS = [
  "pilot", "block", "district", "multi_district", "state", "multi_state", "national",
];

const labelClass = "block font-mono text-[10px] uppercase tracking-[0.12em] text-muted mb-1.5";
const inputClass =
  "w-full bg-cream border border-line rounded-[6px] px-3 py-2 text-[13.5px] text-ink font-serif focus:outline-none focus:border-deep-teal";

function Field({
  name, label, defaultValue, type = "text",
}: { name: string; label: string; defaultValue?: string | number | null; type?: string }) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className={inputClass}
      />
    </div>
  );
}

function Area({
  name, label, defaultValue, rows = 4,
}: { name: string; label: string; defaultValue?: string | null; rows?: number }) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>{label}</label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className={`${inputClass} resize-y`}
      />
    </div>
  );
}

export default async function EditFactSheet({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getFactSheet(slug, { includeUnpublished: true });
  if (!s) notFound();

  const insight = s.insight ?? {
    whats_working: null, whats_hard: null, why_it_matters: null, whats_next: null,
  };
  const themes = Array.isArray(s.themes) ? s.themes : [];
  const principles = Array.isArray(s.principle_alignment) ? s.principle_alignment : [];
  const metricsJson = JSON.stringify(Array.isArray(s.metrics) ? s.metrics : [], null, 2);
  const outcomesJson = JSON.stringify(Array.isArray(s.outcomes) ? s.outcomes : [], null, 2);

  return (
    <div className="space-y-6 max-w-[760px]">
      <header>
        <span className="mono-label">Solutions Atlas</span>
        <h1 className="font-serif text-[32px] sm:text-[38px] font-normal tracking-[-0.02em] text-ink mt-2">
          Edit fact sheet
        </h1>
        <p className="font-serif italic text-[15px] text-ink-soft mt-2 max-w-[64ch] font-light">
          Hand-correct an auto-generated sheet. Saving re-embeds it into Ask and marks it human-edited.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mt-3">
          {s.slug} · status {s.status}
        </p>
      </header>

      <form
        action={`/api/admin/factsheets/${encodeURIComponent(s.slug)}`}
        method="POST"
        className="space-y-5"
      >
        <Field name="title" label="Title" defaultValue={s.title} />
        <Field name="one_liner" label="One liner" defaultValue={s.one_liner} />
        <Area name="summary" label="Summary" defaultValue={s.summary} rows={3} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="lead_organisation" label="Lead organisation" defaultValue={s.lead_organisation} />
          <Field name="district" label="District" defaultValue={s.district} />
          <Field name="state_code" label="State code (2-letter)" defaultValue={s.state_code} />
          <Field name="start_year" label="Start year" defaultValue={s.start_year} type="number" />
          <div>
            <label htmlFor="scale_band" className={labelClass}>Scale band</label>
            <select
              id="scale_band"
              name="scale_band"
              defaultValue={s.scale_band ?? ""}
              className={inputClass}
            >
              <option value="">(none)</option>
              {SCALE_BANDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="source_name" label="Source name" defaultValue={s.source_name} />
          <Field name="source_url" label="Source URL" defaultValue={s.source_url} />
        </div>

        <div>
          <span className={labelClass}>Categories (Atlas themes)</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <label
                key={c.slug}
                className="flex items-center gap-2 bg-cream border border-line rounded-[6px] px-3 py-2 text-[13px] text-ink cursor-pointer hover:border-deep-teal has-[:checked]:border-deep-teal has-[:checked]:bg-deep-teal/5"
              >
                <input
                  type="checkbox"
                  name="themes"
                  value={c.slug}
                  defaultChecked={themes.includes(c.slug)}
                  className="accent-deep-teal"
                />
                <span style={{ color: c.colourHex }} className="font-medium">{c.short}</span>
              </label>
            ))}
          </div>
          <p className="font-mono text-[10px] text-muted mt-1.5">
            These drive the Atlas filter and the landing-page counts. Pick from the list, do not free-type.
          </p>
        </div>
        <Field
          name="principle_alignment"
          label="Principle alignment (comma-separated slugs)"
          defaultValue={principles.join(", ")}
        />

        <fieldset className="space-y-4 border border-line rounded-[8px] p-4">
          <legend className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted px-2">
            Insight
          </legend>
          <Area name="whats_working" label="What is working" defaultValue={insight.whats_working} rows={2} />
          <Area name="whats_hard" label="What is hard" defaultValue={insight.whats_hard} rows={2} />
          <Area name="why_it_matters" label="Why it matters" defaultValue={insight.why_it_matters} rows={2} />
          <Area name="whats_next" label="What is next" defaultValue={insight.whats_next} rows={2} />
        </fieldset>

        <Area
          name="metrics"
          label="Metrics (JSON array of {label, value, source_url})"
          defaultValue={metricsJson}
          rows={6}
        />
        <Area
          name="outcomes"
          label="Outcomes (JSON array of {claim, figure, source_url})"
          defaultValue={outcomesJson}
          rows={6}
        />
        <p className="font-mono text-[10px] text-muted">
          Bad JSON in either box keeps the existing value, it will not blank the field.
        </p>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="font-mono text-[10px] uppercase tracking-[0.12em] bg-deep-teal text-cream px-4 py-2 rounded-[6px] hover:bg-teal"
          >
            Save
          </button>
          <Link
            href="/admin/factsheets"
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink no-underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
