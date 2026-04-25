import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { FinishType } from "@prisma/client";

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  defaultSize: z.string().optional(),
  finishType: z.nativeEnum(FinishType).default("PLAIN"),
  imageUrl: z.string().optional(),
  defaultLeadTimeDays: z.number().int().min(1).default(7),
  rawMaterialRequired: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const includeInactive = searchParams.get("includeInactive") === "true";

  const where: Record<string, unknown> = includeInactive ? {} : { isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.product.findUnique({ where: { sku: parsed.data.sku } });
  if (existing) {
    return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
  }

  const product = await db.product.create({ data: parsed.data });
  return NextResponse.json(product, { status: 201 });
}
