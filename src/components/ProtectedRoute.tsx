import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types";
import { KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { session, profile, loading, deviceBlocked } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth/login" replace />;

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/app/home" replace />;
  }

  // قفل الجهاز يمنع الوصول للمحتوى المدفوع فقط (يُطبَّق داخل صفحات التعلم
  // نفسها بشكل صريح)، لكن هنا نعرض تنبيهًا عامًا إن كان محظورًا.
  if (deviceBlocked) {
    return <DeviceRecovery />;
  }

  return <>{children}</>;
}

function DeviceRecovery() {
  const { recoverDevice } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableAt, setAvailableAt] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError(null);
    setAvailableAt(null);

    const result = await recoverDevice(password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      setAvailableAt(result.availableAt ?? null);
      return;
    }

    setPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-800">
            الحساب مرتبط بجهاز آخر
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            لو هذا جهازك، أكّد كلمة مرور حسابك لنقل الربط إليه. يمكن نقل الجهاز
            ذاتيًا مرة واحدة كل 30 يومًا، وسيتم إشعارك عند إتمام النقل.
          </p>
        </div>

        <form className="space-y-4 text-right" onSubmit={handleSubmit}>
          <Input
            id="device-recovery-password"
            label="كلمة مرور الحساب للتأكيد"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <div className="space-y-1 text-sm text-red-600" role="alert">
              <p>{error}</p>
              {availableAt && (
                <p>
                  موعد إتاحة النقل التالي:{" "}
                  {new Intl.DateTimeFormat("ar-EG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(availableAt))}
                </p>
              )}
            </div>
          )}
          <Button type="submit" className="w-full" isLoading={loading}>
            <KeyRound className="h-4 w-4" />
            تأكيد ونقل الجهاز
          </Button>
        </form>
      </div>
    </div>
  );
}
