import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Receipt,
  CreditCard,
  TrendingUp,
  CalendarDays,
  ArrowUpLeft,
} from "lucide-react";
import { motion } from "framer-motion";
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
export default function PaymentsHistoryPage() {
  const { session } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!session?.user) return;
    setLoading(true);
    fetchStudentPayments(session.user.id)
      .then(setPayments)
      .finally(() => setLoading(false));
  }, [session?.user?.id]);
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
      {/* Payments */}{" "}
      <div className="mt-7">
        {" "}
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
                              <p className="truncate font-bold text-slate-800">
                                {" "}
                                {payment.course?.title ?? "اشتراك في كورس"}{" "}
                              </p>{" "}
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
    </div>
  );
}
