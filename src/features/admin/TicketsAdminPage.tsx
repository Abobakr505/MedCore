import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ticket,
  Search,
  MessageCircle,
  Clock3,
  CheckCircle2,
  CircleAlert,
  XCircle,
  UserRound,
  GraduationCap,
  ChevronLeft,
  Eye,
  Trash2,
  X,
  Mail,
  CalendarDays,
  Tag,
  Flag,
  FileText,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

import {
  fetchAllTickets,
  deleteTicket,
} from "@/services/support";

import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
} from "@/types";

import { formatDateTime } from "@/utils/format";
import { useToast } from "@/contexts/ToastContext";

const STATUS_COLORS: Record<
  string,
  "amber" | "blue" | "green" | "slate"
> = {
  open: "amber",
  in_progress: "blue",
  resolved: "green",
  closed: "slate",
};

const FILTERS = [
  {
    value: "",
    label: "الكل",
    icon: Ticket,
  },
  {
    value: "open",
    label: "مفتوحة",
    icon: CircleAlert,
  },
  {
    value: "in_progress",
    label: "قيد المعالجة",
    icon: Clock3,
  },
  {
    value: "resolved",
    label: "تم الحل",
    icon: CheckCircle2,
  },
  {
    value: "closed",
    label: "مغلقة",
    icon: XCircle,
  },
];

