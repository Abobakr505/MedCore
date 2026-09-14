import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LifeBuoy, Plus } from "lucide-react";
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
import { fetchMyTickets, createTicket } from "@/services/support";
import type { SupportTicket } from "@/types";
import { TICKET_STATUS_LABELS, TICKET_CATEGORY_LABELS } from "@/types";
import { ticketSchema, type TicketFormValues } from "@/utils/validation";
import { formatDateTime } from "@/utils/format";

const STATUS_COLORS: Record<string, "amber" | "blue" | "green" | "slate"> = {
  open: "amber",
  in_progress: "blue",
  resolved: "green",
  closed: "slate",
};

export default function SupportPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { category: "technical" },
  });

  const load = async () => {
    if (!session?.user) return;
    setLoading(true);
    setTickets(await fetchMyTickets(session.user.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const onSubmit = async (values: TicketFormValues) => {
    if (!session?.user) return;
    try {
      await createTicket(session.user.id, values.subject, values.description, values.category);
      showToast("تم إنشاء التذكرة بنجاح", "success");
      reset();
      setModalOpen(false);
      load();
    } catch {
      showToast("تعذّر إنشاء التذكرة", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-brand-900">الدعم الفني</h1>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> تذكرة جديدة</Button>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : tickets.length === 0 ? (
          <EmptyState icon={<LifeBuoy className="w-6 h-6" />} title="لا توجد تذاكر دعم بعد" />
        ) : (
          tickets.map((t) => (
            <Link key={t.id} to={`/app/support/tickets/${t.id}`}>
              <Card className="flex items-center justify-between p-5 transition-shadow hover:shadow-md">
                <div>
                  <p className="font-bold text-slate-800">{t.subject}</p>
                  <p className="mt-1 text-xs text-slate-400">{TICKET_CATEGORY_LABELS[t.category]} · {formatDateTime(t.created_at)}</p>
                </div>
                <Badge color={STATUS_COLORS[t.status]}>{TICKET_STATUS_LABELS[t.status]}</Badge>
              </Card>
            </Link>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="تذكرة دعم جديدة">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="عنوان المشكلة" error={errors.subject?.message} {...register("subject")} />
          <Select label="التصنيف" {...register("category")}>
            <option value="technical">مشكلة تقنية</option>
            <option value="payment">استفسار عن دفع</option>
            <option value="course_content">محتوى الكورس</option>
            <option value="account">الحساب</option>
            <option value="other">أخرى</option>
          </Select>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-slate-700">تفاصيل المشكلة</label>
            <textarea rows={4} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500" {...register("description")} />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
          </div>
          <Button type="submit" className="w-full" isLoading={isSubmitting}>إرسال التذكرة</Button>
        </form>
      </Modal>
    </div>
  );
}
