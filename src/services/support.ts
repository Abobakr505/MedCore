import { supabase } from "@/lib/supabase";

import type { SupportTicket, TicketMessage, TicketCategory } from "@/types";

export interface ContactMessage {

  id: string;

  name: string;

  email: string;

  message: string;

  status: "new" | "read" | "replied";

  created_at: string;

}

export async function fetchMyTickets(userId: string) {

  const { data, error } = await supabase

    .from("support_tickets")

    .select("*")

    .eq("user_id", userId)

    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as SupportTicket[];

}

export async function fetchAllTickets(status?: string) {

  let query = supabase

    .from("support_tickets")

    .select("*, user:profiles(full_name, email, role)")

    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];

}

export async function createTicket(userId: string, subject: string, description: string, category: TicketCategory) {

  const { error } = await supabase.from("support_tickets").insert({ user_id: userId, subject, description, category });

  if (error) throw error;

}

export async function fetchTicketMessages(ticketId: string) {

  const { data, error } = await supabase

    .from("ticket_messages")

    .select("*, sender:profiles(full_name, role)")

    .eq("ticket_id", ticketId)

    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as unknown as TicketMessage[];

}

export async function sendTicketMessage(ticketId: string, senderId: string, message: string) {

  const { error } = await supabase.from("ticket_messages").insert({ ticket_id: ticketId, sender_id: senderId, message });

  if (error) throw error;

}

export async function updateTicketStatus(ticketId: string, status: string) {

  const { error } = await supabase.from("support_tickets").update({ status }).eq("id", ticketId);

  if (error) throw error;

}
export async function deleteTicket(ticketId: string) {
  const { error } = await supabase
    .from("support_tickets")
    .delete()
    .eq("id", ticketId);

  if (error) throw error;
}
export async function updateTicketPriority(ticketId: string, priority: string) {

  const { error } = await supabase.from("support_tickets").update({ priority }).eq("id", ticketId);

  if (error) throw error;

}

// ===== رسائل صفحة التواصل =====

export async function sendContactMessage(data: {

  name: string;

  email: string;

  message: string;

}) {

  const { error } = await supabase.from("contact_messages").insert({

    name: data.name,

    email: data.email,

    message: data.message,

  });

  if (error) throw error;

}

export async function fetchContactMessages(status?: string) {

  let query = supabase

    .from("contact_messages")

    .select("*")

    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as ContactMessage[];

}

export async function markContactMessageAsRead(id: string) {

  const { error } = await supabase

    .from("contact_messages")

    .update({ status: "read" })

    .eq("id", id);

  if (error) throw error;

}

export async function markContactMessageAsReplied(id: string) {

  const { error } = await supabase

    .from("contact_messages")

    .update({ status: "replied" })

    .eq("id", id);

  if (error) throw error;

}