import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // لا نرمي استثناء يوقف التطبيق بالكامل، لكن ننبّه بوضوح أثناء التطوير
  // بدل خطأ Supabase غامض لاحقًا.
  // eslint-disable-next-line no-console
  console.error(
    "متغيرات بيئة Supabase غير موجودة. تأكد من إنشاء ملف .env بناءً على .env.example"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ===== Device Identifier (Device Lock) =====
// معرّف عشوائي غير قابل للتتبع، وليس Fingerprint، يُخزَّن محليًا فقط.
const DEVICE_KEY = "medcore_device_id";

export function getDeviceIdentifier(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "جهاز أندرويد";
  if (/iphone|ipad/i.test(ua)) return "جهاز آبل";
  if (/windows/i.test(ua)) return "حاسوب ويندوز";
  if (/mac/i.test(ua)) return "حاسوب ماك";
  return "متصفح ويب";
}

// ===== Storage helpers =====
export function getPublicUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
