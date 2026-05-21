import { readFile } from "node:fs/promises";
import path from "node:path";
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
  ImageRun,
  PageBreak,
  type IImageOptions,
} from "docx";
import type { LandscapeProfile, LandscapePhoto } from "@/lib/data/landscapes";
import type { BudgetSummary } from "@/lib/db/landscape-kb";

// CAT palette in hex (no leading #) — docx uses the bare form
const NAVY = "373F5A";
const DEEP_TEAL = "334B4A";
const TEAL = "2D7574";
const PERIWINKLE = "646D96";
const INK = "1A2625";
const INK_SOFT = "4D5757";
const AMBER_DEEP = "C68C2E";
const SAGE = "9FB8A6";
const MUTED = "767E7E";

const PAGE_WIDTH_TWIPS = 12240; // Letter? No, default. We'll let docx default to A4 by config.

function eyebrow(number: string | undefined, label: string): Paragraph {
  const children: TextRun[] = [];
  if (number) {
    children.push(
      new TextRun({
        text: number.toUpperCase(),
        font: "Courier New",
        size: 16,
        color: SAGE,
        characterSpacing: 24,
      }),
      new TextRun({
        text: "   ·   ",
        font: "Courier New",
        size: 16,
        color: MUTED,
      })
    );
  }
  children.push(
    new TextRun({
      text: label.toUpperCase(),
      font: "Arial",
      size: 17,
      color: NAVY,
      bold: true,
      characterSpacing: 30,
    })
  );
  return new Paragraph({
    spacing: { before: 360, after: 100 },
    children,
  });
}

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 80, after: 220 },
    children: [
      new TextRun({
        text,
        font: "Arial",
        size: 56, // 28pt
        color: NAVY,
        bold: true,
      }),
    ],
  });
}

function bodyP(text: string, italic = false): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 140, line: 320 },
    children: [
      new TextRun({
        text,
        font: italic ? "Georgia" : "Arial",
        size: 22, // 11pt
        color: INK_SOFT,
        italics: italic,
      }),
    ],
  });
}

function divider(): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDD8CC" },
    },
    children: [],
  });
}

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

function factRow(key: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 0, right: 100 },
        borders: noBorders,
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
        width: { size: 65, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 0, right: 0 },
        borders: noBorders,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: value,
                font: "Arial",
                size: 23,
                color: DEEP_TEAL,
                bold: true,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function fundingMixRow(label: string, value: string, pctText: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 0, right: 0 },
        borders: {
          ...noBorders,
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "E8E5DD" },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, font: "Arial", size: 22, color: INK })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 0, right: 0 },
        borders: {
          ...noBorders,
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "E8E5DD" },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: pctText,
                font: "Courier New",
                size: 18,
                color: AMBER_DEEP,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 0, right: 0 },
        borders: {
          ...noBorders,
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "E8E5DD" },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: value,
                font: "Arial",
                size: 22,
                color: DEEP_TEAL,
                bold: true,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

async function readPhoto(relativePath: string): Promise<Buffer | null> {
  try {
    const cleaned = relativePath.replace(/^\//, "");
    const full = path.join(process.cwd(), "public", cleaned);
    return await readFile(full);
  } catch {
    return null;
  }
}

async function photoParagraph(
  photo: LandscapePhoto,
  options: { width: number; height: number }
): Promise<Paragraph[]> {
  const buf = await readPhoto(photo.src);
  if (!buf) return [];
  const imageRun = new ImageRun({
    type: "jpg",
    data: new Uint8Array(buf),
    transformation: { width: options.width, height: options.height },
  } as IImageOptions);
  return [
    new Paragraph({ spacing: { before: 120, after: 80 }, children: [imageRun] }),
    new Paragraph({
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({ text: photo.caption, font: "Arial", size: 21, color: NAVY }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: `${photo.credit.toUpperCase()} · ${formatMonth(photo.date).toUpperCase()}`,
          font: "Courier New",
          size: 15,
          color: MUTED,
          characterSpacing: 24,
        }),
      ],
    }),
  ];
}

function formatMonth(iso: string): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const [y, m] = iso.split("-");
  const idx = Number(m) - 1;
  return idx >= 0 && idx < 12 ? `${months[idx]} ${y}` : iso;
}

