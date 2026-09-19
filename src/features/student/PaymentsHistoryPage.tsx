import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Wallet2,
  Receipt,
  CreditCard,
  TrendingUp,
  CalendarDays,
  UploadCloud,
  Copy,
  Check as CheckIcon,
  Smartphone,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  fetchStudentPayments,
  fetchStudentInstallments,
  uploadInstallmentReceipt,
} from "@/services/payments";
import type { Payment, StudentInstallment } from "@/types";
import { PAYMENT_STATUS_LABELS } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";

const STATUS_COLORS: Record<string, "amber" | "green" | "red"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};
const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  pending: Clock3,
  approved: CheckCircle2,
  rejected: XCircle,
};
const STATUS_ICON_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-500 border-amber-100",
  approved: "bg-emerald-50 text-emerald-500 border-emerald-100",
  rejected: "bg-red-50 text-red-500 border-red-100",
};

type BannerTone = "ok" | "warning" | "overdue";

const BANNER_STYLES: Record<BannerTone, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  overdue: "border-red-200 bg-red-50 text-red-700",
};

const BANNER_ICON_BG: Record<BannerTone, string> = {
  ok: "bg-emerald-100 text-emerald-600",
  warning: "bg-amber-100 text-amber-600",
  overdue: "bg-red-100 text-red-600",
};

/**
 * بيانات طرق الدفع المعروضة للطالب في مودال رفع الإيصال.
 * غيّر الأرقام والأسماء هنا لتطابق حساباتك الفعلية.
 */
const PAYMENT_METHODS: {
  id: string;
  label: string;
  number: string;
  note?: string;
}[] = [
  {
    id: "instapay",
    label: "InstaPay",
    number: "01276184900", // ضع رقم أو @username الخاص بانستاباي
  },
  {
    id: "etisalat",
    label: "اتصالات كاش",
    number: "01100000000",
  },
];

/**
 * تنسيق تسمية القسط: "قسط X من Y" لو معروف إجمالي عدد الأقساط،
 * وإلا "الشهر X" كافتراضي.
 * ملاحظة: عدّل اسم الحقل `total_installments` هنا لو مختلف عندك في جدول الكورسات.
 */
function formatInstallmentLabel(
  monthNumber: number,
  totalInstallments?: number | null
) {
  return totalInstallments
    ? `قسط ${monthNumber} من ${totalInstallments}`
    : `الشهر ${monthNumber}`;
}

