import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const APP_NAME = "AuraLingovia";

const resources = {
  en: { translation: {
    app: { name: APP_NAME, tagline: "Master German with Confidence" },
    nav: { features: "Features", pricing: "Pricing", faq: "FAQ", contact: "Contact", login: "Login", signup: "Sign Up", dashboard: "Dashboard", logout: "Logout", profile: "Profile", billing: "Billing", security: "Security", admin: "Admin", referrals: "Referrals", notifications: "Notifications" },
    hero: { subtitle: "Master German with Confidence", description: "Prepare for TELC B1 & B2 with structured practice, realistic exam simulations, and a beautifully designed learning experience.", cta_trial: "Start Free Trial", cta_plans: "View Plans", cta_login: "Login" },
    features: { title: "Everything you need to pass", reading: "Lesen", reading_desc: "Authentic TELC reading models with structured guidance.", listening: "Hören", listening_desc: "Audio exercises with transcripts and analysis.", writing: "Schreiben", writing_desc: "Letter and essay practice with detailed feedback.", speaking: "Mündlich", speaking_desc: "Realistic oral exam simulations.", sprachbausteine: "Sprachbausteine", sprachbausteine_desc: "Grammar gap-fill exercises by level.", multi: "7 Languages", multi_desc: "Study in your native language." },
    pricing: { title: "Simple, transparent pricing", monthly: "per month", trial: "3-day free trial included", choose: "Get started", schriftlich_desc: "Written exam — Lesen, Hören, Sprachbausteine, Schreiben", muendlich_desc: "Oral exam — speaking simulation and practice", komplett_desc: "Full access — written + oral, complete preparation" },
    faq: { title: "Frequently asked questions" },
    footer: { rights: "All rights reserved", privacy: "Privacy", terms: "Terms", refund: "Refund", cookies: "Cookies" },
    auth: { email: "Email", password: "Password", confirm_password: "Confirm password", full_name: "Full name", sign_in: "Sign in", sign_up: "Create account", forgot: "Forgot password?", or: "or", accept_terms: "I accept the Terms of Service and Privacy Policy", reset_link: "Send reset link", new_password: "New password", reset: "Reset password", verify_email: "Check your email to verify your account.", verify_sent: "Verification email sent.", check_spam: "Don't see it? Check your spam folder.", back_to_login: "Back to login" },
    onboarding: { title: "Choose your level", subtitle: "This determines your learning path and exam content.", b1: "TELC B1", b1_desc: "Intermediate German — job & everyday life", b2: "TELC B2", b2_desc: "Upper-intermediate — academic & professional", continue: "Continue", skip: "I'll decide later" },
    dashboard: { welcome: "Welcome back", your_level: "Your level", progress: "Progress", streak: "Day streak", exams_done: "Exams completed", avg_score: "Average score", start_practice: "Start practicing", view_all: "View all" },
    sidebar: { schriftlich: "Schriftlich", muendlich: "Mündlich", vorbereitung: "Vorbereitung", pruefung: "Prüfungssimulation", lesen: "Lesen", hoeren: "Hören", sprachbausteine: "Sprachbausteine", schreiben: "Schreiben", presentation: "Präsentation", gespraech: "Gespräch", planen: "Gemeinsam planen", dashboard: "Dashboard", statistik: "Statistik", billing: "Abonnement", referrals: "Empfehlen", settings: "Einstellungen", admin: "Admin" },
  }},
  de: { translation: {
    app: { name: APP_NAME, tagline: "Deutsch mit Zuversicht meistern" },
    nav: { features: "Funktionen", pricing: "Preise", faq: "FAQ", contact: "Kontakt", login: "Anmelden", signup: "Registrieren", dashboard: "Dashboard", logout: "Abmelden", profile: "Profil", billing: "Abrechnung", security: "Sicherheit", admin: "Admin", referrals: "Empfehlungen", notifications: "Benachrichtigungen" },
    hero: { subtitle: "Deutsch mit Zuversicht meistern", description: "Bereite dich auf TELC B1 & B2 vor — strukturierte Übungen, realistische Prüfungssimulationen.", cta_trial: "Kostenlos starten", cta_plans: "Pläne ansehen", cta_login: "Anmelden" },
    features: { title: "Alles, was du zum Bestehen brauchst", reading: "Lesen", reading_desc: "Authentische TELC-Lesemuster mit Erläuterungen.", listening: "Hören", listening_desc: "Hörübungen mit Transkripten.", writing: "Schreiben", writing_desc: "Brief- und Aufsatztraining.", speaking: "Mündlich", speaking_desc: "Realistische mündliche Prüfungssimulation.", sprachbausteine: "Sprachbausteine", sprachbausteine_desc: "Grammatiklückenübungen nach Niveau.", multi: "7 Sprachen", multi_desc: "Lernoberfläche in deiner Muttersprache." },
    pricing: { title: "Einfache, transparente Preise", monthly: "pro Monat", trial: "3 Tage kostenlos", choose: "Jetzt starten", schriftlich_desc: "Schriftliche Prüfung — Lesen, Hören, Sprachbausteine, Schreiben", muendlich_desc: "Mündliche Prüfung — Sprachsimulation und Übung", komplett_desc: "Vollzugang — schriftlich + mündlich" },
    faq: { title: "Häufig gestellte Fragen" },
    footer: { rights: "Alle Rechte vorbehalten", privacy: "Datenschutz", terms: "AGB", refund: "Rückerstattung", cookies: "Cookies" },
    auth: { email: "E-Mail", password: "Passwort", confirm_password: "Passwort bestätigen", full_name: "Vollständiger Name", sign_in: "Anmelden", sign_up: "Konto erstellen", forgot: "Passwort vergessen?", or: "oder", accept_terms: "Ich akzeptiere die AGB und Datenschutzerklärung", reset_link: "Reset-Link senden", new_password: "Neues Passwort", reset: "Passwort zurücksetzen", verify_email: "Prüfe deine E-Mails zur Bestätigung.", verify_sent: "Bestätigungs-E-Mail gesendet.", check_spam: "Nicht gefunden? Spam-Ordner prüfen.", back_to_login: "Zurück zur Anmeldung" },
    onboarding: { title: "Wähle dein Niveau", subtitle: "Das bestimmt deinen Lernpfad und die Prüfungsinhalte.", b1: "TELC B1", b1_desc: "Mittelstufe — Beruf & Alltag", b2: "TELC B2", b2_desc: "Obere Mittelstufe — akademisch & professionell", continue: "Weiter", skip: "Später entscheiden" },
    dashboard: { welcome: "Willkommen zurück", your_level: "Dein Niveau", progress: "Fortschritt", streak: "Tage-Serie", exams_done: "Prüfungen abgeschlossen", avg_score: "Durchschnittswertung", start_practice: "Übung starten", view_all: "Alle anzeigen" },
    sidebar: { schriftlich: "Schriftlich", muendlich: "Mündlich", vorbereitung: "Vorbereitung", pruefung: "Prüfungssimulation", lesen: "Lesen", hoeren: "Hören", sprachbausteine: "Sprachbausteine", schreiben: "Schreiben", presentation: "Präsentation", gespraech: "Gespräch", planen: "Gemeinsam planen", dashboard: "Dashboard", statistik: "Statistik", billing: "Abonnement", referrals: "Empfehlen", settings: "Einstellungen", admin: "Admin" },
  }},
  ar: { translation: {
    app: { name: APP_NAME, tagline: "تعلم الألمانية بثقة" },
    nav: { features: "الميزات", pricing: "الأسعار", faq: "الأسئلة الشائعة", contact: "اتصل بنا", login: "تسجيل الدخول", signup: "إنشاء حساب", dashboard: "لوحة التحكم", logout: "خروج", profile: "الملف الشخصي", billing: "الفواتير", security: "الأمان", admin: "المشرف", referrals: "الإحالات", notifications: "الإشعارات" },
    hero: { subtitle: "تعلم الألمانية بثقة", description: "استعد لامتحان TELC B1 و B2 مع تمارين منظمة ومحاكاة واقعية للامتحان.", cta_trial: "ابدأ مجاناً", cta_plans: "عرض الخطط", cta_login: "دخول" },
    features: { title: "كل ما تحتاجه للنجاح", reading: "القراءة", reading_desc: "نماذج قراءة TELC أصلية.", listening: "الاستماع", listening_desc: "تمارين صوتية مع نصوص.", writing: "الكتابة", writing_desc: "تدريب على الرسائل والمقالات.", speaking: "التحدث", speaking_desc: "محاكاة الامتحان الشفوي.", sprachbausteine: "البنية اللغوية", sprachbausteine_desc: "تمارين ملء الفراغات.", multi: "7 لغات", multi_desc: "واجهة بلغتك الأم." },
    pricing: { title: "أسعار بسيطة وشفافة", monthly: "شهرياً", trial: "3 أيام مجاناً", choose: "ابدأ الآن", schriftlich_desc: "الامتحان الكتابي", muendlich_desc: "الامتحان الشفوي", komplett_desc: "وصول كامل" },
    faq: { title: "الأسئلة الشائعة" },
    footer: { rights: "جميع الحقوق محفوظة", privacy: "الخصوصية", terms: "الشروط", refund: "الاسترداد", cookies: "ملفات تعريف الارتباط" },
    auth: { email: "البريد الإلكتروني", password: "كلمة المرور", confirm_password: "تأكيد كلمة المرور", full_name: "الاسم الكامل", sign_in: "دخول", sign_up: "إنشاء حساب", forgot: "نسيت كلمة المرور؟", or: "أو", accept_terms: "أوافق على الشروط وسياسة الخصوصية", reset_link: "إرسال رابط الاستعادة", new_password: "كلمة مرور جديدة", reset: "إعادة تعيين", verify_email: "تحقق من بريدك الإلكتروني.", verify_sent: "تم إرسال رسالة التحقق.", check_spam: "لم تجدها؟ تحقق من البريد العشوائي.", back_to_login: "العودة لتسجيل الدخول" },
    onboarding: { title: "اختر مستواك", subtitle: "سيحدد ذلك مسار تعلمك ومحتوى الامتحان.", b1: "TELC B1", b1_desc: "المستوى المتوسط — العمل والحياة اليومية", b2: "TELC B2", b2_desc: "المستوى المتوسط المتقدم — أكاديمي ومهني", continue: "متابعة", skip: "سأقرر لاحقاً" },
    dashboard: { welcome: "مرحباً بعودتك", your_level: "مستواك", progress: "التقدم", streak: "أيام متتالية", exams_done: "الامتحانات المكتملة", avg_score: "متوسط الدرجات", start_practice: "ابدأ التدريب", view_all: "عرض الكل" },
    sidebar: { schriftlich: "الكتابي", muendlich: "الشفوي", vorbereitung: "التحضير", pruefung: "محاكاة الامتحان", lesen: "القراءة", hoeren: "الاستماع", sprachbausteine: "البنية اللغوية", schreiben: "الكتابة", presentation: "العرض التقديمي", gespraech: "المحادثة", planen: "التخطيط المشترك", dashboard: "لوحة التحكم", statistik: "الإحصاءات", billing: "الاشتراك", referrals: "الإحالات", settings: "الإعدادات", admin: "المشرف" },
  }},
  fr: { translation: {
    app: { name: APP_NAME, tagline: "Maîtrisez l'allemand avec confiance" },
    nav: { features: "Fonctionnalités", pricing: "Tarifs", faq: "FAQ", contact: "Contact", login: "Connexion", signup: "Inscription", dashboard: "Tableau de bord", logout: "Déconnexion", profile: "Profil", billing: "Facturation", security: "Sécurité", admin: "Admin", referrals: "Parrainages", notifications: "Notifications" },
    hero: { subtitle: "Maîtrisez l'allemand avec confiance", description: "Préparez TELC B1 & B2 avec des exercices structurés et des simulations réalistes.", cta_trial: "Essai gratuit", cta_plans: "Voir les plans", cta_login: "Connexion" },
    features: { title: "Tout pour réussir", reading: "Lesen", reading_desc: "Modèles de lecture TELC avec explications.", listening: "Hören", listening_desc: "Exercices audio avec transcriptions.", writing: "Schreiben", writing_desc: "Lettres et rédactions.", speaking: "Mündlich", speaking_desc: "Simulations d'oral réalistes.", sprachbausteine: "Sprachbausteine", sprachbausteine_desc: "Exercices de remplissage.", multi: "7 langues", multi_desc: "Interface dans votre langue." },
    pricing: { title: "Tarifs simples et transparents", monthly: "par mois", trial: "3 jours gratuits", choose: "Commencer", schriftlich_desc: "Écrit — Lesen, Hören, Sprachbausteine, Schreiben", muendlich_desc: "Oral — simulation et pratique", komplett_desc: "Accès complet" },
    faq: { title: "Questions fréquentes" },
    footer: { rights: "Tous droits réservés", privacy: "Confidentialité", terms: "Conditions", refund: "Remboursement", cookies: "Cookies" },
    auth: { email: "Email", password: "Mot de passe", confirm_password: "Confirmer", full_name: "Nom complet", sign_in: "Connexion", sign_up: "Créer un compte", forgot: "Mot de passe oublié ?", or: "ou", accept_terms: "J'accepte les conditions", reset_link: "Envoyer le lien", new_password: "Nouveau mot de passe", reset: "Réinitialiser", verify_email: "Vérifiez votre email.", verify_sent: "Email de vérification envoyé.", check_spam: "Pas reçu ? Vérifiez les spams.", back_to_login: "Retour à la connexion" },
    onboarding: { title: "Choisissez votre niveau", subtitle: "Cela détermine votre parcours et le contenu.", b1: "TELC B1", b1_desc: "Intermédiaire — vie professionnelle & quotidienne", b2: "TELC B2", b2_desc: "Intermédiaire supérieur — académique & professionnel", continue: "Continuer", skip: "Décider plus tard" },
    dashboard: { welcome: "Bon retour", your_level: "Votre niveau", progress: "Progression", streak: "Jours consécutifs", exams_done: "Examens terminés", avg_score: "Score moyen", start_practice: "Commencer", view_all: "Voir tout" },
    sidebar: { schriftlich: "Schriftlich", muendlich: "Mündlich", vorbereitung: "Préparation", pruefung: "Simulation d'examen", lesen: "Lesen", hoeren: "Hören", sprachbausteine: "Sprachbausteine", schreiben: "Schreiben", presentation: "Présentation", gespraech: "Conversation", planen: "Planification", dashboard: "Tableau de bord", statistik: "Statistiques", billing: "Abonnement", referrals: "Parrainages", settings: "Paramètres", admin: "Admin" },
  }},
  es: { translation: {
    app: { name: APP_NAME, tagline: "Domina el alemán con confianza" },
    nav: { features: "Características", pricing: "Precios", faq: "FAQ", contact: "Contacto", login: "Entrar", signup: "Registro", dashboard: "Panel", logout: "Salir", profile: "Perfil", billing: "Facturación", security: "Seguridad", admin: "Admin", referrals: "Referidos", notifications: "Notificaciones" },
    hero: { subtitle: "Domina el alemán con confianza", description: "Prepárate para TELC B1 y B2 con ejercicios estructurados y simulaciones realistas.", cta_trial: "Prueba gratis", cta_plans: "Ver planes", cta_login: "Entrar" },
    features: { title: "Todo para aprobar", reading: "Lesen", reading_desc: "Modelos TELC con explicaciones.", listening: "Hören", listening_desc: "Audios con transcripciones.", writing: "Schreiben", writing_desc: "Cartas y redacciones.", speaking: "Mündlich", speaking_desc: "Simulaciones de oral.", sprachbausteine: "Sprachbausteine", sprachbausteine_desc: "Ejercicios de huecos.", multi: "7 idiomas", multi_desc: "Interfaz en tu idioma." },
    pricing: { title: "Precios simples", monthly: "al mes", trial: "3 días gratis", choose: "Empezar", schriftlich_desc: "Escrito", muendlich_desc: "Oral", komplett_desc: "Acceso completo" },
    faq: { title: "Preguntas frecuentes" },
    footer: { rights: "Todos los derechos reservados", privacy: "Privacidad", terms: "Términos", refund: "Reembolso", cookies: "Cookies" },
    auth: { email: "Email", password: "Contraseña", confirm_password: "Confirmar contraseña", full_name: "Nombre completo", sign_in: "Entrar", sign_up: "Crear cuenta", forgot: "¿Olvidaste la contraseña?", or: "o", accept_terms: "Acepto los términos y la política", reset_link: "Enviar enlace", new_password: "Nueva contraseña", reset: "Restablecer", verify_email: "Verifica tu correo.", verify_sent: "Email de verificación enviado.", check_spam: "¿No lo ves? Revisa spam.", back_to_login: "Volver al inicio" },
    onboarding: { title: "Elige tu nivel", subtitle: "Esto determina tu camino de aprendizaje.", b1: "TELC B1", b1_desc: "Intermedio — vida laboral y cotidiana", b2: "TELC B2", b2_desc: "Intermedio alto — académico y profesional", continue: "Continuar", skip: "Decidir después" },
    dashboard: { welcome: "Bienvenido de vuelta", your_level: "Tu nivel", progress: "Progreso", streak: "Días seguidos", exams_done: "Exámenes hechos", avg_score: "Puntuación media", start_practice: "Practicar", view_all: "Ver todo" },
    sidebar: { schriftlich: "Schriftlich", muendlich: "Mündlich", vorbereitung: "Preparación", pruefung: "Simulación de examen", lesen: "Lesen", hoeren: "Hören", sprachbausteine: "Sprachbausteine", schreiben: "Schreiben", presentation: "Presentación", gespraech: "Conversación", planen: "Planificación", dashboard: "Panel", statistik: "Estadísticas", billing: "Suscripción", referrals: "Referidos", settings: "Ajustes", admin: "Admin" },
  }},
  it: { translation: {
    app: { name: APP_NAME, tagline: "Padroneggia il tedesco con sicurezza" },
    nav: { features: "Funzionalità", pricing: "Prezzi", faq: "FAQ", contact: "Contatti", login: "Accedi", signup: "Registrati", dashboard: "Dashboard", logout: "Esci", profile: "Profilo", billing: "Fatturazione", security: "Sicurezza", admin: "Admin", referrals: "Referenze", notifications: "Notifiche" },
    hero: { subtitle: "Padroneggia il tedesco con sicurezza", description: "Preparati a TELC B1 e B2 con esercizi strutturati e simulazioni realistiche.", cta_trial: "Prova gratuita", cta_plans: "Vedi piani", cta_login: "Accedi" },
    features: { title: "Tutto per superarlo", reading: "Lesen", reading_desc: "Modelli TELC con spiegazioni.", listening: "Hören", listening_desc: "Audio con trascrizioni.", writing: "Schreiben", writing_desc: "Lettere e saggi.", speaking: "Mündlich", speaking_desc: "Simulazioni orali.", sprachbausteine: "Sprachbausteine", sprachbausteine_desc: "Esercizi a riempimento.", multi: "7 lingue", multi_desc: "Interfaccia nella tua lingua." },
    pricing: { title: "Prezzi semplici", monthly: "al mese", trial: "3 giorni gratis", choose: "Inizia ora", schriftlich_desc: "Scritto", muendlich_desc: "Orale", komplett_desc: "Accesso completo" },
    faq: { title: "Domande frequenti" },
    footer: { rights: "Tutti i diritti riservati", privacy: "Privacy", terms: "Termini", refund: "Rimborso", cookies: "Cookies" },
    auth: { email: "Email", password: "Password", confirm_password: "Conferma password", full_name: "Nome completo", sign_in: "Accedi", sign_up: "Crea account", forgot: "Password dimenticata?", or: "o", accept_terms: "Accetto termini e privacy", reset_link: "Invia link", new_password: "Nuova password", reset: "Reimposta", verify_email: "Controlla la tua email.", verify_sent: "Email di verifica inviata.", check_spam: "Non la vedi? Controlla spam.", back_to_login: "Torna al login" },
    onboarding: { title: "Scegli il tuo livello", subtitle: "Questo determina il tuo percorso.", b1: "TELC B1", b1_desc: "Intermedio — vita lavorativa e quotidiana", b2: "TELC B2", b2_desc: "Intermedio superiore — accademico e professionale", continue: "Continua", skip: "Decido dopo" },
    dashboard: { welcome: "Bentornato", your_level: "Il tuo livello", progress: "Progresso", streak: "Giorni consecutivi", exams_done: "Esami completati", avg_score: "Punteggio medio", start_practice: "Inizia", view_all: "Vedi tutto" },
    sidebar: { schriftlich: "Schriftlich", muendlich: "Mündlich", vorbereitung: "Preparazione", pruefung: "Simulazione esame", lesen: "Lesen", hoeren: "Hören", sprachbausteine: "Sprachbausteine", schreiben: "Schreiben", presentation: "Presentazione", gespraech: "Conversazione", planen: "Pianificazione", dashboard: "Dashboard", statistik: "Statistiche", billing: "Abbonamento", referrals: "Referenze", settings: "Impostazioni", admin: "Admin" },
  }},
  tr: { translation: {
    app: { name: APP_NAME, tagline: "Almancayı güvenle öğren" },
    nav: { features: "Özellikler", pricing: "Fiyatlar", faq: "SSS", contact: "İletişim", login: "Giriş", signup: "Kayıt Ol", dashboard: "Panel", logout: "Çıkış", profile: "Profil", billing: "Faturalama", security: "Güvenlik", admin: "Yönetici", referrals: "Davetler", notifications: "Bildirimler" },
    hero: { subtitle: "Almancayı güvenle öğren", description: "TELC B1 ve B2 için yapılandırılmış alıştırmalar ve gerçekçi sınav simülasyonları.", cta_trial: "Ücretsiz dene", cta_plans: "Planları gör", cta_login: "Giriş" },
    features: { title: "Başarmak için gereken her şey", reading: "Lesen", reading_desc: "Açıklamalı TELC okuma modelleri.", listening: "Hören", listening_desc: "Transkriptli ses alıştırmaları.", writing: "Schreiben", writing_desc: "Mektup ve deneme pratiği.", speaking: "Mündlich", speaking_desc: "Gerçekçi sözlü sınav simülasyonu.", sprachbausteine: "Sprachbausteine", sprachbausteine_desc: "Dil yapısı egzersizleri.", multi: "7 dil", multi_desc: "Ana dilinizde arayüz." },
    pricing: { title: "Basit fiyatlandırma", monthly: "aylık", trial: "3 gün ücretsiz", choose: "Başla", schriftlich_desc: "Yazılı sınav", muendlich_desc: "Sözlü sınav", komplett_desc: "Tam erişim" },
    faq: { title: "Sıkça sorulan sorular" },
    footer: { rights: "Tüm hakları saklıdır", privacy: "Gizlilik", terms: "Şartlar", refund: "İade", cookies: "Çerezler" },
    auth: { email: "E-posta", password: "Şifre", confirm_password: "Şifreyi onayla", full_name: "Tam ad", sign_in: "Giriş yap", sign_up: "Hesap oluştur", forgot: "Şifremi unuttum?", or: "veya", accept_terms: "Şartları ve politikayı kabul ediyorum", reset_link: "Bağlantı gönder", new_password: "Yeni şifre", reset: "Sıfırla", verify_email: "E-postanızı doğrulayın.", verify_sent: "Doğrulama e-postası gönderildi.", check_spam: "Göremediniz mi? Spam klasörünü kontrol edin.", back_to_login: "Girişe dön" },
    onboarding: { title: "Seviyenizi seçin", subtitle: "Bu öğrenme yolunuzu belirler.", b1: "TELC B1", b1_desc: "Orta seviye — iş ve günlük yaşam", b2: "TELC B2", b2_desc: "Üst orta — akademik ve profesyonel", continue: "Devam et", skip: "Sonra karar vereceğim" },
    dashboard: { welcome: "Tekrar hoş geldiniz", your_level: "Seviyeniz", progress: "İlerleme", streak: "Gün serisi", exams_done: "Tamamlanan sınavlar", avg_score: "Ortalama puan", start_practice: "Pratik yap", view_all: "Tümünü gör" },
    sidebar: { schriftlich: "Schriftlich", muendlich: "Mündlich", vorbereitung: "Hazırlık", pruefung: "Sınav simülasyonu", lesen: "Lesen", hoeren: "Hören", sprachbausteine: "Sprachbausteine", schreiben: "Schreiben", presentation: "Sunum", gespraech: "Konuşma", planen: "Birlikte planlama", dashboard: "Panel", statistik: "İstatistikler", billing: "Abonelik", referrals: "Davetler", settings: "Ayarlar", admin: "Yönetici" },
  }},
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: "en",
      fallbackLng: "en",
      supportedLngs: ["en", "de", "ar", "fr", "es", "it", "tr"],
      interpolation: { escapeValue: false },
    });
}

export const RTL_LANGS = ["ar"];
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "de", label: "Deutsch",  flag: "🇩🇪" },
  { code: "ar", label: "العربية",  flag: "🇸🇦", rtl: true },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español",  flag: "🇪🇸" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "tr", label: "Türkçe",   flag: "🇹🇷" },
];

export default i18n;