function inrShort(n: number): string {
  if (!n || !isFinite(n)) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n >= 1e8 ? 0 : 2)} cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} lakh`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export type BriefOpts = {
  budget?: BudgetSummary;
};

export async function buildLandscapeBriefDocx(
  p: LandscapeProfile,
  stateName: string,
  opts: BriefOpts = {}
): Promise<Buffer> {
  const children: Array<Paragraph | Table> = [];

  // ─── Cover ────────────────────────────────────────────────────────
  // Brand block at top
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: "Consortium for Agroecological Transformations",
          font: "Arial",
          size: 22,
          color: NAVY,
          bold: true,
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 460 },
      children: [
        new TextRun({
          text: "TRANSFORMATION HUB · VOL. 01 · EDITION 2026",
          font: "Courier New",
          size: 15,
          color: TEAL,
          characterSpacing: 30,
        }),
      ],
    })
  );

  // Cover anchor photo
  if (p.photos && p.photos.length > 0) {
    const buf = await readPhoto(p.photos[0].src);
    if (buf) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new ImageRun({
              type: "jpg",
              data: new Uint8Array(buf),
              transformation: { width: 540, height: 216 },
            } as IImageOptions),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 40 },
          children: [
            new TextRun({
              text: p.photos[0].caption,
              font: "Arial",
              size: 21,
              color: NAVY,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 280 },
          children: [
            new TextRun({
              text: `${p.photos[0].credit.toUpperCase()} · ${formatMonth(p.photos[0].date).toUpperCase()}`,
              font: "Courier New",
              size: 15,
              color: MUTED,
              characterSpacing: 24,
            }),
          ],
        })
      );
    }
  }

  children.push(eyebrow("VOL. 01", "Landscape investment brief"));

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({
          text: p.name,
          font: "Arial",
          size: 80,
          color: NAVY,
          bold: true,
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { before: 0, after: 320 },
      children: [
        new TextRun({
          text: `${p.district} · ${stateName}`,
          font: "Arial",
          size: 24,
          color: INK_SOFT,
          italics: true,
        }),
      ],
    })
  );

  children.push(bodyP(p.context, true));

  children.push(
    new Paragraph({
      spacing: { before: 600 },
      children: [new PageBreak()],
    })
  );

  // ─── At a glance ──────────────────────────────────────────────────
  children.push(eyebrow("01", "At a glance"));
  children.push(h1("At a glance"));
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        factRow("Region", p.region),
        factRow("Agroclimatic zone", p.agroclimaticZone),
        factRow("State", stateName),
        factRow("District", p.district),
        factRow("Geographical area", p.area),
        factRow("Population", p.population),
        factRow("Households", p.households),
        factRow("Inhabited villages", p.villages),
        factRow(
          "Investment plan status",
          p.lipStatus === "published" ? "Published" : "In preparation"
        ),
        factRow("Key challenges identified", String(p.keyChallenges.length)),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [new PageBreak()],
    })
  );

  // ─── Context ──────────────────────────────────────────────────────
  children.push(eyebrow("02", "Context"));
  children.push(h1("Context"));
  children.push(bodyP(p.bodyContext));
  children.push(divider());
  children.push(eyebrow("03", "Agroclimatic zone"));
  children.push(h1("Agroclimatic zone"));
  children.push(bodyP(p.agroclimaticZone));

  children.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [new PageBreak()],
    })
  );

  // ─── Key challenges ───────────────────────────────────────────────
  children.push(eyebrow("04", "Key landscape challenges"));
  children.push(h1("Key landscape challenges"));
  p.keyChallenges.forEach((c, i) => {
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 80, line: 320 },
        indent: { left: 360, hanging: 360 },
        children: [
          new TextRun({
            text: String(i + 1).padStart(2, "0") + "  ",
            font: "Courier New",
            size: 18,
            color: AMBER_DEEP,
            bold: true,
          }),
          new TextRun({ text: c, font: "Georgia", size: 22, color: INK_SOFT }),
        ],
      })
    );
  });

  // ─── Investment plan finance ─────────────────────────────────────
  if (opts.budget && opts.budget.totalCostInr > 0) {
    const b = opts.budget;
    children.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [new PageBreak()],
      })
    );
    children.push(eyebrow("05", "Investment plan at a glance"));
    children.push(h1("Investment plan at a glance"));

    // Headline figure
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 60 },
        children: [
          new TextRun({
            text: "TOTAL PLAN SIZE · 7-YEAR HORIZON",
            font: "Courier New",
            size: 16,
            color: MUTED,
            characterSpacing: 24,
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        spacing: { before: 0, after: 320 },
        children: [
          new TextRun({
            text: inrShort(b.totalCostInr),
            font: "Arial",
            size: 72,
            color: DEEP_TEAL,
            bold: true,
          }),
        ],
      })
    );

    // Four-tile finance summary as a table
    children.push(divider());
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              miniTile("External investment", inrShort(b.investmentRequiredInr), `${pct(b.investmentRequiredInr, b.totalCostInr)} of plan`),
              miniTile("Government convergence", inrShort(b.govtInr), `${pct(b.govtInr, b.totalCostInr)} of plan`),
              miniTile("Community contribution", inrShort(b.communityInr), `${pct(b.communityInr, b.totalCostInr)} of plan`),
              miniTile("Returnable / outcome", inrShort(b.returnableGrantInr + b.outcomeFinanceInr), "Innovative finance"),
            ],
          }),
        ],
      })
    );

    // Funding mix table
    children.push(divider());
    children.push(eyebrow(undefined, "Funding mix"));
    const sources = [
      { label: "Government", value: b.govtInr },
      { label: "Community", value: b.communityInr },
      { label: "Grants", value: b.grantsInr },
      { label: "Returnable grant", value: b.returnableGrantInr },
      { label: "Outcome-based finance", value: b.outcomeFinanceInr },
      { label: "Debt", value: b.debtInr },
    ].filter((s) => s.value > 0);
    const sumSources = sources.reduce((acc, s) => acc + s.value, 0);
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: sources.map((s) =>
          fundingMixRow(s.label, inrShort(s.value), pct(s.value, sumSources))
        ),
      })
    );

    // Top spend categories
    children.push(divider());
    children.push(eyebrow(undefined, "Top spend by category"));
    const top = b.byCategory.filter((c) => c.total > 0).slice(0, 5);
    top.forEach((c, i) => {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 80, line: 300 },
          children: [
            new TextRun({
              text: String(i + 1).padStart(2, "0") + "   ",
              font: "Courier New",
              size: 16,
              color: AMBER_DEEP,
              bold: true,
            }),
            new TextRun({ text: c.category + "   ", font: "Arial", size: 22, color: INK }),
            new TextRun({
              text: inrShort(c.total),
              font: "Arial",
              size: 22,
              color: DEEP_TEAL,
              bold: true,
            }),
          ],
        })
      );
    });

    children.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: `Drawn from the ${p.name} Landscape Investment Plan. Live explorer with line-level filters at cat-platform-fawn.vercel.app/landscape/${p.slug}/budget.`,
            font: "Georgia",
            size: 18,
            color: MUTED,
            italics: true,
          }),
        ],
      })
    );
  }

  // ─── Field record ────────────────────────────────────────────────
  if (p.photos && p.photos.length > 1) {
    children.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [new PageBreak()],
      })
    );
    children.push(eyebrow("06", "Field record"));
    children.push(h1(`Photographs from ${p.name}`));
    children.push(
      bodyP(
        "Documentary frames from CAT field work in the landscape. Treated as primary source material, not decoration.",
        true
      )
    );
    const remaining = p.photos.slice(1, 5);
    for (const photo of remaining) {
      const paras = await photoParagraph(photo, { width: 480, height: 360 });
      children.push(...paras);
    }
  }

  // ─── Colophon ────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      spacing: { before: 200 },
      children: [new PageBreak()],
    })
  );
  children.push(eyebrow("—", "Editorial note"));
  children.push(h1("About this brief"));
  children.push(
    bodyP(
      "This brief is generated live from the Transformation Hub, the public, curated dashboard of credible food systems work in India by the Consortium for Agroecological Transformations. Every entry is read by a CAT editor before it goes live. Limitations sit beside achievements."
    )
  );
  children.push(
    bodyP(
      "Programmes are read, not pitched. The Hub treats photographs as primary sources, not decoration. The bar is honesty, not affiliation.",
      true
    )
  );
  children.push(divider());
  children.push(eyebrow(undefined, "How to cite this brief"));
  const year = new Date().getFullYear();
  children.push(
    new Paragraph({
      spacing: { before: 80, after: 80, line: 320 },
      children: [
        new TextRun({
          text: `Consortium for Agroecological Transformations. (${year}). ${p.name} Landscape Investment Brief. Transformation Hub. cat-platform-fawn.vercel.app/landscape/${p.slug}`,
          font: "Arial",
          size: 20,
          color: INK,
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "TRANSFORMATION HUB · VOL. 01 · 2026",
          font: "Courier New",
          size: 14,
          color: MUTED,
          characterSpacing: 30,
        }),
      ],
    })
  );

  const doc = new Document({
    creator: "Consortium for Agroecological Transformations",
    title: `${p.name} · Landscape Investment Brief`,
    subject: `Landscape investment brief for ${p.name}`,
    description:
      "Editorial landscape investment brief generated live from the Transformation Hub.",
    sections: [
      {
        properties: {
          page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

function miniTile(label: string, value: string, sub: string): TableCell {
  return new TableCell({
    width: { size: 25, type: WidthType.PERCENTAGE },
    margins: { top: 160, bottom: 160, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "E8E5DD" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "E8E5DD" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "E8E5DD" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "E8E5DD" },
    },
    shading: { fill: "FBF8F2" },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: label.toUpperCase(),
            font: "Courier New",
            size: 12,
            color: MUTED,
            characterSpacing: 20,
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 100, after: 80 },
        children: [
          new TextRun({
            text: value,
            font: "Arial",
            size: 28,
            color: DEEP_TEAL,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: sub, font: "Arial", size: 16, color: MUTED, italics: true }),
        ],
      }),
    ],
  });
}
