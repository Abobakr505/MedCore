import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trash2,
  ShoppingCart,
  ArrowLeft,
  BookOpen,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchCart, removeFromCart } from "@/services/cart";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { CartItem } from "@/types";
import { formatCurrency } from "@/utils/format";
import { getPublicUrl } from "@/lib/supabase";

export default function CartPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = async () => {
    if (!session?.user) return;

    setLoading(true);

    try {
      setItems(await fetchCart(session.user.id));
    } catch {
      showToast("تعذّر تحميل السلة", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const handleRemove = async (id: string) => {
    setRemovingId(id);

    try {
      await removeFromCart(id);

      setItems((prev) => prev.filter((item) => item.id !== id));

      showToast("تم حذف الكورس من السلة", "success");
    } catch {
      showToast("تعذّر حذف الكورس", "error");
    } finally {
      setRemovingId(null);
    }
  };

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (item.course?.price ?? 0),
        0
      ),
    [items]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="space-y-3">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-5 w-72 rounded-lg" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-28 w-full rounded-2xl"
              />
            ))}
          </div>

          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-[calc(100vh-80px)] bg-slate-50/60"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <ShoppingCart className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-brand-950 sm:text-3xl">
                سلة الكورسات
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                راجع الكورسات التي اخترتها قبل إتمام عملية الشراء
              </p>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <EmptyState
              icon={<ShoppingCart className="h-6 w-6" />}
              title="سلتك فارغة حاليًا"
              description="تصفّح الكورسات المتاحة واختر الكورسات المناسبة لك"
              action={
                <Link to="/courses">
                  <Button>
                    <BookOpen className="h-4 w-4" />
                    تصفّح الكورسات
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
            {/* Courses */}
            <div className="space-y-4">
              {items.map((item, index) => {
                const thumb = getPublicUrl(
                  "course-thumbnails",
                  item.course?.thumbnail_path ?? null
                );

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-200 hover:shadow-md sm:p-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Image */}
                      <div className="h-24 w-28 shrink-0 overflow-hidden rounded-2xl bg-brand-50 sm:h-28 sm:w-40">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={item.course?.title ?? "كورس"}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-brand-300">
                            <BookOpen className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-600">
                            كورس
                          </span>
                        </div>

                        <h2 className="line-clamp-2 text-sm font-extrabold leading-6 text-slate-800 sm:text-base">
                          {item.course?.title}
                        </h2>

                        <p className="mt-1 text-base font-black text-brand-600">
                          {formatCurrency(item.course?.price ?? 0)}
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        disabled={removingId === item.id}
                        aria-label="حذف الكورس"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                    <CreditCard className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm text-white/70">
                      ملخص الطلب
                    </p>
                    <h2 className="font-black">
                      جاهز لإتمام الشراء؟
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    عدد الكورسات
                  </span>

                  <span className="font-bold text-slate-800">
                    {items.length}
                  </span>
                </div>

                <div className="my-5 h-px bg-slate-100" />

                <div className="flex items-end justify-between">
                  <span className="font-bold text-slate-600">
                    الإجمالي
                  </span>

                  <span className="text-2xl font-black text-brand-700">
                    {formatCurrency(total)}
                  </span>
                </div>

                <Button
                  size="lg"
                  className="mt-6 w-full"
                  onClick={() => navigate("/app/checkout")}
                >
                  متابعة الدفع
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  عملية دفع آمنة ومراجعة يدوية للإيصال
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

