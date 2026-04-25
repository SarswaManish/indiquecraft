"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VendorStatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import { VendorRequestStatus } from "@prisma/client";

interface VendorDetail {
  id: string;
  name: string;
  phone: string;
  whatsappNumber: string | null;
  city: string | null;
  materialSupplied: string | null;
  standardLeadDays: number;
  notes: string | null;
  vendorRequests: Array<{
    id: string;
    requestNumber: string;
    requestDate: string;
    expectedArrivalDate: string | null;
    status: VendorRequestStatus;
    _count: { vendorRequestItems: number };
  }>;
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vendors/${id}`)
      .then((r) => r.json())
      .then(setVendor)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  if (!vendor) return <div className="text-center py-16 text-gray-500">Vendor not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={vendor.name}
        description="Vendor account details"
        actions={<Button variant="outline" onClick={() => router.back()}><ArrowLeft size={16} /> Back</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Vendor Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone size={15} className="text-gray-400" /> {vendor.phone}
            </div>
            {vendor.whatsappNumber && (
              <div className="text-gray-600">WhatsApp: {vendor.whatsappNumber}</div>
            )}
            {vendor.city && <div className="text-gray-600">City: {vendor.city}</div>}
            <div className="text-gray-600">Lead Time: {vendor.standardLeadDays} days</div>
            {vendor.materialSupplied && (
              <div className="text-gray-600">Material: {vendor.materialSupplied}</div>
            )}
            {vendor.notes && (
              <div className="text-gray-500 border-t pt-2">{vendor.notes}</div>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vendor Requests ({vendor.vendorRequests.length})</CardTitle>
                <Link href={`/vendor-requests/new?vendorId=${vendor.id}`}>
                  <Button size="sm">New Request</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {vendor.vendorRequests.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">No requests yet</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {vendor.vendorRequests.map((vr) => (
                    <Link
                      key={vr.id}
                      href={`/vendor-requests/${vr.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-medium">{vr.requestNumber}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(vr.requestDate)} · {vr._count.vendorRequestItems} items
                          {vr.expectedArrivalDate && ` · ETA ${formatDate(vr.expectedArrivalDate)}`}
                        </p>
                      </div>
                      <VendorStatusBadge status={vr.status} />
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
