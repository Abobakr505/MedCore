import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { fetchTicketMessages, sendTicketMessage, updateTicketStatus, updateTicketPriority } from "@/services/support";
import { supabase } from "@/lib/supabase";
import type { TicketMessage, SupportTicket } from "@/types";
import { TICKET_STATUS_LABELS } from "@/types";
import { formatDateTime } from "@/utils/format";

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { session, profile } = useAuth();
  const { showToast } = useToast();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === "admin";

  const load = async () => {
    if (!ticketId) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("id", ticketId).single();
    setTicket(data as SupportTicket);
    setMessages(await fetchTicketMessages(ticketId));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !ticketId || !session?.user) return;
    try {
      await sendTicketMessage(ticketId, session.user.id, text.trim());
      setText("");
      load();
    } catch {
      showToast("تعذّر إرسال الرسالة", "error");
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!ticketId) return;
    await updateTicketStatus(ticketId, status);
    load();
  };

  if (loading || !ticket) {
    return <div className="space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-64 rounded-2xl" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-brand-900">{ticket.subject}</h1>
          <p className="mt-1 text-xs text-slate-400">{formatDateTime(ticket.created_at)}</p>
        </div>
        {isAdmin ? (
          <select
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          >
            {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        ) : (
          <Badge color="blue">{TICKET_STATUS_LABELS[ticket.status]}</Badge>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 p-4">
        <p className="text-sm text-slate-600 whitespace-pre-line">{ticket.description}</p>
      </div>

      <div className="mt-6 max-h-96 space-y-3 overflow-y-auto rounded-2xl border border-slate-100 p-4">
        {messages.length === 0 && <p className="text-center text-sm text-slate-400 py-6">لا توجد ردود بعد</p>}
        {messages.map((m) => {
          const isMine = m.sender_id === session?.user?.id;
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? "bg-brand-50 text-brand-900" : "bg-slate-100 text-slate-700"}`}>
                <p className="mb-1 text-xs font-bold opacity-70">{m.sender?.full_name} {m.sender?.role === "admin" && "(الدعم الفني)"}</p>
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="اكتب ردك هنا..."
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <Button onClick={handleSend}><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
