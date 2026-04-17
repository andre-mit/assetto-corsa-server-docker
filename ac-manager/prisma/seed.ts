import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const masterEmail = process.env.MASTER_EMAIL;
  const masterPassword = process.env.MASTER_PASSWORD;
  const masterName = process.env.MASTER_NAME || "Master Admin";

  if (!masterEmail || !masterPassword) {
    throw new Error(
      "MASTER_EMAIL and MASTER_PASSWORD must be set in environment variables."
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: masterEmail },
  });

  if (existing) {
    console.log(`✅ Master user already exists: ${masterEmail}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(masterPassword, 12);

  const master = await prisma.user.create({
    data: {
      email: masterEmail,
      name: masterName,
      password: hashedPassword,
      role: "MASTER",
    },
  });

  console.log(`✅ Master user created: ${master.email} (id: ${master.id})`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
