import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  CheckCircle2,
  Copy,
  Banknote,
  Smartphone,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  ChevronLeft,
  FileCheck2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchCart, removeFromCart } from "@/services/cart";
import { uploadReceiptAndCreatePayment } from "@/services/payments";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { CartItem } from "@/types";
import { formatCurrency } from "@/utils/format";

/**
 * غيّر البيانات التالية فقط عند إضافة بيانات الدفع الحقيقية.
 */
const PAYMENT_INFO = {
  bank: {
    bankName: "البنك الأهلي",
    accountName: "شركة Med Core التعليمية",
    accountNumber: "0000000000000000",
  },

  vodafone: {
    number: "01000000000",
  },

  instapay: {
    username: "medcore@instapay",
    link: "https://ipn.eg/",
  },
};

type PaymentMethod = "bank" | "vodafone" | "instapay";

export default function CheckoutPage() {
  const { session } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeItem, setActiveItem] = useState<CartItem | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("vodafone");

  useEffect(() => {
    if (!session?.user) return;

    fetchCart(session.user.id)
      .then(setItems)
      .catch(() =>
        showToast("تعذّر تحميل بيانات السلة", "error")
      )
      .finally(() => setLoading(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (item.course?.price ?? 0),
        0
      ),
    [items]
  );

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message, "success");
    } catch {
      showToast("تعذّر النسخ", "error");
    }
  };

  const handleUpload = async () => {
    if (
      !activeItem ||
      !file ||
      !session?.user ||
      !activeItem.course
    ) {
      return;
    }

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

      setItems((prev) =>
        prev.filter((item) => item.id !== activeItem.id)
      );

      showToast(
        "تم إرسال طلب الدفع، بانتظار المراجعة",
        "success"
      );

      setActiveItem(null);
      setFile(null);
    } catch {
      showToast(
        "تعذّر رفع الإيصال، حاول مرة أخرى",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-48 rounded-xl bg-slate-200" />
          <div className="h-5 w-72 rounded-lg bg-slate-200" />
          <div className="h-32 rounded-3xl bg-slate-200" />
          <div className="h-48 rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (items.length === 0 && submittedIds.length === 0) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-xl px-4 py-24 sm:px-6"
      >
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title="لا توجد كورسات لإتمام الدفع"
          description="أضف كورسًا إلى سلتك أولًا"
          action={
            <Link to="/courses">
              <Button>
                تصفّح الكورسات
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>

        <h2 className="mt-6 text-2xl font-black text-slate-800">
          تم إرسال جميع طلبات الدفع
        </h2>

        <p className="mt-3 text-sm leading-7 text-slate-500">
          تم استلام إيصالات الدفع الخاصة بك.
          سيقوم المعلم أو فريق الإدارة بمراجعتها وتفعيل
          اشتراكك بعد التأكد من التحويل.
        </p>

        <Link
          to="/app/student/payments"
          className="mt-6 inline-block"
        >
          <Button>
            متابعة حالة الطلبات
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-[calc(100vh-80px)] bg-slate-50/60"
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <CreditCard className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-brand-950 sm:text-3xl">
                إتمام الدفع
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                اختر طريقة الدفع المناسبة ثم ارفع إيصال التحويل
              </p>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-black text-slate-800">
            طرق الدفع المتاحة
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Vodafone */}
            <button
              type="button"
              onClick={() => setPaymentMethod("vodafone")}
              className={`group rounded-3xl border p-5 text-right transition ${
                paymentMethod === "vodafone"
                  ? "border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-100"
                  : "border-slate-200 bg-white hover:border-brand-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <Smartphone className="h-6 w-6" />
                </div>

                {paymentMethod === "vodafone" && (
                  <CheckCircle2 className="h-5 w-5 text-brand-500" />
                )}
              </div>

              <h3 className="mt-4 font-black text-slate-800">
                Vodafone Cash
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                تحويل مباشر من محفظة فودافون كاش
              </p>
            </button>

            {/* InstaPay */}
            <button
              type="button"
              onClick={() => setPaymentMethod("instapay")}
              className={`group rounded-3xl border p-5 text-right transition ${
                paymentMethod === "instapay"
                  ? "border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-100"
                  : "border-slate-200 bg-white hover:border-brand-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                  <CreditCard className="h-6 w-6" />
                </div>

                {paymentMethod === "instapay" && (
                  <CheckCircle2 className="h-5 w-5 text-brand-500" />
                )}
              </div>

              <h3 className="mt-4 font-black text-slate-800">
                InstaPay
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                تحويل سريع باستخدام InstaPay
              </p>
            </button>

            {/* Bank */}
            <button
              type="button"
              onClick={() => setPaymentMethod("bank")}
              className={`group rounded-3xl border p-5 text-right transition ${
                paymentMethod === "bank"
                  ? "border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-100"
                  : "border-slate-200 bg-white hover:border-brand-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Banknote className="h-6 w-6" />
                </div>

                {paymentMethod === "bank" && (
                  <CheckCircle2 className="h-5 w-5 text-brand-500" />
                )}
              </div>

              <h3 className="mt-4 font-black text-slate-800">
                تحويل بنكي
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                تحويل مباشر إلى الحساب البنكي
              </p>
            </button>
          </div>
        </section>

        {/* Selected payment info */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-brand-600 to-brand-800 p-5 text-white">
            <div className="flex items-center gap-3">
              {paymentMethod === "bank" ? (
                <Banknote className="h-6 w-6" />
              ) : paymentMethod === "vodafone" ? (
                <Smartphone className="h-6 w-6" />
              ) : (
                <CreditCard className="h-6 w-6" />
              )}

              <div>
                <h2 className="font-black">
                  {paymentMethod === "bank"
                    ? "بيانات التحويل البنكي"
                    : paymentMethod === "vodafone"
                    ? "بيانات Vodafone Cash"
                    : "بيانات InstaPay"}
                </h2>

                <p className="mt-0.5 text-xs text-white/70">
                  حوّل المبلغ ثم احتفظ بصورة الإيصال
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {paymentMethod === "vodafone" && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-slate-400">
                    رقم Vodafone Cash
                  </p>

                  <p
                    dir="ltr"
                    className="mt-1 text-2xl font-black tracking-wide text-slate-800"
                  >
                    {PAYMENT_INFO.vodafone.number}
                  </p>
                </div>

                <Button
                  variant="secondary"
                  onClick={() =>
                    copyText(
                      PAYMENT_INFO.vodafone.number,
                      "تم نسخ رقم Vodafone Cash"
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                  نسخ الرقم
                </Button>
              </div>
            )}

            {paymentMethod === "instapay" && (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-slate-400">
                      InstaPay Address
                    </p>

                    <p
                      dir="ltr"
                      className="mt-1 text-xl font-black text-slate-800"
                    >
                      {PAYMENT_INFO.instapay.username}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        copyText(
                          PAYMENT_INFO.instapay.username,
                          "تم نسخ عنوان InstaPay"
                        )
                      }
                    >
                      <Copy className="h-4 w-4" />
                      نسخ
                    </Button>

                    <a
                      href={PAYMENT_INFO.instapay.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="secondary">
                        فتح InstaPay
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "bank" && (
              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">
                    البنك
                  </p>

                  <p className="mt-1 font-black text-slate-800">
                    {PAYMENT_INFO.bank.bankName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    اسم الحساب
                  </p>

                  <p className="mt-1 font-black text-slate-800">
                    {PAYMENT_INFO.bank.accountName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    رقم الحساب
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <p
                      dir="ltr"
                      className="font-black text-slate-800"
                    >
                      {PAYMENT_INFO.bank.accountNumber}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          PAYMENT_INFO.bank.accountNumber,
                          "تم نسخ رقم الحساب"
                        )
                      }
                      className="rounded-lg p-1.5 text-brand-500 hover:bg-brand-50"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Cart */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800">
                الكورسات المطلوبة
              </h2>

              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
                {items.length} كورس
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-800">
                      {item.course?.title}
                    </p>

                    <p className="mt-1 text-sm font-bold text-brand-600">
                      {formatCurrency(item.course?.price ?? 0)}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => setActiveItem(item)}
                  >
                    <UploadCloud className="h-4 w-4" />
                    رفع الإيصال
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              إجمالي الطلب
            </p>

            <p className="mt-2 text-3xl font-black text-brand-700">
              {formatCurrency(total)}
            </p>

            <div className="my-5 h-px bg-slate-100" />

            <div className="flex items-center gap-2 text-xs leading-5 text-slate-400">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              سيتم مراجعة الإيصال يدويًا قبل تفعيل الكورس.
            </div>
          </div>
        </section>

        {/* Upload Modal */}
        <Modal
          open={!!activeItem}
          onClose={() => {
            if (!submitting) {
              setActiveItem(null);
              setFile(null);
            }
          }}
          title="رفع إيصال الدفع"
        >
          <div dir="rtl">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">
                الكورس
              </p>

              <p className="mt-1 font-black text-slate-800">
                {activeItem?.course?.title}
              </p>

              <p className="mt-1 text-sm font-bold text-brand-600">
                {formatCurrency(
                  activeItem?.course?.price ?? 0
                )}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-brand-800">
                <FileCheck2 className="h-4 w-4" />
                طريقة الدفع
              </div>

              <p className="mt-1 text-sm text-brand-700">
                {paymentMethod === "vodafone"
                  ? "Vodafone Cash"
                  : paymentMethod === "instapay"
                  ? "InstaPay"
                  : "تحويل بنكي"}
              </p>
            </div>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-brand-300 hover:bg-brand-50/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                <UploadCloud className="h-7 w-7" />
              </div>

              <div>
                <p className="font-bold text-slate-700">
                  {file
                    ? file.name
                    : "اختر صورة إيصال الدفع"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  JPG / PNG / PDF
                </p>
              </div>

              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(event) => {
                  setFile(
                    event.target.files?.[0] ?? null
                  );
                }}
              />
            </label>

            <Button
              className="mt-5 w-full"
              disabled={!file}
              isLoading={submitting}
              onClick={handleUpload}
            >
              إرسال طلب الدفع
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
