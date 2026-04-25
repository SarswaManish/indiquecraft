import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  whatsappNumber: z.string().optional(),
  city: z.string().optional(),
  materialSupplied: z.string().optional(),
  standardLeadDays: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vendor = await db.vendor.findUnique({
    where: { id },
    include: {
      vendorRequests: {
        orderBy: { requestDate: "desc" },
        take: 10,
        include: { _count: { select: { vendorRequestItems: true } } },
      },
    },
  });

  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vendor);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const vendor = await db.vendor.update({ where: { id }, data: parsed.data });
  return NextResponse.json(vendor);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await db.vendor.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
