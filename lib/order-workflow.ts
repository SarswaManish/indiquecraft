import { OrderStatus, Prisma, ProductionStage } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

const IN_PRODUCTION_STAGES: ProductionStage[] = [
  "MANUFACTURING",
  "PLATING",
  "POLISHING",
];

type WorkflowOrder = Prisma.OrderGetPayload<{
  include: {
    orderItems: {
      include: {
        vendorRequestItems: true;
        dispatchItems: true;
      };
    };
  };
}>;

function sumDispatchedQty(orderItem: WorkflowOrder["orderItems"][number]): number {
  return orderItem.dispatchItems.reduce((total, item) => total + item.qtyDispatched, 0);
}

export function deriveOrderWorkflowStatus(order: WorkflowOrder): OrderStatus {
  if (order.status === "CANCELLED" || order.status === "COMPLETED") {
    return order.status;
  }

  const allItemsDispatched =
    order.orderItems.length > 0 &&
    order.orderItems.every((item) => sumDispatchedQty(item) >= item.quantity);

  if (allItemsDispatched) {
    return "DISPATCHED";
  }

  const stages = order.orderItems.map((item) => item.productionStage);
  const rawMaterialItems = order.orderItems.filter((item) => item.rawMaterialRequired);

  const hasPendingMaterial = rawMaterialItems.some(
    (item) =>
      item.vendorRequestItems.length === 0 ||
      item.vendorRequestItems.some((requestItem) => requestItem.pendingQty > 0)
  );

  const allRequiredMaterialReceived =
    rawMaterialItems.length > 0 &&
    rawMaterialItems.every(
      (item) =>
        item.vendorRequestItems.length > 0 &&
        item.vendorRequestItems.every((requestItem) => requestItem.pendingQty === 0)
    );

  if (stages.length > 0 && stages.every((stage) => stage === "COMPLETED")) {
    return "READY_TO_DISPATCH";
  }

  if (stages.some((stage) => stage === "PACKING")) {
    return "PACKING";
  }

  if (stages.some((stage) => stage === "FINISHING")) {
    return "FINISHING";
  }

  if (stages.some((stage) => IN_PRODUCTION_STAGES.includes(stage))) {
    return "IN_PRODUCTION";
  }

  if (hasPendingMaterial) {
    return "RAW_MATERIAL_PENDING";
  }

  if (allRequiredMaterialReceived) {
    return "MATERIAL_RECEIVED";
  }

  if (stages.some((stage) => stage === "NOT_STARTED")) {
    return "NEW";
  }

  return order.status;
}

export async function recomputeAndPersistOrderStatus(
  tx: TxClient,
  orderId: string
): Promise<OrderStatus> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          vendorRequestItems: true,
          dispatchItems: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found while recomputing status");
  }

  const nextStatus = deriveOrderWorkflowStatus(order);
  if (nextStatus !== order.status) {
    await tx.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });
  }

  return nextStatus;
}

export async function recomputeAndPersistOrderStatuses(
  tx: TxClient,
  orderIds: Iterable<string>
): Promise<void> {
  const uniqueOrderIds = [...new Set(orderIds)];
  for (const orderId of uniqueOrderIds) {
    await recomputeAndPersistOrderStatus(tx, orderId);
  }
}
