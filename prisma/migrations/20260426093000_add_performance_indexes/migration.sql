CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "users_isActive_idx" ON "users"("isActive");

CREATE INDEX IF NOT EXISTS "customers_isActive_partyName_idx"
  ON "customers"("isActive", "partyName");
CREATE INDEX IF NOT EXISTS "customers_createdAt_idx"
  ON "customers"("createdAt");

CREATE INDEX IF NOT EXISTS "products_isActive_name_idx"
  ON "products"("isActive", "name");
CREATE INDEX IF NOT EXISTS "products_category_isActive_idx"
  ON "products"("category", "isActive");
CREATE INDEX IF NOT EXISTS "products_createdAt_idx"
  ON "products"("createdAt");

CREATE INDEX IF NOT EXISTS "vendors_isActive_name_idx"
  ON "vendors"("isActive", "name");
CREATE INDEX IF NOT EXISTS "vendors_createdAt_idx"
  ON "vendors"("createdAt");

CREATE INDEX IF NOT EXISTS "orders_customerId_orderDate_idx"
  ON "orders"("customerId", "orderDate");
CREATE INDEX IF NOT EXISTS "orders_status_promisedDeliveryDate_idx"
  ON "orders"("status", "promisedDeliveryDate");
CREATE INDEX IF NOT EXISTS "orders_status_createdAt_idx"
  ON "orders"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_priority_createdAt_idx"
  ON "orders"("priority", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_createdAt_idx"
  ON "orders"("createdAt");

CREATE INDEX IF NOT EXISTS "order_items_orderId_idx"
  ON "order_items"("orderId");
CREATE INDEX IF NOT EXISTS "order_items_productId_idx"
  ON "order_items"("productId");
CREATE INDEX IF NOT EXISTS "order_items_productionStage_createdAt_idx"
  ON "order_items"("productionStage", "createdAt");
CREATE INDEX IF NOT EXISTS "order_items_rawMaterialRequired_productionStage_idx"
  ON "order_items"("rawMaterialRequired", "productionStage");
CREATE INDEX IF NOT EXISTS "order_items_createdAt_idx"
  ON "order_items"("createdAt");

CREATE INDEX IF NOT EXISTS "vendor_requests_vendorId_requestDate_idx"
  ON "vendor_requests"("vendorId", "requestDate");
CREATE INDEX IF NOT EXISTS "vendor_requests_status_expectedArrivalDate_idx"
  ON "vendor_requests"("status", "expectedArrivalDate");
CREATE INDEX IF NOT EXISTS "vendor_requests_requestDate_idx"
  ON "vendor_requests"("requestDate");
CREATE INDEX IF NOT EXISTS "vendor_requests_expectedArrivalDate_idx"
  ON "vendor_requests"("expectedArrivalDate");
CREATE INDEX IF NOT EXISTS "vendor_requests_createdAt_idx"
  ON "vendor_requests"("createdAt");

CREATE INDEX IF NOT EXISTS "vendor_request_items_vendorRequestId_idx"
  ON "vendor_request_items"("vendorRequestId");
CREATE INDEX IF NOT EXISTS "vendor_request_items_orderItemId_idx"
  ON "vendor_request_items"("orderItemId");
CREATE INDEX IF NOT EXISTS "vendor_request_items_pendingQty_idx"
  ON "vendor_request_items"("pendingQty");

CREATE INDEX IF NOT EXISTS "material_receipts_vendorRequestId_receivedDate_idx"
  ON "material_receipts"("vendorRequestId", "receivedDate");

CREATE INDEX IF NOT EXISTS "production_logs_orderItemId_loggedAt_idx"
  ON "production_logs"("orderItemId", "loggedAt");
CREATE INDEX IF NOT EXISTS "production_logs_loggedAt_idx"
  ON "production_logs"("loggedAt");
CREATE INDEX IF NOT EXISTS "production_logs_updatedById_idx"
  ON "production_logs"("updatedById");

CREATE INDEX IF NOT EXISTS "dispatches_orderId_dispatchDate_idx"
  ON "dispatches"("orderId", "dispatchDate");
CREATE INDEX IF NOT EXISTS "dispatches_dispatchDate_idx"
  ON "dispatches"("dispatchDate");
CREATE INDEX IF NOT EXISTS "dispatches_isPartial_dispatchDate_idx"
  ON "dispatches"("isPartial", "dispatchDate");

CREATE INDEX IF NOT EXISTS "dispatch_items_dispatchId_idx"
  ON "dispatch_items"("dispatchId");
CREATE INDEX IF NOT EXISTS "dispatch_items_orderItemId_idx"
  ON "dispatch_items"("orderItemId");

CREATE INDEX IF NOT EXISTS "customers_partyName_trgm_idx"
  ON "customers" USING GIN ("partyName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "customers_phone_trgm_idx"
  ON "customers" USING GIN ("phone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "customers_city_trgm_idx"
  ON "customers" USING GIN ("city" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "products_name_trgm_idx"
  ON "products" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_sku_trgm_idx"
  ON "products" USING GIN ("sku" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_category_trgm_idx"
  ON "products" USING GIN ("category" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "vendors_name_trgm_idx"
  ON "vendors" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "vendors_city_trgm_idx"
  ON "vendors" USING GIN ("city" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "vendors_materialSupplied_trgm_idx"
  ON "vendors" USING GIN ("materialSupplied" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "orders_orderNumber_trgm_idx"
  ON "orders" USING GIN ("orderNumber" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "vendor_requests_requestNumber_trgm_idx"
  ON "vendor_requests" USING GIN ("requestNumber" gin_trgm_ops);
