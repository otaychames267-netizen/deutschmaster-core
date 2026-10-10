// SB Teil 1 restyle — batch 02: [7] Karin (Original), [8] Karin (معدل - Variante 2), [9] Karin (معدل)
// (positions 5 and 6 are on hold: their gap-21 option sets are swapped in the DB — waiting for the owner's decision)
export default {
  // ───────────── [7] Karin ( Original ) ─────────────
  7: {
    21: { ok: "was", type: "pronoun", keyword: "das, was …", bed: "الشي اللي تحب",
      text: `الجملة: "das studieren, … du möchtest": كلمة "das" هنا ما تعنيش اسم محدد، تعني "الشي". وضمير الوصل بعد "das / alles / etwas / nichts" هو "was".\n✓ "was" = الشي اللي (Relativpronomen بعد "das" عام).\n✗ "das" = ضمير وصل لاسم محايد معيّن ("das Fach, das …")، وهنا ما فماش اسم يرجعلو.\n✗ "welches" = لاسم محايد معيّن وبأسلوب رسمي ("das Fach, welches …")، موش بعد "das" العام.`,
      rule: "das / alles / etwas / nichts + was (Relativsatz)", ex: "Ich esse nur das, **was** ich mag.", exTr: "ناكل غير اللي نحب." },
    22: { ok: "denn", type: "adjective_adverb", keyword: "denn (Modalpartikel)", bed: "كيفاش الحال يا ترى؟",
      text: `السؤال "Wie ist es … so an der Uni?" فيه فضول ودّي، ونزيدو كلمة صغيرة تلطّف السؤال: "denn".\n✓ "denn" = Modalpartikel في الأسئلة، تبيّن اهتمام (كيفاش الحال يا ترى؟).\n✗ "doch" = تأكيد أو اعتراض ("Komm doch!")، وما تتركّبش هكا في سؤال عن الحال.\n✗ "mal" = "مرة" للطلبات والاقتراحات ("Sag mal …")، موش في سؤال "Wie ist es …".`,
      rule: "Fragesatz + denn = Interesse zeigen (Wie geht's denn?)", ex: "Wie geht es dir **denn** so?", exTr: "كيفاش حالك توّا، قوللي؟" },
    23: { ok: "noch", type: "adjective_adverb", keyword: "auch noch viel", bed: "زادة (على الباقي) لسّا برشا",
      text: `الفكرة: في الدار زادة لازم تقرا برشا؟ يعني حاجة إضافية فوق اللي عندك في الجامعة. التعبير "auch noch" = زادة على كلشي.\n✓ "noch" = auch noch (إضافة فوق الباقي).\n✗ "dazu" = "على هذا" ويحتاج جملة بعدو ("dazu muss ich lernen")، وما يتركّبش هكا قبل "viel".\n✗ "sogar" = حتى (مفاجأة)، وما تتركّبش مع "auch" بهذا المعنى هنا.`,
      rule: "auch noch = zusätzlich (zu allem anderen)", ex: "Musst du heute auch **noch** arbeiten?", exTr: "لازم زادة تخدم اليوم؟" },
    24: { ok: "annehmen", type: "verb", keyword: "eine Einladung annehmen", bed: "نقبل دعوتك",
      text: `"Einladung" يتركّب مع "annehmen" (نقبل / نوافق).\n✓ "annehmen" = نقبل الدعوة.\n✗ "abnehmen" = ينقص (وزن) أو ياخذ حاجة من شخص، ما يتركّبش مع "Einladung".\n✗ "nehmen" = ياخذ، وما نقولوش "eine Einladung nehmen"؛ التعبير الصحيح بالبادئة "an-".`,
      rule: "eine Einladung annehmen = akzeptieren  ≠  ablehnen", ex: "Ich möchte deine Einladung gern **annehmen**.", exTr: "نحب نقبل دعوتك." },
    25: { ok: "um", type: "verb_prep", keyword: "sich kümmern um", bed: "نهتم بـ (نعتني بـ) يوناس",
      text: `الفعل "sich kümmern" يتركّب دايمًا مع "um" + Akkusativ (يعتني بـ).\n✓ "um" = sich kümmern um.\n✗ "für" = لأجل، وما نقولوش "sich kümmern für".\n✗ "über" = حول / فوق ("sich ärgern über")، وما يتركّبش مع "kümmern".`,
      rule: "sich kümmern um + Akk.", ex: "Ich kümmere mich **um** meine Schwester.", exTr: "نهتم بأختي." },
    26: { ok: "sobald", type: "conjunction", keyword: "sobald = sofort wenn", bed: "أول ما يكون عندو راحة",
      text: `الزيارة تصير في اللحظة اللي يكون فيها Thomas عندو راحة: "أول ما" = sobald.\n✓ "sobald" = أول ما (Nebensatz، والفعل "hat" في الآخر).\n✗ "bevor" = قبل ما، يعني نجي قبل ما تبدا راحتو، والمشكل أصلًا في وقت Thomas.\n✗ "bis" = لين (مدة استنّاء)، والجملة تحكي على لحظة تبدا فيها الراحة موش مدة انتظار.`,
      rule: "sobald + Nebensatz = in dem Moment, wenn …", ex: "**Sobald** ich Zeit habe, rufe ich dich an.", exTr: "أول ما يكون عندي وقت، نكلّمك." },
    27: { ok: "auch wenn", type: "conjunction", keyword: "auch wenn = selbst wenn", bed: "حتى لو (فما خلاف)",
      text: `الجملة تقول: العيش في سكن مشترك حلو، "حتى لو" صار بعض الخلاف: تنازل (Einräumung).\n✓ "auch wenn" = حتى لو (+ فعل في الآخر: "gibt").\n✗ "wenn" = إذا / وقتما، وما تعبّرش على التنازل: كأنو الحلو يصير بشرط وجود خلاف.\n✗ "wenn auch" = بمعنى "وإن كان"، لكن "auch" تجي بعد الفاعل ("wenn es auch Streit gibt")؛ ما نقولوش "wenn auch es".`,
      rule: "auch wenn + Nebensatz (Verb am Ende) = selbst wenn", ex: "**Auch wenn** es regnet, gehen wir spazieren.", exTr: "حتى لو تشتي، نمشيو نتمشّاو." },
    28: { ok: "für", type: "verb_prep", keyword: "sich freuen für jdn.", bed: "فرحان لأجلك",
      text: `"Das freut mich … dich" = فرحان من أجلك لأن حالك مليح: الفرح لأجل شخص آخر يتركّب مع "für".\n✓ "für" = sich freuen für + Person.\n✗ "über" = فرحان بحاجة صارت ("Ich freue mich über das Geschenk")، موش لأجل شخص.\n✗ "an" = نستمتع بحاجة قدامي ("sich an den Blumen freuen")، موش لأجل شخص.`,
      rule: "sich freuen FÜR + Person  |  AUF (جاي)  |  ÜBER (صار)", ex: "Ich freue mich **für** dich!", exTr: "فرحان من أجلك!" },
    29: { ok: "neulich", type: "adjective_adverb", keyword: "neulich", bed: "من مدة قريبة",
      text: `"Wir hatten … überlegt" ماضي (Plusquamperfekt)، يعني نحتاج ظرف يرجع للوراء.\n✓ "neulich" = من مدة قريبة (ماضي).\n✗ "demnächst" = قريب (مستقبل)، يتخالف مع الماضي "hatten … überlegt".\n✗ "noch nicht" = لسّا ما (نفي)، والجملة اللي بعد "aber…" تحكي إنهم فكروا فعلًا.`,
      rule: "neulich = vor kurzer Zeit (Vergangenheit)  |  demnächst = bald (Zukunft)", ex: "Ich habe **neulich** einen alten Freund getroffen.", exTr: "من مدة قريبة لقيت صديق قديم." },
    30: { ok: "wollen", type: "verb", keyword: "sich etwas zumuten", bed: "ما نحبوش نحمّلو أنفسنا برشا",
      text: `"sich nicht viel zumuten" = ما نحمّلوش أنفسنا برشا. والسبب قرار شخصي (الإيجار غالي، فنفضّلو نبقاو)، يعني إرادة.\n✓ "wollen" = إرادة / قرار: ما نحبوش.\n✗ "müssen" = لازم (إلزام)، و"nicht müssen" معناها "ما يلزمناش"، تقلب المعنى.\n✗ "sollen" = كان مفروض / طلب من الغير، وما تعبّرش على قرارنا الشخصي.`,
      rule: "wollen + sich nicht viel zumuten = sich nicht überfordern wollen", ex: "Ich **will** mir nicht zu viel zumuten.", exTr: "ما نحبش نحمّل روحي برشا." },
  },

  // ───────────── [8] Karin (معدل - Variante 2) ─────────────  (21,22,23,25,26,27 reused automatically)
  8: {
    24: { ok: "nebenbei", type: "adjective_adverb", keyword: "nebenbei jobben", bed: "تخدم على الجنب (خدمة جانبية)",
      text: `نسألو: تخدم زادة شوية على الجنب (غير الدراسة)؟ الظرف "nebenbei" = بالتوازي مع الدراسة.\n✓ "nebenbei" = على الجنب / بالإضافة للشغل الرئيسي.\n✗ "dazu" = على هذا / إلى ذلك، يحتاج مرجع قبلو، وما يعطيش معنى "تخدم على الجنب".\n✗ "sogar" = حتى (مفاجأة)، ما تعطيش معنى الخدمة الجانبية.`,
      rule: "nebenbei = zusätzlich zu etwas anderem (neben dem Studium)", ex: "Er studiert und arbeitet **nebenbei** im Café.", exTr: "يقرا ويخدم على الجنب في كافي." },
    28: { ok: "euch", type: "pronoun", keyword: "für euch", bed: "فرحان لأجلكم (إنتِ وزميلاتك)",
      text: `الجملة اللي قبل تتكلم بصيغة الجمع: "ihr euch alle gut versteht" (إنتِ وزميلاتك). والفرح موجّه للمجموعة كلها.\n✓ "euch" = Akkusativ لـ "ihr" (الجمع).\n✗ "dich" = لشخص واحد، وهنا نحكيو على المجموعة (ihr).\n✗ "uns" = نحن (المتكلم)، موش اللي نفرح لأجلهم.`,
      rule: "ihr → euch (Akk.): das Pronomen richtet sich nach dem Satz davor", ex: "Ihr habt gewonnen? Ich freue mich für **euch**!", exTr: "ربحتو؟ فرحان لأجلكم!" },
    29: { reuse: "7#30" },
    30: { ok: "viel", type: "adjective_adverb", keyword: "nicht viel", bed: "برشا (ما نحمّلوش برشا)",
      text: `الجملة: "uns nicht … zumuten" = ما نحمّلوش أنفسنا. بعد "nicht" نحتاج كمية: "viel" (ما نحمّلوش برشا).\n✓ "viel" = nicht viel (كمية كبيرة منفية).\n✗ "wenig" = شوية: "nicht wenig zumuten" يعني نحمّلو برشا (نفي + قليل = كثير)، تقلب المعنى.\n✗ "nicht" = مكرّرة، و"nicht nicht" ما تتركّبش.`,
      rule: "(sich) nicht viel zumuten = sich wenig aufbürden", ex: "Du solltest dir nicht **zu viel** zumuten.", exTr: "ما تحمّلش روحك برشا." },
  },

  // ───────────── [9] Karin (معدل) ─────────────  (21,22,23,25,26,27,29,30 reused automatically)
  9: {
    24: { ok: "nebenbei", type: "adjective_adverb", keyword: "nebenbei", bed: "على الجنب (بالتوازي)",
      text: `"Jobbst du noch … ?" = تخدم زادة على الجنب؟ الظرف المعتاد "nebenbei" (بالتوازي مع الدراسة).\n✓ "nebenbei" = على الجنب (ظرف).\n✗ "neben" = حرف جر (جنب)، ياخذ اسم بعدو ("neben dem Studium")، وما ينفعش وحدو في آخر الجملة.\n✗ "eben" = "هكا / توّا" (ظرف أو Partikel)، وما يعطيش معنى الخدمة الجانبية.`,
      rule: "nebenbei (Adverb)  ≠  neben + Dativ (Präposition)", ex: "**Nebenbei** arbeitet sie in einer Bäckerei.", exTr: "على الجنب تخدم في مخبزة." },
    28: { ok: "Ihr", type: "pronoun", keyword: "ihr euch versteht", bed: "إنتو تتفاهمو مع بعضكم",
      text: `الفعل "versteht" (ihr) ينجّم يجي بعد "euch"، يعني الجملة تحتاج فاعل (Subjekt): "ihr".\n✓ "Ihr" = الفاعل (إنتم)، وتكمل "euch" كـ Reflexivpronomen: "ihr euch versteht".\n✗ "euch" = موجودة بعد الفراغ، وما نجّمش نحطوها مرتين ونبقاو بلا فاعل.\n✗ "Sich" = انعكاسي لغائب (er / sie / sie)، ما يطابقش "ihr" ولا الفعل "versteht".`,
      rule: "Subjekt ihr + Reflexivpronomen euch: ihr versteht euch", ex: "**Ihr** versteht euch wirklich gut.", exTr: "إنتو تتفاهمو بعضكم مليح بالحق." },
  },
};
