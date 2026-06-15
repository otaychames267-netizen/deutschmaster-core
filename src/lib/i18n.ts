import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: { translation: {
    nav: { features: "Features", pricing: "Pricing", faq: "FAQ", contact: "Contact", login: "Login", signup: "Sign Up", dashboard: "Dashboard", logout: "Logout", profile: "Profile", billing: "Billing", security: "Security", admin: "Admin" },
    hero: { title: "Lingovia", subtitle: "Master German with Confidence", description: "Prepare for TELC B1 & B2 with structured lessons, exam simulations and AI-powered feedback.", cta_trial: "Start Free Trial", cta_plans: "View Plans", cta_login: "Login" },
    features: { title: "Everything you need to pass", reading: "Reading", reading_desc: "Authentic TELC reading models with explanations.", listening: "Listening", listening_desc: "Audio exercises with transcripts.", writing: "Writing", writing_desc: "Letter & essay practice with AI feedback.", speaking: "Speaking", speaking_desc: "Realistic oral exam simulations.", certificates: "Certificates", certificates_desc: "Earn certificates as you progress.", multi: "7 Languages", multi_desc: "Study interface in your native language." },
    pricing: { title: "Simple, transparent pricing", monthly: "per month", trial: "3-day free trial included", choose: "Choose plan" },
    testimonials: { title: "Trusted by thousands of learners" },
    faq: { title: "Frequently asked questions" },
    contact: { title: "Get in touch", name: "Your name", email: "Email", message: "Message", send: "Send message", sent: "Message sent. We'll get back to you soon." },
    footer: { rights: "All rights reserved", privacy: "Privacy", terms: "Terms", refund: "Refund", cookies: "Cookies" },
    auth: { email: "Email", password: "Password", confirm_password: "Confirm password", full_name: "Full name", remember: "Remember me", sign_in: "Sign in", sign_up: "Create account", forgot: "Forgot password?", continue_google: "Continue with Google", or: "or", accept_terms: "I accept the Terms of Service and Privacy Policy", reset_link: "Send reset link", new_password: "New password", reset: "Reset password", verify_email: "Please check your email to verify your account." }
  }},
  de: { translation: {
    nav: { features: "Funktionen", pricing: "Preise", faq: "FAQ", contact: "Kontakt", login: "Anmelden", signup: "Registrieren", dashboard: "Dashboard", logout: "Abmelden", profile: "Profil", billing: "Abrechnung", security: "Sicherheit", admin: "Admin" },
    hero: { title: "Lingovia", subtitle: "Professionelle Vorbereitung auf die TELC-Prüfung", description: "Bereiten Sie sich auf TELC B1 & B2 mit strukturierten Lektionen, Prüfungssimulationen und KI-Feedback vor.", cta_trial: "Kostenlos testen", cta_plans: "Pläne ansehen", cta_login: "Anmelden" },
    features: { title: "Alles, was Sie brauchen", reading: "Lesen", reading_desc: "Authentische TELC-Lesemodelle mit Erklärungen.", listening: "Hören", listening_desc: "Audio-Übungen mit Transkripten.", writing: "Schreiben", writing_desc: "Brief- und Aufsatzpraxis mit KI-Feedback.", speaking: "Sprechen", speaking_desc: "Realistische mündliche Prüfungssimulationen.", certificates: "Zertifikate", certificates_desc: "Verdienen Sie Zertifikate, während Sie Fortschritte machen.", multi: "7 Sprachen", multi_desc: "Lernoberfläche in Ihrer Muttersprache." },
    pricing: { title: "Einfache, transparente Preise", monthly: "pro Monat", trial: "3 Tage kostenlos testen", choose: "Plan wählen" },
    testimonials: { title: "Tausende vertrauen uns" },
    faq: { title: "Häufig gestellte Fragen" },
    contact: { title: "Kontaktieren Sie uns", name: "Ihr Name", email: "E-Mail", message: "Nachricht", send: "Nachricht senden", sent: "Nachricht gesendet. Wir melden uns bald." },
    footer: { rights: "Alle Rechte vorbehalten", privacy: "Datenschutz", terms: "AGB", refund: "Rückerstattung", cookies: "Cookies" },
    auth: { email: "E-Mail", password: "Passwort", confirm_password: "Passwort bestätigen", full_name: "Vollständiger Name", remember: "Angemeldet bleiben", sign_in: "Anmelden", sign_up: "Konto erstellen", forgot: "Passwort vergessen?", continue_google: "Mit Google fortfahren", or: "oder", accept_terms: "Ich akzeptiere die AGB und die Datenschutzerklärung", reset_link: "Reset-Link senden", new_password: "Neues Passwort", reset: "Passwort zurücksetzen", verify_email: "Bitte prüfen Sie Ihre E-Mails zur Bestätigung." }
  }},
  ar: { translation: {
    nav: { features: "الميزات", pricing: "الأسعار", faq: "الأسئلة", contact: "اتصل", login: "تسجيل الدخول", signup: "إنشاء حساب", dashboard: "لوحة التحكم", logout: "خروج", profile: "الملف", billing: "الفواتير", security: "الأمان", admin: "المشرف" },
    hero: { title: "Lingovia", subtitle: "منصة احترافية للتحضير لامتحان الألمانية", description: "استعد لـ TELC B1 و B2 بدروس منظمة ومحاكاة الامتحان وتعليقات الذكاء الاصطناعي.", cta_trial: "ابدأ تجربة مجانية", cta_plans: "عرض الخطط", cta_login: "تسجيل الدخول" },
    features: { title: "كل ما تحتاجه للنجاح", reading: "القراءة", reading_desc: "نماذج قراءة TELC أصلية مع شروحات.", listening: "الاستماع", listening_desc: "تمارين صوتية مع نصوص.", writing: "الكتابة", writing_desc: "تدريب على الرسائل والمقالات مع تعليقات AI.", speaking: "التحدث", speaking_desc: "محاكاة واقعية للامتحان الشفوي.", certificates: "الشهادات", certificates_desc: "احصل على شهادات أثناء تقدمك.", multi: "7 لغات", multi_desc: "واجهة الدراسة بلغتك الأم." },
    pricing: { title: "أسعار بسيطة وشفافة", monthly: "شهرياً", trial: "تجربة مجانية لمدة 3 أيام", choose: "اختر الخطة" },
    testimonials: { title: "موثوق من قبل آلاف المتعلمين" },
    faq: { title: "الأسئلة الشائعة" },
    contact: { title: "تواصل معنا", name: "اسمك", email: "البريد الإلكتروني", message: "الرسالة", send: "إرسال", sent: "تم الإرسال. سنرد قريباً." },
    footer: { rights: "جميع الحقوق محفوظة", privacy: "الخصوصية", terms: "الشروط", refund: "الاسترداد", cookies: "الكوكيز" },
    auth: { email: "البريد", password: "كلمة المرور", confirm_password: "تأكيد كلمة المرور", full_name: "الاسم الكامل", remember: "تذكرني", sign_in: "دخول", sign_up: "إنشاء حساب", forgot: "نسيت كلمة المرور؟", continue_google: "المتابعة عبر جوجل", or: "أو", accept_terms: "أوافق على الشروط وسياسة الخصوصية", reset_link: "إرسال رابط الاستعادة", new_password: "كلمة مرور جديدة", reset: "إعادة تعيين", verify_email: "يرجى التحقق من بريدك لتفعيل الحساب." }
  }},
  fr: { translation: {
    nav: { features: "Fonctionnalités", pricing: "Tarifs", faq: "FAQ", contact: "Contact", login: "Connexion", signup: "Inscription", dashboard: "Tableau de bord", logout: "Déconnexion", profile: "Profil", billing: "Facturation", security: "Sécurité", admin: "Admin" },
    hero: { title: "Lingovia", subtitle: "Plateforme professionnelle de préparation à l'examen TELC", description: "Préparez TELC B1 & B2 avec des leçons structurées, simulations et retours IA.", cta_trial: "Essai gratuit", cta_plans: "Voir les plans", cta_login: "Connexion" },
    features: { title: "Tout ce qu'il faut pour réussir", reading: "Lecture", reading_desc: "Modèles de lecture TELC avec explications.", listening: "Écoute", listening_desc: "Exercices audio avec transcriptions.", writing: "Écriture", writing_desc: "Lettres et essais avec retours IA.", speaking: "Oral", speaking_desc: "Simulations d'examen oral réalistes.", certificates: "Certificats", certificates_desc: "Gagnez des certificats au fil de votre progression.", multi: "7 langues", multi_desc: "Interface dans votre langue maternelle." },
    pricing: { title: "Tarifs simples et transparents", monthly: "par mois", trial: "Essai gratuit de 3 jours", choose: "Choisir" },
    testimonials: { title: "Approuvé par des milliers d'apprenants" },
    faq: { title: "Questions fréquentes" },
    contact: { title: "Contactez-nous", name: "Votre nom", email: "Email", message: "Message", send: "Envoyer", sent: "Message envoyé." },
    footer: { rights: "Tous droits réservés", privacy: "Confidentialité", terms: "Conditions", refund: "Remboursement", cookies: "Cookies" },
    auth: { email: "Email", password: "Mot de passe", confirm_password: "Confirmer le mot de passe", full_name: "Nom complet", remember: "Se souvenir de moi", sign_in: "Connexion", sign_up: "Créer un compte", forgot: "Mot de passe oublié ?", continue_google: "Continuer avec Google", or: "ou", accept_terms: "J'accepte les Conditions et la Politique", reset_link: "Envoyer le lien", new_password: "Nouveau mot de passe", reset: "Réinitialiser", verify_email: "Vérifiez votre email pour activer votre compte." }
  }},
  es: { translation: {
    nav: { features: "Características", pricing: "Precios", faq: "FAQ", contact: "Contacto", login: "Entrar", signup: "Registro", dashboard: "Panel", logout: "Salir", profile: "Perfil", billing: "Facturación", security: "Seguridad", admin: "Admin" },
    hero: { title: "Lingovia", subtitle: "Plataforma profesional de preparación TELC", description: "Prepárate para TELC B1 y B2 con lecciones, simulaciones y feedback IA.", cta_trial: "Prueba gratis", cta_plans: "Ver planes", cta_login: "Entrar" },
    features: { title: "Todo para aprobar", reading: "Lectura", reading_desc: "Modelos TELC con explicaciones.", listening: "Escucha", listening_desc: "Audios con transcripciones.", writing: "Escritura", writing_desc: "Cartas y ensayos con IA.", speaking: "Oral", speaking_desc: "Simulaciones realistas.", certificates: "Certificados", certificates_desc: "Gana certificados.", multi: "7 idiomas", multi_desc: "Interfaz en tu idioma." },
    pricing: { title: "Precios simples", monthly: "al mes", trial: "Prueba gratis 3 días", choose: "Elegir" },
    testimonials: { title: "Confianza de miles" },
    faq: { title: "Preguntas frecuentes" },
    contact: { title: "Contáctanos", name: "Nombre", email: "Email", message: "Mensaje", send: "Enviar", sent: "Enviado." },
    footer: { rights: "Todos los derechos reservados", privacy: "Privacidad", terms: "Términos", refund: "Reembolso", cookies: "Cookies" },
    auth: { email: "Email", password: "Contraseña", confirm_password: "Confirmar", full_name: "Nombre completo", remember: "Recordarme", sign_in: "Entrar", sign_up: "Crear cuenta", forgot: "¿Olvidaste la contraseña?", continue_google: "Continuar con Google", or: "o", accept_terms: "Acepto los términos", reset_link: "Enviar enlace", new_password: "Nueva contraseña", reset: "Restablecer", verify_email: "Verifica tu correo." }
  }},
  it: { translation: {
    nav: { features: "Funzionalità", pricing: "Prezzi", faq: "FAQ", contact: "Contatti", login: "Accedi", signup: "Registrati", dashboard: "Dashboard", logout: "Esci", profile: "Profilo", billing: "Fatturazione", security: "Sicurezza", admin: "Admin" },
    hero: { title: "Lingovia", subtitle: "Preparazione professionale all'esame TELC", description: "Preparati a TELC B1 e B2 con lezioni, simulazioni e feedback AI.", cta_trial: "Prova gratuita", cta_plans: "Vedi piani", cta_login: "Accedi" },
    features: { title: "Tutto per superarlo", reading: "Lettura", reading_desc: "Modelli TELC con spiegazioni.", listening: "Ascolto", listening_desc: "Audio con trascrizioni.", writing: "Scrittura", writing_desc: "Lettere e saggi con AI.", speaking: "Parlato", speaking_desc: "Simulazioni realistiche.", certificates: "Certificati", certificates_desc: "Ottieni certificati.", multi: "7 lingue", multi_desc: "Interfaccia nella tua lingua." },
    pricing: { title: "Prezzi semplici", monthly: "al mese", trial: "3 giorni gratis", choose: "Scegli" },
    testimonials: { title: "Scelto da migliaia" },
    faq: { title: "Domande frequenti" },
    contact: { title: "Contattaci", name: "Nome", email: "Email", message: "Messaggio", send: "Invia", sent: "Inviato." },
    footer: { rights: "Tutti i diritti riservati", privacy: "Privacy", terms: "Termini", refund: "Rimborso", cookies: "Cookies" },
    auth: { email: "Email", password: "Password", confirm_password: "Conferma", full_name: "Nome completo", remember: "Ricordami", sign_in: "Accedi", sign_up: "Crea account", forgot: "Password dimenticata?", continue_google: "Continua con Google", or: "o", accept_terms: "Accetto i termini", reset_link: "Invia link", new_password: "Nuova password", reset: "Reimposta", verify_email: "Controlla la tua email." }
  }},
  tr: { translation: {
    nav: { features: "Özellikler", pricing: "Fiyatlar", faq: "SSS", contact: "İletişim", login: "Giriş", signup: "Kayıt", dashboard: "Panel", logout: "Çıkış", profile: "Profil", billing: "Faturalama", security: "Güvenlik", admin: "Yönetici" },
    hero: { title: "Lingovia", subtitle: "Profesyonel TELC sınav hazırlık platformu", description: "TELC B1 ve B2 için yapılandırılmış dersler, simülasyonlar ve AI geri bildirimi.", cta_trial: "Ücretsiz dene", cta_plans: "Planları gör", cta_login: "Giriş" },
    features: { title: "Başarmak için ihtiyacınız olan her şey", reading: "Okuma", reading_desc: "Açıklamalı TELC modelleri.", listening: "Dinleme", listening_desc: "Transkriptli ses alıştırmaları.", writing: "Yazma", writing_desc: "AI geri bildirimli mektup ve denemeler.", speaking: "Konuşma", speaking_desc: "Gerçekçi sözlü simülasyonlar.", certificates: "Sertifikalar", certificates_desc: "İlerledikçe sertifika kazanın.", multi: "7 dil", multi_desc: "Ana dilinizde arayüz." },
    pricing: { title: "Basit, şeffaf fiyatlandırma", monthly: "aylık", trial: "3 gün ücretsiz", choose: "Seç" },
    testimonials: { title: "Binlerce öğrencinin güveni" },
    faq: { title: "Sıkça sorulan sorular" },
    contact: { title: "Bize ulaşın", name: "İsim", email: "E-posta", message: "Mesaj", send: "Gönder", sent: "Gönderildi." },
    footer: { rights: "Tüm hakları saklıdır", privacy: "Gizlilik", terms: "Şartlar", refund: "İade", cookies: "Çerezler" },
    auth: { email: "E-posta", password: "Şifre", confirm_password: "Şifreyi onayla", full_name: "Tam ad", remember: "Beni hatırla", sign_in: "Giriş", sign_up: "Hesap oluştur", forgot: "Şifremi unuttum?", continue_google: "Google ile devam", or: "veya", accept_terms: "Şartları kabul ediyorum", reset_link: "Bağlantı gönder", new_password: "Yeni şifre", reset: "Sıfırla", verify_email: "Lütfen e-postanızı doğrulayın." }
  }},
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      supportedLngs: ["en", "de", "ar", "fr", "es", "it", "tr"],
      interpolation: { escapeValue: false },
      detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
    });
}

export const RTL_LANGS = ["ar"];
export default i18n;