export default function TicketsAdminPage() {
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);

    fetchAllTickets(filter || undefined)
      .then(setTickets)
      .catch(() => {
        showToast("حدث خطأ أثناء تحميل التذاكر", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filter, showToast]);

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return tickets;

    return tickets.filter((ticket) => {
      const subject = ticket.subject || "";
      const fullName = ticket.user?.full_name || "";
      const email = ticket.user?.email || "";

      const category =
        TICKET_CATEGORY_LABELS[ticket.category] ||
        ticket.category ||
        "";

      return `${subject} ${fullName} ${email} ${category}`
        .toLowerCase()
        .includes(query);
    });
  }, [tickets, search]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      inProgress: tickets.filter((t) => t.status === "in_progress")
        .length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      closed: tickets.filter((t) => t.status === "closed").length,
    };
  }, [tickets]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return CircleAlert;

      case "in_progress":
        return Clock3;

      case "resolved":
        return CheckCircle2;

      case "closed":
        return XCircle;

      default:
        return Ticket;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      await deleteTicket(deleteTarget.id);

      setTickets((prev) =>
        prev.filter((ticket) => ticket.id !== deleteTarget.id)
      );

      if (selectedTicket?.id === deleteTarget.id) {
        setSelectedTicket(null);
      }

      setDeleteTarget(null);

      showToast("تم حذف التذكرة بنجاح", "success");
    } catch (error) {
      console.error("Delete ticket error:", error);

      showToast(
        "تعذر حذف التذكرة، حاول مرة أخرى",
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Ticket className="h-7 w-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  الشكاوى والدعم الفني
                </h1>

                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
                  {stats.total} تذكرة
                </span>
              </div>

              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                إدارة ومتابعة تذاكر الدعم الفني والشكاوى الواردة من
                الطلاب والمعلمين.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 text-amber-600">
                <CircleAlert className="h-4 w-4" />
                <span className="text-xs font-bold">مفتوحة</span>
              </div>

              <p className="mt-1 text-xl font-extrabold text-amber-700">
                {stats.open}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Clock3 className="h-4 w-4" />
                <span className="text-xs font-bold">معالجة</span>
              </div>

              <p className="mt-1 text-xl font-extrabold text-blue-700">
                {stats.inProgress}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold">تم الحل</span>
              </div>

              <p className="mt-1 text-xl font-extrabold text-emerald-700">
                {stats.resolved}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-100 px-4 py-3">
              <div className="flex items-center gap-2 text-slate-600">
                <XCircle className="h-4 w-4" />
                <span className="text-xs font-bold">مغلقة</span>
              </div>

              <p className="mt-1 text-xl font-extrabold text-slate-700">
                {stats.closed}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المستخدم أو البريد أو عنوان التذكرة..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
      </Card>

      {/* Filters */}
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {FILTERS.map((item) => {
            const Icon = item.icon;
            const active = filter === item.value;

            const count =
              item.value === ""
                ? stats.total
                : tickets.filter(
                    (ticket) => ticket.status === item.value
                  ).length;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`group flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                  active
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                }`}
              >
                <Icon className="h-4 w-4" />

                <span>{item.label}</span>

                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tickets */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-32 rounded-3xl"
            />
          ))
        ) : filteredTickets.length === 0 ? (
          <Card className="border-slate-200 bg-white p-8 shadow-sm">
            <EmptyState
              icon={<Ticket className="h-6 w-6" />}
              title={
                search
                  ? "لا توجد نتائج مطابقة للبحث"
                  : "لا توجد تذاكر في هذا التصنيف"
              }
            />
          </Card>
        ) : (
          filteredTickets.map((ticket) => {
            const StatusIcon = getStatusIcon(ticket.status);

            const statusLabel =
              TICKET_STATUS_LABELS[ticket.status] ||
              ticket.status;

            const categoryLabel =
              TICKET_CATEGORY_LABELS[ticket.category] ||
              ticket.category ||
              "غير محدد";

            const isTeacher =
              ticket.user?.role === "teacher";

            const userName =
              ticket.user?.full_name ||
              "مستخدم غير معروف";

            return (
              <Card
                key={ticket.id}
                className="relative overflow-hidden border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-brand-200 hover:shadow-lg sm:p-5"
              >
                <div
                  className={`absolute right-0 top-0 h-full w-1 ${
                    ticket.status === "open"
                      ? "bg-amber-400"
                      : ticket.status === "in_progress"
                        ? "bg-blue-500"
                        : ticket.status === "resolved"
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                  }`}
                />

                <div className="flex flex-col gap-4">
                  {/* Top */}
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                          isTeacher
                            ? "bg-violet-50 text-violet-600"
                            : "bg-brand-50 text-brand-600"
                        }`}
                      >
                        {isTeacher ? (
                          <GraduationCap className="h-5 w-5" />
                        ) : (
                          <UserRound className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-base font-extrabold text-slate-900">
                          {ticket.subject || "بدون عنوان"}
                        </h2>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="font-bold text-slate-600">
                            {userName}
                          </span>

                          <span>•</span>

                          <span>
                            {isTeacher ? "معلم" : "طالب"}
                          </span>

                          <span>•</span>

                          <span>
                            {formatDateTime(ticket.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      color={
                        STATUS_COLORS[ticket.status] || "slate"
                      }
                    >
                      <span className="flex items-center gap-1.5">
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusLabel}
                      </span>
                    </Badge>
                  </div>

                  {/* Description */}
                  {ticket.description && (
                    <p className="line-clamp-2 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-500">
                      {ticket.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                        {categoryLabel}
                      </span>

                      {ticket.priority && (
                        <span className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600">
                          <Flag className="h-3.5 w-3.5" />
                          {ticket.priority}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Details */}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTicket(ticket)
                        }
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                      >
                        <Eye className="h-4 w-4" />
                        تفاصيل
                      </button>


                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget(ticket)
                        }
                        className="flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Details Modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <Ticket className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-extrabold text-slate-900">
                    تفاصيل التذكرة
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-400">
                    مراجعة بيانات ومحتوى التذكرة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[calc(90vh-150px)] overflow-y-auto p-5">
              <div className="space-y-5">
                {/* Subject */}
                <div>
                  <p className="mb-2 text-xs font-bold text-slate-400">
                    عنوان التذكرة
                  </p>

                  <h3 className="text-lg font-extrabold text-slate-900">
                    {selectedTicket.subject || "بدون عنوان"}
                  </h3>
                </div>

                {/* Status */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                      <CircleAlert className="h-4 w-4" />
                      الحالة
                    </div>

                    <Badge
                      color={
                        STATUS_COLORS[
                          selectedTicket.status
                        ] || "slate"
                      }
                    >
                      {TICKET_STATUS_LABELS[
                        selectedTicket.status
                      ] || selectedTicket.status}
                    </Badge>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Tag className="h-4 w-4" />
                      التصنيف
                    </div>

                    <p className="text-sm font-extrabold text-slate-700">
                      {TICKET_CATEGORY_LABELS[
                        selectedTicket.category
                      ] ||
                        selectedTicket.category ||
                        "غير محدد"}
                    </p>
                  </div>
                </div>

                {/* User */}
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-400">
                    <UserRound className="h-4 w-4" />
                    صاحب التذكرة
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                      {selectedTicket.user?.role ===
                      "teacher" ? (
                        <GraduationCap className="h-5 w-5" />
                      ) : (
                        <UserRound className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-extrabold text-slate-800">
                        {selectedTicket.user?.full_name ||
                          "مستخدم غير معروف"}
                      </p>

                      {selectedTicket.user?.email && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                          {selectedTicket.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                      <CalendarDays className="h-4 w-4" />
                      تاريخ الإنشاء
                    </div>

                    <p className="text-sm font-bold text-slate-700">
                      {formatDateTime(
                        selectedTicket.created_at
                      )}
                    </p>
                  </div>

                  {selectedTicket.priority && (
                    <div className="rounded-2xl bg-orange-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-orange-500">
                        <Flag className="h-4 w-4" />
                        الأولوية
                      </div>

                      <p className="text-sm font-extrabold text-orange-700">
                        {selectedTicket.priority}
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">
                    <FileText className="h-4 w-4" />
                    وصف المشكلة
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                      {selectedTicket.description ||
                        "لا يوجد وصف مضاف لهذه التذكرة."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
              >
                إغلاق
              </button>


              <button
                type="button"
                onClick={() => {
                  setSelectedTicket(null);
                  setDeleteTarget(selectedTicket);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                حذف التذكرة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
          }
        }}
        title="حذف التذكرة؟"
        description={
          deleteTarget
            ? `سيتم حذف التذكرة "${deleteTarget.subject || "بدون عنوان"}" نهائيًا. هذا الإجراء لا يمكن التراجع عنه.`
            : "سيتم حذف التذكرة نهائيًا."
        }
        confirmText={deleting ? "جاري الحذف..." : "حذف التذكرة"}
        cancelText="إلغاء"
        onConfirm={handleDelete}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}