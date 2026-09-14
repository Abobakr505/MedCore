import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types";
import { Loader2 } from "lucide-react";

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
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <h2 className="text-xl font-bold text-slate-800">تم تسجيل الدخول من جهاز آخر</h2>
          <p className="text-slate-500 text-sm">
            حسابك مرتبط حاليًا بجهاز آخر نشط. لأسباب تتعلق بحماية اشتراكك، لا يمكن الوصول
            للمحتوى المدفوع من هذا الجهاز. تواصل مع الدعم الفني لإعادة تعيين الجهاز إذا كان هذا خطأً.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
