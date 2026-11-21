/**
 * Plain-text email through Resend. Returns what happened instead of throwing,
 * so a mail problem never undoes the action that triggered it.
 */
export async function sendEmail(msg: { to: string | string[]; subject: string; text: string; replyTo?: string }): Promise<"sent" | "disabled" | `failed: ${string}`> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return "disabled";
  try {
    const { Resend } = await import("resend");
    const r = await new Resend(key).emails.send({
      from,
      to: msg.to,
      subject: msg.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
      text: msg.text,
      ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
    });
    if (r.error) return `failed: ${r.error.message ?? "unknown"}`;
    return "sent";
  } catch (e) {
    return `failed: ${(e as Error).message}`;
  }
}
