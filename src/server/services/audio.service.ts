import type { Database } from "@/server/db";
import { getSignedR2Url } from "@/lib/r2";

export class AudioService {
  constructor(private readonly database: Database) {}

  async getStreamUrl(_trackId: string, _userId: string): Promise<string> {
    throw new Error("Not implemented");
  }

  async signUrl(key: string) {
    return getSignedR2Url(key);
  }
}
