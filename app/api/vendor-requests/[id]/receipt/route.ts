import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

const receiptItemSchema = z.object({
  vendorRequestItemId: z.string().min(1),
  qtyReceived: z.number().int().min(1),
});

const receiptSchema = z.object({
  receivedDate: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(receiptItemSchema).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const parsed = receiptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const vr = await db.vendorRequest.findUnique({
    where: { id },
    include: { vendorRequestItems: true },
  });
  if (!vr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalReceived = parsed.data.items.reduce((sum, i) => sum + i.qtyReceived, 0);

  await Promise.all(
    parsed.data.items.map(async (item) => {
      const vrItem = vr.vendorRequestItems.find((i) => i.id === item.vendorRequestItemId);
      if (!vrItem) return;
      const newReceived = vrItem.receivedQty + item.qtyReceived;
      const newPending = Math.max(0, vrItem.requestedQty - newReceived);
      await db.vendorRequestItem.update({
        where: { id: item.vendorRequestItemId },
        data: { receivedQty: newReceived, pendingQty: newPending },
      });
    })
  );

  const receipt = await db.materialReceipt.create({
    data: {
      vendorRequestId: id,
      receivedDate: parsed.data.receivedDate ? new Date(parsed.data.receivedDate) : new Date(),
      totalQtyReceived: totalReceived,
      remarks: parsed.data.remarks,
    },
  });

  const updatedVR = await db.vendorRequest.findUnique({
    where: { id },
    include: { vendorRequestItems: true },
  });

  if (updatedVR) {
    const allFullyReceived = updatedVR.vendorRequestItems.every((i) => i.pendingQty === 0);
    const anyReceived = updatedVR.vendorRequestItems.some((i) => i.receivedQty > 0);

    const newStatus = allFullyReceived
      ? "FULLY_RECEIVED"
      : anyReceived
      ? "PARTIALLY_RECEIVED"
      : "REQUESTED";

    await db.vendorRequest.update({
      where: { id },
      data: {
        status: newStatus,
        actualReceiptDate: allFullyReceived ? new Date() : undefined,
      },
    });

    if (allFullyReceived) {
      const orderItemIds = updatedVR.vendorRequestItems.map((i) => i.orderItemId);
      await db.orderItem.updateMany({
        where: { id: { in: orderItemIds }, productionStage: "WAITING_MATERIAL" },
        data: { productionStage: "MANUFACTURING" },
      });
    }
  }

  return NextResponse.json(receipt, { status: 201 });
}
