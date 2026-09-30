import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  LifeBuoy,
  Plus,
  MessageCircle,
  Clock3,
  CheckCircle2,
  Ticket,
  X,
} from "lucide-react";

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
  fetchTicketMessages,
} from "@/services/support";
import type { SupportTicket, TicketMessage } from "@/types";
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

  // تفاصيل التذكرة والردود
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // نجيب التذكرة المفتوحة من القائمة عشان الحالة تفضل محدثة
  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedId) ?? null;

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

  const load = async (silent = false) => {
    if (!session?.user) return;

    try {
      if (!silent) setLoading(true);

      const data = await fetchMyTickets(session.user.id);

      setTickets(data);
    } catch {
      showToast("تعذّر تحميل تذاكر الدعم", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const onSubmit = async (values: TicketFormValues) => {
    if (!session?.user) return;

    try {
      await createTicket(
        session.user.id,
        values.subject,
        values.description,
        values.category
      );

      showToast("تم إنشاء التذكرة بنجاح", "success");

      reset();
      setModalOpen(false);

      await load();
    } catch {
      showToast("تعذّر إنشاء التذكرة", "error");
    }
  };

  const openTicket = async (ticket: SupportTicket) => {
    setSelectedId(ticket.id);
    setMessages([]);

    try {
      setMessagesLoading(true);

      // نحدّث الحالة والردود مع بعض عشان يشوف آخر تغيير
      const [freshMessages] = await Promise.all([
        fetchTicketMessages(ticket.id),
        load(true),
      ]);

      setMessages(freshMessages);
    } catch {
      showToast("تعذّر تحميل الردود", "error");
    } finally {
      setMessagesLoading(false);
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
                اضغط على أي تذكرة لعرض التفاصيل وردود الدعم
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
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-[76px] rounded-xl"
                  />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={<LifeBuoy className="h-6 w-6" />}
                  title="لا توجد تذاكر دعم بعد"
                />

                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setModalOpen(true)}
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
                    STATUS_ICONS[ticket.status] || Clock3;

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => openTicket(ticket)}
                      className="group block w-full rounded-2xl border border-transparent text-right transition hover:border-brand-100 hover:bg-brand-50/50"
                    >
                      <div className="flex min-h-[76px] items-center gap-3 rounded-xl px-3 py-3 sm:px-4">
                        {/* Icon */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                            ticket.status === "resolved"
                              ? "bg-emerald-50 text-emerald-500"
                              : ticket.status === "closed"
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
                              {TICKET_CATEGORY_LABELS[ticket.category]}
                            </span>

                            <span>•</span>

                            <span className="truncate">
                              {formatDateTime(ticket.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            color={STATUS_COLORS[ticket.status]}
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {TICKET_STATUS_LABELS[ticket.status]}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Details Modal */}
      <Modal
        open={!!selectedTicket}
        onClose={() => setSelectedId(null)}
        title="تفاصيل التذكرة"
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-extrabold text-slate-800">
                {selectedTicket.subject}
              </h3>

              <Badge color={STATUS_COLORS[selectedTicket.status]}>
                {TICKET_STATUS_LABELS[selectedTicket.status]}
              </Badge>
            </div>

            {(selectedTicket.status === "resolved" ||
              selectedTicket.status === "closed") && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                تم حل مشكلتك
              </div>
            )}

            {selectedTicket.status === "in_progress" && (
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700">
                <Clock3 className="h-4 w-4" />
                فريق الدعم يعمل على مشكلتك حاليًا
              </div>
            )}

            {selectedTicket.status === "open" && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-700">
                <Clock3 className="h-4 w-4" />
                تم استلام تذكرتك وفي انتظار المراجعة
              </div>
            )}

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-1 text-xs font-bold text-slate-400">
                مشكلتك
              </p>

              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {selectedTicket.description}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-slate-400">
                ردود الدعم الفني
              </p>

              {messagesLoading ? (
                <Skeleton className="h-16 rounded-xl" />
              ) : messages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  لا يوجد رد حتى الآن
                </p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => {
                    const fromSupport = msg.sender?.role === "admin";

                    return (
                      <div
                        key={msg.id}
                        className={`rounded-xl p-3 ${
                          fromSupport ? "bg-brand-50" : "bg-slate-50"
                        }`}
                      >
                        <p className="mb-1 text-[11px] font-bold text-slate-500">
                          {fromSupport ? "الدعم الفني" : "أنت"}
                        </p>

                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {msg.message}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatDateTime(msg.created_at)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

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
          <Select label="التصنيف" {...register("category")}>
            <option value="technical">مشكلة تقنية</option>

            <option value="payment">استفسار عن دفع</option>

            <option value="course_content">محتوى الكورس</option>

            <option value="account">الحساب</option>

            <option value="other">أخرى</option>
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