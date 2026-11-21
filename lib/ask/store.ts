import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Ask v2 conversations (cat.conversations / cat.messages, CAT database).
 * Every read is scoped by the session token hash, so a conversation id alone
 * never exposes anyone's history.
 */

const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StoredCitation = {
  index: number;
  chunkId: string;
  documentId: string | null;
  type: string;
  label: string;
  url: string;
  preview: string;
  score: number;
  section: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  cited: boolean;
  quotes: string[];
};

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: StoredCitation[];
  interrupted: boolean;
  refused: boolean;
  createdAt: string;
};

export type Conversation = { id: string; turnCount: number };

/** The conversation if it belongs to this session, else null. */
export async function findConversation(id: string | null | undefined, tokenHash: string): Promise<Conversation | null> {
  if (!id || !UUID_RE.test(id)) return null;
  const r = rows<Conversation>(await db.execute(sql`
    SELECT id, turn_count AS "turnCount" FROM "cat".conversations
    WHERE id = ${id}::uuid AND session_token_hash = ${tokenHash}`));
  return r[0] ?? null;
}

export async function latestConversation(tokenHash: string): Promise<Conversation | null> {
  const r = rows<Conversation>(await db.execute(sql`
    SELECT id, turn_count AS "turnCount" FROM "cat".conversations
    WHERE session_token_hash = ${tokenHash} AND turn_count > 0
    ORDER BY last_active_at DESC LIMIT 1`));
  return r[0] ?? null;
}

export async function createConversation(tokenHash: string, scope: string | null): Promise<Conversation> {
  const r = rows<Conversation>(await db.execute(sql`
    INSERT INTO "cat".conversations (session_token_hash, mode, landscape_scope)
    VALUES (${tokenHash}, 'text', ${scope})
    RETURNING id, turn_count AS "turnCount"`));
  return r[0];
}

/** Most recent `limit` messages, oldest first. */
export async function loadMessages(conversationId: string, limit: number): Promise<StoredMessage[]> {
  const r = rows<StoredMessage>(await db.execute(sql`
    SELECT * FROM (
      SELECT id, role, content, citations, interrupted, refused, created_at AS "createdAt"
      FROM "cat".messages WHERE conversation_id = ${conversationId}::uuid
      ORDER BY created_at DESC LIMIT ${limit}
    ) m ORDER BY "createdAt" ASC`));
  return r;
}

export async function addUserMessage(conversationId: string, content: string, scope: string | null): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO "cat".messages (conversation_id, role, content)
      VALUES (${conversationId}::uuid, 'user', ${content})`);
    await tx.execute(sql`
      UPDATE "cat".conversations
      SET turn_count = turn_count + 1, landscape_scope = ${scope}, last_active_at = now()
      WHERE id = ${conversationId}::uuid`);
  });
}

export async function addAssistantMessage(m: {
  conversationId: string;
  content: string;
  citations: StoredCitation[];
  interrupted: boolean;
  refused: boolean;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  latencyMs: number;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO "cat".messages
        (conversation_id, role, content, citations, interrupted, refused, model,
         input_tokens, output_tokens, cost_usd, latency_ms)
      VALUES (${m.conversationId}::uuid, 'assistant', ${m.content}, ${JSON.stringify(m.citations)}::jsonb,
              ${m.interrupted}, ${m.refused}, ${m.model}, ${m.inputTokens}, ${m.outputTokens},
              ${m.costUsd}, ${m.latencyMs})`);
    await tx.execute(sql`
      UPDATE "cat".conversations
      SET cost_usd = cost_usd + ${m.costUsd ?? 0}, last_active_at = now()
      WHERE id = ${m.conversationId}::uuid`);
  });
}
