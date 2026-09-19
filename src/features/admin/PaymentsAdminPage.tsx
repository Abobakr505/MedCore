import { useEffect, useMemo, useState } from "react";
import {
  Receipt,
  Check,
  X,
  ExternalLink,
  Wallet,
  Clock3,
  CheckCircle2,
  XCircle,
  User,
  BookOpen,
  CalendarDays,
  Search,
  Layers,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { useToast } from "@/contexts/ToastContext";

import {
  fetchAllPayments,
  approvePaymentByType,
  rejectPaymentByType,
  getReceiptSignedUrlAsync,
} from "@/services/payments";

import type { Payment } from "@/types";
import { PAYMENT_STATUS_LABELS } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";

const STATUS_COLORS: Record<string, "amber" | "green" | "red"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

const FILTERS = [
  {
    value: "pending",
    label: "قيد المراجعة",
    icon: Clock3,
  },
  {
    value: "approved",
    label: "مقبولة",
    icon: CheckCircle2,
  },
  {
    value: "rejected",
    label: "مرفوضة",
    icon: XCircle,
  },
  {
    value: "",
    label: "الكل",
    icon: Receipt,
  },
];

/**
 * معلومات تقدّم القسط لدفعة معيّنة، محسوبة من قائمة كاملة (غير مفلترة
 * حسب الحالة) لكل دفعات نفس الطالب في نفس الكورس. لازم نستخدم قائمة
 * كاملة هنا وليس القائمة المعروضة على الشاشة، عشان لو القسط الأول
 * "approved" هيختفي من فلتر "pending" وبالتالي الحساب هيغلط.
 * عدّل اسم الحقل `total_installments` هنا لو مختلف عندك في جدول الكورسات.
 */
function getInstallmentProgress(
  payment: Payment,
  allPaymentsUnfiltered: Payment[]
): { index: number; total: number | null; remaining: number | null } | null {
  if (!payment.installment_id) return null;

  const sameGroup = allPaymentsUnfiltered
    .filter(
      (p) =>
        p.installment_id &&
        p.student?.id === payment.student?.id &&
        p.course?.id === payment.course?.id
    )
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  const index = sameGroup.findIndex((p) => p.id === payment.id) + 1;

  const total = (payment.course as any)?.total_installments ?? null;

  return {
    index: index > 0 ? index : 1,
    total,
    remaining: total ? Math.max(total - index, 0) : null,
  };
}

export default function PaymentsAdminPage() {
  const { showToast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // قائمة كاملة بكل الدفعات (بدون فلتر status) نستخدمها فقط لحساب
  // ترتيب الأقساط بشكل صحيح، مستقلة عن فلتر العرض الحالي
  const [allPaymentsForProgress, setAllPaymentsForProgress] = useState<Payment[]>([]);

  const [filter, setFilter] = useState("pending");

  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);

  const [rejectReason, setRejectReason] = useState("");

  const [processingId, setProcessingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);

    try {
      const data = await fetchAllPayments(filter || undefined);

      setPayments(data);
    } catch {
      showToast("تعذّر تحميل المدفوعات", "error");
    } finally {
      setLoading(false);
    }
  };

  // تحميل منفصل لكل الدفعات (بدون فلتر) عشان حساب ترتيب الأقساط يكون صحيح
  // دايمًا مهما كان الفلتر المعروض على الشاشة
  const loadAllForProgress = async () => {
    try {
      const data = await fetchAllPayments(undefined);
      setAllPaymentsForProgress(data);
    } catch {
      // تجاهل صامت، الشاشة الأساسية هتشتغل عادي حتى لو فشل ده
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    loadAllForProgress();
  }, []);

  const handleApprove = async (payment: Payment) => {
    setProcessingId(payment.id);

    try {
      await approvePaymentByType(payment);

      showToast("تم قبول الدفع بنجاح", "success");

      await load();
      await loadAllForProgress();
    } catch {
      showToast("تعذّرت عملية قبول الدفع", "error");
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
        rejectReason.trim() || "لم يتم تحديد سبب"
      );

      showToast("تم رفض الدفعة", "success");

      setRejectTarget(null);
      setRejectReason("");

      await load();
      await loadAllForProgress();
    } catch {
      showToast("تعذّرت عملية رفض الدفعة", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const viewReceipt = async (path: string) => {
    if (!path) {
      showToast("لا يوجد إيصال مرفق", "error");
      return;
    }

    const { data, error } = await getReceiptSignedUrlAsync(path);

    if (error || !data) {
      showToast("تعذّر فتح الإيصال", "error");
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return payments;

    return payments.filter((payment) => {
      return (
        payment.student?.full_name?.toLowerCase().includes(query) ||
        payment.course?.title?.toLowerCase().includes(query) ||
        String(payment.amount).includes(query)
      );
    });
  }, [payments, search]);

  const totalAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Wallet className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                إدارة المدفوعات
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                راجع طلبات الدفع والإيصالات وأدر عمليات القبول والرفض
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3">
            <p className="text-xs font-medium text-emerald-600">
              قيمة العمليات الحالية
            </p>

            <p className="mt-1 text-xl font-extrabold text-emerald-700">
              {loading ? "—" : formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden border-slate-200 p-5 shadow-sm">
          <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-amber-500/5 blur-2xl" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock3 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-extrabold text-slate-900">
                {filter === "pending" ? payments.length : "—"}
              </p>

              <p className="text-sm text-slate-500">طلبات قيد المراجعة</p>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 p-5 shadow-sm">
          <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-emerald-500/5 blur-2xl" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-extrabold text-slate-900">
                {filter === "approved" ? payments.length : "—"}
              </p>

              <p className="text-sm text-slate-500">عمليات مقبولة</p>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 p-5 shadow-sm">
          <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-red-500/5 blur-2xl" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <XCircle className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-extrabold text-slate-900">
                {filter === "rejected" ? payments.length : "—"}
              </p>

              <p className="text-sm text-slate-500">عمليات مرفوضة</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 p-2 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map(({ value, label, icon: Icon }) => {
              const active = filter === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    active
                      ? "bg-brand-500 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن طالب أو كورس..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm outline-none transition focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
          </div>
        </div>
      </Card>

      {/* Payments */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))
        ) : filteredPayments.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <div className="py-12">
              <EmptyState
                icon={<Receipt className="h-6 w-6" />}
                title={
                  search ? "لا توجد نتائج" : "لا توجد طلبات دفع في هذا التصنيف"
                }
              />
            </div>
          </Card>
        ) : (
          filteredPayments.map((p) => {
            const progress = getInstallmentProgress(p, allPaymentsForProgress);

            return (
              <Card
                key={p.id}
                className="group overflow-hidden border-slate-200 p-0 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    {/* Student / Course */}
                    <div className="min-w-0">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                          <User className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-slate-800">
                              {p.student?.full_name || "طالب غير معروف"}
                            </h3>

                            <Badge color={STATUS_COLORS[p.status]}>
                              {PAYMENT_STATUS_LABELS[p.status]}
                            </Badge>

                            {progress && (
                              <Badge
                                color={progress.index === 1 ? "green" : "amber"}
                              >
                                {progress.index === 1
                                  ? "القسط الأول"
                                  : progress.total
                                  ? `القسط ${progress.index} من ${progress.total}`
                                  : `القسط رقم ${progress.index}`}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5" />
                              {p.course?.title || "كورس غير معروف"}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDateTime(p.created_at)}
                            </span>

                            {progress?.remaining !== null &&
                              progress?.remaining !== undefined && (
                                <span className="flex items-center gap-1.5 font-semibold text-brand-600">
                                  <Layers className="h-3.5 w-3.5" />
                                  {progress.remaining === 0
                                    ? "آخر قسط"
                                    : `متبقي ${progress.remaining} ${
                                        progress.remaining === 1
                                          ? "قسط"
                                          : "أقساط"
                                      }`}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 xl:min-w-[170px] xl:flex-col xl:items-end xl:bg-transparent xl:px-0 xl:py-0">
                      <span className="text-xs text-slate-400">قيمة الدفع</span>

                      <span className="text-xl font-extrabold text-brand-700">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => viewReceipt(p.receipt_path)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                      عرض الإيصال
                    </button>

                    {p.status === "pending" && (
                      <div className="flex w-full gap-2 sm:w-auto">
                        <Button
                          size="sm"
                          className="flex-1 sm:flex-none"
                          isLoading={processingId === p.id}
                          onClick={() => handleApprove(p)}
                        >
                          <Check className="h-4 w-4" />
                          قبول الدفع
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          className="flex-1 sm:flex-none"
                          disabled={processingId === p.id}
                          onClick={() => setRejectTarget(p)}
                        >
                          <X className="h-4 w-4" />
                          رفض
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status indicator */}
                <div
                  className={`h-1 w-full ${
                    p.status === "pending"
                      ? "bg-amber-400"
                      : p.status === "approved"
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  }`}
                />
              </Card>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => {
          if (!processingId) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
        title="رفض طلب الدفع"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-red-500 shadow-sm">
                <XCircle className="h-5 w-5" />
              </div>

              <div>
                <p className="font-bold text-red-800">سيتم رفض طلب الدفع</p>

                <p className="mt-1 text-xs leading-5 text-red-600">
                  {rejectTarget?.student?.full_name || "الطالب"} —{" "}
                  {rejectTarget?.course?.title || "الكورس"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              سبب الرفض
            </label>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب رفض الدفع للرجوع إليه لاحقًا..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-500/10"
            />
          </div>

          <Button
            className="w-full"
            variant="danger"
            isLoading={!!rejectTarget && processingId === rejectTarget.id}
            onClick={handleReject}
          >
            <X className="h-4 w-4" />
            تأكيد رفض الدفع
          </Button>
        </div>
      </Modal>
    </div>
  );
}