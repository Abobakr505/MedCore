import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
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
    try {
      await removeFromCart(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast("تم حذف الكورس من السلة", "success");
    } catch {
      showToast("تعذّر حذف الكورس", "error");
    }
  };

  const total = items.reduce((sum, i) => sum + (i.course?.price ?? 0), 0);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-extrabold text-brand-900">سلة الكورسات</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-6 h-6" />}
          title="سلتك فارغة حاليًا"
          description="تصفّح الكورسات وأضف ما يناسبك"
          action={<Link to="/courses"><Button>تصفّح الكورسات</Button></Link>}
        />
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            {items.map((item) => {
              const thumb = getPublicUrl("course-thumbnails", item.course?.thumbnail_path ?? null);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4"
                >
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-100">
                    {thumb && <img src={thumb} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-bold text-slate-800">{item.course?.title}</p>
                    <p className="text-sm font-semibold text-brand-500">{formatCurrency(item.course?.price ?? 0)}</p>
                  </div>
                  <button onClick={() => handleRemove(item.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-50">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              );
            })}
          </div>

          <div className="h-fit rounded-2xl border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800">ملخص الطلب</h3>
            <div className="mt-4 flex justify-between text-sm text-slate-500">
              <span>عدد الكورسات</span> <span>{items.length}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-3 font-bold text-brand-900">
              <span>الإجمالي</span> <span>{formatCurrency(total)}</span>
            </div>
            <Button className="mt-5 w-full" size="lg" onClick={() => navigate("/app/checkout")}>
              إتمام الشراء <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
