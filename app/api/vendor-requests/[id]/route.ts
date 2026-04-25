import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import { z } from "zod";
import { VendorRequestStatus } from "@prisma/client";
import { invalidateReadCaches } from "@/lib/server-cache";

const updateSchema = z.object({
  expectedArrivalDate: z.string().optional(),
  status: z.nativeEnum(VendorRequestStatus).optional(),
  notes: z.string().optional(),
});

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const vr = await db.vendorRequest.findUnique({
    where: { id },
    include: {
      vendor: true,
      vendorRequestItems: {
        include: {
          orderItem: {
            include: {
              product: true,
              order: { include: { customer: { select: { partyName: true } } } },
            },
          },
        },
      },
      materialReceipts: { orderBy: { receivedDate: "desc" } },
    },
  });

  if (!vr) return jsonNoStore({ error: "Not found" }, { status: 404 });
  return jsonNoStore(vr);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonNoStore({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.expectedArrivalDate) {
    data.expectedArrivalDate = new Date(parsed.data.expectedArrivalDate);
  }

  const vr = await db.vendorRequest.update({ where: { id }, data });
  await invalidateReadCaches();
  return jsonNoStore(vr);
}
