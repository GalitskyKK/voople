import type { Database } from "@/server/db";

export class MatchService {
  constructor(private readonly database: Database) {}

  async calculateCompatibility(_userA: string, _userB: string): Promise<number> {
    throw new Error("Not implemented");
  }
}
