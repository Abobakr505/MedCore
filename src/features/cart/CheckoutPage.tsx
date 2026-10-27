import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  CheckCircle2,
  Copy,
  Smartphone,
  CreditCard,
  ShieldCheck,
  ChevronLeft,
  FileCheck2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchCart, removeFromCart } from "@/services/cart";
import {
  prepareReceiptFile,
  uploadFirstInstallmentAndCreatePlan,
  uploadReceiptAndCreatePayment,
} from "@/services/payments";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { CartItem } from "@/types";
import { formatCurrency } from "@/utils/format";

/**
 * بيانات الدفع الثابتة (Etisalat Cash / InstaPay).
 * غيّر القيم دي براحتك.
 */
const PAYMENT_INFO = {
  etisalat: {
    number: "01120262955", // رقم Etisalat Cash
  },
  instapay: {
    number: "01276184900", // رقم InstaPay
  },
};

/** الحد الأقصى للملف قبل الضغط (الصور بتتضغط تلقائيًا قبل الرفع) */
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

type PaymentMethod = "etisalat" | "instapay";
type PurchaseMode = "full" | "installment";

/** تحويل أخطاء Supabase/الشبكة لرسالة عربية مفهومة */
function getUploadErrorMessage(error: unknown): string {
  const raw =
    (error as { message?: string })?.message ??
    (typeof error === "string" ? error : "");
  const msg = raw.toLowerCase();

  if (msg.includes("invalid key")) {
    return "تعذّر رفع الإيصال: اسم الملف غير صالح، جرّب صورة أخرى";
  }
  if (msg.includes("mime type") || msg.includes("not supported")) {
    return "نوع الملف غير مدعوم، ارفع صورة JPG أو PNG أو ملف PDF";
  }
  if (msg.includes("exceeded") || msg.includes("too large") || msg.includes("payload")) {
    return "حجم الملف كبير جدًا، جرّب صورة أصغر";
  }
  if (msg.includes("row-level security") || msg.includes("jwt") || msg.includes("not authenticated")) {
    return "انتهت الجلسة أو لا تملك صلاحية، سجّل الخروج ثم الدخول وحاول مرة أخرى";
  }
  if (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed")
  ) {
    return "مشكلة في الاتصال بالإنترنت، تأكد من الشبكة وحاول مرة أخرى";
  }
  if (msg.includes("duplicate") || msg.includes("already exists")) {
    return "يوجد طلب دفع سابق لهذا الكورس، راجع حالة طلباتك";
  }

  return raw
    ? `تعذّر رفع الإيصال (${raw})`
    : "تعذّر رفع الإيصال، حاول مرة أخرى";
}

