import { supabase } from "@/lib/supabase";

import type { CartItem } from "@/types";

export async function fetchCart(studentId: string) {
  // 1. Get cart items
  const { data: cartItems, error: cartError } = await supabase
    .from("cart_items")
    .select("*")
    .eq("student_id", studentId)
    .order("added_at", { ascending: false });

  if (cartError) {
    console.error("FETCH CART ITEMS ERROR:", cartError);
    throw cartError;
  }

  if (!cartItems || cartItems.length === 0) {
    return [];
  }

  // 2. Get course IDs
  const courseIds = cartItems
    .map((item) => item.course_id)
    .filter(Boolean);

  // 3. Get courses with teacher_id
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      price,
      thumbnail_path,
      college,
      slug,
      teacher_id,
      is_installment,
      installment_months,
      installment_amount
    `)
    .in("id", courseIds);

  if (coursesError) {
    console.error("FETCH CART COURSES ERROR:", coursesError);
    throw coursesError;
  }

  // 4. Attach course to each cart item
  const result = cartItems.map((item) => ({
    ...item,
    course:
      courses?.find(
        (course) => course.id === item.course_id
      ) ?? null,
  }));

  console.log("FINAL CART DATA:", result);

  console.log(
    "FINAL TEACHER ID:",
    result[0]?.course?.teacher_id
  );

  return result as CartItem[];
}

export async function addToCart(
  studentId: string,
  courseId: string
) {
  const { error } = await supabase
    .from("cart_items")
    .insert({
      student_id: studentId,
      course_id: courseId,
    });

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "هذا الكورس موجود بالفعل في سلتك"
      );
    }

    throw error;
  }
}

export async function removeFromCart(
  itemId: string
) {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw error;
  }
}

export async function clearCartItems(
  itemIds: string[]
) {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .in("id", itemIds);

  if (error) {
    throw error;
  }
}