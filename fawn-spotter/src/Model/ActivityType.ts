export interface SpecialRatioEntry {
  tag: string;
  type: "ratio" | "set";
  value: number;
}

export class ActivityType {
  id: string;
  name: string;
  councilorRatio: number;
  specialRatio: SpecialRatioEntry | null;

  constructor(
    id: string,
    name: string,
    councilorRatio: number,
    specialRatio: SpecialRatioEntry | null = null
  ) {
    this.id = id;
    this.name = name;
    this.councilorRatio = councilorRatio;
    this.specialRatio = specialRatio;
  }
}
