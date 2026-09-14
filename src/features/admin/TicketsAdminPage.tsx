import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ticket } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchAllTickets } from "@/services/support";
import { TICKET_STATUS_LABELS, TICKET_CATEGORY_LABELS } from "@/types";
import { formatDateTime } from "@/utils/format";

const STATUS_COLORS: Record<string, "amber" | "blue" | "green" | "slate"> = {
  open: "amber", in_progress: "blue", resolved: "green", closed: "slate",
};

export default function TicketsAdminPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchAllTickets(filter || undefined).then(setTickets).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-brand-900">الشكاوى والدعم الفني</h1>
        <div className="flex gap-2">
          {[["", "الكل"], ["open", "مفتوحة"], ["in_progress", "قيد المعالجة"], ["resolved", "تم الحل"], ["closed", "مغلقة"]].map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === value ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : tickets.length === 0 ? (
          <EmptyState icon={<Ticket className="w-6 h-6" />} title="لا توجد تذاكر في هذا التصنيف" />
        ) : (
          tickets.map((t) => (
            <Link key={t.id} to={`/app/support/tickets/${t.id}`}>
              <Card className="flex items-center justify-between p-5 hover:shadow-md">
                <div>
                  <p className="font-bold text-slate-800">{t.subject}</p>
                  <p className="mt-1 text-xs text-slate-400">{t.user?.full_name} ({t.user?.role === "teacher" ? "معلم" : "طالب"}) · {TICKET_CATEGORY_LABELS[t.category]} · {formatDateTime(t.created_at)}</p>
                </div>
                <Badge color={STATUS_COLORS[t.status]}>{TICKET_STATUS_LABELS[t.status]}</Badge>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
