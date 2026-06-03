import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

/**
 * Mints client-upload tokens so the browser can upload a report DIRECTLY to
 * Vercel Blob (bypassing the ~4.5 MB serverless request limit — needed for big
 * PDFs). Lives outside /api/admin so Vercel's server-to-server
 * `onUploadCompleted` callback isn't caught by the admin middleware; access is
 * still gated here — only a signed-in editor/admin can get a token.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        const role = (session?.user as { role?: string } | undefined)?.role;
        if (role !== "admin" && role !== "editor") {
          throw new Error("Not authorised to upload");
        }
        return {
          allowedContentTypes: [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
          maximumSizeInBytes: 60 * 1024 * 1024, // 60 MB
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op: the client calls the ingest endpoint with the blob URL itself.
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
