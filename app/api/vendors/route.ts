import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE));
  const includeInactive = searchParams.get("includeInactive") === "true";

  const where = search
    ? {
        ...(includeInactive ? {} : { isActive: true }),
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
          { materialSupplied: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : includeInactive
    ? {}
    : { isActive: true };

  const [vendors, total] = await Promise.all([
    db.vendor.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { vendorRequests: true } },
      },
    }),
    db.vendor.count({ where }),
  ]);

  return NextResponse.json({ vendors, total, page, limit });
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
