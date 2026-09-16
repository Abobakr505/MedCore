import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Receipt,
  Check,
  X,
  ExternalLink,
  Wallet,
  Clock3,
  CheckCircle2,
  XCircle,
  Search,
  TrendingUp,
  User,
  BookOpen,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

import {
  fetchTeacherPayments,
  approvePaymentByType,
  rejectPaymentByType,
  getReceiptSignedUrlAsync,
} from "@/services/payments";

import type { Payment } from "@/types";
import {
  PAYMENT_STATUS_LABELS,
} from "@/types";

import {
  formatCurrency,
  formatDateTime,
} from "@/utils/format";

const STATUS_COLORS: Record<
  string,
  "amber" | "green" | "red"
> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

export default function TeacherPaymentsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");

  const [rejectTarget, setRejectTarget] =
    useState<Payment | null>(null);

  const [rejectReason, setRejectReason] =
    useState("");

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const load = async () => {
    if (!session?.user) return;

    setLoading(true);

    try {
      setPayments(
        await fetchTeacherPayments(
          session.user.id,
          filter || undefined
        )
      );
const result = await fetchTeacherPayments(
  session.user.id,
  filter || undefined
);

console.log("PAYMENTS RESULT:", result);

setPayments(result);

    } catch {
      showToast("تعذّر تحميل المدفوعات", "error");
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, filter]);

  const stats = useMemo(() => {
    const pending = payments.filter(
      (p) => p.status === "pending"
    );

    const approved = payments.filter(
      (p) => p.status === "approved"
    );

    const rejected = payments.filter(
      (p) => p.status === "rejected"
    );

    const approvedAmount = approved.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const pendingAmount = pending.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      approvedAmount,
      pendingAmount,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    if (!search.trim()) return payments;

    const query = search.toLowerCase();

    return payments.filter((payment) => {
      return (
        payment.student?.full_name
          ?.toLowerCase()
          .includes(query) ||
        payment.student?.email
          ?.toLowerCase()
          .includes(query) ||
        payment.course?.title
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [payments, search]);

  const handleApprove = async (payment: Payment) => {
    setProcessingId(payment.id);

    try {
      await approvePaymentByType(payment);

      showToast(
        "تم قبول الدفع وتفعيل اشتراك الطالب",
        "success"
      );

      load();
    } catch {
      showToast(
        "تعذّرت عملية قبول الدفع",
        "error"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;

    setProcessingId(rejectTarget.id);

    try {
      await rejectPaymentByType(
        rejectTarget,
        rejectReason ||
          "الإيصال غير واضح أو غير مطابق"
      );

      showToast("تم رفض طلب الدفع", "success");

      setRejectTarget(null);
      setRejectReason("");

      load();
    } catch {
      showToast("تعذّرت عملية الرفض", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const viewReceipt = async (path: string) => {
    const { data, error } =
      await getReceiptSignedUrlAsync(path);

    if (error || !data) {
      showToast("تعذّر فتح الإيصال", "error");
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl  bg-gradient-to-br from-slate-950 via-brand-950 to-brand-700 p-6 text-white shadow-xl">
        <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 right-10 h-52 w-52 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2 text-sm text-white/75">
            <Wallet className="h-4 w-4" />
            الإدارة المالية
          </div>

          <h1 className="mt-2 text-3xl font-black">
           مراجعة المدفوعات
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
            راجع طلبات الدفع، تحقق من الإيصالات، وقم بتفعيل
            اشتراكات الطلاب أو رفض العمليات غير المطابقة.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PaymentStat
          icon={<Clock3 />}
          label="قيد المراجعة"
          value={stats.pending}
          sub={formatCurrency(stats.pendingAmount)}
          tone="amber"
        />

        <PaymentStat
          icon={<CheckCircle2 />}
          label="مدفوعات مقبولة"
          value={stats.approved}
          sub={formatCurrency(stats.approvedAmount)}
          tone="green"
        />

        <PaymentStat
          icon={<XCircle />}
          label="مدفوعات مرفوضة"
          value={stats.rejected}
          tone="red"
        />

        <PaymentStat
          icon={<TrendingUp />}
          label="إجمالي المعروض"
          value={payments.length}
          sub="عملية"
          tone="brand"
        />
      </div>

      {/* Search + filters */}
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="ابحث باسم الطالب أو الكورس أو البريد..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["pending", "قيد المراجعة"],
              ["approved", "مقبولة"],
              ["rejected", "مرفوضة"],
              ["", "الكل"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  filter === value
                    ? "bg-brand-500 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-36 rounded-3xl"
            />
          ))
        ) : filteredPayments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10">
            <EmptyState
              icon={<Receipt className="h-7 w-7" />}
              title="لا توجد عمليات دفع"
            />
          </div>
        ) : (
          filteredPayments.map((payment, index) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.03,
              }}
            >
              <PaymentCard
                payment={payment}
                processingId={processingId}
                onApprove={handleApprove}
                onReject={setRejectTarget}
                onViewReceipt={viewReceipt}
              />
            </motion.div>
          ))
        )}
      </div>

      {/* Reject */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="رفض طلب الدفع"
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="h-4 w-4" />
              تأكيد رفض العملية
            </div>

            <p className="mt-1 text-xs leading-5 text-red-600/80">
              سيتم رفض طلب الدفع ولن يتم تفعيل اشتراك الطالب.
            </p>
          </div>

          <textarea
            rows={4}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/10"
            placeholder="اكتب سبب الرفض..."
            value={rejectReason}
            onChange={(e) =>
              setRejectReason(e.target.value)
            }
          />

          <Button
            className="w-full"
            variant="danger"
            isLoading={!!processingId}
            onClick={handleReject}
          >
            تأكيد الرفض
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function PaymentCard({
  payment,
  processingId,
  onApprove,
  onReject,
  onViewReceipt,
}: {
  payment: Payment;
  processingId: string | null;
  onApprove: (payment: Payment) => void;
  onReject: (payment: Payment) => void;
  onViewReceipt: (path: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0 transition hover:shadow-lg">
      <div className="p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <User className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-slate-800">
                  {payment.student?.full_name ||
                    "طالب غير معروف"}
                </h3>

                <Badge
                  color={STATUS_COLORS[payment.status]}
                >
                  {PAYMENT_STATUS_LABELS[payment.status]}
                </Badge>
              </div>

              <p className="mt-1 truncate text-xs text-slate-400">
                {payment.student?.email}
              </p>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-brand-500" />
                  {payment.course?.title}
                </span>

                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  {formatDateTime(payment.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-brand-50 px-4 py-2.5 text-center">
              <p className="text-[10px] text-brand-500">
                المبلغ
              </p>

              <p className="mt-0.5 font-black text-brand-800">
                {formatCurrency(payment.amount)}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onViewReceipt(payment.receipt_path)
              }
            >
              <ExternalLink className="h-3.5 w-3.5" />
              الإيصال
            </Button>

            {payment.status === "pending" && (
              <>
                <Button
                  size="sm"
                  isLoading={
                    processingId === payment.id
                  }
                  onClick={() =>
                    onApprove(payment)
                  }
                >
                  <Check className="h-3.5 w-3.5" />
                  قبول
                </Button>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    onReject(payment)
                  }
                >
                  <X className="h-3.5 w-3.5" />
                  رفض
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <span>
            Payment ID: {payment.id.slice(0, 12)}...
          </span>

          <span>
            {payment.status === "approved"
              ? "تم تفعيل الاشتراك"
              : payment.status === "rejected"
              ? "تم رفض العملية"
              : "بانتظار مراجعة الإدارة"}
          </span>
        </div>
      </div>
    </Card>
  );
}

function PaymentStat({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone: "amber" | "green" | "red" | "brand";
}) {
  const colors = {
    amber: "bg-amber-50 text-amber-500",
    green: "bg-emerald-50 text-emerald-500",
    red: "bg-red-50 text-red-500",
    brand: "bg-brand-50 text-brand-500",
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`rounded-xl p-2.5 ${colors[tone]}`}>
          {icon}
        </div>

        <span className="text-xl font-black text-slate-800">
          {value}
        </span>
      </div>

      <p className="mt-3 text-xs font-bold text-slate-500">
        {label}
      </p>

      {sub && (
        <p className="mt-1 text-[11px] text-slate-400">
          {sub}
        </p>
      )}
    </div>
  );
}