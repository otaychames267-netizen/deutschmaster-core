import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getManualPaymentOrder, type ManualPaymentOrder } from "@/lib/payment/manual-orders.functions";
import { POSTAL_PAYMENT, BANCAIRE_PAYMENT, buildWhatsAppReceiptUrl } from "@/lib/payment/payment-methods";
import {
  ArrowLeft, Copy, Check, MessageCircle, Clock, ShieldCheck,
  CheckCircle2, XCircle, Loader2, Landmark, Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/paiement/$orderId")({
  component: ManualPaymentPage,
});

const PLAN_LABEL: Record<string, string> = {
  schriftlich: "Schriftlich",
  muendlich: "Mündlich",
  komplett: "Komplett",
};

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value.replace(/\s+/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر النسخ");
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
        {/* dir=ltr keeps the digit groups left-to-right even inside an RTL page */}
        <p dir="ltr" className="mt-0.5 text-left font-mono text-base font-bold tracking-wide text-foreground sm:text-lg">
          {value}
        </p>
      </div>
      <button
        onClick={copy}
        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
          copied ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary hover:bg-primary/15"
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "تم النسخ" : "نسخ"}
      </button>
    </div>
  );
}

function postalSteps(amountTnd: number): string[] {
  return [
    "توجّه إلى أقرب مكتب بريد.",
    "أعطِ الموظف رقم البطاقة البريدية الموجود أسفل هذه الصفحة.",
    `أخبر الموظف أنك تريد إجراء تحويل بقيمة ${amountTnd} دينارًا تونسيًا إلى هذا الحساب.`,
    "بعد إتمام العملية، سيعطيك موظف البريد وصل التحويل.",
    "اضغط على زر WhatsApp الموجود أسفل الصفحة للتواصل مع فريق AuraLingovia.",
    "أرسل صورة واضحة لوصل التحويل في محادثة WhatsApp.",
    "سيتحقق فريقنا من الوصل، وبعد التأكد من الدفع سيتم تفعيل الاشتراك خلال دقائق.",
  ];
}

function bancaireSteps(amountTnd: number): string[] {
  return [
    "توجّه إلى أقرب فرع من فروع بنك البركة.",
    "أعطِ موظف البنك رقم الـRIB الموجود أسفل هذه الصفحة.",
    `أخبر الموظف أنك تريد إجراء تحويل بقيمة ${amountTnd} دينارًا تونسيًا إلى هذا الحساب.`,
    "بعد إتمام التحويل، سيعطيك موظف البنك وصل التحويل.",
    "اضغط على زر WhatsApp الموجود أسفل الصفحة للتواصل مباشرة مع فريق AuraLingovia.",
    "أرسل صورة واضحة لوصل التحويل في محادثة WhatsApp.",
    "سيتحقق فريقنا من الوصل، وبعد التأكد من عملية الدفع سيتم تفعيل الاشتراك خلال دقائق.",
  ];
}

