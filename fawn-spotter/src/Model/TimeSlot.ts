import { ActivityType } from "./ActivityType";
import type { Activity } from "./Activity";

export class TimeSlot {
  timeStart: string;
  timeName: string;
  typicalActivities: ActivityType[];
  requiredActivities: Activity[];

  constructor(timeStart: string, timeName: string, typicalActivities: ActivityType[] = [], requiredActivities: Activity[] = []) {
    this.timeStart = timeStart;
    this.timeName = timeName;
    this.typicalActivities = typicalActivities;
    this.requiredActivities = requiredActivities;
  }
}
