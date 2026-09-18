import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import {
  Save,
  User,
  Mail,
  Phone,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Loader2,
  LockKeyhole,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase, getPublicUrl } from "@/lib/supabase";
import { COLLEGE_LABELS } from "@/types";

interface ProfileFormValues {
  full_name: string;
  phone: string;
  college: string;
}

interface PasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
  } = useForm<ProfileFormValues>({
    defaultValues: {
      full_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      college: profile?.college ?? "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    watch,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  if (!profile) return null;

  const avatarUrl = getPublicUrl("avatars", profile.avatar_url);

  const newPassword = watch("newPassword");

  // =========================
  // Update Profile
  // =========================

  const onSubmit = async (values: ProfileFormValues) => {
    if (!profile?.id) return;

    setSaving(true);

    try {
      const profileUpdate: {
        full_name: string;
        phone: string | null;
        college: string | null;
      } = {
        full_name: values.full_name.trim(),
        phone: values.phone.trim() || null,
        college: values.college || null,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", profile.id);

      if (profileError) {
        console.error("PROFILE UPDATE ERROR:", {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
        });

        throw profileError;
      }

      await refreshProfile();

      showToast("تم تحديث بياناتك بنجاح", "success");
    } catch (error) {
      console.error("PROFILE SAVE FAILED:", error);

      showToast("تعذّر حفظ التعديلات، حاول مرة أخرى", "error");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // Upload Avatar
  // =========================

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("يرجى اختيار صورة صحيحة", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("حجم الصورة يجب ألا يتجاوز 5MB", "error");
      return;
    }

    setUploading(true);

    try {
      const ext =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const path = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: path,
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      await refreshProfile();

      showToast("تم تحديث الصورة الشخصية", "success");
    } catch (error) {
      console.error("AVATAR UPLOAD FAILED:", error);

      showToast("تعذّر رفع الصورة", "error");
    } finally {
      setUploading(false);
    }
  };

  // =========================
  // Change Password
  // =========================


const onChangePassword = async (
  values: PasswordFormValues
) => {
  // التحقق من كلمة المرور الجديدة
  if (!values.newPassword) {
    showToast("من فضلك أدخل كلمة المرور الجديدة", "error");
    return;
  }

  if (values.newPassword.length < 6) {
    showToast(
      "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل",
      "error"
    );
    return;
  }

  // التحقق من تأكيد كلمة المرور
  if (!values.confirmPassword) {
    showToast(
      "من فضلك أكد كلمة المرور الجديدة",
      "error"
    );
    return;
  }

  if (values.newPassword !== values.confirmPassword) {
    showToast(
      "كلمة المرور الجديدة وتأكيدها غير متطابقين",
      "error"
    );
    return;
  }

  setChangingPassword(true);

  try {
    const { error } = await supabase.auth.updateUser({
      password: values.newPassword,
    });

    if (error) {
      console.error("PASSWORD UPDATE ERROR:", {
        message: error.message,
        status: error.status,
        name: error.name,
        code: error.code,
      });

      // تحويل رسائل Supabase إلى رسائل عربية
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("same password") ||
        errorMessage.includes("different from the old password")
      ) {
        throw new Error(
          "كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية"
        );
      }

      if (
        errorMessage.includes("password should be at least") ||
        errorMessage.includes("password must be at least")
      ) {
        throw new Error(
          "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل"
        );
      }

      if (
        errorMessage.includes("weak password") ||
        errorMessage.includes("password is too weak")
      ) {
        throw new Error(
          "كلمة المرور ضعيفة، يرجى اختيار كلمة مرور أقوى"
        );
      }

      throw new Error(
        "تعذّر تغيير كلمة المرور، يرجى المحاولة مرة أخرى"
      );
    }

    // نجاح التغيير
    resetPasswordForm();

    setShowNewPassword(false);
    setShowConfirmPassword(false);

    showToast(
      "تم تغيير كلمة المرور بنجاح",
      "success"
    );
  } catch (error) {
    console.error("PASSWORD CHANGE FAILED:", error);

    showToast(
      error instanceof Error
        ? error.message
        : "تعذّر تغيير كلمة المرور، يرجى المحاولة مرة أخرى",
      "error"
    );
  } finally {
    setChangingPassword(false);
  }
};

{/* كلمة المرور الجديدة */}
<div className="rounded-2xl border border-slate-100 bg-white p-4 transition-colors focus-within:border-brand-200">
  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
    <KeyRound className="h-4 w-4 text-brand-500" />
    كلمة المرور الجديدة
  </div>

  <div className="relative">
    <Input
      {...registerPassword("newPassword", {
        required: "من فضلك أدخل كلمة المرور الجديدة",
        minLength: {
          value: 6,
          message:
            "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل",
        },
      })}
      type={showNewPassword ? "text" : "password"}
      dir="ltr"
      placeholder="••••••••"
      className="pl-11"
    />

    <button
      type="button"
      onClick={() =>
        setShowNewPassword((previous) => !previous)
      }
      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-brand-500"
      aria-label={
        showNewPassword
          ? "إخفاء كلمة المرور"
          : "إظهار كلمة المرور"
      }
    >
      {showNewPassword ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </button>
  </div>

  {passwordErrors.newPassword && (
    <p className="mt-2 text-xs font-semibold text-red-500">
      {passwordErrors.newPassword.message}
    </p>
  )}
</div>

{/* تأكيد كلمة المرور */}
<div className="rounded-2xl border border-slate-100 bg-white p-4 transition-colors focus-within:border-brand-200">
  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
    <LockKeyhole className="h-4 w-4 text-brand-500" />
    تأكيد كلمة المرور الجديدة
  </div>

  <div className="relative">
    <Input
      {...registerPassword("confirmPassword", {
        required: "من فضلك أكد كلمة المرور الجديدة",
        validate: (value) =>
          value === newPassword ||
          "كلمة المرور الجديدة وتأكيدها غير متطابقين",
      })}
      type={
        showConfirmPassword ? "text" : "password"
      }
      dir="ltr"
      placeholder="••••••••"
      className="pl-11"
    />

    <button
      type="button"
      onClick={() =>
        setShowConfirmPassword((previous) => !previous)
      }
      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-brand-500"
      aria-label={
        showConfirmPassword
          ? "إخفاء كلمة المرور"
          : "إظهار كلمة المرور"
      }
    >
      {showConfirmPassword ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </button>
  </div>

  {passwordErrors.confirmPassword && (
    <p className="mt-2 text-xs font-semibold text-red-500">
      {passwordErrors.confirmPassword.message}
    </p>
  )}
</div>


  // =========================
  // Initials
  // =========================

  const initials =
    profile.full_name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="mx-auto max-w-3xl pb-10">
      {/* =========================
          Header
      ========================= */}

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
            <User className="h-3.5 w-3.5" />
            حسابي
          </div>

          <h1 className="text-2xl font-extrabold text-brand-900 sm:text-3xl">
            الملف الشخصي
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            حدّث بياناتك الشخصية ومعلوماتك الأكاديمية من هنا.
          </p>
        </div>
      </motion.div>

      {/* =========================
          Profile Hero
      ========================= */}

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-500 p-0 text-white shadow-xl">
          {/* Decorative circles */}

          <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-white/5" />

          <div className="absolute -bottom-20 right-10 h-52 w-52 rounded-full bg-white/5" />

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              {/* Avatar */}

              <div className="relative shrink-0">
                <label
                  htmlFor="avatar-upload"
                  className="group relative block cursor-pointer"
                >
                  <div className="grid h-24 w-24 overflow-hidden rounded-full border-4 border-white/20 bg-white/10 text-3xl font-extrabold shadow-2xl sm:h-28 sm:w-28">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={profile.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="m-auto">
                        {initials}
                      </span>
                    )}

                    {/* Upload loading */}

                    {uploading && (
                      <div className="absolute inset-0 grid place-items-center bg-black/50">
                        <Loader2 className="h-7 w-7 animate-spin" />
                      </div>
                    )}

                    {/* Camera hover */}

                    {!uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur-sm">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                            <circle cx="12" cy="13" r="3" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        void handleAvatarUpload(file);
                      }

                      event.target.value = "";
                    }}
                  />
                </label>
              </div>

              {/* User info */}

              <div className="min-w-0 flex-1 text-center sm:text-right">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h2 className="truncate text-xl font-extrabold sm:text-2xl">
                    {profile.full_name}
                  </h2>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold text-emerald-100">
                    <ShieldCheck className="h-3 w-3" />
                    حساب نشط
                  </span>
                </div>

                <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/70 sm:justify-start">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email}
                </p>

                <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-white/80 sm:justify-start">
                  <GraduationCap className="h-4 w-4" />

                  {COLLEGE_LABELS[profile.college] ?? "طالب"}
                </div>
              </div>

              {/* Decorative */}

              <div className="hidden shrink-0 sm:block">
                <Sparkles className="h-10 w-10 text-white/20" />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* =========================
          Personal Information
      ========================= */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="mt-5 overflow-hidden p-0">
          {/* Section header */}

          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500">
                <User className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-extrabold text-slate-800">
                  المعلومات الشخصية
                </h3>

                <p className="mt-0.5 text-xs text-slate-400">
                  يمكنك تعديل بياناتك في أي وقت.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5 p-5 sm:p-6"
          >
            {/* Name */}

            <div className="rounded-2xl border border-slate-100 bg-white p-4 transition-colors focus-within:border-brand-200">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                <User className="h-4 w-4 text-brand-500" />
                الاسم الكامل
              </div>

              <Input
                {...register("full_name", {
                  required: true,
                })}
                placeholder="اكتب اسمك الكامل"
              />
            </div>

            {/* Phone */}

            <div className="rounded-2xl border border-slate-100 bg-white p-4 transition-colors focus-within:border-brand-200">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                <Phone className="h-4 w-4 text-brand-500" />
                رقم الهاتف
              </div>

              <Input
                {...register("phone")}
                type="tel"
                dir="ltr"
                placeholder="01xxxxxxxxx"
              />
            </div>

            {/* College */}

            <div className="rounded-2xl border border-slate-100 bg-white p-4 transition-colors focus-within:border-brand-200">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                <GraduationCap className="h-4 w-4 text-brand-500" />
                الكلية
              </div>

              <Select {...register("college")}>
                <option value="medicine">
                  طب بشري
                </option>

                <option value="dentistry">
                  طب أسنان
                </option>

                <option value="pharmacy">
                  صيدلة
                </option>
              </Select>
            </div>

            {/* Email */}

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                <Mail className="h-4 w-4 text-slate-400" />
                البريد الإلكتروني
              </div>

              <Input
                value={profile.email}
                disabled
                className="bg-white"
              />

              <p className="mt-2 text-[11px] text-slate-400">
                البريد الإلكتروني مرتبط بحسابك ولا يمكن تغييره
                من هنا.
              </p>
            </div>

            {/* Save */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-[11px] text-slate-400 sm:text-right">
                تأكد من صحة البيانات قبل الحفظ.
              </p>

              <Button
                type="submit"
                isLoading={saving}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4" />
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* =========================
          Change Password
      ========================= */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="mt-5 overflow-hidden p-0">
          {/* Section header */}

          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500">
                <LockKeyhole className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-extrabold text-slate-800">
                  تغيير كلمة المرور
                </h3>

                <p className="mt-0.5 text-xs text-slate-400">
                  قم بتحديث كلمة المرور الخاصة بحسابك.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handlePasswordSubmit(
              onChangePassword
            )}
            className="space-y-5 p-5 sm:p-6"
          >
            {/* New Password */}

            <div className="rounded-2xl border border-slate-100 bg-white p-4 transition-colors focus-within:border-brand-200">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                <KeyRound className="h-4 w-4 text-brand-500" />
                كلمة المرور الجديدة
              </div>

              <div className="relative">
                <Input
                  {...registerPassword("newPassword", {
                    required: "أدخل كلمة المرور الجديدة",
                    minLength: {
                      value: 6,
                      message:
                        "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
                    },
                  })}
                  type={
                    showNewPassword ? "text" : "password"
                  }
                  dir="ltr"
                  placeholder="••••••••"
                  className="pl-11"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowNewPassword(
                      (previous) => !previous
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-brand-500"
                  aria-label={
                    showNewPassword
                      ? "إخفاء كلمة المرور"
                      : "إظهار كلمة المرور"
                  }
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {passwordErrors.newPassword && (
                <p className="mt-2 text-xs font-semibold text-red-500">
                  {
                    passwordErrors.newPassword
                      .message
                  }
                </p>
              )}
            </div>

            {/* Confirm Password */}

            <div className="rounded-2xl border border-slate-100 bg-white p-4 transition-colors focus-within:border-brand-200">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                <LockKeyhole className="h-4 w-4 text-brand-500" />
                تأكيد كلمة المرور الجديدة
              </div>

              <div className="relative">
                <Input
                  {...registerPassword("confirmPassword", {
                    required:
                      "أكد كلمة المرور الجديدة",
                    validate: (value) =>
                      value === newPassword ||
                      "كلمتا المرور غير متطابقتين",
                  })}
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  dir="ltr"
                  placeholder="••••••••"
                  className="pl-11"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-brand-500"
                  aria-label={
                    showConfirmPassword
                      ? "إخفاء كلمة المرور"
                      : "إظهار كلمة المرور"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {passwordErrors.confirmPassword && (
                <p className="mt-2 text-xs font-semibold text-red-500">
                  {
                    passwordErrors.confirmPassword
                      .message
                  }
                </p>
              )}
            </div>

            {/* Security note */}

            <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600">
                <ShieldCheck className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-bold text-brand-900">
                  نصيحة أمنية
                </p>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  استخدم كلمة مرور قوية تحتوي على أحرف
                  وأرقام ورموز، ولا تشاركها مع أي شخص.
                </p>
              </div>
            </div>

            {/* Save password */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-[11px] text-slate-400 sm:text-right">
                سيتم تحديث كلمة المرور مباشرة بعد الحفظ.
              </p>

              <Button
                type="submit"
                isLoading={changingPassword}
                className="w-full sm:w-auto"
              >
                <LockKeyhole className="h-4 w-4" />
                تغيير كلمة المرور
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* =========================
          Account Info
      ========================= */}

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="mt-5 border-brand-100 bg-brand-50/40 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-600">
              <ShieldCheck className="h-4 w-4" />
            </div>

            <div>
              <p className="font-bold text-brand-900">
                حسابك محمي
              </p>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                بيانات حسابك محفوظة بأمان، ولا يمكن لأي
                مستخدم آخر الوصول إلى معلوماتك الشخصية أو
                تعديلها.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

