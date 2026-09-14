import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/utils/validation";

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    return {
      label: "ضعيفة",
      width: "33%",
      textClass: "text-red-600",
      barClass: "bg-red-500",
    };
  }

  if (score <= 4) {
    return {
      label: "متوسطة",
      width: "66%",
      textClass: "text-amber-600",
      barClass: "bg-amber-500",
    };
  }

  return {
    label: "قوية",
    width: "100%",
    textClass: "text-emerald-600",
    barClass: "bg-emerald-500",
  };
}

export default function ResetPasswordPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const strength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const validate = () => {
    const result = resetPasswordSchema.safeParse({
      password,
      confirmPassword,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        password: fieldErrors.password?.[0],
        confirmPassword:
          fieldErrors.confirmPassword?.[0],
      });

      return false;
    }

    setErrors({});
    return true;
  };

  const onSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) return;

    if (!validate()) return;

    setLoading(true);

    try {
      /*
       * Supabase يجب أن يكون عنده recovery session
       * ناتجة عن رابط استعادة كلمة المرور.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        showToast(
          "رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته",
          "error"
        );

        return;
      }

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        console.error(
          "UPDATE PASSWORD ERROR:",
          error
        );

        showToast(
          "تعذّر تحديث كلمة المرور، حاول مرة أخرى",
          "error"
        );

        return;
      }

      /*
       * إنهاء recovery session بعد تغيير كلمة المرور.
       */
      await supabase.auth.signOut();

      showToast(
        "تم تحديث كلمة المرور بنجاح",
        "success"
      );

      navigate("/auth/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "RESET PASSWORD ERROR:",
        error
      );

      showToast(
        "حدث خطأ أثناء تحديث كلمة المرور",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:45px_45px]" />
      </div>

      <motion.div
        initial={{
          opacity: 0,
          y: 25,
          scale: 0.97,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative w-full max-w-md"
      >
        <div className="absolute -inset-1 rounded-[34px] bg-gradient-to-br from-brand-500/25 to-cyan-500/20 blur-2xl" />

        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-cyan-400 to-brand-500" />

          {/* Header */}
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-[22px] bg-brand-500/30 blur-xl" />

              <div className="relative grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-brand-500 to-cyan-500 text-white shadow-xl">
                <KeyRound className="h-8 w-8" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-slate-900">
              تعيين كلمة مرور جديدة
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              اختر كلمة مرور قوية لحماية حسابك.
            </p>
          </div>

          {/* Security */}
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-black text-brand-900">
                حماية الحساب
              </p>

              <p className="mt-1 text-[10px] leading-5 text-brand-700/70">
                لا تستخدم كلمة مرور استخدمتها من قبل في حسابات
                أخرى.
              </p>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-5"
            noValidate
          >
            {/* Password */}
            <div>
              <div className="relative">
                <Input
                  label="كلمة المرور الجديدة"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  error={errors.password}
                  onChange={(event) => {
                    setPassword(event.target.value);

                    if (errors.password) {
                      setErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  className="absolute left-3 top-[34px] z-10 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                  aria-label={
                    showPassword
                      ? "إخفاء كلمة المرور"
                      : "إظهار كلمة المرور"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {password.length > 0 && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      قوة كلمة المرور
                    </span>

                    <span
                      className={`text-[10px] font-black ${strength.textClass}`}
                    >
                      {strength.label}
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: strength.width,
                      }}
                      className={`h-full rounded-full ${strength.barClass}`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div className="relative">
              <Input
                label="تأكيد كلمة المرور"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                error={errors.confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);

                  if (errors.confirmPassword) {
                    setErrors((prev) => ({
                      ...prev,
                      confirmPassword: undefined,
                    }));
                  }
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (value) => !value
                  )
                }
                className="absolute left-3 top-[34px] z-10 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                aria-label={
                  showConfirmPassword
                    ? "إخفاء تأكيد كلمة المرور"
                    : "إظهار تأكيد كلمة المرور"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Requirements */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-black text-slate-700">
                <LockKeyhole className="h-4 w-4 text-brand-500" />
                متطلبات كلمة المرور
              </p>

              <div className="space-y-2">
                <Requirement
                  valid={password.length >= 8}
                  text="8 أحرف على الأقل"
                />

                <Requirement
                  valid={/[A-Z]/.test(password)}
                  text="حرف كبير واحد على الأقل"
                />

                <Requirement
                  valid={/[a-z]/.test(password)}
                  text="حرف صغير واحد على الأقل"
                />

                <Requirement
                  valid={/\d/.test(password)}
                  text="رقم واحد على الأقل"
                />

                <Requirement
                  valid={/[^A-Za-z0-9]/.test(password)}
                  text="رمز خاص واحد على الأقل"
                />

                <Requirement
                  valid={
                    password.length > 0 &&
                    password === confirmPassword
                  }
                  text="تطابق كلمتي المرور"
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="group h-13 w-full rounded-2xl shadow-lg shadow-brand-500/15"
              size="lg"
              isLoading={loading}
            >
              <CheckCircle2 className="h-4 w-4" />

              <span>تحديث كلمة المرور</span>

              {!loading && (
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </main>
  );
}

function Requirement({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-[10px] font-medium ${
        valid ? "text-emerald-600" : "text-slate-400"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          valid
            ? "bg-emerald-500 text-white"
            : "bg-slate-200 text-transparent"
        }`}
      >
        <Check className="h-2.5 w-2.5" />
      </span>

      {text}
    </div>
  );
}