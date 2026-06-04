/**
 * Batch fact-sheet generation for the Solutions Atlas.
 * Usage: pass the keys inline (dotenv skips a couple) then run with tsx:
 *   export ANTHROPIC_API_KEY=...  NVIDIA_API_KEY=...
 *   npx tsx scripts/generate-factsheets.ts
 * Each programme → Claude web search → grounded cited fact sheet → auto-publish
 * (well-sourced) or flag → embed into the RAG. Idempotent-ish (upsert by slug).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const PROGRAMMES = [
  "Andhra Pradesh Community-Managed Natural Farming APCNF",
  "Paramparagat Krishi Vikas Yojana PKVY India",
  "National Mission on Natural Farming NMNF India",
  "Bharatiya Prakritik Krishi Paddhati BPKP India",
  "Sikkim Organic Mission",
  "Mission Organic Value Chain Development for North Eastern Region MOVCDNER",
  "Himachal Pradesh Prakritik Kheti Khushhal Kisan Yojana",
  "Gujarat Natural Farming Mission",
  "Chhattisgarh Suraji Gaon Yojana Narwa Garuwa Ghurwa Bari",
  "Maharashtra Dr Panjabrao Deshmukh Natural Farming Mission",
  "Odisha Millets Mission",
  "Karnataka Zero Budget Natural Farming programme",
  "Kerala organic farming mission Jaiva Keralam",
  "Tamil Nadu organic farming mission",
  "Rajasthan natural farming programme",
  "Madhya Pradesh natural farming mission",
  "Telangana natural farming programme",
  "Punjab Kheti Virasat Mission natural farming",
  "Uttarakhand organic agriculture mission",
  "Nagaland organic farming mission",
  "National Centre for Organic and Natural Farming NCONF India",
  "ICAR Network Project on Organic Farming India",
  "WASSAN Watershed Support Services and Activities Network India",
  "BAIF Development Research Foundation wadi programme",
  "Foundation for Ecological Security FES India",
  "Watershed Organisation Trust WOTR India",
  "Deccan Development Society millets Telangana",
  "PRADAN natural resource management India",
  "Timbaktu Collective Andhra Pradesh",
  "Centre for Sustainable Agriculture CSA Hyderabad",
  "Revitalising Rainfed Agriculture Network RRA India",
  "Samaj Pragati Sahayog SPS Madhya Pradesh watershed",
  "Aga Khan Rural Support Programme India AKRSP",
  "Action for Social Advancement ASA India agriculture",
  "Reliance Foundation Bharat India Jodo agriculture",
  "Navdanya biodiversity conservation organic farming",
  "Sahaja Samrudha organic seeds Karnataka",
  "Dharamitra natural farming Maharashtra",
  "NABARD watershed development programme India",
  "NABARD wadi tribal development programme",
  "Bhoochetana programme ICRISAT Karnataka",
  "Sujala watershed project Karnataka",
  "System of Rice Intensification SRI India",
  "Odisha Integrated Irrigation Project for Climate Resilient Agriculture OIIPCRA",
  "Meghalaya Integrated Basin Development and Livelihood Promotion Programme",
  "Nagaland Environmental Protection and Economic Development NEPED",
  "Kudumbashree Kerala farming collectives",
  "Jalyukt Shivar Abhiyan Maharashtra watershed",
  "Sikkim agriculture organic value chain",
  "Andhra Pradesh Drought Mitigation Project APDMP",
  "Rythu Sadhikara Samstha RySS natural farming",
  "Millet mission India Shree Anna",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { generateFactSheet } = await import("../lib/factsheet/generate");
  const results = { published: 0, flagged: 0, refused: 0, error: 0 };
  const total = PROGRAMMES.length;

  // Sequential with exponential backoff on 429 — web search has a tight
  // per-minute limit on this account, so we pace ourselves.
  async function genWithRetry(q: string, attempt = 0): Promise<Awaited<ReturnType<typeof generateFactSheet>>> {
    try {
      return await generateFactSheet(q);
    } catch (e) {
      const msg = String((e as Error).message || "");
      if ((msg.includes("429") || msg.includes("rate_limit") || msg.includes("overloaded")) && attempt < 8) {
        const wait = 30000 * (attempt + 1); // 30s, 60s, 90s … up to 4 min
        console.log(`  …rate-limited, waiting ${wait / 1000}s (attempt ${attempt + 1})`);
        await sleep(wait);
        return genWithRetry(q, attempt + 1);
      }
      throw e;
    }
  }

  for (let i = 0; i < total; i++) {
    const q = PROGRAMMES[i];
    try {
      const r = await genWithRetry(q);
      if (r.ok) {
        results[r.status === "published" ? "published" : "flagged"]++;
        console.log(`[${i + 1}/${total}] ${r.status.toUpperCase().padEnd(9)} ${r.sheet.title.slice(0, 60)}`);
      } else {
        results.refused++;
        console.log(`[${i + 1}/${total}] REFUSED   ${q.slice(0, 48)} — ${r.reason.slice(0, 50)}`);
      }
    } catch (e) {
      results.error++;
      console.log(`[${i + 1}/${total}] ERROR     ${q.slice(0, 48)} — ${String((e as Error).message).slice(0, 70)}`);
    }
    await sleep(2000);
  }

  console.log(`\nDONE. published=${results.published} flagged=${results.flagged} refused=${results.refused} error=${results.error}`);
  process.exit(0);
}
main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
