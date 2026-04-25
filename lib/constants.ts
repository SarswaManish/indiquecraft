import {
  OrderStatus,
  OrderPriority,
  OrderSource,
  ProductionStage,
  VendorRequestStatus,
  FinishType,
  Role,
} from "@prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "New",
  RAW_MATERIAL_PENDING: "Raw Material Pending",
  MATERIAL_RECEIVED: "Material Received",
  IN_PRODUCTION: "In Production",
  FINISHING: "Finishing",
  PACKING: "Packing",
  READY_TO_DISPATCH: "Ready to Dispatch",
  DISPATCHED: "Dispatched",
  COMPLETED: "Completed",
  DELAYED: "Delayed",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  RAW_MATERIAL_PENDING: "bg-yellow-100 text-yellow-800",
  MATERIAL_RECEIVED: "bg-cyan-100 text-cyan-800",
  IN_PRODUCTION: "bg-purple-100 text-purple-800",
  FINISHING: "bg-indigo-100 text-indigo-800",
  PACKING: "bg-orange-100 text-orange-800",
  READY_TO_DISPATCH: "bg-green-100 text-green-800",
  DISPATCHED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  DELAYED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-200 text-gray-500",
};

export const PRODUCTION_STAGE_LABELS: Record<ProductionStage, string> = {
  NOT_STARTED: "Not Started",
  WAITING_MATERIAL: "Waiting Material",
  MANUFACTURING: "Manufacturing",
  PLATING: "Plating",
  POLISHING: "Polishing",
  FINISHING: "Finishing",
  PACKING: "Packing",
  COMPLETED: "Completed",
};

export const PRODUCTION_STAGE_COLORS: Record<ProductionStage, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600",
  WAITING_MATERIAL: "bg-yellow-100 text-yellow-700",
  MANUFACTURING: "bg-blue-100 text-blue-700",
  PLATING: "bg-violet-100 text-violet-700",
  POLISHING: "bg-indigo-100 text-indigo-700",
  FINISHING: "bg-orange-100 text-orange-700",
  PACKING: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

export const VENDOR_STATUS_LABELS: Record<VendorRequestStatus, string> = {
  DRAFT: "Draft",
  REQUESTED: "Requested",
  FOLLOW_UP_PENDING: "Follow-up Pending",
  CONFIRMED: "Confirmed",
  PARTIALLY_RECEIVED: "Partially Received",
  FULLY_RECEIVED: "Fully Received",
  DELAYED: "Delayed",
  CANCELLED: "Cancelled",
};

export const VENDOR_STATUS_COLORS: Record<VendorRequestStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  REQUESTED: "bg-blue-100 text-blue-700",
  FOLLOW_UP_PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-cyan-100 text-cyan-700",
  PARTIALLY_RECEIVED: "bg-orange-100 text-orange-700",
  FULLY_RECEIVED: "bg-green-100 text-green-700",
  DELAYED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-200 text-gray-500",
};

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_COLORS: Record<OrderPriority, string> = {
  LOW: "bg-gray-100 text-gray-600",
  NORMAL: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export const SOURCE_LABELS: Record<OrderSource, string> = {
  PHONE: "Phone",
  WHATSAPP: "WhatsApp",
  DIRECT: "Direct",
  EMAIL: "Email",
  OTHER: "Other",
};

export const FINISH_TYPE_LABELS: Record<FinishType, string> = {
  PLAIN: "Plain",
  GOLD_PLATED: "Gold Plated",
  RHODIUM: "Rhodium",
  ANTIQUE: "Antique",
  TWO_TONE: "Two Tone",
  OTHER: "Other",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  ORDER_MANAGER: "Order Manager",
  PURCHASE_COORDINATOR: "Purchase Coordinator",
  PRODUCTION_MANAGER: "Production Manager",
  DISPATCH_MANAGER: "Dispatch Manager",
  OWNER: "Owner",
};

export const ORDER_NUMBER_PREFIX = "ORD";
export const VENDOR_REQUEST_NUMBER_PREFIX = "VR";

export const ITEMS_PER_PAGE = 20;
