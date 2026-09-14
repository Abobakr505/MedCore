import { useEffect, useState } from "react";
import { Settings, Save, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/contexts/ToastContext";
import { fetchPlatformSettings, updatePlatformSetting } from "@/services/admin";

export default function SettingsAdminPage() {
  const { showToast } = useToast();
  const [deviceLockEnabled, setDeviceLockEnabled] = useState(true);
  const [platformName, setPlatformName] = useState("Med Core");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlatformSettings().then((settings) => {
      const lock = settings.find((s: any) => s.key === "device_lock_enabled");
      const name = settings.find((s: any) => s.key === "platform_name");
      if (lock) setDeviceLockEnabled(lock.value === true || lock.value === "true");
      if (name) setPlatformName(typeof name.value === "string" ? name.value : "Med Core");
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePlatformSetting("device_lock_enabled", deviceLockEnabled);
      await updatePlatformSetting("platform_name", platformName);
      showToast("تم حفظ الإعدادات بنجاح", "success");
    } catch {
      showToast("تعذّر حفظ الإعدادات", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-brand-900">إعدادات المنصة</h1>

      <Card className="mt-6 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-2 font-bold text-slate-800"><ShieldCheck className="w-4 h-4 text-brand-500" /> قفل الجهاز (Device Lock)</p>
            <p className="mt-1 text-sm text-slate-500">تفعيل هذا الخيار يمنع تسجيل الدخول من أكثر من جهاز واحد نشط للمحتوى المدفوع.</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" checked={deviceLockEnabled} onChange={(e) => setDeviceLockEnabled(e.target.checked)} className="peer sr-only" />
            <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-brand-500 transition-colors after:absolute after:right-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:-translate-x-5" />
          </label>
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-medium text-slate-700">اسم المنصة</label>
          <input value={platformName} onChange={(e) => setPlatformName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30" />
        </div>

        <Button onClick={handleSave} isLoading={saving}><Save className="w-4 h-4" /> حفظ الإعدادات</Button>
      </Card>
    </div>
  );
}