export default function PaymentsHistoryPage() {
  const { session } = useAuth();
  const { showToast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [installments, setInstallments] = useState<StudentInstallment[]>([]);
  const [installmentsLoading, setInstallmentsLoading] = useState(true);

  const [payTarget, setPayTarget] = useState<StudentInstallment | null>(null);
  const [payFile, setPayFile] = useState<File | null>(null);
  const [paying, setPaying] = useState(false);

  const [copiedMethodId, setCopiedMethodId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    setLoading(true);
    fetchStudentPayments(session.user.id)
      .then(setPayments)
      .finally(() => setLoading(false));

    setInstallmentsLoading(true);
    fetchStudentInstallments(session.user.id)
      .then(setInstallments)
      .catch(() => setInstallments([]))
      .finally(() => setInstallmentsLoading(false));
  }, [session?.user?.id]);

  const reloadInstallments = async () => {
    if (!session?.user) return;
    try {
      const data = await fetchStudentInstallments(session.user.id);
      setInstallments(data);
    } catch {
      // تجاهل صامت، هيتم عرض آخر نسخة محملة
    }
  };

  const stats = useMemo(() => {
    const approved = payments.filter((p) => p.status === "approved");
    const pending = payments.filter((p) => p.status === "pending");
    const rejected = payments.filter((p) => p.status === "rejected");
    const totalPaid = approved.reduce(
      (sum, payment) => sum + (payment.amount ?? 0),
      0,
    );
    const totalTransactions = payments.length;
    return {
      totalPaid,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      totalTransactions,
    };
  }, [payments]);

  /* أقرب قسط يحتاج دفع أو إعادة رفع (مش pending لأنه بالفعل مُرسل) */
  const nextDueInstallment = useMemo(() => {
    const due = installments.filter(
      (i) => i.status === "scheduled" || i.status === "rejected",
    );
    return (
      due.sort(
        (a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
      )[0] ?? null
    );
  }, [installments]);

  const daysUntilDue = useMemo(() => {
    if (!nextDueInstallment) return null;
    const due = new Date(nextDueInstallment.due_date).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  }, [nextDueInstallment]);

  const bannerTone: BannerTone | null = useMemo(() => {
    if (daysUntilDue === null) return null;
    if (daysUntilDue < 0) return "overdue";
    if (daysUntilDue <= 3) return "warning";
    return "ok";
  }, [daysUntilDue]);

  const bannerMessage = useMemo(() => {
    if (!nextDueInstallment || daysUntilDue === null) return null;

    const total =
      (nextDueInstallment.course as any)?.total_installments ?? null;
    const label = formatInstallmentLabel(
      nextDueInstallment.month_number,
      total,
    );

    if (nextDueInstallment.status === "rejected") {
      return `تم رفض إيصال ${label}، برجاء إعادة الرفع`;
    }

    if (daysUntilDue < 0) {
      return `فات معاد ${label} منذ ${Math.abs(daysUntilDue)} يوم`;
    }

    if (daysUntilDue === 0) {
      return `${label} مستحق اليوم`;
    }

    return `${label} مستحق خلال ${daysUntilDue} يوم`;
  }, [nextDueInstallment, daysUntilDue]);

  /* عدد أقساط نفس كورس القسط القادم: كام متبقي من كام إجمالي */
  const nextDueCourseProgress = useMemo(() => {
    if (!nextDueInstallment) return null;

    const sameCourse = installments.filter(
      (i) => i.course_id === nextDueInstallment.course_id,
    );

    const remaining = sameCourse.filter(
      (i) => i.status === "scheduled" || i.status === "rejected",
    ).length;

    return {
      remaining,
      total: sameCourse.length,
    };
  }, [installments, nextDueInstallment]);

  const handlePayInstallment = async () => {
    if (!payTarget || !payFile || !session?.user) return;

    setPaying(true);

    try {
      await uploadInstallmentReceipt({
        installmentId: payTarget.id,
        studentId: session.user.id,
        courseId: payTarget.course_id,
        amount: payTarget.amount,
        file: payFile,
      });

      showToast("تم إرسال إيصال القسط، بانتظار المراجعة", "success");

      setPayTarget(null);
      setPayFile(null);

      await reloadInstallments();
    } catch {
      showToast("تعذّر رفع إيصال القسط، حاول مرة أخرى", "error");
    } finally {
      setPaying(false);
    }
  };

  const handleCopyNumber = async (id: string, number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedMethodId(id);
      setTimeout(() => setCopiedMethodId(null), 2000);
    } catch {
      showToast("تعذّر نسخ الرقم", "error");
    }
  };

  return (
    <div className="mx-auto max-w-5xl pb-10">
      {" "}
      {/* Header */}{" "}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {" "}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          {" "}
          <div>
            {" "}
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
              {" "}
              <Receipt className="h-3.5 w-3.5" /> المعاملات المالية{" "}
            </div>{" "}
            <h1 className="text-2xl font-extrabold text-brand-900 sm:text-3xl">
              {" "}
              سجل المدفوعات{" "}
            </h1>{" "}
            <p className="mt-1 text-sm text-slate-400">
              {" "}
              تابع جميع عمليات الدفع والاشتراكات الخاصة بك بسهولة.{" "}
            </p>{" "}
          </div>{" "}
          {!loading && payments.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {" "}
              <CreditCard className="h-4 w-4" /> {stats.totalTransactions} عملية
              مسجلة{" "}
            </div>
          )}{" "}
        </div>{" "}
      </motion.div>{" "}
      {/* Installment due banner */}{" "}
      {!installmentsLoading && nextDueInstallment && bannerTone && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${BANNER_STYLES[bannerTone]}`}
        >
          {" "}
          <div className="flex items-start gap-3">
            {" "}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${BANNER_ICON_BG[bannerTone]}`}
            >
              {" "}
              {bannerTone === "overdue" ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Wallet2 className="h-5 w-5" />
              )}{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="font-bold">{bannerMessage}</p>{" "}
              <p className="mt-1 text-xs opacity-80">
                {" "}
                {nextDueInstallment.course?.title ?? "كورس"} —{" "}
                {formatCurrency(nextDueInstallment.amount)}{" "}
              </p>{" "}
              {nextDueCourseProgress && (
                <p className="mt-1 text-xs font-semibold opacity-90">
                  متبقي {nextDueCourseProgress.remaining} من أصل{" "}
                  {nextDueCourseProgress.total} أقساط
                </p>
              )}{" "}
            </div>{" "}
          </div>{" "}
          <Button
            onClick={() => setPayTarget(nextDueInstallment)}
            className="shrink-0"
          >
            {" "}
            ادفع القسط الآن{" "}
          </Button>{" "}
        </motion.div>
      )}{" "}
      {/* Statistics */}{" "}
      {loading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {" "}
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}{" "}
        </div>
      ) : payments.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {" "}
          {/* Total */}{" "}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {" "}
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4 text-white shadow-lg">
              {" "}
              <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/10" />{" "}
              <div className="relative">
                {" "}
                <div className="flex items-center gap-2 text-xs text-white/70">
                  {" "}
                  <Wallet className="h-4 w-4" /> إجمالي المدفوع{" "}
                </div>{" "}
                <p className="mt-2 text-xl font-extrabold sm:text-2xl">
                  {" "}
                  {formatCurrency(stats.totalPaid)}{" "}
                </p>{" "}
                <div className="mt-2 flex items-center gap-1 text-[10px] text-white/60">
                  {" "}
                  <TrendingUp className="h-3 w-3" /> المدفوعات المقبولة{" "}
                </div>{" "}
              </div>{" "}
            </Card>{" "}
          </motion.div>{" "}
          {/* Approved */}{" "}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            {" "}
            <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
              {" "}
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                {" "}
                <CheckCircle2 className="h-4 w-4" /> مكتملة{" "}
              </div>{" "}
              <p className="mt-2 text-2xl font-extrabold text-emerald-600">
                {" "}
                {stats.approved}{" "}
              </p>{" "}
              <p className="mt-1 text-[10px] text-slate-400">
                {" "}
                عمليات دفع مقبولة{" "}
              </p>{" "}
            </Card>{" "}
          </motion.div>{" "}
          {/* Pending */}{" "}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {" "}
            <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
              {" "}
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                {" "}
                <Clock3 className="h-4 w-4" /> قيد المراجعة{" "}
              </div>{" "}
              <p className="mt-2 text-2xl font-extrabold text-amber-500">
                {" "}
                {stats.pending}{" "}
              </p>{" "}
              <p className="mt-1 text-[10px] text-slate-400">
                {" "}
                في انتظار الإدارة{" "}
              </p>{" "}
            </Card>{" "}
          </motion.div>{" "}
          {/* Rejected */}{" "}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {" "}
            <Card className="border-red-100 bg-gradient-to-br from-red-50 to-white p-4">
              {" "}
              <div className="flex items-center gap-2 text-xs font-semibold text-red-500">
                {" "}
                <XCircle className="h-4 w-4" /> مرفوضة{" "}
              </div>{" "}
              <p className="mt-2 text-2xl font-extrabold text-red-500">
                {" "}
                {stats.rejected}{" "}
              </p>{" "}
              <p className="mt-1 text-[10px] text-slate-400">
                {" "}
                عمليات لم يتم قبولها{" "}
              </p>{" "}
            </Card>{" "}
          </motion.div>{" "}
        </div>
      ) : null}{" "}
      {/* Installments table (only if the student has any installment courses) */}{" "}
      {!installmentsLoading && installments.length > 0 && (
        <div className="mt-8">
          {" "}
          <h2 className="mb-3 text-lg font-black text-slate-800">
            {" "}
            خطة الأقساط{" "}
          </h2>{" "}
          <div className="space-y-2">
            {" "}
            {installments
              .slice()
              .sort((a, b) => {
                if (a.course_id !== b.course_id) {
                  return (a.course?.title ?? "").localeCompare(
                    b.course?.title ?? "",
                  );
                }
                return a.month_number - b.month_number;
              })
              .map((installment) => {
                const color: "amber" | "green" | "red" =
                  installment.status === "approved"
                    ? "green"
                    : installment.status === "pending"
                      ? "amber"
                      : installment.status === "rejected"
                        ? "red"
                        : "amber";

                const isPayable =
                  installment.status === "scheduled" ||
                  installment.status === "rejected";

                const totalForCourse = (installment.course as any)
                  ?.total_installments as number | undefined;

                return (
                  <div
                    key={installment.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {" "}
                    <div className="min-w-0">
                      {" "}
                      <p className="truncate text-sm font-bold text-slate-800">
                        {" "}
                        {installment.course?.title ?? "كورس"} —{" "}
                        {formatInstallmentLabel(
                          installment.month_number,
                          totalForCourse,
                        )}{" "}
                      </p>{" "}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        {" "}
                        <span className="flex items-center gap-1">
                          {" "}
                          <CalendarDays className="h-3.5 w-3.5" />{" "}
                          {new Date(installment.due_date).toLocaleDateString(
                            "ar-EG",
                          )}{" "}
                        </span>{" "}
                        <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />{" "}
                        <span>{formatCurrency(installment.amount)}</span>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="flex items-center gap-3">
                      {" "}
                      <Badge color={color}>
                        {" "}
                        {installment.status === "scheduled"
                          ? "لم يحن موعده"
                          : installment.status === "pending"
                            ? "قيد المراجعة"
                            : installment.status === "approved"
                              ? "مدفوع"
                              : "مرفوض"}{" "}
                      </Badge>{" "}
                      {isPayable && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPayTarget(installment)}
                        >
                          {" "}
                          <UploadCloud className="h-4 w-4" /> ادفع{" "}
                        </Button>
                      )}{" "}
                    </div>{" "}
                  </div>
                );
              })}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Payments */}{" "}
      <div className="mt-7">
        {" "}
        <h2 className="mb-3 text-lg font-black text-slate-800">
          {" "}
          سجل عمليات الدفع{" "}
        </h2>{" "}
        {loading ? (
          <div className="space-y-3">
            {" "}
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}{" "}
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="لا توجد مدفوعات بعد"
            description="ستظهر هنا جميع عمليات الدفع الخاصة باشتراكاتك في الكورسات."
          />
        ) : (
          <div className="space-y-3">
            {" "}
            {payments.map((payment, index) => {
              const StatusIcon = STATUS_ICONS[payment.status] ?? Wallet;

              // نجيب بيانات القسط المرتبط بهذه الدفعة (لو موجود) عشان نعرض ترتيبه
              const relatedInstallment = payment.installment_id
                ? installments.find((i) => i.id === payment.installment_id)
                : undefined;

              const installmentTotal = (payment.course as any)
                ?.total_installments as number | undefined;

              return (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.3) }}
                >
                  {" "}
                  <Card className="group overflow-hidden p-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                    {" "}
                    <div className="p-4 sm:p-5">
                      {" "}
                      <div className="flex items-start gap-3 sm:gap-4">
                        {" "}
                        {/* Icon */}{" "}
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${STATUS_ICON_STYLES[payment.status] ?? "border-slate-100 bg-slate-50 text-slate-400"}`}
                        >
                          {" "}
                          <StatusIcon className="h-5 w-5" />{" "}
                        </div>{" "}
                        {/* Main information */}{" "}
                        <div className="min-w-0 flex-1">
                          {" "}
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            {" "}
                            <div className="min-w-0">
                              {" "}
                              <div className="flex flex-wrap items-center gap-2">
                                {" "}
                                <p className="truncate font-bold text-slate-800">
                                  {" "}
                                  {payment.course?.title ?? "اشتراك في كورس"}{" "}
                                </p>{" "}
                                {payment.installment_id && (
                                  <Badge color="amber">
                                    {relatedInstallment
                                      ? formatInstallmentLabel(
                                          relatedInstallment.month_number,
                                          installmentTotal,
                                        )
                                      : "قسط"}
                                  </Badge>
                                )}{" "}
                              </div>{" "}
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                                {" "}
                                <span className="flex items-center gap-1">
                                  {" "}
                                  <CalendarDays className="h-3.5 w-3.5" />{" "}
                                  {formatDateTime(payment.created_at)}{" "}
                                </span>{" "}
                                <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />{" "}
                                <span>
                                  {" "}
                                  رقم العملية: {payment.id.slice(0, 8)}{" "}
                                </span>{" "}
                              </div>{" "}
                            </div>{" "}
                            {/* Amount */}{" "}
                            <div className="mt-2 text-right sm:mt-0">
                              {" "}
                              <p className="text-lg font-extrabold text-brand-900">
                                {" "}
                                {formatCurrency(payment.amount)}{" "}
                              </p>{" "}
                              <div className="mt-1">
                                {" "}
                                <Badge
                                  color={
                                    STATUS_COLORS[payment.status] ?? "amber"
                                  }
                                >
                                  {" "}
                                  {PAYMENT_STATUS_LABELS[payment.status] ??
                                    payment.status}{" "}
                                </Badge>{" "}
                              </div>{" "}
                            </div>{" "}
                          </div>{" "}
                          {/* Rejection */}{" "}
                          {payment.status === "rejected" &&
                            payment.rejection_reason && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mt-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600"
                              >
                                {" "}
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{" "}
                                <div>
                                  {" "}
                                  <p className="font-bold"> سبب الرفض </p>{" "}
                                  <p className="mt-0.5 leading-relaxed">
                                    {" "}
                                    {payment.rejection_reason}{" "}
                                  </p>{" "}
                                </div>{" "}
                              </motion.div>
                            )}{" "}
                          {/* Approved footer */}{" "}
                          {payment.status === "approved" && (
                            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500">
                              {" "}
                              <CheckCircle2 className="h-3.5 w-3.5" /> تم اعتماد
                              عملية الدفع بنجاح{" "}
                            </div>
                          )}{" "}
                          {/* Pending footer */}{" "}
                          {payment.status === "pending" && (
                            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-amber-500">
                              {" "}
                              <Clock3 className="h-3.5 w-3.5" /> سيتم مراجعة
                              العملية من الإدارة قريبًا{" "}
                            </div>
                          )}{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                    {/* Bottom accent */}{" "}
                    <div
                      className={`h-1 w-full ${payment.status === "approved" ? "bg-emerald-400" : payment.status === "rejected" ? "bg-red-400" : "bg-amber-400"} opacity-40`}
                    />{" "}
                  </Card>{" "}
                </motion.div>
              );
            })}{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Pay installment modal */}{" "}
      <Modal
        open={!!payTarget}
        onClose={() => {
          if (!paying) {
            setPayTarget(null);
            setPayFile(null);
          }
        }}
        title={
          payTarget
            ? `دفع ${formatInstallmentLabel(
                payTarget.month_number,
                (payTarget.course as any)?.total_installments,
              )}`
            : ""
        }
      >
        <div dir="rtl">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">الكورس</p>

            <p className="mt-1 font-black text-slate-800">
              {payTarget?.course?.title}
            </p>

            <p className="mt-1 text-sm font-bold text-brand-600">
              {formatCurrency(payTarget?.amount ?? 0)}
            </p>
          </div>

          {payTarget?.status === "rejected" && payTarget.rejection_reason && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-bold">سبب رفض المحاولة السابقة</p>
                <p className="mt-0.5 leading-relaxed">
                  {payTarget.rejection_reason}
                </p>
              </div>
            </div>
          )}

          {/* بيانات طرق الدفع */}
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Smartphone className="h-3.5 w-3.5" />
              حوّل المبلغ على أحد الأرقام التالية ثم ارفع صورة الإيصال
            </p>

            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-500">
                      {method.label}
                    </p>
                    <p
                      dir="ltr"
                      className="mt-0.5 truncate text-sm font-black text-brand-800"
                    >
                      {method.number}
                    </p>
                    {method.note && (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {method.note}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleCopyNumber(method.id, method.number)}
                  >
                    {copiedMethodId === method.id ? (
                      <>
                        <CheckIcon className="h-3.5 w-3.5" />
                        تم النسخ
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        نسخ
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-brand-300 hover:bg-brand-50/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <UploadCloud className="h-7 w-7" />
            </div>

            <div>
              <p className="font-bold text-slate-700">
                {payFile ? payFile.name : "اختر صورة إيصال الدفع"}
              </p>

              <p className="mt-1 text-xs text-slate-400">JPG / PNG / PDF</p>
            </div>

            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(event) => {
                setPayFile(event.target.files?.[0] ?? null);
              }}
            />
          </label>

          <Button
            className="mt-5 w-full"
            disabled={!payFile}
            isLoading={paying}
            onClick={handlePayInstallment}
          >
            إرسال إيصال القسط
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      </Modal>
    </div>
  );
}