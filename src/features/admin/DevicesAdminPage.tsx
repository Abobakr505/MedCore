import { useEffect, useMemo, useState } from "react";
import {
  Smartphone,
  RotateCcw,
  Search,
  ShieldCheck,
  Clock3,
  Mail,
  UserRound,
  MonitorSmartphone,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { useToast } from "@/contexts/ToastContext";
import {
  fetchAllDevices,
  resetUserDevice,
} from "@/services/admin";

import type { UserDevice } from "@/types";
import { formatDateTime } from "@/utils/format";

export default function DevicesAdminPage() {
  const { showToast } = useToast();

  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<UserDevice | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);

    try {
      const data = await fetchAllDevices();
      setDevices(data);
    } catch {
      showToast("تعذّر تحميل الأجهزة", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleReset = async () => {
    if (!resetTarget) return;

    try {
      await resetUserDevice(resetTarget.user_id);

      showToast(
        "تم إعادة تعيين الجهاز، ويمكن للمستخدم الدخول من جهاز جديد",
        "success"
      );

      setResetTarget(null);
      load();
    } catch {
      showToast("تعذّرت إعادة تعيين الجهاز", "error");
    }
  };

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return devices;

    return devices.filter((device) => {
      const name = device.user?.full_name?.toLowerCase() || "";
      const email = device.user?.email?.toLowerCase() || "";
      const deviceName = device.device_name?.toLowerCase() || "";

      return (
        name.includes(query) ||
        email.includes(query) ||
        deviceName.includes(query)
      );
    });
  }, [devices, search]);

  const totalDevices = devices.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-20 right-10 h-44 w-44 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <MonitorSmartphone className="h-7 w-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  إدارة الأجهزة
                </h1>

                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                  {totalDevices} جهاز نشط
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                متابعة الأجهزة المرتبطة بحسابات المستخدمين. كل مستخدم يمكنه
                استخدام جهاز نشط واحد فقط في نفس الوقت.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                حالة حماية الأجهزة
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-slate-800">
                مفعّلة
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Stats */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <Card className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المستخدم أو البريد أو اسم الجهاز..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
          </div>
        </Card>

        <Card className="flex items-center gap-4 px-5 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Smartphone className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400">
              الأجهزة الحالية
            </p>
            <p className="text-xl font-extrabold text-slate-900">
              {devices.length}
            </p>
          </div>
        </Card>
      </div>

      {/* Devices */}
      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />

                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                  <Skeleton className="h-3 w-48" />
                </div>

                <Skeleton className="h-10 w-28 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredDevices.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={<Smartphone className="h-6 w-6" />}
            title={
              search
                ? "لا توجد أجهزة مطابقة للبحث"
                : "لا توجد أجهزة نشطة مسجّلة"
            }
          />

          {search && (
            <div className="flex justify-center pb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearch("")}
              >
                مسح البحث
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDevices.map((device) => (
            <Card
              key={device.id}
              className="group relative overflow-hidden p-0 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="absolute inset-y-0 right-0 w-1 bg-brand-500" />

              <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
                {/* User */}
                <div className="flex min-w-0 items-center gap-4">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-slate-100 text-brand-600 ring-1 ring-slate-200">
                    <UserRound className="h-5 w-5" />

                    <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-extrabold text-slate-800">
                        {device.user?.full_name || "مستخدم غير معروف"}
                      </p>

                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        نشط
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {device.user?.email || "لا يوجد بريد"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Device Info */}
                <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[430px]">
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                      <Smartphone className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-400">
                        الجهاز
                      </p>

                      <p className="truncate text-sm font-bold text-slate-700">
                        {device.device_name || "جهاز غير معروف"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                      <Clock3 className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-400">
                        آخر نشاط
                      </p>

                      <p className="truncate text-sm font-bold text-slate-700">
                        {formatDateTime(device.last_seen_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="shrink-0 border-t border-slate-100 pt-4 lg:border-0 lg:pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setResetTarget(device)}
                    className="w-full lg:w-auto"
                  >
                    <RotateCcw className="h-4 w-4" />
                    إعادة تعيين الجهاز
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!resetTarget}
        title="إعادة تعيين الجهاز"
        description={`سيتمكن ${
          resetTarget?.user?.full_name || "المستخدم"
        } من تسجيل الدخول من جهاز جديد بعد هذه العملية.`}
        confirmLabel="إعادة التعيين"
        onConfirm={handleReset}
        onCancel={() => setResetTarget(null)}
      />
    </div>
  );
}