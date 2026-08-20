import type { Database } from "@/server/db";
import { getSignedR2Url } from "@/lib/r2";

export class AudioService {
  constructor(private readonly database: Database) {}

  async getStreamUrl(trackId: string, userId: string): Promise<string> {
    void trackId;
    void userId;
    throw new Error("Not implemented");
  }

  async signUrl(key: string) {
    return getSignedR2Url(key);
  }
}
