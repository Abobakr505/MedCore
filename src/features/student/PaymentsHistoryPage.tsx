import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentPayments } from "@/services/payments";
import type { Payment } from "@/types";
import { PAYMENT_STATUS_LABELS } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";

const STATUS_COLORS: Record<string, "amber" | "green" | "red"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

export default function PaymentsHistoryPage() {
  const { session } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    fetchStudentPayments(session.user.id).then(setPayments).finally(() => setLoading(false));
  }, [session?.user?.id]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">سجل المدفوعات</h1>
      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : payments.length === 0 ? (
          <EmptyState icon={<Wallet className="w-6 h-6" />} title="لا توجد مدفوعات بعد" />
        ) : (
          payments.map((p) => (
            <Card key={p.id} className="flex items-center justify-between p-5">
              <div>
                <p className="font-bold text-slate-800">{p.course?.title}</p>
                <p className="text-xs text-slate-400">{formatDateTime(p.created_at)}</p>
                {p.status === "rejected" && p.rejection_reason && (
                  <p className="mt-1 text-xs text-red-500">سبب الرفض: {p.rejection_reason}</p>
                )}
              </div>
              <div className="text-left">
                <p className="font-extrabold text-brand-900">{formatCurrency(p.amount)}</p>
                <Badge color={STATUS_COLORS[p.status]}>{PAYMENT_STATUS_LABELS[p.status]}</Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
