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
  VerticalAlign,
} from "docx";

const TITLE_FONT_SIZE = 38; // 19pt
const HEADER_FONT_SIZE = 26; // 13pt
const BODY_FONT_SIZE = 22;   // 11pt

const COL_WIDTH = { size: 50, type: WidthType.PERCENTAGE };

interface SlotValue {
  day: string;
  activity: string;
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

class CompactedDocumentGenerator {
  constructor(private sharedExperiences: SharedExperience[]) {}

  private buildTitleParagraph(): Paragraph {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 240 },
      children: [
        new TextRun({
          text: "Shared Experience Camptivity Rotations",
          bold: true,
          underline: { type: UnderlineType.SINGLE },
          size: TITLE_FONT_SIZE,
        }),
      ],
    });
  }

  private buildGroupHeader(se: SharedExperience): TableRow {
    const abbrs = se.cabinNames.map(cabinAbbr).join(", ");
    return new TableRow({
      children: [
        new TableCell({
          width: COL_WIDTH,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              spacing: { before: 80, after: 80 },
              children: [
                new TextRun({
                  text: `Cabins ${abbrs}`,
                  bold: true,
                  size: HEADER_FONT_SIZE,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: COL_WIDTH,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              spacing: { before: 80, after: 80 },
              children: [
                new TextRun({
                  text: "Activity",
                  bold: true,
                  size: HEADER_FONT_SIZE,
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  private buildSlotRow(slot: SlotValue): TableRow {
    const leader = slot.leader.trim();
    const activityText = leader ? `${slot.activity} (${leader})` : slot.activity;
    return new TableRow({
      children: [
        new TableCell({
          width: COL_WIDTH,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: slot.day, size: BODY_FONT_SIZE }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: COL_WIDTH,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: activityText, size: BODY_FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  private buildGroupTable(se: SharedExperience): Table {
    const slots = [se.slot1, se.slot2, se.slot3, se.slot4].filter(
      (s) => s.day && s.activity
    );
    return new Table({
      rows: [this.buildGroupHeader(se), ...slots.map((s) => this.buildSlotRow(s))],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
  }

  async export(): Promise<void> {
    const children: (Paragraph | Table)[] = [this.buildTitleParagraph()];

    for (const se of this.sharedExperiences) {
      children.push(this.buildGroupTable(se));
      children.push(new Paragraph({ children: [] }));
    }

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    const bytes = new Uint8Array(await Packer.toArrayBuffer(doc));

    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    const filePath = await save({
      defaultPath: "shared-experience-compact.docx",
      filters: [{ name: "Word Document", extensions: ["docx"] }],
    });

    if (filePath) {
      await writeFile(filePath, bytes);
    }
  }
}

export async function generateCompactedDocument(
  sharedExperiences: SharedExperience[]
): Promise<void> {
  await new CompactedDocumentGenerator(sharedExperiences).export();
}
