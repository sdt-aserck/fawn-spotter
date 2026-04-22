export interface SpecialRatioEntry {
  tag: string;
  type: "ratio" | "set";
  value: number;
}

export class ActivityType {
  id: string;
  name: string;
  counselorRatio: number;
  specialRatio: SpecialRatioEntry | null;
  allCampersIncluded: boolean;

  constructor(
    id: string,
    name: string,
    counselorRatio: number,
    specialRatio: SpecialRatioEntry | null = null,
    allCampersIncluded: boolean = false
  ) {
    this.id = id;
    this.name = name;
    this.counselorRatio = counselorRatio;
    this.specialRatio = specialRatio;
    this.allCampersIncluded = allCampersIncluded;
  }
}
