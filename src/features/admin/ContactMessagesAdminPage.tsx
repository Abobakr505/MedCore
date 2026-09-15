import { useEffect, useState } from "react";
import {
Mail,
Search,
Inbox,
Clock3,
User,
AtSign,
MessageSquareText,
ExternalLink,
} from "lucide-react";

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

const STATUS_COLORS: Record<
string,
"amber" | "blue" | "green" | "slate"

> = {
 new: "amber",
 read: "blue",
 replied: "green", };

const FILTERS = [
{ value: "", label: "الكل", icon: Inbox },
{ value: "new", label: "جديدة", icon: Mail },
{ value: "read", label: "مقروءة", icon: Clock3 },
{ value: "replied", label: "تم الرد", icon: MessageSquareText },
];

export default function ContactMessagesAdminPage() {
const [messages, setMessages] = useState<ContactMessage[]>([]);
const [loading, setLoading] = useState(true);
const [filter, setFilter] = useState("");
const [selected, setSelected] = useState<ContactMessage | null>(null);

const load = async () => {
setLoading(true);

try {
  const data = await fetchContactMessages(filter || undefined);
  setMessages(data);

  // لو الرسالة المحددة لم تعد موجودة في الفلتر الحالي
  if (selected && !data.some((item) => item.id === selected.id)) {
    setSelected(null);
  }
} finally {
  setLoading(false);
}

};

useEffect(() => {
load();
}, [filter]);

const openMessage = async (msg: ContactMessage) => {
setSelected(msg);


if (msg.status === "new") {
  await markContactMessageAsRead(msg.id);

  setSelected({
    ...msg,
    status: "read",
  });

  await load();
}


};

const unreadCount = messages.filter((m) => m.status === "new").length;

return ( <div className="space-y-6">
{/* Header */} <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"> <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" /> <div className="absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />


    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Mail className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              رسائل التواصل
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              تابع رسائل واستفسارات زوار المنصة
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
          <Mail className="h-5 w-5 text-brand-500" />
        </div>

        <div>
          <p className="text-xl font-extrabold text-slate-900">
            {loading ? "—" : unreadCount}
          </p>
          <p className="text-xs text-slate-500">رسالة جديدة</p>
        </div>
      </div>
    </div>
  </div>

  {/* Filters */}
  <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
    {FILTERS.map(({ value, label, icon: Icon }) => {
      const active = filter === value;

      return (
        <button
          key={value}
          type="button"
          onClick={() => setFilter(value)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            active
              ? "bg-brand-500 text-white shadow-sm shadow-brand-500/20"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      );
    })}
  </div>

  {/* Content */}
  <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
    {/* Messages */}
    <div className="min-w-0">
      <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-800">
                صندوق الوارد
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {loading ? "جاري التحميل..." : `${messages.length} رسالة`}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
              <Inbox className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="max-h-[650px] overflow-y-auto p-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[112px] rounded-2xl"
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={<Mail className="h-6 w-6" />}
                title="لا توجد رسائل"
              />
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => {
                const isSelected = selected?.id === m.id;
                const isNew = m.status === "new";

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openMessage(m)}
                    className={`group relative w-full rounded-2xl border p-4 text-right transition-all duration-200 ${
                      isSelected
                        ? "border-brand-300 bg-brand-50 shadow-sm"
                        : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {isNew && (
                      <span className="absolute right-0 top-5 h-8 w-1 rounded-l-full bg-brand-500" />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                            isNew
                              ? "bg-brand-100 text-brand-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {m.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-extrabold text-slate-800">
                            {m.name}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {m.email}
                          </p>
                        </div>
                      </div>

                      <Badge color={STATUS_COLORS[m.status]}>
                        {STATUS_LABELS[m.status]}
                      </Badge>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                      {m.message}
                    </p>

                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDateTime(m.created_at)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>

    {/* Message details */}
    <div className="min-w-0">
      {selected ? (
        <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
          {/* Details header */}
          <div className="border-b border-slate-100 bg-gradient-to-l from-brand-50/70 via-white to-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-xl font-extrabold text-brand-600">
                  {selected.name?.charAt(0)?.toUpperCase() || "?"}
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {selected.name}
                  </h2>

                  <a
                    href={`mailto:${selected.email}`}
                    className="mt-1 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-brand-500"
                  >
                    <AtSign className="h-3.5 w-3.5" />
                    {selected.email}
                  </a>
                </div>
              </div>

              <Badge color={STATUS_COLORS[selected.status]}>
                {STATUS_LABELS[selected.status]}
              </Badge>
            </div>
          </div>

          {/* Meta */}
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-white p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <User className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[11px] text-slate-400">المرسل</p>
                <p className="text-sm font-bold text-slate-700">
                  {selected.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Clock3 className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[11px] text-slate-400">
                  تاريخ الرسالة
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {formatDateTime(selected.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                <MessageSquareText className="h-4 w-4" />
              </div>

              <h3 className="font-extrabold text-slate-800">
                محتوى الرسالة
              </h3>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <p className="whitespace-pre-line text-sm leading-8 text-slate-700">
                {selected.message}
              </p>
            </div>

            <a
              href={`mailto:${selected.email}`}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-extrabold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600 hover:shadow-md"
            >
              <ExternalLink className="h-4 w-4" />
              الرد عبر البريد
            </a>
          </div>
        </Card>
      ) : (
        <Card className="flex min-h-[500px] items-center justify-center border-slate-200 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
              <Search className="h-7 w-7" />
            </div>

            <h2 className="mt-5 text-lg font-extrabold text-slate-700">
              اختر رسالة لعرضها
            </h2>

            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
              اختر إحدى الرسائل من صندوق الوارد لعرض تفاصيلها والرد عليها.
            </p>
          </div>
        </Card>
      )}
    </div>
  </div>
</div>

);
}
