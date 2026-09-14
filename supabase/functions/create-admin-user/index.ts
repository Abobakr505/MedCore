// Supabase Edge Function: create-admin-user
// لا يُستدعى هذا الـ Endpoint من الفرونت إند العام إطلاقًا. استخدمه فقط
// يدويًا (عبر supabase functions invoke) أو من أداة داخلية محدودة الوصول
// لفريق التشغيل، لإنشاء حسابات الأدمن دون المرور بـ Public Sign-up.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("https://wijtjofukwoqrnmhbggh.supabase.co")!;
const SERVICE_ROLE_KEY = Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpanRqb2Z1a3dvcXJubWhiZ2doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTMxOTk5OCwiZXhwIjoyMTA0ODk1OTk4fQ.OqPrfve3WajzZaDmd_mWa4SsZaivFCP4XPmRMwJci5o")!;
// سرّ إضافي يجب ضبطه في متغيرات بيئة الـ Function (وليس في الكود) لمنع أي استدعاء عشوائي
const SETUP_SECRET = Deno.env.get("MedCore_Admin_2026_9xK7pQ2mL8vR")!;

Deno.serve(async (req) => {
  const { email, password, fullName, secret } = await req.json();

  if (secret !== SETUP_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  if (!email || !password || !fullName) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "student", college: "medicine" }, // Trigger سيرفضها كـ admin تلقائيًا، لذا نصححها يدويًا بالأسفل
  });

  if (createError || !created.user) {
    return new Response(JSON.stringify({ error: createError?.message ?? "Failed to create user" }), { status: 500 });
  }

  // ترقية الدور إلى admin مباشرة في profiles بعد الإنشاء (مسموح فقط هنا لأن
  // هذا الكود يعمل بصلاحية service_role ولا يمر عبر RLS العادية)
  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ role: "admin", status: "active" })
    .eq("id", created.user.id);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, userId: created.user.id }), { status: 200 });
});
