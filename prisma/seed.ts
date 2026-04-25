import { PrismaClient, OrderStatus, VendorRequestStatus, ProductionStage } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
const db = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding IndiqueCraft database...");

  // ─── Clean slate ──────────────────────────────────────────────────────────
  await db.dispatchItem.deleteMany();
  await db.dispatch.deleteMany();
  await db.productionLog.deleteMany();
  await db.materialReceipt.deleteMany();
  await db.vendorRequestItem.deleteMany();
  await db.vendorRequest.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.customer.deleteMany();
  await db.product.deleteMany();
  await db.vendor.deleteMany();
  await db.user.deleteMany();

  // ─── Users ────────────────────────────────────────────────────────────────
  const users = await Promise.all([
    db.user.create({ data: { name: "Rajesh Sharma", email: "admin@indiquecraft.com", passwordHash: await bcrypt.hash("admin123", 10), role: "ADMIN" } }),
    db.user.create({ data: { name: "Sunita Agarwal", email: "owner@indiquecraft.com", passwordHash: await bcrypt.hash("owner123", 10), role: "OWNER" } }),
    db.user.create({ data: { name: "Vikram Patel", email: "orders@indiquecraft.com", passwordHash: await bcrypt.hash("order123", 10), role: "ORDER_MANAGER" } }),
    db.user.create({ data: { name: "Pooja Meena", email: "purchase@indiquecraft.com", passwordHash: await bcrypt.hash("purch123", 10), role: "PURCHASE_COORDINATOR" } }),
    db.user.create({ data: { name: "Suresh Kumar", email: "production@indiquecraft.com", passwordHash: await bcrypt.hash("prod123", 10), role: "PRODUCTION_MANAGER" } }),
    db.user.create({ data: { name: "Anita Joshi", email: "dispatch@indiquecraft.com", passwordHash: await bcrypt.hash("disp123", 10), role: "DISPATCH_MANAGER" } }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ─── Customers ───────────────────────────────────────────────────────────
  const customers = await Promise.all([
    db.customer.create({ data: { partyName: "Rajesh Jewellers", phone: "+91 94123 00001", city: "Jaipur", gstNumber: "08ABCDE1234F1Z5", address: "MI Road, Jaipur 302001" } }),
    db.customer.create({ data: { partyName: "Meenakshi Silver House", phone: "+91 94123 00002", city: "Jodhpur", address: "Clock Tower Market, Jodhpur" } }),
    db.customer.create({ data: { partyName: "Laxmi Traders", phone: "+91 94123 00003", city: "Mumbai", gstNumber: "27XYZPQ9876H1A2", address: "Zaveri Bazaar, Mumbai" } }),
    db.customer.create({ data: { partyName: "Soni Emporium", phone: "+91 94123 00004", city: "Delhi", address: "Karol Bagh, New Delhi" } }),
    db.customer.create({ data: { partyName: "Pushkar Silver Art", phone: "+91 94123 00005", city: "Ajmer", address: "Pushkar Road, Ajmer" } }),
    db.customer.create({ data: { partyName: "Amrit Wholesale", phone: "+91 94123 00006", city: "Ahmedabad", gstNumber: "24MNOPQ5678J1K3", address: "Manek Chowk, Ahmedabad" } }),
    db.customer.create({ data: { partyName: "Heritage Crafts", phone: "+91 94123 00007", city: "Udaipur", address: "City Palace Road, Udaipur" } }),
    db.customer.create({ data: { partyName: "Patel Gift House", phone: "+91 94123 00008", city: "Surat", address: "Ring Road, Surat" } }),
    db.customer.create({ data: { partyName: "Shree Silver Palace", phone: "+91 94123 00009", city: "Bikaner", address: "Kote Gate, Bikaner" } }),
    db.customer.create({ data: { partyName: "Ganesh Traders", phone: "+91 94123 00010", city: "Jaipur", address: "Tripolia Bazar, Jaipur" } }),
  ]);
  console.log(`✅ Created ${customers.length} customers`);

  // ─── Products ─────────────────────────────────────────────────────────────
  const products = await Promise.all([
    db.product.create({ data: { sku: "AG-GANESH-4IN", name: "Silver Ganesh Idol 4 inch", category: "Idols", defaultSize: "4 inch", finishType: "PLAIN", defaultLeadTimeDays: 10, rawMaterialRequired: true } }),
    db.product.create({ data: { sku: "AG-GANESH-6IN", name: "Silver Ganesh Idol 6 inch", category: "Idols", defaultSize: "6 inch", finishType: "PLAIN", defaultLeadTimeDays: 12, rawMaterialRequired: true } }),
    db.product.create({ data: { sku: "AG-LAKSHMI-4IN", name: "Silver Lakshmi Idol 4 inch", category: "Idols", defaultSize: "4 inch", finishType: "GOLD_PLATED", defaultLeadTimeDays: 10, rawMaterialRequired: true } }),
    db.product.create({ data: { sku: "AG-LAKSHMI-6IN", name: "Silver Lakshmi Idol 6 inch", category: "Idols", defaultSize: "6 inch", finishType: "GOLD_PLATED", defaultLeadTimeDays: 14, rawMaterialRequired: true } }),
    db.product.create({ data: { sku: "AG-RADHA-KRISHNA-8IN", name: "Silver Radha Krishna 8 inch", category: "Idols", defaultSize: "8 inch", finishType: "ANTIQUE", defaultLeadTimeDays: 20, rawMaterialRequired: true } }),
    db.product.create({ data: { sku: "AG-DIYA-SET-6", name: "Silver Diya Set of 6", category: "Puja Items", finishType: "PLAIN", defaultLeadTimeDays: 7, rawMaterialRequired: false } }),
    db.product.create({ data: { sku: "AG-POOJA-THALI-SMALL", name: "Silver Pooja Thali Small", category: "Puja Items", finishType: "PLAIN", defaultLeadTimeDays: 7, rawMaterialRequired: false } }),
    db.product.create({ data: { sku: "AG-COIN-1GM", name: "Silver Coin 1 gram", category: "Coins", finishType: "PLAIN", defaultLeadTimeDays: 3, rawMaterialRequired: false } }),
    db.product.create({ data: { sku: "AG-COIN-5GM", name: "Silver Coin 5 gram", category: "Coins", finishType: "PLAIN", defaultLeadTimeDays: 3, rawMaterialRequired: false } }),
    db.product.create({ data: { sku: "AG-COIN-10GM", name: "Silver Coin 10 gram", category: "Coins", finishType: "PLAIN", defaultLeadTimeDays: 3, rawMaterialRequired: false } }),
    db.product.create({ data: { sku: "AG-BRACELET-MEN", name: "Silver Men's Bracelet", category: "Jewellery", finishType: "RHODIUM", defaultLeadTimeDays: 5, rawMaterialRequired: false } }),
    db.product.create({ data: { sku: "AG-CHAIN-16IN", name: "Silver Chain 16 inch", category: "Jewellery", finishType: "PLAIN", defaultLeadTimeDays: 5, rawMaterialRequired: false } }),
    db.product.create({ data: { sku: "AG-SHIV-FAMILY-10IN", name: "Silver Shiv Parvati Family 10 inch", category: "Idols", defaultSize: "10 inch", finishType: "ANTIQUE", defaultLeadTimeDays: 25, rawMaterialRequired: true } }),
    db.product.create({ data: { sku: "AG-ELEPHANT-PAIR-3IN", name: "Silver Elephant Pair 3 inch", category: "Decoratives", defaultSize: "3 inch", finishType: "PLAIN", defaultLeadTimeDays: 8, rawMaterialRequired: true } }),
    db.product.create({ data: { sku: "AG-HORSE-5IN", name: "Silver Running Horse 5 inch", category: "Decoratives", defaultSize: "5 inch", finishType: "GOLD_PLATED", defaultLeadTimeDays: 12, rawMaterialRequired: true } }),
    db.product.create({ data: { sku: "AG-FRAME-4X6", name: "Silver Photo Frame 4×6", category: "Decoratives", finishType: "PLAIN", defaultLeadTimeDays: 7, rawMaterialRequired: false } }),
    db.product.create({ data: { sku: "AG-KALASH-SMALL", name: "Silver Kalash Small", category: "Puja Items", finishType: "PLAIN", defaultLeadTimeDays: 8, rawMaterialRequired: false } }),
    db.product.create({ data: { sku: "AG-RING-LADIES-PLAIN", name: "Silver Ladies Ring Plain", category: "Jewellery", finishType: "PLAIN", defaultLeadTimeDays: 4, rawMaterialRequired: false } }),
    db.product.create({ data: { sku: "AG-EARING-JHUMKA-M", name: "Silver Jhumka Earrings Medium", category: "Jewellery", finishType: "ANTIQUE", defaultLeadTimeDays: 5, rawMaterialRequired: false } }),
    db.product.create({ data: { sku: "AG-VISHNU-CUSTOM-12IN", name: "Custom Silver Vishnu Idol 12 inch", category: "Idols", defaultSize: "12 inch", finishType: "TWO_TONE", defaultLeadTimeDays: 30, rawMaterialRequired: true } }),
  ]);
  console.log(`✅ Created ${products.length} products`);

  // ─── Vendors ──────────────────────────────────────────────────────────────
  const vendors = await Promise.all([
    db.vendor.create({ data: { name: "Soni Casting Works", phone: "+91 94200 11001", whatsappNumber: "+91 94200 11001", city: "Jaipur", materialSupplied: "Silver castings — idols, decoratives", standardLeadDays: 7 } }),
    db.vendor.create({ data: { name: "Rajputana Silver Craft", phone: "+91 94200 11002", whatsappNumber: "+91 94200 11002", city: "Jaipur", materialSupplied: "Semi-finished silver idols, rough casting", standardLeadDays: 10 } }),
    db.vendor.create({ data: { name: "AK Metal Works", phone: "+91 94200 11003", city: "Jodhpur", materialSupplied: "Silver frames, photo frames, boxes", standardLeadDays: 5 } }),
    db.vendor.create({ data: { name: "Jaipur Fine Casting", phone: "+91 94200 11004", whatsappNumber: "+91 94200 11004", city: "Jaipur", materialSupplied: "Premium silver figurines, custom casting", standardLeadDays: 14 } }),
    db.vendor.create({ data: { name: "Silver Bazaar Wholesale", phone: "+91 94200 11005", city: "Mumbai", materialSupplied: "Silver bars, raw silver ingots, coins", standardLeadDays: 3 } }),
  ]);
  console.log(`✅ Created ${vendors.length} vendors`);

  // ─── Orders ───────────────────────────────────────────────────────────────
  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);

  const orderData: Array<{
    number: string; customer: typeof customers[0]; date: Date; due: Date | null;
    status: OrderStatus; priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"; source: "PHONE" | "WHATSAPP" | "DIRECT" | "EMAIL" | "OTHER";
    items: Array<{ product: typeof products[0]; qty: number; size?: string; rawMaterial: boolean; stage: ProductionStage }>;
  }> = [
    {
      number: "ORD-26-0001", customer: customers[0], date: daysAgo(20), due: daysFromNow(5),
      status: "IN_PRODUCTION", priority: "HIGH", source: "PHONE",
      items: [
        { product: products[0], qty: 10, rawMaterial: true, stage: "MANUFACTURING" },
        { product: products[2], qty: 5, rawMaterial: true, stage: "PLATING" },
      ],
    },
    {
      number: "ORD-26-0002", customer: customers[1], date: daysAgo(15), due: daysAgo(2),
      status: "DELAYED", priority: "URGENT", source: "WHATSAPP",
      items: [
        { product: products[4], qty: 2, size: "8 inch", rawMaterial: true, stage: "WAITING_MATERIAL" },
        { product: products[5], qty: 6, rawMaterial: false, stage: "PACKING" },
      ],
    },
    {
      number: "ORD-26-0003", customer: customers[2], date: daysAgo(10), due: daysFromNow(10),
      status: "RAW_MATERIAL_PENDING", priority: "NORMAL", source: "PHONE",
      items: [
        { product: products[12], qty: 1, size: "10 inch", rawMaterial: true, stage: "WAITING_MATERIAL" },
        { product: products[13], qty: 4, rawMaterial: true, stage: "WAITING_MATERIAL" },
      ],
    },
    {
      number: "ORD-26-0004", customer: customers[3], date: daysAgo(8), due: daysFromNow(7),
      status: "READY_TO_DISPATCH", priority: "NORMAL", source: "DIRECT",
      items: [
        { product: products[7], qty: 50, rawMaterial: false, stage: "COMPLETED" },
        { product: products[8], qty: 20, rawMaterial: false, stage: "COMPLETED" },
        { product: products[9], qty: 10, rawMaterial: false, stage: "COMPLETED" },
      ],
    },
    {
      number: "ORD-26-0005", customer: customers[4], date: daysAgo(5), due: daysFromNow(15),
      status: "NEW", priority: "LOW", source: "WHATSAPP",
      items: [
        { product: products[5], qty: 12, rawMaterial: false, stage: "NOT_STARTED" },
        { product: products[6], qty: 3, rawMaterial: false, stage: "NOT_STARTED" },
      ],
    },
    {
      number: "ORD-26-0006", customer: customers[5], date: daysAgo(30), due: daysAgo(5),
      status: "DELAYED", priority: "HIGH", source: "PHONE",
      items: [
        { product: products[19], qty: 1, size: "12 inch", rawMaterial: true, stage: "MANUFACTURING" },
      ],
    },
    {
      number: "ORD-26-0007", customer: customers[6], date: daysAgo(12), due: daysFromNow(8),
      status: "FINISHING", priority: "NORMAL", source: "PHONE",
      items: [
        { product: products[1], qty: 8, rawMaterial: true, stage: "FINISHING" },
        { product: products[3], qty: 4, rawMaterial: true, stage: "FINISHING" },
      ],
    },
    {
      number: "ORD-26-0008", customer: customers[7], date: daysAgo(3), due: daysFromNow(20),
      status: "NEW", priority: "NORMAL", source: "WHATSAPP",
      items: [
        { product: products[10], qty: 5, rawMaterial: false, stage: "NOT_STARTED" },
        { product: products[11], qty: 3, rawMaterial: false, stage: "NOT_STARTED" },
        { product: products[17], qty: 2, rawMaterial: false, stage: "NOT_STARTED" },
      ],
    },
    {
      number: "ORD-26-0009", customer: customers[8], date: daysAgo(18), due: daysAgo(3),
      status: "DISPATCHED", priority: "HIGH", source: "PHONE",
      items: [
        { product: products[0], qty: 15, rawMaterial: true, stage: "COMPLETED" },
        { product: products[2], qty: 10, rawMaterial: true, stage: "COMPLETED" },
      ],
    },
    {
      number: "ORD-26-0010", customer: customers[9], date: daysAgo(7), due: daysFromNow(14),
      status: "PACKING", priority: "NORMAL", source: "DIRECT",
      items: [
        { product: products[14], qty: 3, size: "5 inch", rawMaterial: true, stage: "PACKING" },
        { product: products[15], qty: 5, rawMaterial: false, stage: "PACKING" },
      ],
    },
    {
      number: "ORD-26-0011", customer: customers[0], date: daysAgo(2), due: daysFromNow(25),
      status: "RAW_MATERIAL_PENDING", priority: "URGENT", source: "WHATSAPP",
      items: [
        { product: products[4], qty: 3, size: "8 inch", rawMaterial: true, stage: "WAITING_MATERIAL" },
      ],
    },
    {
      number: "ORD-26-0012", customer: customers[2], date: daysAgo(25), due: daysAgo(10),
      status: "COMPLETED", priority: "NORMAL", source: "PHONE",
      items: [
        { product: products[7], qty: 100, rawMaterial: false, stage: "COMPLETED" },
      ],
    },
    {
      number: "ORD-26-0013", customer: customers[3], date: daysAgo(1), due: daysFromNow(30),
      status: "NEW", priority: "LOW", source: "EMAIL",
      items: [
        { product: products[18], qty: 10, rawMaterial: false, stage: "NOT_STARTED" },
        { product: products[16], qty: 6, rawMaterial: false, stage: "NOT_STARTED" },
      ],
    },
    {
      number: "ORD-26-0014", customer: customers[4], date: daysAgo(22), due: daysAgo(7),
      status: "MATERIAL_RECEIVED", priority: "HIGH", source: "PHONE",
      items: [
        { product: products[0], qty: 20, rawMaterial: true, stage: "MANUFACTURING" },
        { product: products[1], qty: 10, rawMaterial: true, stage: "MANUFACTURING" },
      ],
    },
    {
      number: "ORD-26-0015", customer: customers[6], date: daysAgo(4), due: daysFromNow(18),
      status: "IN_PRODUCTION", priority: "NORMAL", source: "WHATSAPP",
      items: [
        { product: products[13], qty: 8, rawMaterial: true, stage: "PLATING" },
        { product: products[6], qty: 4, rawMaterial: false, stage: "MANUFACTURING" },
      ],
    },
  ];

  const createdOrders = [];
  for (const o of orderData) {
    const order = await db.order.create({
      data: {
        orderNumber: o.number,
        customerId: o.customer.id,
        orderDate: o.date,
        promisedDeliveryDate: o.due,
        status: o.status,
        priority: o.priority,
        source: o.source,
        orderItems: {
          create: o.items.map(item => ({
            productId: item.product.id,
            size: item.size,
            quantity: item.qty,
            rawMaterialRequired: item.rawMaterial,
            productionStage: item.stage,
            finishType: item.product.finishType,
          })),
        },
      },
      include: { orderItems: true },
    });
    createdOrders.push(order);
  }
  console.log(`✅ Created ${createdOrders.length} orders`);

  // ─── Vendor Requests ──────────────────────────────────────────────────────
  // VR for order 1 (IN_PRODUCTION - material mostly received)
  const vr1 = await db.vendorRequest.create({
    data: {
      requestNumber: "VR-26-0001",
      vendorId: vendors[0].id,
      requestDate: daysAgo(18),
      expectedArrivalDate: daysAgo(10),
      actualReceiptDate: daysAgo(10),
      status: "FULLY_RECEIVED",
      vendorRequestItems: {
        create: [
          {
            orderItemId: createdOrders[0].orderItems[0].id,
            materialName: "Silver Ganesh Casting 4 inch",
            requestedQty: 10,
            receivedQty: 10,
            pendingQty: 0,
          },
          {
            orderItemId: createdOrders[0].orderItems[1].id,
            materialName: "Silver Lakshmi Casting 4 inch",
            requestedQty: 5,
            receivedQty: 5,
            pendingQty: 0,
          },
        ],
      },
    },
  });

  // VR for order 2 (DELAYED - partial receipt)
  const vr2 = await db.vendorRequest.create({
    data: {
      requestNumber: "VR-26-0002",
      vendorId: vendors[3].id,
      requestDate: daysAgo(20),
      expectedArrivalDate: daysAgo(5),
      status: "DELAYED",
      vendorRequestItems: {
        create: [
          {
            orderItemId: createdOrders[1].orderItems[0].id,
            materialName: "Silver Radha Krishna Rough Casting 8 inch",
            requestedQty: 2,
            receivedQty: 0,
            pendingQty: 2,
          },
        ],
      },
    },
  });

  // VR for order 3 (REQUESTED)
  const vr3 = await db.vendorRequest.create({
    data: {
      requestNumber: "VR-26-0003",
      vendorId: vendors[1].id,
      requestDate: daysAgo(8),
      expectedArrivalDate: daysFromNow(3),
      status: "REQUESTED",
      vendorRequestItems: {
        create: [
          {
            orderItemId: createdOrders[2].orderItems[0].id,
            materialName: "Silver Shiv Family Casting 10 inch",
            requestedQty: 1,
            receivedQty: 0,
            pendingQty: 1,
          },
          {
            orderItemId: createdOrders[2].orderItems[1].id,
            materialName: "Silver Elephant Pair Casting 3 inch",
            requestedQty: 4,
            receivedQty: 0,
            pendingQty: 4,
          },
        ],
      },
    },
  });

  // VR for order 6 (FOLLOW_UP_PENDING - overdue)
  const vr4 = await db.vendorRequest.create({
    data: {
      requestNumber: "VR-26-0004",
      vendorId: vendors[3].id,
      requestDate: daysAgo(25),
      expectedArrivalDate: daysAgo(10),
      status: "FOLLOW_UP_PENDING",
      vendorRequestItems: {
        create: [
          {
            orderItemId: createdOrders[5].orderItems[0].id,
            materialName: "Custom Silver Vishnu Rough Casting 12 inch",
            requestedQty: 1,
            receivedQty: 0,
            pendingQty: 1,
          },
        ],
      },
    },
  });

  // VR for order 7 (PARTIALLY_RECEIVED)
  const vr5 = await db.vendorRequest.create({
    data: {
      requestNumber: "VR-26-0005",
      vendorId: vendors[0].id,
      requestDate: daysAgo(15),
      expectedArrivalDate: daysAgo(5),
      status: "PARTIALLY_RECEIVED",
      vendorRequestItems: {
        create: [
          {
            orderItemId: createdOrders[6].orderItems[0].id,
            materialName: "Silver Ganesh Casting 6 inch",
            requestedQty: 8,
            receivedQty: 5,
            pendingQty: 3,
          },
          {
            orderItemId: createdOrders[6].orderItems[1].id,
            materialName: "Silver Lakshmi Casting 6 inch",
            requestedQty: 4,
            receivedQty: 4,
            pendingQty: 0,
          },
        ],
      },
    },
  });

  // VR for order 9 (FULLY_RECEIVED - dispatched order)
  await db.vendorRequest.create({
    data: {
      requestNumber: "VR-26-0006",
      vendorId: vendors[0].id,
      requestDate: daysAgo(22),
      expectedArrivalDate: daysAgo(15),
      actualReceiptDate: daysAgo(15),
      status: "FULLY_RECEIVED",
      vendorRequestItems: {
        create: [
          {
            orderItemId: createdOrders[8].orderItems[0].id,
            materialName: "Silver Ganesh Casting 4 inch",
            requestedQty: 15,
            receivedQty: 15,
            pendingQty: 0,
          },
          {
            orderItemId: createdOrders[8].orderItems[1].id,
            materialName: "Silver Lakshmi Casting 4 inch",
            requestedQty: 10,
            receivedQty: 10,
            pendingQty: 0,
          },
        ],
      },
    },
  });

  // VR for order 11 (CONFIRMED)
  await db.vendorRequest.create({
    data: {
      requestNumber: "VR-26-0007",
      vendorId: vendors[1].id,
      requestDate: daysAgo(2),
      expectedArrivalDate: daysFromNow(8),
      status: "CONFIRMED",
      vendorRequestItems: {
        create: [
          {
            orderItemId: createdOrders[10].orderItems[0].id,
            materialName: "Silver Radha Krishna Casting 8 inch",
            requestedQty: 3,
            receivedQty: 0,
            pendingQty: 3,
          },
        ],
      },
    },
  });

  // VR for order 14 (FULLY_RECEIVED - material received, now in production)
  await db.vendorRequest.create({
    data: {
      requestNumber: "VR-26-0008",
      vendorId: vendors[0].id,
      requestDate: daysAgo(20),
      expectedArrivalDate: daysAgo(12),
      actualReceiptDate: daysAgo(12),
      status: "FULLY_RECEIVED",
      vendorRequestItems: {
        create: [
          {
            orderItemId: createdOrders[13].orderItems[0].id,
            materialName: "Silver Ganesh Casting 4 inch",
            requestedQty: 20,
            receivedQty: 20,
            pendingQty: 0,
          },
          {
            orderItemId: createdOrders[13].orderItems[1].id,
            materialName: "Silver Ganesh Casting 6 inch",
            requestedQty: 10,
            receivedQty: 10,
            pendingQty: 0,
          },
        ],
      },
    },
  });

  console.log(`✅ Created vendor requests`);

  // ─── Material Receipts ───────────────────────────────────────────────────
  await db.materialReceipt.create({
    data: { vendorRequestId: vr1.id, receivedDate: daysAgo(10), totalQtyReceived: 15, remarks: "All items received in good condition" },
  });
  await db.materialReceipt.create({
    data: { vendorRequestId: vr5.id, receivedDate: daysAgo(8), totalQtyReceived: 5, remarks: "First batch of Ganesh castings received" },
  });
  await db.materialReceipt.create({
    data: { vendorRequestId: vr5.id, receivedDate: daysAgo(4), totalQtyReceived: 4, remarks: "Lakshmi castings fully received" },
  });
  console.log(`✅ Created material receipts`);

  // ─── Production Logs ─────────────────────────────────────────────────────
  const prodUser = users[4]; // Production Manager
  const adminUser = users[0];

  // Order 1 items — in manufacturing/plating
  for (const item of createdOrders[0].orderItems) {
    await db.productionLog.create({
      data: { orderItemId: item.id, stage: "WAITING_MATERIAL", updatedById: adminUser.id, loggedAt: daysAgo(18) },
    });
    await db.productionLog.create({
      data: { orderItemId: item.id, stage: "MANUFACTURING", updatedById: prodUser.id, assignedPerson: "Ramesh", loggedAt: daysAgo(10) },
    });
    if (item.productionStage === "PLATING") {
      await db.productionLog.create({
        data: { orderItemId: item.id, stage: "PLATING", updatedById: prodUser.id, assignedPerson: "Sita", loggedAt: daysAgo(3), remarks: "Gold plating in progress" },
      });
    }
  }

  // Order 7 items — finishing
  for (const item of createdOrders[6].orderItems) {
    await db.productionLog.create({
      data: { orderItemId: item.id, stage: "MANUFACTURING", updatedById: prodUser.id, loggedAt: daysAgo(10) },
    });
    await db.productionLog.create({
      data: { orderItemId: item.id, stage: "POLISHING", updatedById: prodUser.id, loggedAt: daysAgo(5) },
    });
    await db.productionLog.create({
      data: { orderItemId: item.id, stage: "FINISHING", updatedById: prodUser.id, loggedAt: daysAgo(2), remarks: "Final finishing in progress" },
    });
  }

  console.log(`✅ Created production logs`);

  // ─── Dispatches ───────────────────────────────────────────────────────────
  const dispatchUser = users[5]; // Dispatch Manager

  // Order 9 (DISPATCHED)
  await db.dispatch.create({
    data: {
      orderId: createdOrders[8].id,
      dispatchDate: daysAgo(1),
      transporter: "DTDC",
      trackingNumber: "DTDC123456789",
      isPartial: false,
      createdById: dispatchUser.id,
      remarks: "Fragile — handle with care",
      dispatchItems: {
        create: createdOrders[8].orderItems.map(item => ({
          orderItemId: item.id,
          qtyDispatched: item.quantity,
        })),
      },
    },
  });

  console.log(`✅ Created dispatches`);

  console.log("\n🎉 Seed complete!\n");
  console.log("Demo login credentials:");
  console.log("  Admin:      admin@indiquecraft.com / admin123");
  console.log("  Owner:      owner@indiquecraft.com / owner123");
  console.log("  Orders:     orders@indiquecraft.com / order123");
  console.log("  Purchase:   purchase@indiquecraft.com / purch123");
  console.log("  Production: production@indiquecraft.com / prod123");
  console.log("  Dispatch:   dispatch@indiquecraft.com / disp123");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
