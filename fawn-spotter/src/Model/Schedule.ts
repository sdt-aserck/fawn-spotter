import { TimeSlot } from "./TimeSlot";
import { Activity } from "./Activity";

export class Schedule {
  timeslots: TimeSlot[];
  activities: Activity[];
  date: Date;

  constructor(timeslots: TimeSlot[], activities: Activity[], date: Date) {
    this.timeslots = timeslots;
    this.activities = activities;
    this.date = date;
  }
}
