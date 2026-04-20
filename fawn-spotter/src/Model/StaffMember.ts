import { Villages } from "./Villages";
import { Tag } from "./Tag";

export class StaffMember {
  id: string;
  name: string;
  notes: string;
  village: Villages;
  tags: Tag[];

  constructor(id: string, name: string, notes: string, village: Villages, tags: Tag[]) {
    this.id = id;
    this.name = name;
    this.notes = notes;
    this.village = village;
    this.tags = tags;
  }
}
