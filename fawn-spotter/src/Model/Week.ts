import { Schedule } from "./Schedule";
import { StaffMember } from "./StaffMember";

export class Week {
  id: string;
  name: string;
  schedules: Schedule[];
  numCampers: number;
  excludedStaffMembers: StaffMember[];

  constructor(name: string, schedules: Schedule[] = [], numCampers: number = 0, excludedStaffMembers: StaffMember[] = []) {
    this.id = crypto.randomUUID();
    this.name = name;
    this.schedules = schedules;
    this.numCampers = numCampers;
    this.excludedStaffMembers = excludedStaffMembers;
  }
}
