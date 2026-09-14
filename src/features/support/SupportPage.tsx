import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  LifeBuoy,
  Plus,
  MessageCircle,
  Clock3,
  CheckCircle2,
  ChevronLeft,
  Ticket,
  X,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  fetchMyTickets,
  createTicket,
} from "@/services/support";
import type { SupportTicket } from "@/types";
import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
} from "@/types";
import {
  ticketSchema,
  type TicketFormValues,
} from "@/utils/validation";
import { formatDateTime } from "@/utils/format";

const STATUS_COLORS: Record<
  string,
  "amber" | "blue" | "green" | "slate"
> = {
  open: "amber",
  in_progress: "blue",
  resolved: "green",
  closed: "slate",
};

const STATUS_ICONS: Record<string, typeof Clock3> = {
  open: Clock3,
  in_progress: MessageCircle,
  resolved: CheckCircle2,
  closed: CheckCircle2,
};

export default function SupportPage() {
  const { session } = useAuth();
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      category: "technical",
    },
  });

  const load = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);

      const data = await fetchMyTickets(
        session.user.id
      );

      setTickets(data);
    } catch {
      showToast(
        "تعذّر تحميل تذاكر الدعم",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const onSubmit = async (
    values: TicketFormValues
  ) => {
    if (!session?.user) return;

    try {
      await createTicket(
        session.user.id,
        values.subject,
        values.description,
        values.category
      );

      showToast(
        "تم إنشاء التذكرة بنجاح",
        "success"
      );

      reset();
      setModalOpen(false);

      await load();
    } catch {
      showToast(
        "تعذّر إنشاء التذكرة",
        "error"
      );
    }
  };

  const openTickets = tickets.filter(
    (ticket) =>
      ticket.status === "open" ||
      ticket.status === "in_progress"
  ).length;

  const completedTickets = tickets.filter(
    (ticket) =>
      ticket.status === "resolved" ||
      ticket.status === "closed"
  ).length;

  return (
    <div className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <LifeBuoy className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-xl font-extrabold text-slate-800 sm:text-2xl">
                الدعم الفني
              </h1>

              <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                تواصل مع فريق الدعم واحصل على المساعدة
              </p>
            </div>
          </div>

          <Button
            onClick={() => setModalOpen(true)}
            className="h-10 rounded-xl px-4 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            تذكرة جديدة
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Total */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  إجمالي التذاكر
                </p>

                <p className="mt-1 text-2xl font-black text-slate-800">
                  {loading ? "—" : tickets.length}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Ticket className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Open */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  قيد المتابعة
                </p>

                <p className="mt-1 text-2xl font-black text-slate-800">
                  {loading ? "—" : openTickets}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock3 className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  تم حلها
                </p>

                <p className="mt-1 text-2xl font-black text-slate-800">
                  {loading ? "—" : completedTickets}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-bold text-slate-800 sm:text-base">
                تذاكر الدعم
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                جميع طلبات الدعم الخاصة بك
              </p>
            </div>

            {!loading && tickets.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                {tickets.length} تذكرة
              </span>
            )}
          </div>

          {/* Tickets List */}
          <div className="p-3 sm:p-4">
            {loading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 5 }).map(
                  (_, index) => (
                    <Skeleton
                      key={index}
                      className="h-[76px] rounded-xl"
                    />
                  )
                )}
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={
                    <LifeBuoy className="h-6 w-6" />
                  }
                  title="لا توجد تذاكر دعم بعد"
                />

                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setModalOpen(true)
                    }
                    className="rounded-xl"
                  >
                    <Plus className="h-4 w-4" />
                    إنشاء أول تذكرة
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => {
                  const StatusIcon =
                    STATUS_ICONS[
                      ticket.status
                    ] || Clock3;

                  return (
                    <Link
                      key={ticket.id}
                      to={`/app/support/tickets/${ticket.id}`}
                      className="group block"
                    >
                      <div className="flex min-h-[76px] items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 hover:border-brand-100 hover:bg-brand-50/50 sm:px-4">
                        {/* Icon */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            ticket.status ===
                            "resolved"
                              ? "bg-emerald-50 text-emerald-500"
                              : ticket.status ===
                                "closed"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-brand-50 text-brand-500"
                          }`}
                        >
                          <MessageCircle className="h-4.5 w-4.5" />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-700 transition-colors group-hover:text-brand-700">
                            {ticket.subject}
                          </p>

                          <div className="mt-1 flex items-center gap-1.5 overflow-hidden text-[11px] text-slate-400">
                            <span className="shrink-0">
                              {
                                TICKET_CATEGORY_LABELS[
                                  ticket.category
                                ]
                              }
                            </span>

                            <span>•</span>

                            <span className="truncate">
                              {formatDateTime(
                                ticket.created_at
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            color={
                              STATUS_COLORS[
                                ticket.status
                              ]
                            }
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {
                              TICKET_STATUS_LABELS[
                                ticket.status
                              ]
                            }
                          </Badge>

                          <ChevronLeft className="hidden h-4 w-4 text-slate-300 transition-transform group-hover:-translate-x-0.5 sm:block" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="تذكرة دعم جديدة"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Info */}
          <div className="rounded-xl border border-brand-100 bg-brand-50/70 p-4">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                <LifeBuoy className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-bold text-brand-900">
                  كيف يمكننا مساعدتك؟
                </p>

                <p className="mt-1 text-xs leading-5 text-brand-700/70">
                  وضّح المشكلة بالتفصيل ليتمكن فريق
                  الدعم من مساعدتك بشكل أسرع.
                </p>
              </div>
            </div>
          </div>

          {/* Subject */}
          <Input
            label="عنوان المشكلة"
            placeholder="مثال: لا أستطيع تشغيل فيديو الدرس"
            error={errors.subject?.message}
            {...register("subject")}
          />

          {/* Category */}
          <Select
            label="التصنيف"
            {...register("category")}
          >
            <option value="technical">
              مشكلة تقنية
            </option>

            <option value="payment">
              استفسار عن دفع
            </option>

            <option value="course_content">
              محتوى الكورس
            </option>

            <option value="account">
              الحساب
            </option>

            <option value="other">
              أخرى
            </option>
          </Select>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              تفاصيل المشكلة
            </label>

            <textarea
              rows={5}
              placeholder="اكتب تفاصيل المشكلة هنا..."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              {...register("description")}
            />

            {errors.description && (
              <p className="mt-1 text-xs text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="h-11 flex-1 rounded-xl"
            >
              <X className="h-4 w-4" />
              إلغاء
            </Button>

            <Button
              type="submit"
              className="h-11 flex-1 rounded-xl"
              isLoading={isSubmitting}
            >
              <MessageCircle className="h-4 w-4" />
              إرسال التذكرة
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

