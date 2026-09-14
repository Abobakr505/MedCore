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
      setTickets(
        await fetchMyTickets(session.user.id)
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
      load();
    } catch {
      showToast(
        "تعذّر إنشاء التذكرة",
        "error"
      );
    }
  };

  const openTickets = tickets.filter(
    (t) =>
      t.status === "open" ||
      t.status === "in_progress"
  ).length;

  const resolvedTickets = tickets.filter(
    (t) =>
      t.status === "resolved" ||
      t.status === "closed"
  ).length;

  return (
    <div className="mx-auto max-w-5xl pb-8">
      {/* Hero */}
      <div className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-xl shadow-brand-900/10 sm:p-8">
        <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <LifeBuoy className="h-6 w-6" />
            </div>

            <h1 className="text-2xl font-black sm:text-3xl">
              الدعم الفني
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              عندك مشكلة أو استفسار؟ افتح تذكرة وسيساعدك
              فريق الدعم في حلها بأسرع وقت.
            </p>
          </div>

          <Button
            onClick={() => setModalOpen(true)}
            className="h-12 rounded-xl bg-white px-5 font-bold text-brand-700 shadow-lg hover:bg-white/90"
          >
            <Plus className="h-5 w-5" />
            تذكرة جديدة
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Ticket className="h-4 w-4" />
          </div>

          <p className="text-2xl font-black text-slate-800">
            {loading ? "—" : tickets.length}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-400">
            إجمالي التذاكر
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock3 className="h-4 w-4" />
          </div>

          <p className="text-2xl font-black text-slate-800">
            {loading ? "—" : openTickets}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-400">
            قيد المتابعة
          </p>
        </div>

        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-1">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>

          <p className="text-2xl font-black text-slate-800">
            {loading ? "—" : resolvedTickets}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-400">
            تم حلها
          </p>
        </div>
      </div>

      {/* Tickets header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">
            تذاكر الدعم
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            جميع طلبات الدعم الخاصة بك
          </p>
        </div>

        {tickets.length > 0 && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {tickets.length} تذكرة
          </span>
        )}
      </div>

      {/* Tickets */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-24 rounded-2xl"
            />
          ))
        ) : tickets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14">
            <EmptyState
              icon={
                <LifeBuoy className="h-6 w-6" />
              }
              title="لا توجد تذاكر دعم بعد"
            />

            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                افتح أول تذكرة
              </Button>
            </div>
          </div>
        ) : (
          tickets.map((t) => {
            const StatusIcon =
              STATUS_ICONS[t.status] || Clock3;

            return (
              <Link
                key={t.id}
                to={`/app/support/tickets/${t.id}`}
                className="group block"
              >
                <Card className="relative overflow-hidden border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-slate-200/50 sm:p-5">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 sm:flex">
                      <MessageCircle className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center gap-2">
                        <p className="truncate font-bold text-slate-800 transition-colors group-hover:text-brand-700">
                          {t.subject}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                        <span>
                          {TICKET_CATEGORY_LABELS[
                            t.category
                          ]}
                        </span>

                        <span>•</span>

                        <span>
                          {formatDateTime(
                            t.created_at
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        color={
                          STATUS_COLORS[t.status]
                        }
                      >
                        <StatusIcon className="mr-1 h-3.5 w-3.5" />
                        {
                          TICKET_STATUS_LABELS[
                            t.status
                          ]
                        }
                      </Badge>

                      <ChevronLeft className="hidden h-4 w-4 text-slate-300 transition-transform group-hover:-translate-x-1 sm:block" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {/* Create Ticket Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="إنشاء تذكرة دعم"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <div className="rounded-2xl bg-brand-50 p-4">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
                <LifeBuoy className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-bold text-brand-900">
                  كيف يمكننا مساعدتك؟
                </p>

                <p className="mt-1 text-xs leading-5 text-brand-700/70">
                  اكتب تفاصيل المشكلة بشكل واضح حتى
                  يتمكن فريق الدعم من مساعدتك بشكل أسرع.
                </p>
              </div>
            </div>
          </div>

          <Input
            label="عنوان المشكلة"
            placeholder="مثال: لا أستطيع فتح الكورس"
            error={errors.subject?.message}
            {...register("subject")}
          />

          <Select
            label="نوع المشكلة"
            {...register("category")}
          >
            <option value="technical">
              مشكلة تقنية
            </option>

            <option value="payment">
              استفسار عن الدفع
            </option>

            <option value="course_content">
              محتوى الكورس
            </option>

            <option value="account">
              مشكلة في الحساب
            </option>

            <option value="other">
              أخرى
            </option>
          </Select>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              تفاصيل المشكلة
            </label>

            <textarea
              rows={5}
              placeholder="اشرح لنا المشكلة بالتفصيل..."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              {...register("description")}
            />

            {errors.description && (
              <p className="mt-1.5 text-xs text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="h-11 flex-1"
            >
              إلغاء
            </Button>

            <Button
              type="submit"
              className="h-11 flex-1"
              isLoading={isSubmitting}
            >
              <SendIcon />
              إرسال التذكرة
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}