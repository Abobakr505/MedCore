import { useEffect, useState } from "react";
import { Smartphone, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { fetchAllDevices, resetUserDevice } from "@/services/admin";
import type { UserDevice } from "@/types";
import { formatDateTime } from "@/utils/format";

export default function DevicesAdminPage() {
  const { showToast } = useToast();
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<UserDevice | null>(null);

  const load = async () => {
    setLoading(true);
    setDevices(await fetchAllDevices());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleReset = async () => {
    if (!resetTarget) return;
    try {
      await resetUserDevice(resetTarget.user_id);
      showToast("تم إعادة تعيين الجهاز، يمكن للمستخدم الدخول من جهاز جديد", "success");
      setResetTarget(null);
      load();
    } catch {
      showToast("تعذّرت العملية", "error");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-brand-900">إدارة الأجهزة</h1>
      <p className="mt-1 text-sm text-slate-500">كل مستخدم مرتبط بجهاز نشط واحد فقط. أعد تعيين الجهاز إذا احتاج المستخدم الدخول من جهاز جديد.</p>

      <div className="mt-6 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : devices.length === 0 ? (
          <EmptyState icon={<Smartphone className="w-6 h-6" />} title="لا توجد أجهزة نشطة مسجّلة" />
        ) : (
          devices.map((d) => (
            <Card key={d.id} className="flex items-center justify-between p-5">
              <div>
                <p className="font-bold text-slate-800">{d.user?.full_name}</p>
                <p className="text-xs text-slate-400">{d.user?.email} · {d.device_name}</p>
                <p className="text-xs text-slate-400">آخر نشاط: {formatDateTime(d.last_seen_at)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setResetTarget(d)}>
                <RotateCcw className="w-3.5 h-3.5" /> إعادة تعيين
              </Button>
            </Card>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!resetTarget}
        title="إعادة تعيين الجهاز"
        description={`سيتمكن ${resetTarget?.user?.full_name} من تسجيل الدخول من جهاز جديد بعد هذه العملية.`}
        confirmLabel="إعادة التعيين"
        onConfirm={handleReset}
        onCancel={() => setResetTarget(null)}
      />
    </div>
  );
}
