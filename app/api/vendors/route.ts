import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const vendorSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  whatsappNumber: z.string().optional(),
  city: z.string().optional(),
  materialSupplied: z.string().optional(),
  standardLeadDays: z.number().int().min(1).default(7),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const where = search
    ? {
        isActive: true,
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
          { materialSupplied: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : { isActive: true };

  const vendors = await db.vendor.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { vendorRequests: true } },
    },
  });

  return NextResponse.json({ vendors });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = vendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const vendor = await db.vendor.create({ data: parsed.data });
  return NextResponse.json(vendor, { status: 201 });
}
