import { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

function extractSequence(value: string | null | undefined): number {
  if (!value) return 0;
  const match = value.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

async function lockAndReadLatestNumber(
  tx: TxClient,
  scope: string,
  query: Prisma.Sql
): Promise<number> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scope}))`;
  const rows = await tx.$queryRaw<Array<{ value: string | null }>>(query);
  return extractSequence(rows[0]?.value);
}

export async function generateNextOrderNumber(tx: TxClient): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `ORD-${year}-`;
  const latest = await lockAndReadLatestNumber(
    tx,
    `orders:${year}`,
    Prisma.sql`
      SELECT "orderNumber" AS value
      FROM "orders"
      WHERE "orderNumber" LIKE ${`${prefix}%`}
      ORDER BY "orderNumber" DESC
      LIMIT 1
    `
  );

  return `${prefix}${String(latest + 1).padStart(4, "0")}`;
}

export async function generateNextVendorRequestNumber(tx: TxClient): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `VR-${year}-`;
  const latest = await lockAndReadLatestNumber(
    tx,
    `vendor-requests:${year}`,
    Prisma.sql`
      SELECT "requestNumber" AS value
      FROM "vendor_requests"
      WHERE "requestNumber" LIKE ${`${prefix}%`}
      ORDER BY "requestNumber" DESC
      LIMIT 1
    `
  );

  return `${prefix}${String(latest + 1).padStart(4, "0")}`;
}
