import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/** نفس اسم الحدث القديم عشان أي كود موجود بيعمل dispatch يفضل شغال */
export const CART_EVENT = "cart-updated";

const CACHE_KEY = "medcore-cart-count";

interface CartCache {
  userId: string;
  count: number;
}

function readCache(): CartCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.userId === "string" && typeof parsed?.count === "number") {
      return parsed as CartCache;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(userId: string, count: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, count }));
  } catch {
    /* ignore */
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** استدعيها بعد أي إضافة/حذف للسلة لو مش بتستخدم useCart().adjust */
export function notifyCartUpdated() {
  window.dispatchEvent(new Event(CART_EVENT));
}

interface CartContextValue {
  count: number;
  refresh: () => Promise<void>;
  setCount: (count: number) => void;
  /** تعديل فوري (متفائل) مثل adjust(1) عند الإضافة و adjust(-1) عند الحذف */
  adjust: (delta: number) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();

  const userId = session?.user?.id;
  const role = profile?.role;

  // الدور لسه ما اتحمّلش؟ نبدأ الجلب فورًا بدل ما نستنى الـ profile
  const mayHaveCart = !role || role === "student";

  // القيمة المخزّنة بتظهر فورًا قبل أي طلب شبكة
  const [count, setCountState] = useState<number>(() => readCache()?.count ?? 0);

  const countRef = useRef(count);
  const userIdRef = useRef<string | undefined>(userId);
  const prevUserRef = useRef<string | undefined>(userId);
  const requestRef = useRef(0);

  userIdRef.current = userId;

  const commit = useCallback((next: number, persist = true) => {
    const value = Math.max(0, next);
    countRef.current = value;
    setCountState(value);

    const uid = userIdRef.current;
    if (persist && uid) writeCache(uid, value);
  }, []);

  const refresh = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;

    const requestId = ++requestRef.current;

    // count فقط (head) — بدل تحميل السلة كاملة مع join
    const { count: total, error } = await supabase
      .from("cart_items")
      .select("id", { count: "exact", head: true })
      .eq("student_id", uid);

    // تجاهل الردود القديمة أو لو المستخدم اتغيّر
    if (requestId !== requestRef.current || userIdRef.current !== uid) return;

    if (error) {
      console.error("CART COUNT ERROR:", error);
      return; // نحتفظ بآخر رقم معروف بدل ما نصفّره
    }

    commit(total ?? 0);
  }, [commit]);

  const adjust = useCallback(
    (delta: number) => commit(countRef.current + delta),
    [commit]
  );

  // تسجيل خروج / تغيير حساب → امسح الكاش
  useEffect(() => {
    const prev = prevUserRef.current;
    prevUserRef.current = userId;

    const cached = readCache();
    const switchedOrSignedOut = !!prev && prev !== userId;
    const foreignCache = !!userId && !!cached && cached.userId !== userId;

    if (switchedOrSignedOut || foreignCache) {
      clearCache();
      commit(0, false);
    }
  }, [userId, commit]);

  // جلب العدد + تحديثات لحظية
  useEffect(() => {
    if (!userId) return;

    if (!mayHaveCart) {
      commit(0, false);
      return;
    }

    void refresh();

    const onUpdate = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener(CART_EVENT, onUpdate);
    document.addEventListener("visibilitychange", onVisible);

    // Realtime (اختياري: لو مفعّل على جدول cart_items)
    const channel = supabase
      .channel(`cart-count-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `student_id=eq.${userId}`,
        },
        onUpdate
      )
      .subscribe();

    return () => {
      window.removeEventListener(CART_EVENT, onUpdate);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [userId, mayHaveCart, refresh, commit]);

  const value = useMemo<CartContextValue>(
    () => ({ count, refresh, setCount: commit, adjust }),
    [count, refresh, commit, adjust]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}