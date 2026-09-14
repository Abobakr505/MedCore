import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchContactMessages,
  markContactMessageAsRead,
  ContactMessage,
} from "@/services/support";

import { formatDateTime } from "@/utils/format";

const STATUS_LABELS: Record<string, string> = {
  new: "جديدة",
  read: "مقروءة",
  replied: "تم الرد",
};

const STATUS_COLORS: Record<string, "amber" | "blue" | "green" | "slate"> = {
  new: "amber",
  read: "blue",
  replied: "green",
};

export default function ContactMessagesAdminPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  const load = () => {
    setLoading(true);
    fetchContactMessages(filter || undefined)
      .then(setMessages)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filter]);

const openMessage = async (msg: ContactMessage) => {
  setSelected(msg);
  if (msg.status === "new") {
    await markContactMessageAsRead(msg.id);
    load();
  }
};

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-brand-900">رسائل التواصل</h1>
        <div className="flex gap-2">
          {[["", "الكل"], ["new", "جديدة"], ["read", "مقروءة"], ["replied", "تم الرد"]].map(
            ([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  filter === value ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          ) : messages.length === 0 ? (
            <EmptyState icon={<Mail className="w-6 h-6" />} title="لا توجد رسائل" />
          ) : (
            messages.map((m) => (
              <button
                key={m.id}
                onClick={() => openMessage(m)}
                className={`block w-full rounded-2xl border p-4 text-right transition hover:shadow-md ${
                  selected?.id === m.id ? "border-brand-400 bg-brand-50" : "border-slate-100 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800">{m.name}</p>
                  <Badge color={STATUS_COLORS[m.status]}>{STATUS_LABELS[m.status]}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-slate-400">{m.email}</p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">{m.message}</p>
                <p className="mt-2 text-[11px] text-slate-400">{formatDateTime(m.created_at)}</p>
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-800">{selected.name}</p>
                  <p className="text-sm text-slate-400">{selected.email}</p>
                </div>
                <Badge color={STATUS_COLORS[selected.status]}>
                  {STATUS_LABELS[selected.status]}
                </Badge>
              </div>
              <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">
                {selected.message}
              </p>

              <a
                href={`mailto:${selected.email}`}
                className="mt-6 inline-block rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white"
              >
                الرد عبر البريد
              </a>
            </Card>
          ) : (
            <EmptyState icon={<Mail className="w-6 h-6" />} title="اختر رسالة لعرضها" />
          )}
        </div>
      </div>
    </div>
  );
}