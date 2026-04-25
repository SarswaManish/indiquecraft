"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Phone, MapPin, FileText } from "lucide-react";
import Link from "next/link";

interface CustomerDetail {
  id: string;
  partyName: string;
  phone: string;
  city: string | null;
  address: string | null;
  gstNumber: string | null;
  notes: string | null;
  orders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    status: string;
    priority: string;
    _count: { orderItems: number };
  }>;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then(setCustomer)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  if (!customer)
    return <div className="text-center py-16 text-gray-500">Customer not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.partyName}
        description="Customer account details"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft size={16} /> Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone size={15} className="text-gray-400" />
              <span>{customer.phone}</span>
            </div>
            {customer.city && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={15} className="text-gray-400" />
                <span>{customer.city}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-2 text-sm">
                <FileText size={15} className="text-gray-400 mt-0.5" />
                <span className="text-gray-600">{customer.address}</span>
              </div>
            )}
            {customer.gstNumber && (
              <div className="text-sm">
                <span className="text-gray-500">GST: </span>
                <span className="font-mono">{customer.gstNumber}</span>
              </div>
            )}
            {customer.notes && (
              <div className="text-sm text-gray-500 border-t pt-2">{customer.notes}</div>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order History ({customer.orders.length})</CardTitle>
                <Link href={`/orders/new?customerId=${customer.id}`}>
                  <Button size="sm">New Order</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {customer.orders.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No orders yet</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {customer.orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(order.orderDate)} · {order._count.orderItems} items
                        </p>
                      </div>
                      <OrderStatusBadge status={order.status as never} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