function ManualPaymentPage() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<ManualPaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const o = await getManualPaymentOrder({ data: { order_id: orderId } });
        if (!cancelled) setOrder(o);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Order not found.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    // Poll while pending — an admin approving elsewhere should flip this
    // page's status without the student needing to reload manually.
    const interval = setInterval(() => { if (!cancelled) load(); }, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [orderId]);

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-semibold text-foreground">{error ?? "Order not found."}</p>
        <Link to="/billing" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Billing
        </Link>
      </div>
    );
  }

  const isPostal = order.method === "postal";
  const amountTnd = Number(order.amount_tnd);
  const steps = isPostal ? postalSteps(amountTnd) : bancaireSteps(amountTnd);
  const arabicTitle = isPostal ? "التحويل البريدي – البريد التونسي" : "التحويل البنكي – بنك البركة";
  const methodLabel = isPostal ? "تحويل بريدي" : "تحويل بنكي";
  const planName = PLAN_LABEL[order.plan_code] ?? order.plan_code;
  const whatsappUrl = buildWhatsAppReceiptUrl({ planName, amountTnd, methodLabel, email: user?.email ?? "" });

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <Link to="/billing" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Billing
      </Link>

      <div dir="rtl" className="flex items-center gap-3 text-right">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          {isPostal ? <Landmark className="h-6 w-6 text-primary" /> : <Wallet className="h-6 w-6 text-primary" />}
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">
            {isPostal ? "📮" : "🏦"} {arabicTitle}
          </h1>
        </div>
      </div>

      {/* ── Plan / amount summary ─────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">الخطة المختارة</p>
            <p className="text-base font-black text-foreground">{planName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground">المبلغ المطلوب</p>
            <p className="text-2xl font-black text-primary">{Number(order.amount_tnd).toFixed(0)} TND</p>
          </div>
        </div>
      </div>

      {/* ── Status states ──────────────────────────────────────── */}
      {order.status === "approved" && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
          <div>
            <p className="font-black text-foreground">تم تفعيل اشتراكك</p>
            <p className="text-sm text-muted-foreground">Your subscription is now active.</p>
          </div>
        </div>
      )}
      {order.status === "rejected" && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
          <XCircle className="h-6 w-6 shrink-0 text-rose-500" />
          <div>
            <p className="font-black text-foreground">لم نتمكن من التحقق من هذا الدفع</p>
            {order.rejection_reason && <p className="mt-1 text-sm text-muted-foreground">{order.rejection_reason}</p>}
            <p className="mt-1 text-sm text-muted-foreground">Please contact us via WhatsApp if you believe this is a mistake.</p>
          </div>
        </div>
      )}

      {order.status === "pending_verification" && (
        <>
          {/* ── Arabic instructions ────────────────────────────── */}
          <div dir="rtl" className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-black text-foreground">خطوات الدفع</p>
            <ol className="space-y-2.5">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>

            <div className="space-y-2.5 pt-1">
              {isPostal ? (
                <>
                  <CopyRow label="رقم بطاقة D17 / البريد" value={POSTAL_PAYMENT.cardNumber} />
                  <CopyRow label="صاحب الحساب" value={POSTAL_PAYMENT.accountHolder} />
                </>
              ) : (
                <>
                  <CopyRow label="RIB" value={BANCAIRE_PAYMENT.rib} />
                  <CopyRow label="اسم صاحب الحساب" value={BANCAIRE_PAYMENT.accountHolder} />
                </>
              )}
            </div>
          </div>

          {/* ── After payment / WhatsApp receipt ───────────────── */}
          <div dir="rtl" className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm font-black text-foreground">ماذا أفعل بعد الدفع؟</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              بعد إتمام عملية الدفع، احتفظ بوصل الدفع وأرسله إلينا عبر WhatsApp حتى نتمكن من التحقق من العملية وتفعيل اشتراكك.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700"
            >
              <MessageCircle className="h-4.5 w-4.5" /> إرسال وصل الدفع عبر WhatsApp
            </a>
          </div>

          <div dir="rtl" className="flex items-center gap-2.5 rounded-2xl border border-border bg-muted/30 px-4 py-3.5">
            <Clock className="h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-sm font-medium text-foreground">
              ⏱️ يتم تفعيل الاشتراك خلال دقائق بعد التحقق من وصل الدفع.
            </p>
          </div>

          {/* ── Trust section ───────────────────────────────────── */}
          <div dir="rtl" className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2.5 flex items-center gap-1.5 text-sm font-black text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> الدفع والتحقق
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>✓ يتم التحقق من وصل الدفع قبل تفعيل الاشتراك</li>
              <li>✓ يمكنك إرسال الوصل بسهولة عبر WhatsApp</li>
              <li>✓ يتم تفعيل الاشتراك بعد تأكيد الدفع</li>
              <li>✓ يمكنك التواصل معنا عبر WhatsApp عند الحاجة</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
