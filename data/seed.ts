/**
 * VIGIL Database Seed Script
 * Run: npm run seed
 *
 * Seeds: incidents, regulations, workers, and initial permits into MongoDB Atlas
 */

// Load .env.local FIRST — tsx doesn't load it automatically like Next.js does
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { MongoClient } from "mongodb";
import incidents from "./incidents.json";
import regulations from "./regulations.json";

const MONGODB_URI = process.env.MONGODB_ATLAS_URI || "";
const DB_NAME = process.env.DB_NAME || "vigil_db";

const ZONE_IDS = ["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D", "ZONE_E", "ZONE_F"] as const;
const ROLES = ["Process Operator", "Maintenance Technician", "Safety Marshal", "Crane Operator", "Electrician", "Welder"];
const SHIFTS = ["DAY", "EVENING", "NIGHT"] as const;

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const INDIAN_NAMES = [
  "Rajan Kumar", "Suresh Patel", "Mohammed Ashraf", "Venkat Rao", "Arun Singh",
  "Pradeep Nair", "Sanjay Gupta", "Ramesh Babu", "Deepak Sharma", "Manoj Tiwari",
  "Gopal Krishnan", "Bala Subramaniam", "Arjun Reddy", "Vikram Joshi", "Sathish Kumar",
  "Ravi Shankar", "Anand Mehta", "Harish Patel", "Dilip Verma", "Sunil Yadav",
  "Rajesh Mishra", "Chandra Mohan", "Selvam Pillai", "Murali Manohar", "Srinivas Rao",
  "Kishore Babu", "Prasad Naidu", "Ganesh Iyer", "Karthik Raja", "Naresh Goud",
];

async function seed() {
  if (!MONGODB_URI || MONGODB_URI.includes("<db_password>")) {
    console.error("❌ Please set MONGODB_ATLAS_URI in .env.local with your actual password first.");
    process.exit(1);
  }

  console.log("🔗 Connecting to MongoDB Atlas...");
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  console.log(`✅ Connected to database: ${DB_NAME}`);

  // ─── Create collections & indexes ─────────────────────────────────────────
  console.log("\n📁 Setting up collections and indexes...");

  // TTL index on sensors (keep last 24 hours)
  await db.collection("sensors").createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 86400, background: true }
  );

  // TTL on risk_scores (keep last 7 days)
  await db.collection("risk_scores").createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 604800, background: true }
  );

  // Indexes for efficient querying
  await db.collection("sensors").createIndex({ zone_id: 1, sensor_type: 1, timestamp: -1 });
  await db.collection("permits").createIndex({ zone_id: 1, status: 1 });
  await db.collection("permits").createIndex({ permit_id: 1 }, { unique: true });
  await db.collection("alerts").createIndex({ timestamp: -1 });
  await db.collection("alerts").createIndex({ zone_id: 1, status: 1 });
  await db.collection("workers").createIndex({ zone_id: 1 });

  // Text indexes for keyword search
  await db.collection("incidents").createIndex({ content: "text", title: "text", facility: "text" });
  await db.collection("regulations").createIndex({ content: "text", title: "text" });

  console.log("✅ Indexes created");

  // ─── Seed Incidents ────────────────────────────────────────────────────────
  const existingIncidents = await db.collection("incidents").countDocuments();
  if (existingIncidents === 0) {
    await db.collection("incidents").insertMany(incidents as any[]);
    console.log(`✅ Seeded ${incidents.length} incident records`);
  } else {
    console.log(`⏭️  Incidents already seeded (${existingIncidents} records)`);
  }

  // ─── Seed Regulations ─────────────────────────────────────────────────────
  const existingRegs = await db.collection("regulations").countDocuments();
  if (existingRegs === 0) {
    await db.collection("regulations").insertMany(regulations as any[]);
    console.log(`✅ Seeded ${regulations.length} regulatory documents`);
  } else {
    console.log(`⏭️  Regulations already seeded (${existingRegs} records)`);
  }

  // ─── Seed Workers ─────────────────────────────────────────────────────────
  const existingWorkers = await db.collection("workers").countDocuments();
  if (existingWorkers === 0) {
    const workers = INDIAN_NAMES.map((name, i) => ({
      worker_id: `WKR-${String(i + 1).padStart(4, "0")}`,
      name,
      zone_id: randomFrom(ZONE_IDS),
      last_seen: new Date(),
      shift: randomFrom(SHIFTS),
      role: randomFrom(ROLES),
    }));
    await db.collection("workers").insertMany(workers);
    console.log(`✅ Seeded ${workers.length} workers`);
  } else {
    console.log(`⏭️  Workers already seeded (${existingWorkers} records)`);
  }

  // ─── Seed Sample Permits ───────────────────────────────────────────────────
  const existingPermits = await db.collection("permits").countDocuments();
  if (existingPermits === 0) {
    const now = new Date();
    const samplePermits = [
      {
        permit_id: "PTW-2026-0001",
        type: "HOT_WORK",
        zone_id: "ZONE_B",
        issued_by: "Safety Officer",
        issued_to: "Venkat Rao",
        valid_from: new Date(now.getTime() - 2 * 3600000),
        valid_until: new Date(now.getTime() + 6 * 3600000),
        status: "ACTIVE",
        ai_verdict: "CONDITIONAL",
        ai_reason: "CH₄ at 4.2% LEL — below threshold but monitoring required. Gas test every 30 minutes mandatory.",
        ai_referenced_standard: "OISD-116 Section 5.3",
        conditions: ["Re-test atmosphere every 30 minutes", "Standby fire extinguisher within 5m", "Immediate suspension if CH4 exceeds 10% LEL"],
        created_at: new Date(now.getTime() - 2 * 3600000),
      },
      {
        permit_id: "PTW-2026-0002",
        type: "CONFINED_SPACE",
        zone_id: "ZONE_D",
        issued_by: "Safety Officer",
        issued_to: "Mohammed Ashraf",
        valid_from: new Date(now.getTime() - 1 * 3600000),
        valid_until: new Date(now.getTime() + 4 * 3600000),
        status: "ACTIVE",
        ai_verdict: "APPROVED",
        ai_reason: "All atmospheric parameters within safe limits. Continuous monitoring in place. Standby person assigned.",
        ai_referenced_standard: "OISD-116 Section 8.1",
        conditions: ["Standby person to remain at entry point", "Continuous O2 and H2S monitoring mandatory"],
        created_at: new Date(now.getTime() - 3 * 3600000),
      },
      {
        permit_id: "PTW-2026-0003",
        type: "ELECTRICAL",
        zone_id: "ZONE_F",
        issued_by: "Electrical Supervisor",
        issued_to: "Harish Patel",
        valid_from: now,
        valid_until: new Date(now.getTime() + 8 * 3600000),
        status: "PENDING_AI",
        conditions: [],
        created_at: now,
      },
    ];
    await db.collection("permits").insertMany(samplePermits);
    console.log(`✅ Seeded ${samplePermits.length} sample permits`);
  } else {
    console.log(`⏭️  Permits already seeded (${existingPermits} records)`);
  }

  console.log("\n🎉 VIGIL database seeding complete!");
  console.log(`   📊 Database: ${DB_NAME}`);
  console.log(`   📍 Cluster: ${MONGODB_URI.split("@")[1]?.split("/")[0]}`);
  console.log("\n   Next: Run 'npm run dev' to start VIGIL\n");

  await client.close();
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
