import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UploadCloud, CheckCircle2, Copy, Banknote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchCart, removeFromCart } from "@/services/cart";
import { uploadReceiptAndCreatePayment } from "@/services/payments";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { CartItem } from "@/types";
import { formatCurrency } from "@/utils/format";

const BANK_INFO = {
  bankName: "البنك الأهلي",
  accountName: "شركة Med Core التعليمية",
  accountNumber: "SA00 0000 0000 0000 0000 0000",
};

export default function CheckoutPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<CartItem | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!session?.user) return;
    fetchCart(session.user.id)
      .then(setItems)
      .catch(() => showToast("تعذّر تحميل بيانات السلة", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const copyAccount = () => {
    navigator.clipboard.writeText(BANK_INFO.accountNumber);
    showToast("تم نسخ رقم الحساب", "success");
  };

  const handleUpload = async () => {
    if (!activeItem || !file || !session?.user || !activeItem.course) return;
    setSubmitting(true);
    try {
      await uploadReceiptAndCreatePayment({
        studentId: session.user.id,
        courseId: activeItem.course.id,
        amount: activeItem.course.price,
        file,
      });
      await removeFromCart(activeItem.id);
      setSubmittedIds((prev) => [...prev, activeItem.id]);
      setItems((prev) => prev.filter((i) => i.id !== activeItem.id));
      showToast("تم إرسال طلب الدفع، بانتظار المراجعة", "success");
      setActiveItem(null);
      setFile(null);
    } catch {
      showToast("تعذّر رفع الإيصال، حاول مرة أخرى", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (items.length === 0 && submittedIds.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24">
        <EmptyState title="لا توجد كورسات لإتمام الدفع" action={<Link to="/courses"><Button>تصفّح الكورسات</Button></Link>} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-800">تم إرسال جميع طلبات الدفع</h2>
        <p className="mt-2 text-sm text-slate-500">سيقوم المعلم أو فريق الإدارة بمراجعة الإيصالات وتفعيل اشتراكك قريبًا.</p>
        <Link to="/app/student/payments" className="mt-5 inline-block">
          <Button>متابعة حالة الطلبات</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-extrabold text-brand-900">إتمام الدفع</h1>
      <p className="mt-2 text-sm text-slate-500">
        الدفع يتم يدويًا حاليًا. حوّل المبلغ إلى الحساب البنكي التالي، ثم ارفع صورة الإيصال لكل كورس على حدة.
      </p>

      <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
        <div className="flex items-center gap-2 text-brand-900 font-bold">
          <Banknote className="w-5 h-5" /> بيانات التحويل البنكي
        </div>
        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <p><span className="text-slate-400">البنك:</span> {BANK_INFO.bankName}</p>
          <p><span className="text-slate-400">اسم الحساب:</span> {BANK_INFO.accountName}</p>
          <button onClick={copyAccount} className="flex items-center gap-1 font-semibold text-brand-500">
            {BANK_INFO.accountNumber} <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
            <div>
              <p className="font-bold text-slate-800">{item.course?.title}</p>
              <p className="text-sm font-semibold text-brand-500">{formatCurrency(item.course?.price ?? 0)}</p>
            </div>
            <Button variant="secondary" onClick={() => setActiveItem(item)}>
              <UploadCloud className="w-4 h-4" /> رفع الإيصال
            </Button>
          </div>
        ))}
      </div>

      <Modal open={!!activeItem} onClose={() => setActiveItem(null)} title="رفع إيصال الدفع">
        <p className="text-sm text-slate-500 mb-4">
          كورس: <span className="font-semibold text-slate-700">{activeItem?.course?.title}</span>
        </p>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center hover:border-brand-300">
          <UploadCloud className="h-8 w-8 text-brand-400" />
          <span className="text-sm text-slate-500">{file ? file.name : "اضغط لاختيار صورة الإيصال (JPG/PNG/PDF)"}</span>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <Button className="mt-5 w-full" disabled={!file} isLoading={submitting} onClick={handleUpload}>
          إرسال طلب الدفع
        </Button>
      </Modal>
    </div>
  );
}
