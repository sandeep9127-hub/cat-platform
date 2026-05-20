import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import type { LandscapeProfile } from "@/lib/data/landscapes";

const TEAL = "2E7573";
const DEEP_TEAL = "334B4A";
const INK_SOFT = "4D5757";
const AMBER = "C68C2E";
const MUTED = "767E7E";

function eyebrow(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: "Courier New",
        size: 14, // half-points = 7pt
        color: TEAL,
        characterSpacing: 30,
        bold: true,
      }),
    ],
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 120, line: 320 },
    children: [
      new TextRun({
        text,
        font: "Georgia",
        size: 22, // 11pt
        color: INK_SOFT,
      }),
    ],
  });
}

function divider(): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDD8CC" },
    },
    children: [],
  });
}

function factRow(key: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 0, right: 100 },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: key.toUpperCase(),
                font: "Courier New",
                size: 14,
                color: MUTED,
                characterSpacing: 24,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 0, right: 0 },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: value,
                font: "Georgia",
                size: 22,
                color: DEEP_TEAL,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function buildLandscapeProfileDocx(
  p: LandscapeProfile,
  stateName: string
): Promise<Buffer> {
  const doc = new Document({
    creator: "Consortium for Agroecological Transformations",
    title: `${p.name} · Landscape profile · CAT Platform`,
    subject: `Landscape profile for ${p.name}`,
    description:
      "Editorial landscape profile prepared by CAT editors. Sourced from CAT Landscape Profiles, February 2026.",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          // Brand header
          new Paragraph({
            children: [
              new TextRun({
                text: "CAT PLATFORM",
                font: "Courier New",
                size: 16,
                color: DEEP_TEAL,
                characterSpacing: 40,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 600 },
            children: [
              new TextRun({
                text: "Consortium for Agroecological Transformations",
                font: "Georgia",
                size: 16,
                color: MUTED,
              }),
            ],
          }),

          eyebrow("Landscape profile"),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 0, after: 120 },
            children: [
              new TextRun({
                text: p.name,
                font: "Georgia",
                size: 60, // 30pt
                color: "1A2625",
                bold: false,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `${p.district} · ${stateName}`,
                font: "Georgia",
                size: 24,
                color: INK_SOFT,
                italics: true,
              }),
            ],
          }),

          body(p.context),

          divider(),
          eyebrow("Quick facts"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              factRow("Region", p.region),
              factRow("Agroclimatic zone", p.agroclimaticZone),
              factRow("Geographical area", p.area),
              factRow("Population", p.population),
              factRow("Households", p.households),
              factRow("Inhabited villages", p.villages),
              factRow(
                "LIP status",
                p.lipStatus === "published" ? "Published" : "In preparation"
              ),
            ],
          }),

          divider(),
          eyebrow("Context"),
          body(p.bodyContext),

          divider(),
          eyebrow("Agroclimatic zone"),
          body(p.agroclimaticZone),

          divider(),
          eyebrow("Key landscape challenges"),
          ...p.keyChallenges.map(
            (c, i) =>
              new Paragraph({
                spacing: { before: 80, after: 80, line: 320 },
                indent: { left: 360, hanging: 360 },
                children: [
                  new TextRun({
                    text: String(i + 1).padStart(2, "0") + ".  ",
                    font: "Courier New",
                    size: 18,
                    color: AMBER,
                    bold: true,
                  }),
                  new TextRun({
                    text: c,
                    font: "Georgia",
                    size: 22,
                    color: INK_SOFT,
                  }),
                ],
              })
          ),

          divider(),
          eyebrow("Editorial note"),
          new Paragraph({
            spacing: { before: 60, after: 120, line: 320 },
            children: [
              new TextRun({
                text:
                  "This profile is curated by CAT editors. Data sourced from the official CAT Landscape Profiles, February 2026. Programmes are read, not pitched. Limitations sit beside achievements. For the full landscape investment plan, where published, see the Library tab on the CAT Platform.",
                font: "Georgia",
                size: 20,
                color: MUTED,
                italics: true,
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 600 },
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: "CAT PLATFORM · VOL. 01 · 2026",
                font: "Courier New",
                size: 14,
                color: MUTED,
                characterSpacing: 30,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
