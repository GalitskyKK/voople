import type { Database } from "@/server/db";

export class MatchService {
  constructor(private readonly database: Database) {}

  async calculateCompatibility(userA: string, userB: string): Promise<number> {
    void userA;
    void userB;
    throw new Error("Not implemented");
  }
}
