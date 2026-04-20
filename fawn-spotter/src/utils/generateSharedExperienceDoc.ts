import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  UnderlineType,
  WidthType,
  PageBreak,
  HeightRule,
} from "docx";

const FONT_SIZE = 24; // half-points, so 24 = 12pt
const HEADER_FONT_SIZE = 26;
const FOOTER_FONT_SIZE = 26;
const ROW_HEIGHT = 400; // twips (~0.28 inches)

interface Camper {
  facilityName: string;
  nameFirst: string;
  nameLast: string;
  preferredName: string;
  isCIT: boolean;
}

interface Cabin {
  name: string;
  campers: Camper[];
}

interface SlotValue {
  day: string;
  activity: string;
}

interface Activity {
  name: string;
  leader: string;
}

interface SharedExperience {
  id: string;
  groupNumber: number;
  slot1: SlotValue;
  slot2: SlotValue;
  slot3: SlotValue;
  slot4: SlotValue;
  cabinNames: string[];
}

function cabinAbbr(facilityName: string): string {
  const firstChar = facilityName.trim()[0]?.toUpperCase() ?? "";
  const trailingDigits = facilityName.match(/(\d+)\s*$/)?.[1] ?? "";
  return firstChar + trailingDigits;
}

function nameRuns(camper: Camper): TextRun[] {
  const lastInitial = camper.nameLast.trim()[0]?.toUpperCase() ?? "";
  const runs: TextRun[] = [];

  if (camper.preferredName.trim()) {
    const preferred = camper.preferredName.trim();
    runs.push(new TextRun({ text: `${preferred} ${lastInitial}.  (`, size: FONT_SIZE }));
    runs.push(new TextRun({ text: camper.nameFirst.trim(), strike: true, size: FONT_SIZE }));
    runs.push(new TextRun({ text: ")", size: FONT_SIZE }));
  } else {
    runs.push(new TextRun({ text: `${camper.nameFirst.trim()} ${lastInitial}.`, size: FONT_SIZE }));
  }

  if (camper.isCIT) {
    runs.push(new TextRun({ text: " (CIT)", italics: true, size: FONT_SIZE }));
  }

  return runs;
}

function buildHeaderParagraph(se: SharedExperience, activities: Activity[]): Paragraph {
  const abbrs = se.cabinNames.map(cabinAbbr).join(", ");
  const slotList = [se.slot1, se.slot2, se.slot3, se.slot4]
    .filter((s) => s.day && s.activity)
    .map((s) => {
      const leader = activities.find((a) => a.name === s.activity)?.leader.trim();
      return leader ? `${s.day}-${s.activity} (${leader})` : `${s.day}-${s.activity}`;
    });

  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: `Cabins ${abbrs}`,
        bold: true,
        underline: { type: UnderlineType.SINGLE },
        size: HEADER_FONT_SIZE,
      }),
      ...slotList.map((slot) => new TextRun({
        text: slot,
        size: HEADER_FONT_SIZE,
        break: 1,
      })),
    ],
  });
}

function buildCamperTable(se: SharedExperience, cabins: Cabin[]): Table {
  const ordered: Array<{ abbr: string; camper: Camper }> = [];
  for (const cabinName of se.cabinNames) {
    const cabin = cabins.find((c) => c.name === cabinName);
    if (!cabin) continue;
    const abbr = cabinAbbr(cabinName);
    for (const camper of cabin.campers) {
      ordered.push({ abbr, camper });
    }
  }

  const half = Math.ceil(ordered.length / 2);
  const left = ordered.slice(0, half);
  const right = ordered.slice(half);
  const rowCount = Math.max(left.length, right.length, 1);

  const rows: TableRow[] = [];
  for (let i = 0; i < rowCount; i++) {
    const leftEntry = left[i];
    const rightEntry = right[i];

    rows.push(
      new TableRow({
        height: { value: ROW_HEIGHT, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            children: [new Paragraph({ children: leftEntry ? [new TextRun({ text: leftEntry.abbr, size: FONT_SIZE })] : [] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: leftEntry ? nameRuns(leftEntry.camper) : [] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: rightEntry ? [new TextRun({ text: rightEntry.abbr, size: FONT_SIZE })] : [] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: rightEntry ? nameRuns(rightEntry.camper) : [] })],
          }),
        ],
      })
    );
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [800, 3880, 800, 3880],
  });
}

function buildFooterParagraph(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: "Please return this sheet to ~FAWN~ at LUNCH!",
        bold: true,
        italics: true,
        size: FOOTER_FONT_SIZE,
      }),
    ],
  });
}

function buildTotalParagraph(totalCampers: number): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 360, after: 240 },
    children: [
      new TextRun({
        text: `${totalCampers} campers total`,
        bold: true,
        underline: { type: UnderlineType.SINGLE },
        size: FOOTER_FONT_SIZE + 4,
      }),
    ],
  });
}

function buildGroupContent(
  se: SharedExperience,
  cabins: Cabin[],
  activities: Activity[],
  isLast: boolean
): (Paragraph | Table)[] {
  const totalCampers = se.cabinNames.reduce(
    (sum, name) => sum + (cabins.find((c) => c.name === name)?.campers.length ?? 0),
    0
  );

  const content: (Paragraph | Table)[] = [
    buildHeaderParagraph(se, activities),
    buildCamperTable(se, cabins),
    buildFooterParagraph(),
    buildTotalParagraph(totalCampers),
  ];

  if (!isLast) {
    content.push(new Paragraph({ children: [new PageBreak()] }));
  }

  return content;
}

export async function generateDocument(
  sharedExperiences: SharedExperience[],
  cabins: Cabin[],
  activities: Activity[]
): Promise<void> {
  const allContent = sharedExperiences.flatMap((se, i) =>
    buildGroupContent(se, cabins, activities, i === sharedExperiences.length - 1)
  );

  const doc = new Document({
    sections: [{ properties: {}, children: allContent }],
  });

  const bytes = new Uint8Array(await Packer.toArrayBuffer(doc));

  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");

  const filePath = await save({
    defaultPath: "shared-experience.docx",
    filters: [{ name: "Word Document", extensions: ["docx"] }],
  });

  if (filePath) {
    await writeFile(filePath, bytes);
  }
}
