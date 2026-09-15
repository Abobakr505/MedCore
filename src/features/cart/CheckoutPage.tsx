import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  CheckCircle2,
  Copy,
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
import {
  fetchCart,
  removeFromCart,
} from "@/services/cart";
import {
  uploadFirstInstallmentAndCreatePlan,
  uploadReceiptAndCreatePayment,
} from "@/services/payments";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { CartItem } from "@/types";
import { formatCurrency } from "@/utils/format";

/**
 * بيانات الدفع الثابتة (Orange Cash / InstaPay).
 *
 * تم إلغاء التحويل البنكي، وتم استبدال Vodafone Cash بـ Orange Cash.
 * غيّر القيم دي براحتك.
 */
const PAYMENT_INFO = {
  orange: {
    number: "01xxxxxxxxx", // TODO: ضع رقم Orange Cash الثابت
  },

  instapay: {
    username: "yourname@instapay", // TODO: ضع عنوان InstaPay الثابت
    link: "https://ipn.eg/",
  },
};

type PaymentMethod =
  | "orange"
  | "instapay";

type PurchaseMode =
  | "full"
  | "installment";

export default function CheckoutPage() {
  const { session } = useAuth();
  const { showToast } = useToast();

  // =========================
  // State
  // =========================

  const [items, setItems] = useState<CartItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [activeItem, setActiveItem] =
    useState<CartItem | null>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [purchaseMode, setPurchaseMode] =
    useState<PurchaseMode>("full");

  const [submitting, setSubmitting] =
    useState(false);

  const [submittedIds, setSubmittedIds] =
    useState<string[]>([]);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("orange");

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
        console.error(
          "FETCH CART ERROR:",
          error
        );

        showToast(
          "تعذّر تحميل بيانات السلة",
          "error"
        );
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
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          (item.course?.price ?? 0),
        0
      ),
    [items]
  );

  // =========================
  // Copy Helper
  // =========================

  const copyText = async (
    text: string,
    message: string
  ) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(
        text
      );

      showToast(
        message,
        "success"
      );
    } catch (error) {
      console.error(
        "COPY ERROR:",
        error
      );

      showToast(
        "تعذر نسخ البيانات",
        "error"
      );
    }
  };

  // =========================
  // Open Upload Modal
  // =========================

  const openUpload = (
    item: CartItem,
    mode: PurchaseMode
  ) => {
    setActiveItem(item);
    setFile(null);
    setPurchaseMode(mode);
  };

  // =========================
  // Handle Upload
  // =========================

  const handleUpload =
    async () => {
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
        const course =
          activeItem.course;

        // =========================
        // Installment
        // =========================

        if (
          purchaseMode ===
            "installment" &&
          course.is_installment &&
          course.installment_amount
        ) {
          await uploadFirstInstallmentAndCreatePlan(
            {
              studentId:
                session.user.id,

              courseId:
                course.id,

              amount:
                course.installment_amount,

              file,
            }
          );
        } else {
          // =========================
          // Full Payment
          // =========================

          await uploadReceiptAndCreatePayment(
            {
              studentId:
                session.user.id,

              courseId:
                course.id,

              amount:
                course.price,

              file,
            }
          );
        }

        // =========================
        // Remove From Cart
        // =========================

        await removeFromCart(
          activeItem.id
        );

        // =========================
        // Mark As Submitted
        // =========================

        setSubmittedIds(
          (prev) => [
            ...prev,
            activeItem.id,
          ]
        );

        setItems(
          (prev) =>
            prev.filter(
              (item) =>
                item.id !==
                activeItem.id
            )
        );

        // =========================
        // Success
        // =========================

        showToast(
          "تم إرسال طلب الدفع، بانتظار المراجعة",
          "success"
        );

        // =========================
        // Reset Modal
        // =========================

        setActiveItem(null);
        setFile(null);
        setPurchaseMode("full");
      } catch (error) {
        console.error(
          "PAYMENT UPLOAD ERROR:",
          error
        );

        showToast(
          "تعذّر رفع الإيصال، حاول مرة أخرى",
          "error"
        );
      } finally {
        setSubmitting(false);
      }
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

  if (
    items.length === 0 &&
    submittedIds.length === 0
  ) {
    return (
      <div
        dir="rtl"
        className="mx-auto max-w-xl px-4 py-24 sm:px-6"
      >
        <EmptyState
          icon={
            <CreditCard className="h-6 w-6" />
          }
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
          تم استلام إيصالات الدفع الخاصة بك.
          سيقوم المعلم أو فريق الإدارة
          بمراجعتها وتفعيل اشتراكك بعد
          التأكد من التحويل.
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

  // =========================
  // Main
  // =========================

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

        {/* Payment Methods */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-black text-slate-800">
            طرق الدفع المتاحة
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">

            {/* Orange Cash */}
            <button
              type="button"
              onClick={() =>
                setPaymentMethod(
                  "orange"
                )
              }
              className={`group rounded-3xl border p-5 text-right transition ${
                paymentMethod ===
                "orange"
                  ? "border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-100"
                  : "border-slate-200 bg-white hover:border-brand-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                  <Smartphone className="h-6 w-6" />
                </div>

                {paymentMethod ===
                  "orange" && (
                  <CheckCircle2 className="h-5 w-5 text-brand-500" />
                )}
              </div>

              <h3 className="mt-4 font-black text-slate-800">
                Orange Cash
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                تحويل مباشر من محفظة Orange Cash
              </p>
            </button>

            {/* InstaPay */}
            <button
              type="button"
              onClick={() =>
                setPaymentMethod(
                  "instapay"
                )
              }
              className={`group rounded-3xl border p-5 text-right transition ${
                paymentMethod ===
                "instapay"
                  ? "border-brand-500 bg-brand-50 shadow-md ring-2 ring-brand-100"
                  : "border-slate-200 bg-white hover:border-brand-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                  <CreditCard className="h-6 w-6" />
                </div>

                {paymentMethod ===
                  "instapay" && (
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
          </div>
        </section>

        {/* Selected Payment Info */}
        <section className="mt-6 overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm">

          <div className="bg-gradient-to-r from-brand-600 to-brand-800 p-5 text-white">
            <div className="flex items-center gap-3">

              {paymentMethod ===
              "orange" ? (
                <Smartphone className="h-6 w-6" />
              ) : (
                <CreditCard className="h-6 w-6" />
              )}

              <div>
                <h2 className="font-black">
                  {paymentMethod ===
                  "orange"
                    ? "بيانات Orange Cash"
                    : "بيانات InstaPay"}
                </h2>

                <p className="mt-0.5 text-xs text-white/70">
                  حوّل المبلغ ثم احتفظ بصورة الإيصال
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">

            {/* Orange Cash */}
            {paymentMethod ===
              "orange" && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-xs text-slate-400">
                    رقم Orange Cash
                  </p>

                  <p
                    dir="ltr"
                    className="mt-1 text-2xl font-black tracking-wide text-slate-800"
                  >
                    {PAYMENT_INFO.orange.number}
                  </p>
                </div>

                <Button
                  variant="secondary"
                  onClick={() =>
                    copyText(
                      PAYMENT_INFO.orange.number,
                      "تم نسخ رقم Orange Cash"
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                  نسخ الرقم
                </Button>
              </div>
            )}

            {/* InstaPay */}
            {paymentMethod === "instapay" && (
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

              {items.map(
                (item) => {
                  const course =
                    item.course;

                  const canInstallment =
                    Boolean(
                      course?.is_installment &&
                        course.installment_amount &&
                        course.installment_months
                    );

                  const installmentAmount =
                    course?.installment_amount ??
                    0;

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
                          {formatCurrency(
                            course?.price ??
                              0
                          )}
                        </p>

                        {course?.is_installment &&
                          !canInstallment && (
                            <p className="mt-2 text-xs font-semibold text-amber-600">
                              التقسيط غير مكتمل الإعداد، تواصل مع إدارة الكورس.
                            </p>
                          )}

                      </div>

                      <div className="flex flex-wrap gap-2 sm:shrink-0">

                        <Button
                          variant="secondary"
                          onClick={() =>
                            openUpload(
                              item,
                              "full"
                            )
                          }
                        >
                          <UploadCloud className="h-4 w-4" />
                          دفع كامل
                        </Button>

                        {canInstallment && (
                          <button
                            type="button"
                            onClick={() =>
                              openUpload(
                                item,
                                "installment"
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
                          >
                            <CreditCard className="h-4 w-4" />
                            تقسيط{" "}
                            {formatCurrency(
                              installmentAmount
                            )}{" "}
                            / شهر
                          </button>
                        )}

                      </div>
                    </div>
                  );
                }
              )}

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
              setPurchaseMode(
                "full"
              );
            }
          }}
          title="رفع إيصال الدفع"
        >
          <div dir="rtl">

            {/* Course Info */}
            <div className="rounded-2xl bg-slate-50 p-4">

              <p className="text-xs text-slate-400">
                الكورس
              </p>

              <p className="mt-1 font-black text-slate-800">
                {activeItem?.course?.title}
              </p>

              <p className="mt-1 text-sm font-bold text-brand-600">
                {formatCurrency(
                  purchaseMode ===
                    "installment"
                    ? activeItem
                        ?.course
                        ?.installment_amount ??
                        0
                    : activeItem
                        ?.course
                        ?.price ??
                        0
                )}
              </p>

            </div>

            {/* Purchase Mode */}
            {activeItem?.course
              ?.is_installment &&
              activeItem.course
                .installment_amount &&
              activeItem.course
                .installment_months && (

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">

                <button
                  type="button"
                  onClick={() =>
                    setPurchaseMode(
                      "full"
                    )
                  }
                  className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                    purchaseMode ===
                    "full"
                      ? "bg-white text-brand-700 shadow-sm ring-1 ring-brand-200"
                      : "text-slate-500 hover:bg-white"
                  }`}
                >
                  دفع كامل

                  <span className="mt-1 block text-xs font-normal text-slate-400">
                    {formatCurrency(
                      activeItem
                        .course
                        .price
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPurchaseMode(
                      "installment"
                    )
                  }
                  className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                    purchaseMode ===
                    "installment"
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-white"
                  }`}
                >
                  تقسيط شهري

                  <span className="mt-1 block text-xs font-normal opacity-75">
                    {formatCurrency(
                      activeItem
                        .course
                        .installment_amount ??
                        0
                    )}
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

              <p className="mt-1 text-sm text-brand-700">
                {paymentMethod ===
                "orange"
                  ? "Orange Cash"
                  : "InstaPay"}
              </p>

              <p className="mt-2 text-xs font-bold text-brand-800">
                {purchaseMode ===
                "installment"
                  ? `قسط الشهر الأول — ${formatCurrency(
                      activeItem
                        ?.course
                        ?.installment_amount ??
                        0
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
                onChange={(
                  event
                ) => {
                  setFile(
                    event.target.files?.[0] ??
                      null
                  );
                }}
              />

            </label>

            {/* Submit */}
            <Button
              className="mt-5 w-full"
              disabled={!file}
              isLoading={submitting}
              onClick={
                handleUpload
              }
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