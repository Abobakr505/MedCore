import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  MessageSquareText,
  Clock3,
  HelpCircle,
  ChevronDown,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

const contactInfo = [
  {
    icon: Mail,
    label: "البريد الإلكتروني",
    value: "support@medcore.app",
  },
  {
    icon: Phone,
    label: "الهاتف",
    value: "+966 5XX XXX XXX",
  },
  {
    icon: MapPin,
    label: "العنوان",
    value: "المملكة العربية السعودية",
  },
];

const faqs = [
  {
    q: "كم يستغرق الرد على استفساري؟",
    a: "فريق الدعم يرد خلال 24 ساعة كحد أقصى، وغالبًا أسرع من ذلك في أيام الأسبوع.",
  },
  {
    q: "هل يمكنني السؤال عن كورس قبل الشراء؟",
    a: "بالتأكيد، أرسل اسم الكورس الذي تسأل عنه وسنوضح لك محتواه ومدته والتفاصيل المهمة قبل الشراء.",
  },
  {
    q: "واجهت مشكلة في الدفع، ماذا أفعل؟",
    a: "أرسل رقم العملية أو لقطة شاشة للمشكلة داخل رسالتك، وسيعمل فريق الدعم على مراجعتها وحلها بأسرع وقت.",
  },
];

function FAQItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="overflow-hidden rounded-[22px] border border-slate-100 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 p-5 text-right transition hover:bg-slate-50"
      >
        <span className="font-bold text-slate-800">{question}</span>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="border-t border-slate-100 px-5 pb-5 pt-4">
              <p className="text-sm leading-7 text-slate-500">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ContactPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      showToast(
        "تم إرسال رسالتك بنجاح، سنتواصل معك قريبًا",
        "success"
      );

      e.currentTarget.reset();
    }, 900);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white pb-20">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 25, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-32 top-20 h-72 w-72 rounded-full bg-brand-300/20 blur-3xl"
        />

        <motion.div
          animate={{
            x: [0, -20, 0],
            y: [0, 25, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-32 top-[45%] h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl"
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-bold text-brand-700 shadow-sm">
            <MessageSquareText className="h-4 w-4" />
            تواصل معنا
          </span>

          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight text-brand-900 sm:text-5xl lg:text-6xl">
            نحن هنا
            <span className="block bg-gradient-to-l from-brand-500 to-cyan-500 bg-clip-text text-transparent">
              لمساعدتك
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            لديك سؤال أو تحتاج إلى دعم؟ فريق Med Core جاهز للإجابة على
            استفساراتك حول الدورات، الدفع، أو أي مساعدة تقنية.
          </p>
        </motion.div>

        {/* Main */}
        <div className="mt-14 grid gap-7 lg:grid-cols-5">
          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-4 lg:col-span-2"
          >
            <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-brand-600 to-brand-900 p-7 text-white shadow-xl shadow-brand-900/20">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

              <div className="relative">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
                  <Clock3 className="h-6 w-6 text-brand-200" />
                </div>

                <p className="mt-5 text-xl font-black">
                  نرد خلال 24 ساعة
                </p>

                <p className="mt-2 text-sm leading-7 text-white/65">
                  فريقنا يتابع الرسائل يوميًا، وأغلب الاستفسارات تتم
                  الإجابة عنها خلال ساعات قليلة في أيام الأسبوع.
                </p>

                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-brand-200">
                  <ShieldCheck className="h-4 w-4" />
                  دعم موثوق وسريع
                </div>
              </div>
            </div>

            {contactInfo.map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  whileHover={{ y: -3 }}
                  className="flex items-center gap-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50 transition-shadow hover:shadow-lg"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-400">
                      {item.label}
                    </p>

                    <p className="mt-1 truncate font-bold text-slate-700">
                      {item.value}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            onSubmit={onSubmit}
            className="relative overflow-hidden rounded-[30px] border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-8 lg:col-span-3"
          >
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-50 blur-3xl" />

            <div className="relative">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Send className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-800">
                    أرسل رسالتك
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    املأ البيانات وسنتواصل معك على البريد الذي تدخله.
                  </p>
                </div>
              </div>

              <div className="mt-7 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label="الاسم"
                    required
                    placeholder="اسمك الكامل"
                  />

                  <Input
                    label="البريد الإلكتروني"
                    type="email"
                    required
                    placeholder="example@medcore.app"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    الرسالة
                  </label>

                  <textarea
                    required
                    rows={7}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    placeholder="اكتب رسالتك أو استفسارك هنا..."
                  />
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl"
                  isLoading={loading}
                >
                  إرسال الرسالة
                </Button>

                <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-brand-500" />
                  معلوماتك ستُستخدم فقط للرد على استفسارك
                </p>
              </div>
            </div>
          </motion.form>
        </div>

        {/* FAQ */}
        <section className="mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 text-sm font-bold text-brand-600">
              <HelpCircle className="h-4 w-4" />
              أسئلة شائعة
            </span>

            <h2 className="mt-3 text-3xl font-black text-slate-900">
              قبل ما ترسل، ممكن تلاقي إجابتك هنا
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              مجموعة من أكثر الأسئلة التي تصل إلى فريق الدعم.
            </p>
          </motion.div>

          <div className="mx-auto mt-8 max-w-4xl space-y-3">
            {faqs.map((item, index) => (
              <FAQItem
                key={item.q}
                question={item.q}
                answer={item.a}
                index={index}
              />
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative mt-16 overflow-hidden rounded-[30px] bg-slate-950 p-7 text-center text-white shadow-2xl sm:p-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.12),transparent_55%)]" />

          <div className="relative">
            <Sparkles className="mx-auto h-7 w-7 text-brand-300" />

            <h2 className="mt-4 text-2xl font-black sm:text-3xl">
              عندك استفسار؟ لا تتردد
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-white/55">
              فريق Med Core موجود لمساعدتك في كل خطوة من رحلتك التعليمية.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}