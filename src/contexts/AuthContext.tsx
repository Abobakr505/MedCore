import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, getDeviceIdentifier, getDeviceName } from "@/lib/supabase";
import type { Profile, CollegeType, UserRole } from "@/types";

interface DeviceCheckResult {
  allowed: boolean;
  reason: string;
}

type SignInBlockReason = "pending_verification" | "suspended" | "rate_limited";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  deviceBlocked: boolean;
  signUp: (params: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    college: CollegeType;
    role: Extract<UserRole, "student" | "teacher">;
  }) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; reason?: SignInBlockReason; retryAfterSeconds?: number }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// رابط الـ Edge Function الخاص بتسجيل الدخول المحمي بـ Rate Limiting
const LOGIN_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login-with-rate-limit`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceBlocked, setDeviceBlocked] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) {
      setProfile(data as Profile);
      return data as Profile;
    }
    return null;
  }, []);

  const checkDevice = useCallback(async () => {
    const { data, error } = await supabase.rpc("check_or_register_device", {
      p_device_identifier: getDeviceIdentifier(),
      p_device_name: getDeviceName(),
    });
    if (!error && data) {
      const result = data as unknown as DeviceCheckResult;
      setDeviceBlocked(!result.allowed);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
        await checkDevice();
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await loadProfile(newSession.user.id);
        await checkDevice();
      } else {
        setProfile(null);
        setDeviceBlocked(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile, checkDevice]);

  const signUp: AuthContextValue["signUp"] = async ({
    fullName,
    email,
    password,
    phone,
    college,
    role,
  }) => {
    try {
      if (!fullName.trim()) {
        return { error: "من فضلك أدخل الاسم الثلاثي" };
      }

      if (!email.trim()) {
        return { error: "من فضلك أدخل البريد الإلكتروني" };
      }

      if (password.length < 6) {
        return { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
      }

      if (!phone.trim()) {
        return { error: "من فضلك أدخل رقم الهاتف" };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            college,
            role,
            // يُستخدم بواسطة الـ trigger في قاعدة البيانات (handle_new_user)
            // ليحدد حالة الحساب الابتدائية: المعلم يبقى pending_verification
            // والطالب يبقى active مباشرة.
            status: role === "teacher" ? "pending_verification" : "active",
          },
        },
      });

      if (error) {
        return {
          error: translateAuthError(error.message),
        };
      }

      return { error: null };
    } catch (err) {
      console.error("SIGNUP EXCEPTION:", err);

      return {
        error: "حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مرة أخرى",
      };
    }
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    // بدل ما ننادي supabase.auth.signInWithPassword مباشرة، بننادي الـ Edge Function
    // اللي بتتحقق من عدد المحاولات الفاشلة (بالـ IP وبالإيميل) قبل ما تسمح بمحاولة جديدة
    let response: Response;
    try {
      response = await fetch(LOGIN_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
    } catch (err) {
      console.error("LOGIN NETWORK ERROR:", err);
      return { error: "تعذر الاتصال بالخادم، تحقق من اتصالك بالإنترنت" };
    }

    const result = await response.json();

    if (!response.ok) {
      if (result.error === "rate_limited") {
        return {
          error: result.message,
          reason: "rate_limited",
          retryAfterSeconds: result.retry_after_seconds,
        };
      }
      return { error: result.message || "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى" };
    }

    // الدخول نجح على مستوى الـ Edge Function، دلوقتي نحط الـ session في عميل Supabase المحلي
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });

    if (setSessionError) {
      console.error("SET SESSION ERROR:", setSessionError);
      return { error: "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى" };
    }

    // نجيب البروفايل عشان نتأكد من حالة الحساب قبل ما نسمح بالدخول
    const userProfile = await loadProfile(result.user.id);

    if (userProfile?.status === "pending_verification") {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      return {
        error:
          "حسابك كمعلم لسه قيد المراجعة من الإدارة. هيتم إشعارك بمجرد الموافقة عليه.",
        reason: "pending_verification",
      };
    }

    if (userProfile?.status === "suspended") {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      return {
        error: "تم إيقاف هذا الحساب. تواصل مع الإدارة لمزيد من التفاصيل.",
        reason: "suspended",
      };
    }

    await checkDevice();

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, deviceBlocked, signUp, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth يجب أن يُستخدم داخل AuthProvider");
  return ctx;
}

function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    "User already registered": "هذا البريد الإلكتروني مسجّل بالفعل",
    "Email not confirmed": "يرجى تفعيل بريدك الإلكتروني أولاً من الرابط المُرسل إليك",
    "Password should be at least 6 characters": "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  };
  return map[message] || "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى";
}