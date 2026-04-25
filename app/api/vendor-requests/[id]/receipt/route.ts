import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";
import { recomputeAndPersistOrderStatuses } from "@/lib/order-workflow";
import { invalidateDashboardCache } from "@/lib/server-cache";

function createHttpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

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

  try {
    const receipt = await db.$transaction(async (tx) => {
      const vendorRequest = await tx.vendorRequest.findUnique({
        where: { id },
        include: {
          vendorRequestItems: {
            include: {
              orderItem: {
                select: { id: true, orderId: true, productionStage: true },
              },
            },
          },
        },
      });

      if (!vendorRequest) {
        throw createHttpError("Vendor request not found", 404);
      }

      const totalReceived = parsed.data.items.reduce((sum, item) => sum + item.qtyReceived, 0);
      const vendorRequestItemsById = new Map(
        vendorRequest.vendorRequestItems.map((item) => [item.id, item])
      );

      for (const receiptItem of parsed.data.items) {
        const existingItem = vendorRequestItemsById.get(receiptItem.vendorRequestItemId);
        if (!existingItem) {
          throw createHttpError("Receipt item does not belong to this vendor request");
        }

        if (receiptItem.qtyReceived > existingItem.pendingQty) {
          throw createHttpError(
            `Cannot receive ${receiptItem.qtyReceived} units. Only ${existingItem.pendingQty} pending for ${existingItem.materialName}.`
          );
        }

        const newReceivedQty = existingItem.receivedQty + receiptItem.qtyReceived;
        const newPendingQty = existingItem.requestedQty - newReceivedQty;

        await tx.vendorRequestItem.update({
          where: { id: receiptItem.vendorRequestItemId },
          data: {
            receivedQty: newReceivedQty,
            pendingQty: newPendingQty,
          },
        });

        if (newPendingQty === 0 && existingItem.orderItem.productionStage === "WAITING_MATERIAL") {
          await tx.orderItem.update({
            where: { id: existingItem.orderItem.id },
            data: { productionStage: "NOT_STARTED" },
          });
        }
      }

      const receipt = await tx.materialReceipt.create({
        data: {
          vendorRequestId: id,
          receivedDate: parsed.data.receivedDate ? new Date(parsed.data.receivedDate) : new Date(),
          totalQtyReceived: totalReceived,
          remarks: parsed.data.remarks,
        },
      });

      const updatedVendorRequest = await tx.vendorRequest.findUniqueOrThrow({
        where: { id },
        include: { vendorRequestItems: true },
      });

      const allFullyReceived = updatedVendorRequest.vendorRequestItems.every(
        (item) => item.pendingQty === 0
      );
      const anyReceived = updatedVendorRequest.vendorRequestItems.some(
        (item) => item.receivedQty > 0
      );

      await tx.vendorRequest.update({
        where: { id },
        data: {
          status: allFullyReceived
            ? "FULLY_RECEIVED"
            : anyReceived
            ? "PARTIALLY_RECEIVED"
            : "REQUESTED",
          actualReceiptDate: allFullyReceived ? new Date() : null,
        },
      });

      await recomputeAndPersistOrderStatuses(
        tx,
        vendorRequest.vendorRequestItems.map((item) => item.orderItem.orderId)
      );

      return receipt;
    });

    await invalidateDashboardCache();

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to record receipt";
    return NextResponse.json({ error: message }, { status });
  }
}
