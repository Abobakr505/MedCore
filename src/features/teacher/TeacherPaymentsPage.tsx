import { useEffect, useState } from "react";
import { Receipt, Check, X, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { fetchTeacherPayments, approvePayment, rejectPayment, getReceiptSignedUrlAsync } from "@/services/payments";
import type { Payment } from "@/types";
import { PAYMENT_STATUS_LABELS } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";

const STATUS_COLORS: Record<string, "amber" | "green" | "red"> = { pending: "amber", approved: "green", rejected: "red" };

export default function TeacherPaymentsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = async () => {
    if (!session?.user) return;
    setLoading(true);
    setPayments(await fetchTeacherPayments(session.user.id, filter || undefined));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, filter]);

  const handleApprove = async (payment: Payment) => {
    setProcessingId(payment.id);
    try {
      await approvePayment(payment.id);
      showToast("تم قبول الدفع وتفعيل اشتراك الطالب", "success");
      load();
    } catch {
      showToast("تعذّرت العملية، حاول مرة أخرى", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    try {
      await rejectPayment(rejectTarget.id, rejectReason || "الإيصال غير واضح أو غير مطابق");
      showToast("تم رفض طلب الدفع", "success");
      setRejectTarget(null);
      setRejectReason("");
      load();
    } catch {
      showToast("تعذّرت العملية", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const viewReceipt = async (path: string) => {
    const { data, error } = await getReceiptSignedUrlAsync(path);
    if (error || !data) {
      showToast("تعذّر فتح الإيصال", "error");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-brand-900">مراجعة المدفوعات</h1>
        <div className="flex gap-2">
          {[["pending", "قيد المراجعة"], ["approved", "مقبولة"], ["rejected", "مرفوضة"], ["", "الكل"]].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === value ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : payments.length === 0 ? (
          <EmptyState icon={<Receipt className="w-6 h-6" />} title="لا توجد طلبات دفع في هذا التصنيف" />
        ) : (
          payments.map((p) => (
            <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-bold text-slate-800">{p.student?.full_name}</p>
                <p className="text-xs text-slate-400">{p.course?.title} · {formatDateTime(p.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-brand-900">{formatCurrency(p.amount)}</span>
                <Badge color={STATUS_COLORS[p.status]}>{PAYMENT_STATUS_LABELS[p.status]}</Badge>
                <Button size="sm" variant="outline" onClick={() => viewReceipt(p.receipt_path)}>
                  <ExternalLink className="w-3.5 h-3.5" /> الإيصال
                </Button>
                {p.status === "pending" && (
                  <>
                    <Button size="sm" isLoading={processingId === p.id} onClick={() => handleApprove(p)}>
                      <Check className="w-3.5 h-3.5" /> قبول
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setRejectTarget(p)}>
                      <X className="w-3.5 h-3.5" /> رفض
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="سبب رفض الدفعة">
        <textarea
          rows={3}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
          placeholder="مثال: الإيصال غير واضح أو المبلغ غير مطابق"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
        <Button className="mt-4 w-full" variant="danger" isLoading={!!processingId} onClick={handleReject}>تأكيد الرفض</Button>
      </Modal>
    </div>
  );
}
