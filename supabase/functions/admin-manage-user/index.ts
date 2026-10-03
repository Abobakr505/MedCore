import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "غير مصرح: لا يوجد توكن" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    // 1) من هو المستدعي؟ (التحقق من التوكن عبر Auth مباشرة)
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return json(
        { error: "جلسة الدخول غير صالحة، سجّل الدخول من جديد" },
        401
      );
    }

    // 2) هل هو أدمن؟
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return json({ error: "هذه العملية للمشرفين فقط" }, 403);
    }

    // 3) قراءة الطلب
    const { action, userId, password } = await req.json();

    if (!userId || typeof userId !== "string") {
      return json({ error: "معرّف المستخدم مطلوب" }, 400);
    }

    if (userId === user.id) {
      return json({ error: "لا يمكنك تنفيذ هذه العملية على حسابك" }, 400);
    }

    // 4) الهدف يجب أن يكون طالبًا أو معلمًا فقط
    const { data: target } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!target || !["student", "teacher"].includes(target.role)) {
      return json({ error: "المستخدم غير موجود أو غير مسموح بتعديله" }, 400);
    }

    if (action === "set_password") {
      if (typeof password !== "string" || password.length < 8) {
        return json({ error: "كلمة المرور يجب ألا تقل عن 8 أحرف" }, 400);
      }

      const { error } = await admin.auth.admin.updateUserById(userId, {
        password,
      });
      if (error) return json({ error: error.message }, 400);

      return json({ success: true });
    }

    if (action === "delete_user") {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);

      // تنظيف احتياطي إن لم يكن هناك ON DELETE CASCADE
      await admin.from("profiles").delete().eq("id", userId);

      return json({ success: true });
    }

    return json({ error: "إجراء غير معروف" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || "خطأ غير متوقع" }, 500);
  }
});