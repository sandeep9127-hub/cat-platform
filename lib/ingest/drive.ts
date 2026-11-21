import { readFileSync } from "node:fs";
import { GoogleAuth } from "google-auth-library";

/**
 * Read-only access to the CAT Drive "Final folder" through a Google service
 * account (shared on the folder as Viewer). Used by the first import and by
 * the daily sync.
 *
 * Credentials: GOOGLE_SA_JSON (the key JSON, e.g. in Vercel) or
 * GOOGLE_SA_KEY_FILE (a local path, default .secrets/google-sa.json).
 */

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export const GOOGLE_DOC = "application/vnd.google-apps.document";
export const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
export const GOOGLE_FOLDER = "application/vnd.google-apps.folder";
export const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

let auth: GoogleAuth | null = null;

function credentials(): Record<string, unknown> {
  const inline = process.env.GOOGLE_SA_JSON?.trim();
  if (inline) return JSON.parse(inline.startsWith("{") ? inline : Buffer.from(inline, "base64").toString("utf8"));
  const file = process.env.GOOGLE_SA_KEY_FILE?.trim() || ".secrets/google-sa.json";
  return JSON.parse(readFileSync(file, "utf8"));
}

async function token(): Promise<string> {
  auth ??= new GoogleAuth({ credentials: credentials(), scopes: SCOPES });
  const t = await (await auth.getClient()).getAccessToken();
  if (!t.token) throw new Error("Could not get a Google access token");
  return t.token;
}

async function api(url: string, init: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, headers: { ...init.headers, authorization: `Bearer ${await token()}` } });
    if (res.ok) return res;
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Google API ${res.status} for ${url.split("?")[0]}: ${(await res.text()).slice(0, 300)}`);
  }
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  md5Checksum?: string;
  size?: string;
  parents?: string[];
  path: string; // display only: "Final folder/Landscape report - final/…/name" (names may contain "/")
  folders: string[]; // exact folder names from the root down to the file's parent
};

const FIELDS = "nextPageToken,files(id,name,mimeType,modifiedTime,md5Checksum,size,parents)";

async function listChildren(folderId: string): Promise<Omit<DriveFile, "path">[]> {
  const out: Omit<DriveFile, "path">[] = [];
  let pageToken: string | undefined;
  do {
    const q = encodeURIComponent(`'${folderId.replace(/'/g, "")}' in parents and trashed = false`);
    const url =
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${encodeURIComponent(FIELDS)}&pageSize=200` +
      `&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const data = (await (await api(url)).json()) as { files: Omit<DriveFile, "path">[]; nextPageToken?: string };
    out.push(...data.files);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}

/** All files (not folders) under a folder, recursively, with readable paths. */
export async function listTree(folderId: string, rootName: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  const walk = async (id: string, folders: string[]) => {
    for (const f of await listChildren(id)) {
      if (f.mimeType === GOOGLE_FOLDER) await walk(f.id, [...folders, f.name]);
      else files.push({ ...f, folders, path: [...folders, f.name].join("/") });
    }
  };
  await walk(folderId, [rootName]);
  return files;
}

const MAX_DOWNLOAD_BYTES = 150 * 1024 * 1024;

/** Read a response body, aborting once it exceeds the cap (metadata sizes are optional). */
async function readCapped(res: Response): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_DOWNLOAD_BYTES) {
      await reader.cancel();
      throw new Error(`File too large to import (> ${MAX_DOWNLOAD_BYTES} bytes)`);
    }
    parts.push(value);
  }
  return new Uint8Array(Buffer.concat(parts));
}

/** Bytes of a file. Google Docs export as DOCX, Google Sheets as XLSX. Capped at 150 MB. */
export async function downloadFile(f: Pick<DriveFile, "id" | "mimeType"> & { size?: string }): Promise<{ bytes: Uint8Array; mime: string }> {
  if (f.size && Number(f.size) > MAX_DOWNLOAD_BYTES) throw new Error(`File too large to import: ${f.size} bytes`);
  if (f.mimeType === GOOGLE_DOC || f.mimeType === GOOGLE_SHEET) {
    const mime = f.mimeType === GOOGLE_DOC ? DOCX : XLSX;
    const res = await api(`https://www.googleapis.com/drive/v3/files/${f.id}/export?mimeType=${encodeURIComponent(mime)}`);
    return { bytes: await readCapped(res), mime };
  }
  const res = await api(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&supportsAllDrives=true`);
  return { bytes: await readCapped(res), mime: f.mimeType };
}

/** PDF of a Google Doc as Drive renders it (read-only export; nothing changes in Drive). */
export async function exportGoogleDocPdf(fileId: string): Promise<Uint8Array> {
  const res = await api(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application%2Fpdf`);
  return readCapped(res);
}

/** Cell values (as displayed) of one sheet tab, e.g. "Data". */
export async function readSheetValues(spreadsheetId: string, range = "Data"): Promise<string[][]> {
  const res = await api(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}` +
      `?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`,
  );
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

export function driveEnabled(): boolean {
  if (process.env.GOOGLE_SA_JSON?.trim()) return true;
  try {
    readFileSync(process.env.GOOGLE_SA_KEY_FILE?.trim() || ".secrets/google-sa.json");
    return true;
  } catch {
    return false;
  }
}
