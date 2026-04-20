import { Schedule } from "./Schedule";
import { StaffMember } from "./StaffMember";

export class Week {
  schedules: Schedule[];
  numCampers: number;
  excludedStaffMembers: StaffMember[];

  constructor(schedules: Schedule[], numCampers: number, excludedStaffMembers: StaffMember[] = []) {
    this.schedules = schedules;
    this.numCampers = numCampers;
    this.excludedStaffMembers = excludedStaffMembers;
  }
}
