import { useState } from "react";
import { useForm } from "react-hook-form";
import { Camera, Save } from "lucide-react";
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

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit } = useForm<ProfileFormValues>({
    defaultValues: {
      full_name: profile?.full_name,
      phone: profile?.phone ?? "",
      college: profile?.college,
    },
  });

  if (!profile) return null;

  const avatarUrl = getPublicUrl("avatars", profile.avatar_url);

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: values.full_name, phone: values.phone, college: values.college })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      showToast("تعذّر حفظ التعديلات", "error");
      return;
    }
    await refreshProfile();
    showToast("تم تحديث بياناتك بنجاح", "success");
  };

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", profile.id);
      if (updateError) throw updateError;
      await refreshProfile();
      showToast("تم تحديث الصورة الشخصية", "success");
    } catch {
      showToast("تعذّر رفع الصورة", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-brand-900">الملف الشخصي</h1>

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-brand-100 text-2xl font-bold text-brand-500">
              {avatarUrl ? <img src={avatarUrl} className="h-full w-full object-cover" /> : profile.full_name.charAt(0)}
            </div>
            <label className="absolute -bottom-1 -left-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-brand-500 text-white shadow-md">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} disabled={uploading} />
            </label>
          </div>
          <div>
            <p className="font-bold text-slate-800">{profile.full_name}</p>
            <p className="text-sm text-slate-400">{profile.email}</p>
            <p className="mt-1 text-xs font-semibold text-brand-500">{COLLEGE_LABELS[profile.college]}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input label="الاسم الكامل" {...register("full_name")} />
          <Input label="رقم الهاتف" {...register("phone")} />
          <Select label="الكلية" {...register("college")}>
            <option value="medicine">طب بشري</option>
            <option value="dentistry">طب أسنان</option>
            <option value="pharmacy">صيدلة</option>
          </Select>
          <Input label="البريد الإلكتروني" value={profile.email} disabled />
          <Button type="submit" isLoading={saving}><Save className="w-4 h-4" /> حفظ التعديلات</Button>
        </form>
      </Card>
    </div>
  );
}
