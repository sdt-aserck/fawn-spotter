import { ActivityType } from "./ActivityType";

export class TimeSlot {
  timeStart: string;
  timeName: string;
  typicalActivities: ActivityType[];
  requiredActivities: ActivityType[];

  constructor(timeStart: string, timeName: string, typicalActivities: ActivityType[] = [], requiredActivities: ActivityType[] = []) {
    this.timeStart = timeStart;
    this.timeName = timeName;
    this.typicalActivities = typicalActivities;
    this.requiredActivities = requiredActivities;
  }
}
