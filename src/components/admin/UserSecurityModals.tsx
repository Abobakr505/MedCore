import { useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Trash2,
  Wand2,
  Copy,
  Check,
  X,
} from "lucide-react";

/* ---------- Shell ---------- */

function ModalShell({
  children,
  onClose,
  locked,
}: {
  children: React.ReactNode;
  onClose: () => void;
  locked: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={() => !locked && onClose()}
    >
      <div
        dir="rtl"
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function generatePassword(length = 12) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

/* ---------- Change Password ---------- */

interface ChangePasswordModalProps {
  name: string;
  email?: string | null;
  roleLabel: string; // الطالب / المعلم
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}

export function ChangePasswordModal({
  name,
  email,
  roleLabel,
  onClose,
  onSubmit,
}: ChangePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = () => {
    const p = generatePassword();
    setPassword(p);
    setConfirm(p);
    setShow(true);
    setCopied(false);
    setError("");
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("كلمة المرور يجب ألا تقل عن 8 أحرف");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذّر تغيير كلمة المرور"
      );
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10";

  return (
    <ModalShell onClose={onClose} locked={loading}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900">
                تغيير كلمة مرور {roleLabel}
              </h3>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {name}
                {email ? ` · ${email}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 أحرف على الأقل"
                autoComplete="new-password"
                dir="ltr"
                className={`${inputClass} pl-20 text-left`}
              />
              <div className="absolute left-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!password}
                  title="نسخ"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  title={show ? "إخفاء" : "إظهار"}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  {show ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">
              تأكيد كلمة المرور
            </label>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
              autoComplete="new-password"
              dir="ltr"
              className={`${inputClass} text-left`}
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 text-xs font-bold text-brand-600 transition hover:text-brand-700"
          >
            <Wand2 className="h-3.5 w-3.5" />
            توليد كلمة مرور قوية
          </button>

          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200/60 disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ كلمة المرور
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ---------- Delete User ---------- */

interface DeleteUserModalProps {
  name: string;
  email?: string | null;
  roleLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const CONFIRM_WORD = "حذف";

export function DeleteUserModal({
  name,
  email,
  roleLabel,
  onClose,
  onConfirm,
}: DeleteUserModalProps) {
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canDelete = typed.trim() === CONFIRM_WORD;

  const handleConfirm = async () => {
    if (!canDelete) return;
    setError("");
    setLoading(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر حذف الحساب");
      setLoading(false);
    }
  };

  return (
    <ModalShell onClose={onClose} locked={loading}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-900">
              حذف حساب {roleLabel} نهائيًا
            </h3>
            <p className="mt-1 truncate text-xs text-slate-500">
              {name}
              {email ? ` · ${email}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs leading-6 text-red-700">
          سيتم حذف الحساب وبياناته نهائيًا ولا يمكن التراجع عن هذا الإجراء.
          إذا كنت تريد فقط منعه من الدخول فاستخدم «إيقاف» بدلًا من الحذف.
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            للتأكيد اكتب كلمة «{CONFIRM_WORD}»
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-500/10"
          />
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-600">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200/60 disabled:opacity-50"
        >
          إلغاء
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canDelete || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          حذف نهائي
        </button>
      </div>
    </ModalShell>
  );
}