export default function CheckoutPage() {
  const { session } = useAuth();
  const { showToast } = useToast();

  // =========================
  // State
  // =========================

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<CartItem | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("full");
  const [submitting, setSubmitting] = useState(false);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("etisalat");

  // بيتغير مع كل فتح للمودال عشان الـ input يتصفّر
  const [inputKey, setInputKey] = useState(0);

  // =========================
  // Load Cart
  // =========================

  useEffect(() => {
    if (!session?.user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetchCart(session.user.id)
      .then((cart) => {
        setItems(cart);
      })
      .catch((error) => {
        console.error("FETCH CART ERROR:", error);
        showToast("تعذّر تحميل بيانات السلة", "error");
      })
      .finally(() => {
        setLoading(false);
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // =========================
  // Total
  // =========================

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.course?.price ?? 0), 0),
    [items]
  );

  // =========================
  // Copy Helper
  // =========================

  const copyText = async (text: string, message: string) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      showToast(message, "success");
    } catch (error) {
      console.error("COPY ERROR:", error);
      showToast("تعذر نسخ البيانات", "error");
    }
  };

  // =========================
  // Modal helpers
  // =========================

  const resetModal = () => {
    setActiveItem(null);
    setFile(null);
    setPurchaseMode("full");
    setInputKey((k) => k + 1);
  };

  const openUpload = (item: CartItem, mode: PurchaseMode) => {
    setActiveItem(item);
    setFile(null);
    setPurchaseMode(mode);
    setInputKey((k) => k + 1);
  };

  // =========================
  // File selection (validation)
  // =========================

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;

    // نصفّر الـ input عشان نقدر نختار نفس الملف تاني
    event.target.value = "";

    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      showToast("حجم الملف كبير، الحد الأقصى 15 ميجا", "error");
      return;
    }

    // بعض الأجهزة بترجّع type فاضي، فبنسمح بيه ونعتمد على الامتداد/الضغط
    if (selected.type && !ALLOWED_TYPES.includes(selected.type.toLowerCase())) {
      showToast("نوع الملف غير مدعوم، ارفع صورة أو PDF", "error");
      return;
    }

    setFile(selected);
  };

  // =========================
  // Handle Upload
  // =========================

  const handleUpload = async () => {
    if (submitting) return;

    if (!activeItem || !file || !session?.user || !activeItem.course) {
      return;
    }

    setSubmitting(true);

    const course = activeItem.course;
    const itemId = activeItem.id;

    try {
      // ضغط الصورة قبل الرفع (لو فشل بنكمل بالأصلي)
      const preparedFile = await prepareReceiptFile(file);

      if (
        purchaseMode === "installment" &&
        course.is_installment &&
        course.installment_amount
      ) {
        // =========================
        // Installment
        // =========================
        await uploadFirstInstallmentAndCreatePlan({
          studentId: session.user.id,
          courseId: course.id,
          amount: course.installment_amount,
          file: preparedFile,
        });
      } else {
        // =========================
        // Full Payment
        // =========================
        await uploadReceiptAndCreatePayment({
          studentId: session.user.id,
          courseId: course.id,
          amount: course.price,
          file: preparedFile,
        });
      }
    } catch (error) {
      console.error("PAYMENT UPLOAD ERROR:", error);
      showToast(getUploadErrorMessage(error), "error");
      setSubmitting(false);
      return;
    }

    // =========================
    // الدفع نجح: من هنا أي فشل مش بيعتبر فشل رفع
    // =========================

    try {
      await removeFromCart(itemId);
    } catch (error) {
      console.error("REMOVE FROM CART ERROR:", error);
    }

    setSubmittedIds((prev) => [...prev, itemId]);
    setItems((prev) => prev.filter((item) => item.id !== itemId));

    showToast("تم إرسال طلب الدفع، بانتظار المراجعة", "success");

    resetModal();
    setSubmitting(false);
  };

  // =========================
  // Loading
  // =========================

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

  // =========================
  // Empty Cart
  // =========================

  if (items.length === 0 && submittedIds.length === 0) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl px-4 py-24 sm:px-6">
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title="لا توجد كورسات لإتمام الدفع"
          description="أضف كورسًا إلى سلتك أولًا"
          action={
            <Link to="/courses">
              <Button>تصفّح الكورسات</Button>
            </Link>
          }
        />
      </div>
    );
  }

  // =========================
  // All Submitted
  // =========================

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
          تم استلام إيصالات الدفع الخاصة بك. سيقوم المعلم أو فريق الإدارة
          بمراجعتها وتفعيل اشتراكك بعد التأكد من التحويل.
        </p>

        <Link to="/app/student/payments" className="mt-6 inline-block">
          <Button>
            متابعة حالة الطلبات
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  // =========================
  // Derived (modal)
  // =========================

  const activeCourse = activeItem?.course;
  const activeCanInstallment = Boolean(
    activeCourse?.is_installment &&
      activeCourse.installment_amount &&
      activeCourse.installment_months
  );

  const paymentNumber =
    paymentMethod === "etisalat"
      ? PAYMENT_INFO.etisalat.number
      : PAYMENT_INFO.instapay.number;

  const paymentLabel =
    paymentMethod === "etisalat" ? "Etisalat Cash" : "InstaPay";

  // =========================
  // Main
  // =========================

  return (
    <div dir="rtl" className="min-h-[calc(100vh-80px)] bg-slate-50/60">
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

        {/* Payment Methods */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-black text-slate-800">
            طرق الدفع المتاحة
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Etisalat Cash */}
            <button
              type="button"
              onClick={() => setPaymentMethod("etisalat")}
              className={`group rounded-3xl border p-5 text-right transition ${
                paymentMethod === "etisalat"
                  ? "border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-100"
                  : "border-slate-200 bg-white hover:border-brand-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
                  <Smartphone className="h-6 w-6" />
                </div>

                {paymentMethod === "etisalat" && (
                  <CheckCircle2 className="h-5 w-5 text-brand-500" />
                )}
              </div>

              <h3 className="mt-4 font-black text-slate-800">Etisalat Cash</h3>

              <p className="mt-1 text-xs text-slate-500">
                تحويل مباشر من محفظة Etisalat Cash
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

              <h3 className="mt-4 font-black text-slate-800">InstaPay</h3>

              <p className="mt-1 text-xs text-slate-500">
                تحويل سريع باستخدام InstaPay
              </p>
            </button>
          </div>
        </section>

        {/* Selected Payment Info */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-brand-600 to-brand-800 p-5 text-white">
            <div className="flex items-center gap-3">
              {paymentMethod === "etisalat" ? (
                <Smartphone className="h-6 w-6" />
              ) : (
                <CreditCard className="h-6 w-6" />
              )}

              <div>
                <h2 className="font-black">بيانات {paymentLabel}</h2>

                <p className="mt-0.5 text-xs text-white/70">
                  حوّل المبلغ ثم احتفظ بصورة الإيصال
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-400">رقم {paymentLabel}</p>

                <p
                  dir="ltr"
                  className="mt-1 text-2xl font-black tracking-wide text-slate-800"
                >
                  {paymentNumber}
                </p>
              </div>

              <Button
                variant="secondary"
                onClick={() =>
                  copyText(paymentNumber, `تم نسخ رقم ${paymentLabel}`)
                }
              >
                <Copy className="h-4 w-4" />
                نسخ الرقم
              </Button>
            </div>
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
              {items.map((item) => {
                const course = item.course;

                const canInstallment = Boolean(
                  course?.is_installment &&
                    course.installment_amount &&
                    course.installment_months
                );

                const installmentAmount = course?.installment_amount ?? 0;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-800">
                        {course?.title}
                      </p>

                      <p className="mt-1 text-sm font-bold text-brand-600">
                        {formatCurrency(course?.price ?? 0)}
                      </p>

                      {course?.is_installment && !canInstallment && (
                        <p className="mt-2 text-xs font-semibold text-amber-600">
                          التقسيط غير مكتمل الإعداد، تواصل مع إدارة الكورس.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 sm:shrink-0">
                      <Button
                        variant="secondary"
                        onClick={() => openUpload(item, "full")}
                      >
                        <UploadCloud className="h-4 w-4" />
                        دفع كامل
                      </Button>

                      {canInstallment && (
                        <button
                          type="button"
                          onClick={() => openUpload(item, "installment")}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
                        >
                          <CreditCard className="h-4 w-4" />
                          تقسيط {formatCurrency(installmentAmount)} / شهر
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total */}
          <div className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">إجمالي الطلب</p>

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
              resetModal();
            }
          }}
          title="رفع إيصال الدفع"
        >
          <div dir="rtl">
            {/* Course Info */}
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">الكورس</p>

              <p className="mt-1 font-black text-slate-800">
                {activeCourse?.title}
              </p>

              <p className="mt-1 text-sm font-bold text-brand-600">
                {formatCurrency(
                  purchaseMode === "installment"
                    ? activeCourse?.installment_amount ?? 0
                    : activeCourse?.price ?? 0
                )}
              </p>
            </div>

            {/* Purchase Mode */}
            {activeCanInstallment && activeCourse && (
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <button
                  type="button"
                  onClick={() => setPurchaseMode("full")}
                  className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                    purchaseMode === "full"
                      ? "bg-white text-brand-700 shadow-sm ring-1 ring-brand-200"
                      : "text-slate-500 hover:bg-white"
                  }`}
                >
                  دفع كامل
                  <span className="mt-1 block text-xs font-normal text-slate-400">
                    {formatCurrency(activeCourse.price)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPurchaseMode("installment")}
                  className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                    purchaseMode === "installment"
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-white"
                  }`}
                >
                  تقسيط شهري
                  <span className="mt-1 block text-xs font-normal opacity-75">
                    {formatCurrency(activeCourse.installment_amount ?? 0)}
                    {" / شهر"}
                  </span>
                </button>
              </div>
            )}

            {/* Payment Method */}
            <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-brand-800">
                <FileCheck2 className="h-4 w-4" />
                طريقة الدفع
              </div>

              <p className="mt-1 text-sm text-brand-700">{paymentLabel}</p>

              <p className="mt-2 text-xs font-bold text-brand-800">
                {purchaseMode === "installment"
                  ? `قسط الشهر الأول — ${formatCurrency(
                      activeCourse?.installment_amount ?? 0
                    )}`
                  : "دفع كامل للكورس"}
              </p>
            </div>

            {/* Upload */}
            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition hover:border-brand-300 hover:bg-brand-50/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                <UploadCloud className="h-7 w-7" />
              </div>

              <div>
                <p className="break-all font-bold text-slate-700">
                  {file ? file.name : "اختر صورة إيصال الدفع"}
                </p>

                <p className="mt-1 text-xs text-slate-400">JPG / PNG / PDF</p>
              </div>

              <input
                key={inputKey}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {/* Submit */}
            <Button
              className="mt-5 w-full"
              disabled={!file || submitting}
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