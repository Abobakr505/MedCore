import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      showToast("اكتب البريد الإلكتروني وكلمة المرور", "error");
      return;
    }

    setLoading(true);

    try {
      /*
       * 1) تسجيل الدخول في Supabase Auth
       */
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      /*
       * بيانات الدخول غير صحيحة
       */
      if (error) {
        console.error("ADMIN LOGIN AUTH ERROR:", error);

        showToast(
          "البريد الإلكتروني أو كلمة المرور غير صحيحة",
          "error"
        );

        return;
      }

      if (!data.user) {
        showToast("تعذر تسجيل الدخول", "error");
        return;
      }

      /*
       * 2) جلب Role المستخدم من profiles
       */
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, status")
        .eq("id", data.user.id)
        .maybeSingle();

      /*
       * فشل جلب الـ profile
       */
      if (profileError) {
        console.error("ADMIN PROFILE ERROR:", profileError);

        await supabase.auth.signOut();

        showToast(
          "تعذر التحقق من صلاحيات الحساب",
          "error"
        );

        return;
      }

      /*
       * لا يوجد Profile
       */
      if (!profile) {
        await supabase.auth.signOut();

        showToast(
          "هذا الحساب غير مسجل بشكل صحيح في المنصة",
          "error"
        );

        return;
      }

      /*
       * 3) أهم جزء:
       * الحساب لازم يكون Admin فعلاً
       */
      if (profile.role !== "admin") {
        console.warn(
          "NON ADMIN LOGIN ATTEMPT:",
          {
            email: normalizedEmail,
            role: profile.role,
          }
        );

        /*
         * تسجيل الخروج فوراً
         */
        await supabase.auth.signOut();

        showToast(
          "هذا الدخول مخصص لمدير المنصة فقط",
          "error"
        );

        return;
      }

      /*
       * 4) التأكد من أن الأدمن Active
       */
      if (profile.status !== "active") {
        await supabase.auth.signOut();

        showToast(
          "حساب المدير غير مفعل",
          "error"
        );

        return;
      }

      /*
       * 5) تم التحقق من أن المستخدم Admin
       */
      showToast(
        `مرحباً ${profile.full_name || "مدير المنصة"}`,
        "success"
      );

      navigate("/app/admin/home", {
        replace: true,
      });
    } catch (error) {
      console.error("ADMIN LOGIN EXCEPTION:", error);

      await supabase.auth.signOut();

      showToast(
        "حدث خطأ أثناء تسجيل الدخول",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center px-4 py-8"
    >
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-blue-100/50 blur-3xl" />

        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-sky-100/60 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-md"
      >
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_20px_60px_rgba(37,99,235,0.12)]">

          {/* Top accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 via-sky-500 to-blue-600" />

          <div className="p-7 sm:p-9">

            {/* Header */}
            <div className="mb-8 text-center">

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/60"
              >
                <ShieldCheck className="h-8 w-8" />
              </motion.div>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                دخول لوحة الإدارة
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                هذه الصفحة مخصصة لمدير منصة Med Core فقط
              </p>
            </div>

            {/* Security Notice */}
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

              <p className="text-xs leading-5 text-blue-800">
                لا يمكن للطلاب أو المعلمين الدخول إلى لوحة الإدارة،
                حتى باستخدام رابط لوحة التحكم مباشرة.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  البريد الإلكتروني
                </label>

                <div className="relative">

                  <Mail className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@medcore.app"
                    autoComplete="username"
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  كلمة المرور
                </label>

                <div className="relative">

                  <Lock className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-11 pl-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => !prev)
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "إخفاء كلمة المرور"
                        : "إظهار كلمة المرور"
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600 disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>

                </div>
              </div>

              {/* Login */}
              <Button
                type="submit"
                className="!mt-6 h-12 w-full rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-blue-600/30"
                size="lg"
                isLoading={loading}
              >
                <Lock className="h-4 w-4" />
                دخول لوحة الإدارة
              </Button>

            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-xs text-slate-400">
          Med Core Admin Panel
        </p>
      </motion.div>
    </div>
  );
}