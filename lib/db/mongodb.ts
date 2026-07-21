import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_ATLAS_URI!;
const DB_NAME = process.env.DB_NAME || "vigil_db";

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_ATLAS_URI in .env.local");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export default clientPromise;
