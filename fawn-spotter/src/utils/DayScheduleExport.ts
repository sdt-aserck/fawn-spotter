import ExcelJS from "exceljs";

interface TimeSlotRecord {
  id: string;
  timeStart: string;
  timeName: string;
}

interface StaffMember {
  id: string;
  name: string;
}

interface ActivityEntry {
  activityType: { name: string };
  timeslot: unknown;
  staffMembers: StaffMember[];
  leader: StaffMember | null;
}

interface ScheduleRecord {
  date: string;
  timeslotIds: string[];
  activities: ActivityEntry[];
}

interface WeekRecord {
  name: string;
  excludedStaffIds: string[];
  staffUnits?: Record<string, string>;
}

function formatTime12h(time: string): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  return `${weekday} ${Number(month)}/${Number(day)}/${year.slice(2)}`;
}

function removeEmojis(text: string): string {
  return text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\p{Emoji_Modifier}\u{FE0F}\u{FE0E}\u{200D}\u{20E3}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function exportScheduleToSpreadsheet(
  schedule: ScheduleRecord,
  week: WeekRecord | null,
  allTimeslots: TimeSlotRecord[],
  allStaff: StaffMember[],
  stripEmojis = false
): Promise<boolean> {
  const cleanName = (s: string) => stripEmojis ? removeEmojis(s) : s;
  const excludedIds = new Set(week?.excludedStaffIds ?? []);
  const activeStaff = allStaff.filter((s) => !excludedIds.has(s.id));
  const units = week?.staffUnits ?? {};

  const withUnit = activeStaff.filter((s) => units[s.id]?.trim());
  const withoutUnit = activeStaff.filter((s) => !units[s.id]?.trim());

  withUnit.sort((a, b) => units[a.id].localeCompare(units[b.id]) || a.name.localeCompare(b.name));
  withoutUnit.sort((a, b) => a.name.localeCompare(b.name));

  const orderedStaff = [...withUnit, ...withoutUnit];

  const timeslotIdToRecord = new Map(allTimeslots.map((ts) => [ts.id, ts]));
  const orderedSlots = schedule.timeslotIds
    .map((id) => timeslotIdToRecord.get(id))
    .filter((ts): ts is TimeSlotRecord => ts !== undefined);

  // Build lookup: staffId → timeslotId → { name, isLeader }
  const lookup = new Map<string, Map<string, { name: string; isLeader: boolean }>>();
  for (const activity of schedule.activities) {
    const slotId = (activity.timeslot as { id: string }).id;
    const actName = cleanName(activity.activityType.name);

    const assign = (staffId: string, isLeader: boolean) => {
      if (!lookup.has(staffId)) lookup.set(staffId, new Map());
      lookup.get(staffId)!.set(slotId, { name: actName, isLeader });
    };

    if (activity.leader) assign(activity.leader.id, true);
    for (const sm of activity.staffMembers) assign(sm.id, false);
  }

  const workbook = new ExcelJS.Workbook();
  const sheetName = week ? week.name : formatDate(schedule.date);
  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: { orientation: "landscape", horizontalCentered: true },
  });

  const totalCols = 2 + orderedSlots.length;

  // Row 1 — title
  const titleRow = sheet.addRow([formatDate(schedule.date)]);
  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = titleRow.getCell(1);
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center" };

  // Row 2 — times
  const timeValues: (string | null)[] = [null, null, ...orderedSlots.map((ts) => ts.timeStart ? formatTime12h(ts.timeStart) : null)];
  const timeRow = sheet.addRow(timeValues);
  timeRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FF666666" } };
    cell.alignment = { horizontal: "center" };
  });

  // Row 3 — headers
  const headerValues = ["Staff", "Unit", ...orderedSlots.map((ts) => ts.timeName)];
  const headerRow = sheet.addRow(headerValues);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    cell.alignment = { horizontal: "center" };
  });

  // Rows 4+ — staff
  for (const [staffIndex, staff] of orderedStaff.entries()) {
    const slotMap = lookup.get(staff.id);
    const rowValues: (string)[] = [
      staff.name,
      units[staff.id]?.trim() || "-",
      ...orderedSlots.map((ts) => slotMap?.get(ts.id)?.name ?? "OFF"),
    ];
    const row = sheet.addRow(rowValues);

    if (staffIndex % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
      });
    }

    // Bold leader cells (col C onwards = index 3+)
    orderedSlots.forEach((ts, i) => {
      const entry = slotMap?.get(ts.id);
      if (entry?.isLeader) {
        row.getCell(3 + i).font = { bold: true };
      }
    });

  }

  // Legend row
  const legendRow = sheet.addRow(["bold=Leader"]);
  legendRow.getCell(1).font = { bold: true };

  // Column widths — each activity column sized to its own widest text
  sheet.getColumn(1).width = 22;
  sheet.getColumn(2).width = 8;
  orderedSlots.forEach((slot, i) => {
    const colIndex = 3 + i;
    const activitiesInSlot = schedule.activities.filter(
      (a) => (a.timeslot as { id: string }).id === slot.id
    );
    const maxLen = Math.max(
      8,
      slot.timeName.length,
      ...activitiesInSlot.map((a) => cleanName(a.activityType.name).length)
    );
    sheet.getColumn(colIndex).width = maxLen;
  });

  // Freeze panes at C4
  sheet.views = [{ state: "frozen", xSplit: 2, ySplit: 3, activeCell: "C4" }];

  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer as ArrayBuffer);

  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");

  const defaultName = `schedule-${schedule.date}.xlsx`;
  const filePath = await save({
    defaultPath: defaultName,
    filters: [{ name: "Excel Spreadsheet", extensions: ["xlsx"] }],
  });

  if (filePath) {
    await writeFile(filePath, bytes);
    return true;
  }
  return false;
}
