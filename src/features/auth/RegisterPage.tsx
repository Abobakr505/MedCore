import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/utils/validation";

type Role = "student" | "teacher";

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
      score,
      label: "ضعيفة",
      width: "33%",
      textClass: "text-red-600",
      barClass: "bg-red-500",
    };
  }

  if (score <= 4) {
    return {
      score,
      label: "متوسطة",
      width: "66%",
      textClass: "text-amber-600",
      barClass: "bg-amber-500",
    };
  }

  return {
    score,
    label: "قوية",
    width: "100%",
    textClass: "text-emerald-600",
    barClass: "bg-emerald-500",
  };
}

export default function RegisterPage() {
  const { signUp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [values, setValues] = useState<
    Partial<RegisterFormValues>
  >({
    role: "student",
    college: "medicine",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof RegisterFormValues, string>>
  >({});

  const password = values.password ?? "";
  const confirmPassword = values.confirmPassword ?? "";

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const updateValue = (
    key: keyof RegisterFormValues,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (errors[key]) {
      setErrors((prev) => ({
        ...prev,
        [key]: undefined,
      }));
    }
  };

  const validate = () => {
    const result = registerSchema.safeParse({
      ...values,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        fullName: fieldErrors.fullName?.[0],
        email: fieldErrors.email?.[0],
        phone: fieldErrors.phone?.[0],
        college: fieldErrors.college?.[0],
        role: fieldErrors.role?.[0],
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
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

    if (password !== confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "كلمتا المرور غير متطابقتين",
      }));

      return;
    }

    setLoading(true);

    try {
      const data = values as RegisterFormValues;

      const { error } = await signUp({
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        phone: data.phone.trim(),
        college: data.college,
        role: data.role,
      });

      if (error) {
        console.error("REGISTER ERROR:", error);

        showToast(error, "error");
        return;
      }

      showToast(
        "تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتفعيل الحساب.",
        "success"
      );

      navigate("/auth/login", {
        replace: true,
      });
    } catch (error) {
      console.error("REGISTER ERROR:", error);

      showToast(
        "حدث خطأ أثناء إنشاء الحساب، حاول مرة أخرى",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-slate-100 px-4 py-8 md:py-12"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-3xl" />

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
          duration: 0.65,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative mx-auto w-full max-w-2xl"
      >
        <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-br from-brand-500/25 to-cyan-500/20 blur-2xl" />

        <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white p-5 shadow-2xl sm:p-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-cyan-400 to-brand-500" />

          {/* Header */}
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-[22px] bg-brand-500/30 blur-xl" />

              <div className="relative grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-brand-500 to-cyan-500 text-white shadow-xl">
                <Stethoscope className="h-8 w-8" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-slate-900">
              إنشاء حساب جديد
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              انضم إلى مجتمع{" "}
              <span className="font-bold text-brand-600">
                Med Core
              </span>
            </p>
          </div>

          {/* Security */}
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-black text-brand-900">
                حسابك أمانة
              </p>

              <p className="mt-1 text-[10px] leading-5 text-brand-700/70">
                استخدم بريدًا شخصيًا وكلمة مرور قوية ولا تشارك
                بيانات الدخول مع أي شخص.
              </p>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-5"
            noValidate
          >
            {/* Role */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">
                  نوع الحساب
                </label>

                {errors.role && (
                  <span className="text-[11px] font-bold text-red-500">
                    {errors.role}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <RoleOption
                  selected={values.role === "student"}
                  value="student"
                  label="طالب"
                  description="تعلم وتابع تقدمك"
                  icon={GraduationCap}
                  onClick={() =>
                    updateValue("role", "student")
                  }
                />

                <RoleOption
                  selected={values.role === "teacher"}
                  value="teacher"
                  label="معلم"
                  description="أنشئ وأدر كورساتك"
                  icon={Users}
                  onClick={() =>
                    updateValue("role", "teacher")
                  }
                />
              </div>
            </div>

            {/* Name */}
            <Input
              label="الاسم الكامل"
              className="bg-white"
              autoComplete="name"
              placeholder="أحمد محمد"
              value={values.fullName ?? ""}
              error={errors.fullName}
              onChange={(event) =>
                updateValue("fullName", event.target.value)
              }
            />

            {/* Email */}
            <Input
              label="البريد الإلكتروني"
              className="bg-white"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="example@medcore.app"
              value={values.email ?? ""}
              error={errors.email}
              onChange={(event) =>
                updateValue("email", event.target.value)
              }
            />

            {/* Phone */}
            <Input
              label="رقم الهاتف"
              className="bg-white"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01xxxxxxxxx"
              value={values.phone ?? ""}
              error={errors.phone}
              onChange={(event) =>
                updateValue("phone", event.target.value)
              }
            />

            {/* College */}
            <Select
              label="الكلية"
              value={values.college ?? "medicine"}
              error={errors.college}
              onChange={(event) =>
                updateValue("college", event.target.value)
              }
            >
              <option value="medicine">طب بشري</option>
              <option value="dentistry">طب أسنان</option>
              <option value="pharmacy">صيدلة</option>
            </Select>

            {/* Passwords */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Password */}
              <div>
                <div className="relative">
                  <Input
                    label="كلمة المرور"
                    className="bg-white"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    error={errors.password}
                    onChange={(event) =>
                      updateValue(
                        "password",
                        event.target.value
                      )
                    }
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
                      <span className="text-[10px] font-medium text-slate-400">
                        قوة كلمة المرور
                      </span>

                      <span
                        className={`text-[10px] font-black ${passwordStrength.textClass}`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: passwordStrength.width,
                        }}
                        className={`h-full rounded-full ${passwordStrength.barClass}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div className="relative">
                <Input
                  label="تأكيد كلمة المرور"
                  className="bg-white"
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  error={errors.confirmPassword}
                  onChange={(event) =>
                    updateValue(
                      "confirmPassword",
                      event.target.value
                    )
                  }
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
            </div>

            {/* Password requirements */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-black text-slate-700">
                <LockKeyhole className="h-4 w-4 text-brand-500" />
                متطلبات كلمة المرور
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                <PasswordRequirement
                  valid={password.length >= 8}
                  text="8 أحرف على الأقل"
                />

                <PasswordRequirement
                  valid={/[A-Z]/.test(password)}
                  text="حرف كبير واحد على الأقل"
                />

                <PasswordRequirement
                  valid={/[a-z]/.test(password)}
                  text="حرف صغير واحد على الأقل"
                />

                <PasswordRequirement
                  valid={/\d/.test(password)}
                  text="رقم واحد على الأقل"
                />

                <PasswordRequirement
                  valid={/[^A-Za-z0-9]/.test(password)}
                  text="رمز خاص مثل @ أو #"
                />

                <PasswordRequirement
                  valid={
                    password.length > 0 &&
                    password === confirmPassword
                  }
                  text="تطابق كلمة المرور"
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
              <UserPlus className="h-4 w-4" />

              <span>إنشاء الحساب</span>

              {!loading && (
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              )}
            </Button>
          </form>

          {/* Login */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[10px] font-bold text-slate-400">
              لديك حساب؟
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <Link
            to="/auth/login"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-black text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          >
            تسجيل الدخول
          </Link>

          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-400">
            <Mail className="h-3.5 w-3.5" />
            حساب آمن ومحمي
          </div>
        </div>
      </motion.div>
    </main>
  );
}

function RoleOption({
  selected,
  value,
  label,
  description,
  icon: Icon,
  onClick,
}: {
  selected: boolean;
  value: Role;
  label: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative overflow-hidden rounded-2xl border p-4 text-right transition-all duration-300 ${
        selected
          ? "border-brand-400 bg-brand-50 shadow-lg shadow-brand-100"
          : "border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
            selected
              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
              : "bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p
            className={`text-sm font-black ${
              selected
                ? "text-brand-900"
                : "text-slate-700"
            }`}
          >
            {label}
          </p>

          <p className="mt-1 text-[10px] leading-4 text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`mr-auto flex h-5 w-5 items-center justify-center rounded-full border ${
            selected
              ? "border-brand-500 bg-brand-500 text-white"
              : "border-slate-300"
          }`}
        >
          {selected && <Check className="h-3 w-3" />}
        </div>
      </div>
    </button>
  );
}

function PasswordRequirement({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-[10px] font-medium transition ${
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