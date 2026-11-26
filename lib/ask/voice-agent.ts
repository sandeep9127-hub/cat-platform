import type Anthropic from "@anthropic-ai/sdk";
import type { LoopTool } from "@/lib/ai/claude";
import { hybridSearch, type Hit } from "@/lib/rag/search";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { LIP_KINDS, PASSAGE_MIN, toCitation, type Citation } from "@/lib/ask/shared";

/**
 * The voice agent's tools (docs/voice-agent-plan.md, steps 1, 3 and 4).
 * Charter: tools only read. Nothing sends, edits or deletes, and nothing opens
 * a window or tab: screen actions happen inside the page, because browsers
 * block pop-ups that don't come from a click. A link the reader may want is
 * shown as a card they tap.
 */

/** Screen actions the browser may carry out: a fixed allowlist, nothing else. */
export type ScreenAction =
  | { type: "open_sources" }
  | { type: "show_landscape"; slug: string; name: string; href: string };

export type AgentHooks = {
  /** Hits so far, in search_result order (the initial search first); tools append to it. */
  hits: Hit[];
  citations: Citation[];
  /** Builds the search_result block for a hit (shared with the plain answer path). */
  block: (h: Hit, c: Citation) => Anthropic.SearchResultBlockParam;
  scope: string | null;
  onAction: (a: ScreenAction) => void;
  onEnd: () => void;
};

const MAX_HITS = 30; // all sources in one answer, initial search included
const SLUGS = Object.keys(LANDSCAPES);

export function voiceAgentTools(h: AgentHooks): LoopTool[] {
  const searchLibrary: LoopTool = {
    def: {
      name: "search_library",
      description:
        "Search the CAT library (landscape investment plans and their intervention budgets) for passages you can cite. Use it when the passages you already have don't answer the question, for a different landscape or topic, or for exact budget figures. Write the query in English.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "A standalone search query in English." },
          landscape: { type: "string", enum: SLUGS, description: "Limit to one landscape, by slug." },
        },
        required: ["query"],
        additionalProperties: false,
      },
      strict: true,
    },
    async run(input) {
      const query = typeof input.query === "string" ? input.query.trim().slice(0, 300) : "";
      if (!query) return "No query given.";
      const landscape = typeof input.landscape === "string" && LANDSCAPES[input.landscape] ? input.landscape : h.scope;
      const room = MAX_HITS - h.hits.length;
      if (room <= 0) return "The answer already has as many sources as it can use. Answer from the passages you have.";
      const found = (await hybridSearch({ query, landscapeSlug: landscape, k: 6, sourceKinds: LIP_KINDS }))
        .filter((x) => x.score >= PASSAGE_MIN)
        // Passages already given keep their first number.
        .filter((x) => !h.hits.some((y) => y.chunkId === x.chunkId))
        .slice(0, Math.min(5, room));
      if (!found.length) return "Nothing in the library matches that. Say the library doesn't cover it rather than guessing.";
      return found.map((x) => {
        h.hits.push(x);
        const c = toCitation(x, h.hits.length);
        h.citations.push(c);
        return h.block(x, c);
      });
    },
  };

  const showOnScreen: LoopTool = {
    def: {
      name: "show_on_screen",
      description:
        "Show something on the reader's screen while you speak. 'sources' opens the list of sources for this answer. 'landscape' shows a card linking to a landscape's page (the reader taps it; never claim you opened it). Use it only when the reader asks to see something or when a long list is easier to read than to hear.",
      input_schema: {
        type: "object",
        properties: {
          what: { type: "string", enum: ["sources", "landscape"] },
          landscape: { type: "string", enum: SLUGS, description: "For 'landscape': which one." },
        },
        required: ["what"],
        additionalProperties: false,
      },
      strict: true,
    },
    async run(input) {
      if (input.what === "sources") {
        h.onAction({ type: "open_sources" });
        return "The sources are now open on screen.";
      }
      if (input.what === "landscape" && typeof input.landscape === "string" && LANDSCAPES[input.landscape]) {
        const l = LANDSCAPES[input.landscape];
        h.onAction({ type: "show_landscape", slug: input.landscape, name: l.name, href: `/landscape/${input.landscape}` });
        return `A card linking to ${l.name} is on screen for the reader to tap.`;
      }
      throw new Error("Unknown screen action.");
    },
  };

  const endConversation: LoopTool = {
    def: {
      name: "end_conversation",
      description: "End the voice conversation after your reply, when the reader says they are done or asks you to stop.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
      strict: true,
    },
    async run() {
      h.onEnd();
      return "The conversation will end after your reply. Say a short goodbye.";
    },
  };

  return [searchLibrary, showOnScreen, endConversation];
}

/** Extra instructions for the voice agent, appended to the answer instruction. */
export const VOICE_AGENT_NOTE =
  " You are Agents of Change, the voice of the CAT Transformation Hub. You have tools: search_library when the passages above don't cover the question (another landscape, topic or figure); show_on_screen whenever the reader asks to see, show or open the sources or a landscape's page; end_conversation when the reader is done. Call any tools first, before writing a word of the answer. Your first words are the answer itself: never mention searching, search results, passages, tools, or whether you need to look anything up, in any language. Search before saying the library doesn't cover something. Give the key figure, not every line item. If the question is ambiguous (for example goats or poultry), ask one short question instead of guessing.";
