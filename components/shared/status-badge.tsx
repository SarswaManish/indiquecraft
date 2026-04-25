import { Badge } from "@/components/ui/badge";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PRODUCTION_STAGE_LABELS,
  PRODUCTION_STAGE_COLORS,
  VENDOR_STATUS_LABELS,
  VENDOR_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/lib/constants";
import {
  OrderStatus,
  ProductionStage,
  VendorRequestStatus,
  OrderPriority,
} from "@prisma/client";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge className={ORDER_STATUS_COLORS[status]}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ProductionStageBadge({ stage }: { stage: ProductionStage }) {
  return (
    <Badge className={PRODUCTION_STAGE_COLORS[stage]}>
      {PRODUCTION_STAGE_LABELS[stage]}
    </Badge>
  );
}

export function VendorStatusBadge({ status }: { status: VendorRequestStatus }) {
  return (
    <Badge className={VENDOR_STATUS_COLORS[status]}>
      {VENDOR_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: OrderPriority }) {
  return (
    <Badge className={PRIORITY_COLORS[priority]}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
