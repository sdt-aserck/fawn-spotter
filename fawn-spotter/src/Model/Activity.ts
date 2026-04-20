import { ActivityType } from "./ActivityType";
import type { TimeSlot } from "./TimeSlot";
import { StaffMember } from "./StaffMember";

export class Activity {
  activityType: ActivityType;
  timeslot: TimeSlot;
  staffMembers: StaffMember[];
  leader: StaffMember;
  notes: string;

  constructor(activityType: ActivityType, timeslot: TimeSlot, staffMembers: StaffMember[], leader: StaffMember, notes: string) {
    this.activityType = activityType;
    this.timeslot = timeslot;
    this.staffMembers = staffMembers;
    this.leader = leader;
    this.notes = notes;
  }
}
