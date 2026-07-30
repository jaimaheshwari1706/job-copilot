import mongoose from "mongoose";

export interface MongoConnectOptions {
  uri: string;
  serviceName: string;
}

let connectionPromise: Promise<typeof mongoose> | null = null;

/**
 * Idempotent Mongo connection helper shared by apps/api and apps/worker.
 * Both runtimes call this with their own service name for clearer logs,
 * but share connection pooling behaviour and event wiring.
 */
export async function connectMongo({ uri, serviceName }: MongoConnectOptions) {
  if (connectionPromise) return connectionPromise;

  mongoose.connection.on("connected", () => {
    // eslint-disable-next-line no-console
    console.log(`[mongo] (${serviceName}) connected`);
  });
  mongoose.connection.on("error", (err) => {
    console.error(`[mongo] (${serviceName}) connection error`, err);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn(`[mongo] (${serviceName}) disconnected`);
  });

  connectionPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  return connectionPromise;
}

export async function disconnectMongo() {
  await mongoose.disconnect();
  connectionPromise = null;
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
