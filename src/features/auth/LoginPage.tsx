import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  loginSchema,
  type LoginFormValues,
} from "@/utils/validation";

export default function LoginPage() {
  const { signIn } = useAuth();
  const { showToast } = useToast();

  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // لما نتحظر مؤقتًا، بنقفل الفورم ونعرض عداد تنازلي
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);



  useEffect(() => {
    if (!lockedUntil) return;

    const tick = () => {
      const secondsLeft = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);
      if (secondsLeft <= 0) setLockedUntil(null);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const validate = () => {
    const result = loginSchema.safeParse({
      email,
      password,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
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

    if (loading || lockedUntil) return;

    if (!validate()) return;

    setLoading(true);

    try {
      const { error, reason, retryAfterSeconds } = await signIn(
        email.trim().toLowerCase(),
        password
      );

      if (error) {
        if (reason === "pending_verification") {
          navigate("/auth/pending-approval", { replace: true });
          return;
        }

        if (reason === "rate_limited") {
          const seconds = retryAfterSeconds || 60;
          setLockedUntil(Date.now() + seconds * 1000);
        }

        showToast(error, "error");
        return;
      }

      showToast("مرحبًا بعودتك 👋", "success");

      const from =
        (location.state as { from?: string } | null)?.from ||
        "/app/home";

      /*
       * لا نسمح بالانتقال إلى روابط خارجية من state
       */
      const safeFrom =
        typeof from === "string" && from.startsWith("/")
          ? from
          : "/app/home";

      navigate(safeFrom, {
        replace: true,
      });
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      showToast(
        "حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    setCapsLock(event.getModifierState("CapsLock"));
  };

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8"
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
          y: 30,
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
        {/* Glow */}
        <div className="absolute -inset-1 rounded-[34px] bg-gradient-to-br from-brand-500/30 to-cyan-500/20 opacity-60 blur-xl" />

        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white p-6 shadow-2xl shadow-black/30 sm:p-8">
          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-cyan-400 to-brand-500" />

          {/* Logo */}
          <div className="mb-8 flex flex-col items-center text-center">
            <motion.div
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{
                delay: 0.15,
                duration: 0.5,
              }}
              className="relative mb-4"
            >
              <div className="absolute inset-0 rounded-[22px] bg-brand-500/30 blur-xl" />

              <div className="relative grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-brand-500 to-cyan-500 text-white shadow-xl shadow-brand-500/20">
                <Stethoscope className="h-8 w-8" />
              </div>
            </motion.div>

            <h1 className="text-2xl font-black text-slate-900">
              تسجيل الدخول
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              مرحبًا بعودتك إلى{" "}
              <span className="font-bold text-brand-600">
                Med Core
              </span>
            </p>
          </div>

          {/* Security badge */}
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-extrabold text-emerald-800">
                دخول آمن
              </p>

              <p className="mt-0.5 text-[10px] leading-5 text-emerald-700/70">
                بيانات الدخول الخاصة بك محمية.
              </p>
            </div>
          </div>

          {/* Rate-limit lock notice */}
          {lockedUntil && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center"
            >
              <p className="text-xs font-extrabold text-red-700">
                تم تقييد المحاولات مؤقتًا
              </p>
              <p className="mt-1 text-[11px] text-red-600/80">
                حاول مرة أخرى بعد {Math.floor(remainingSeconds / 60)}:
                {String(remainingSeconds % 60).padStart(2, "0")}
              </p>
            </motion.div>
          )}

          <form
            onSubmit={onSubmit}
            className="space-y-5"
            noValidate
          >
            {/* Email */}
            <div>
              <Input
                label="البريد الإلكتروني"
                className="bg-white"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="example@medcore.app"
                value={email}
                error={errors.email}
                disabled={!!lockedUntil}
                onChange={(event) => {
                  setEmail(event.target.value);

                  if (errors.email) {
                    setErrors((prev) => ({
                      ...prev,
                      email: undefined,
                    }));
                  }
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div className="relative ">
                <Input
                  label="كلمة المرور"
                  className="bg-white"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  error={errors.password}
                  disabled={!!lockedUntil}
                  onChange={(event) => {
                    setPassword(event.target.value);

                    if (errors.password) {
                      setErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                  onKeyDown={handlePasswordKeyDown}
                  onKeyUp={handlePasswordKeyDown}
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

              {capsLock && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-[11px] font-bold text-amber-600"
                >
                  ⚠️ زر Caps Lock مفعّل
                </motion.p>
              )}
            </div>

            {/* Forgot password */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <LockKeyhole className="h-3.5 w-3.5" />
                اتصال آمن
              </div>

            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="group h-13 w-full rounded-2xl shadow-lg shadow-brand-500/15"
              size="lg"
              isLoading={loading}
              disabled={!!lockedUntil}
            >
              <span>تسجيل الدخول</span>

              {!loading && (
                <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
              )}
            </Button>
          </form>

          {/* Register */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[10px] font-bold text-slate-400">
              أو
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <p className="text-center text-sm text-slate-500">
            ليس لديك حساب؟{" "}
            <Link
              to="/auth/register"
              className="font-black text-brand-600 hover:text-brand-700 hover:underline"
            >
              إنشاء حساب جديد
            </Link>
          </p>


        </div>
      </motion.div>
    </main>
  );
}