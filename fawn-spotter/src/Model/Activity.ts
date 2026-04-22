import { ActivityType } from "./ActivityType";
import type { TimeSlot } from "./TimeSlot";
import { StaffMember } from "./StaffMember";

export class Activity {
  id: string;
  activityType: ActivityType;
  timeslot: TimeSlot;
  staffMembers: StaffMember[];
  leader: StaffMember | null;
  numCampers: number;

  constructor(
    activityType: ActivityType,
    timeslot: TimeSlot,
    staffMembers: StaffMember[] = [],
    leader: StaffMember | null = null,
    numCampers: number = 0
  ) {
    this.id = crypto.randomUUID();
    this.activityType = activityType;
    this.timeslot = timeslot;
    this.staffMembers = staffMembers;
    this.leader = leader;
    this.numCampers = numCampers;
  }
}
