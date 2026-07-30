import IORedis, { type Redis } from "ioredis";

let sharedConnection: Redis | null = null;

/**
 * BullMQ requires maxRetriesPerRequest: null on its Redis connection.
 * This factory is the single place that rule is enforced so api/worker
 * can't accidentally create a misconfigured connection.
 */
export function getRedisConnection(redisUrl: string): Redis {
  if (sharedConnection) return sharedConnection;
  sharedConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });
  return sharedConnection;
}

export async function closeRedisConnection() {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
  }
}
