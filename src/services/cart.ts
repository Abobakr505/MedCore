import { supabase } from "@/lib/supabase";
import type { CartItem } from "@/types";

export async function fetchCart(studentId: string) {
  const { data, error } = await supabase
    .from("cart_items")
    .select("*, course:courses(id, title, price, thumbnail_path, college, slug)")
    .eq("student_id", studentId)
    .order("added_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CartItem[];
}

export async function addToCart(studentId: string, courseId: string) {
  const { error } = await supabase.from("cart_items").insert({ student_id: studentId, course_id: courseId });
  if (error) {
    if (error.code === "23505") throw new Error("هذا الكورس موجود بالفعل في سلتك");
    throw error;
  }
}

export async function removeFromCart(itemId: string) {
  const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function clearCartItems(itemIds: string[]) {
  const { error } = await supabase.from("cart_items").delete().in("id", itemIds);
  if (error) throw error;
}
