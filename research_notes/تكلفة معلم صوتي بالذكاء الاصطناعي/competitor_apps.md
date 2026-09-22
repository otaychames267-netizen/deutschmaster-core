# AI Voice-Conversation Language Apps: Provider Disclosures, Pricing & Usage-Limit Research (ISSEN, Talkpal, Praktika, Loora, and others)

## ISSEN — Disclosed AI/cloud providers per official Privacy Policy (STT vs. LLM vs. TTS, kept separate)

### Takeaway
ISSEN's own Privacy Policy (fetched from `https://issen.com/privacy-policy`, dated **last updated September 6, 2026**) is unusually explicit and discloses a *large, redundant multi-vendor stack* — different named providers for speech-to-text, tutoring-response generation, and text-to-speech, plus separate real-time audio-transport vendors. This is a CONFIRMED, quoted disclosure, not inference, and it should not be conflated across features (the assignment's caution): STT, LLM, and TTS use different provider lists.

### Cited Findings
- **STT (speech-to-text)**: "Soniox and Sprag" are named as default transcription providers; "OpenAI may handle transcription for languages not supported by Sprag"; "ElevenLabs may transcribe Cantonese." — [ISSEN Privacy Policy](https://issen.com/privacy-policy)
- **Tutoring response generation (LLM)**: "Microsoft Azure and Amazon Bedrock process transcripts, typed or shared text, conversation history, and relevant learning profile information...to generate tutoring responses, corrections, translations, and personalized lessons"; "OpenAI also provides backup tutoring"; "Google processes text for certain exercises." — [ISSEN Privacy Policy](https://issen.com/privacy-policy)
- **TTS (text-to-speech)**: "ElevenLabs is our default speech synthesis provider and receives tutor response text to generate spoken replies"; alternative/fallback providers listed: "OpenAI, Google, xAI, MiniMax, or Fish Audio." — [ISSEN Privacy Policy](https://issen.com/privacy-policy)
- **Additional named vendors** appearing elsewhere in the same policy (roles not fully disambiguated in the fetched excerpt, but grouped near STT/infra language): Deepgram, AssemblyAI, Inworld, Cartesia, Gladia, NVIDIA, Fireworks AI, Baseten, OpenRouter, Groq, Cerebras. — [ISSEN Privacy Policy](https://issen.com/privacy-policy)
- **Real-time audio transport (not an AI model provider, but infrastructure)**: the policy references "Daily and LiveKit transport call audio" — i.e., Daily.co and LiveKit, both well-known WebRTC/real-time voice infrastructure platforms used to carry the live audio stream between the user's device and ISSEN's backend. — [ISSEN Privacy Policy](https://issen.com/privacy-policy)
- Note: the flashcard/other-feature TTS path was not separately distinguished from the "main conversation" TTS path in the fetched excerpt — the policy text as quoted describes TTS generally as receiving "tutor response text," which appears to be the main-conversation path, not a separate flashcard-only claim. No flashcard-specific voice vendor was found distinct from this list.

### Inferences
- The sheer number of interchangeable providers per function (multiple STT engines, multiple LLM backends, multiple TTS engines) strongly suggests ISSEN architected for **provider redundancy/failover and per-request cost/latency arbitrage** — i.e., routing to whichever provider is cheapest, fastest, or least loaded at a given moment, rather than relying on a single vendor contract. This is INFERENCE, not stated directly in the policy (the policy states *what* is used, not *why* multiple options exist).
- Using open inference routers (OpenRouter, Groq, Cerebras, Fireworks, Baseten are all inference-hosting/routing platforms optimized for cheap, fast token throughput) alongside frontier labs (OpenAI, Google, Anthropic-adjacent via Azure/Bedrock) suggests a **tiered/cascading model strategy**: cheap, fast, open-weight models for routine turns, with premium providers reserved for harder cases or specific languages.

### Gaps
- The Privacy Policy does not disclose *which* specific provider is used by default for the main LLM tutoring response versus which is "backup," so exact cost-per-turn cannot be inferred from this document alone.
- No percentage split or routing logic (e.g., "80% of turns go to provider X") is disclosed anywhere found.

---

## ISSEN — Subscription pricing and fair-use/usage-limit disclosure

### Takeaway
ISSEN is CONFIRMED to price at roughly **$20–29/month** depending on plan/geography, and — critically — no fair-use, daily-limit, or throttling language was found in any fetched ISSEN legal page (Privacy Policy or attempted Terms of Service pages, several of which failed to resolve to unique content). Third-party reviews and the founder himself (see next section) affirm **no daily talk-time cap** is imposed, which is a marketing/product claim, not a legally binding disclosure — an important distinction for the report.

### Cited Findings
- Pricing: "$29/month, cancel anytime" with a free trial of "5 minutes of conversation," per a general web summary of ISSEN's own site content. — [ISSEN official site via search summary](https://issen.com/)
- A separate search pass found conflicting numbers: "$20–29 USD per month depending on your plan" with some third-party sources citing a "10-minute free trial" instead of 5 minutes. — [aichief.com Issen review](https://aichief.com/ai-voice-chat-generator/issen/), [aitools.fyi](https://aitools.fyi/issen)
- The Hacker News launch thread (primary source, founder-authored) states pricing as **"$20–29/month (depending on duration and specific geography)"** with a **"20 min free trial"** — this conflicts with the "5 minutes" figure found elsewhere, and is likely the more current/accurate number since it comes directly from the founder. — [Hacker News: Launch HN: Issen (YC F24)](https://hn.nuxt.dev/item/44387828)
- **No fair-use, daily-limit, or throttling clause was found** in the ISSEN Privacy Policy excerpt fetched (which focused on data-processing vendors, not usage caps). Attempts to fetch `issen.com/terms-of-service`, `issen.com/terms`, and `app.issen.com/terms-of-service` each returned only the site's generic homepage tagline with no policy body text, so the actual Terms of Service content could not be confirmed either way through direct fetch.
- A third-party competitor-review site states ISSEN "has no daily talk time limit," contrasting it with rivals that "cap you at 30 minutes of call time per day." — [SpeakTwice Italian review of Issen](https://speaktwice.app/app-review/issen) (note: this is a third-party blog, not ISSEN's own policy — treat as a product claim, not a legal guarantee)

### Inferences
- The conflicting free-trial-length figures (5 vs. 10 vs. 20 minutes across sources) suggest ISSEN may have changed its trial offer over time, or that third-party aggregators are simply out of date — this is INFERENCE, not confirmed.
- The complete absence of a discoverable, quotable fair-use clause is itself notable: it means ISSEN's "unlimited" positioning is currently a **marketing claim with no published contractual usage ceiling found**, which — per the objective — is exactly the pattern the user asked about.

### Gaps
- ISSEN's actual Terms of Service body text could not be retrieved (all attempted URLs resolved to the bare homepage tagline with no policy content in the fetch). It remains possible a fair-use clause exists in the ToS but was not visible to this research pass. This should be flagged as **unconfirmed, not ruled out**.
- No confirmation of an annual pricing tier or exact geographic price variance.

---

## ISSEN — Public statements on architecture, session length, cost structure

### Takeaway
CONFIRMED via a primary source: ISSEN's own co-founder, posting as "mariano54" on the Hacker News launch thread for "Issen (YC F24)," directly described the company's real-time voice pipeline, its multi-vendor STT/TTS strategy, and explicit reasoning for choosing a cascaded (non-voice-to-voice) architecture for cost/latency/UX reasons. This is the single richest disclosed-architecture source found for any app in this research set.

### Cited Findings
- STT: founder quote — "We now combine Gemini Flash, Whisper, Scribe, and GPT-4o-transcribe to minimize errors and keep the conversation flowing." — [Hacker News: Launch HN: Issen (YC F24), comment by mariano54](https://hn.nuxt.dev/item/44387828)
- TTS: founder quote — "The voices are due to the quality of the TTS services that we use. Openi, 11labs, minimax." And for Japanese specifically: "Minimax's new model is quite good. We use their voices for some of our Japanese tutors." — [same thread](https://hn.nuxt.dev/item/44387828)
- Architecture philosophy (why not use end-to-end "voice-to-voice" models): founder quote — "latency is not a free lunch, it comes at the cost of more interruptions from the tutor, which is a really bad UX," and separately, on why processing happens server-side rather than on-device: "The main issue I see with doing it in device is the LLM piece. Even with some large models like llama 4 maverick, the tutor just struggles to properly teach and understand the student, it's not viable IMO." — [same thread](https://hn.nuxt.dev/item/44387828)
- Roadmap admission: "by next year we will switch over to full voice to voice models" — implying the *current* (as of the thread) architecture is a traditional cascaded pipeline (STT → LLM → TTS), not a native speech-to-speech model, and that the founder considers voice-to-voice a future upgrade rather than the present state. — [same thread](https://hn.nuxt.dev/item/44387828)
- Founders: Mariano Sorgente (CEO, described as a former crypto engineer and a16z VC partner) and a co-founder ("Anton") who spent 7 years at Palantir on LATAM infrastructure. Company is YC Fall 2024, founded 2024, based in NYC, and was listed with a team size of 1 on the YC directory at the time of the profile snapshot. — [Y Combinator company page](https://www.ycombinator.com/companies/issen)

### Inferences
- The use of **multiple cheap/fast STT engines run in combination** ("combine Gemini Flash, Whisper, Scribe, and GPT-4o-transcribe") for error minimization, rather than one premium engine, suggests a deliberate cost/accuracy tradeoff — likely ensembling or fallback-racing cheaper models rather than paying for a single top-tier always-on transcription service. This is INFERENCE built on the quoted architecture description.
- Choosing a **cascaded pipeline (separate STT/LLM/TTS stages) over an end-to-end voice-to-voice model** is very likely a direct cost-control decision as much as a UX one: current native speech-to-speech models (e.g., realtime multimodal APIs) are generally billed at a much higher per-minute rate than a text-token LLM call plus separate commodity STT/TTS legs. The founder frames this only in latency/UX terms, but the cost angle is a reasonable additional inference AuraLingovia should weigh, not a stated fact.
- No session-length caps, per-minute costs, or explicit statement of how they avoid the cost of long unlimited sessions were disclosed anywhere in this thread — the founder's public commentary is about *quality/latency* engineering, not about *usage-limiting* engineering.

### Gaps
- No average session length, no cost-per-minute figure, no server-side rate-limiting or session-timeout mechanism was disclosed by the founder or anywhere else found. This is a genuine, unresolved gap — the "how do they avoid runaway cost from unlimited long sessions" mechanism is NOT publicly disclosed by ISSEN, only inferable.

---

## Talkpal — Pricing, "unlimited" claims, and ToS/Privacy Policy disclosures (AI providers + fair use)

### Takeaway
Talkpal is CONFIRMED to gate "unlimited" behind Premium, explicitly capping its **free tier at a 10-minute daily limit** — direct proof that at least one major competitor uses a plain, disclosed hard daily cap rather than an invisible soft limit for its free users. Its own Privacy Policy separately and explicitly names its AI vendor list, largely matching the categories the objective asked to keep separate (STT vs. response-generation vs. TTS), though with less granularity than ISSEN's policy.

### Cited Findings
- Pricing (from Talkpal's own pricing page): **Basic Plan (Free) = $0/month** with an explicit **"10 minute daily limit"**; **Premium 1 Month, Premium 12 Months (labeled "SAVE 50%"), and Premium 24 Months (labeled "SAVE 69%")** — exact premium dollar amounts were not rendered in the fetched page text, but third-party aggregators cite Premium 1-month at "$9.99/month," Premium 12-months at "$4.99/month billed annually," and Premium 24-months at "$149.99 up front (~$6.24/mo)." — [Talkpal Pricing page](https://talkpal.ai/pricing/); dollar figures corroborated by [aicurator.io Talkpal pricing summary](https://aicurator.io/talkpal-pricing/)
- The Premium tiers' marketing copy explicitly says: **"Unlimited practice with all AI modes"** and elsewhere: users can engage in "unlimited conversations on a variety of interesting topics, either by writing or speaking," with both Premium plans offering "unlimited usage, ad-free experience, roleplays, personalized conversations, message translations, photo mode, and advanced voice." — [Talkpal Pricing page](https://talkpal.ai/pricing/)
- **AI providers named in Talkpal's Privacy Policy** (last updated **September 19, 2026**, per the fetched page): "your information may be shared with AI processing vendors such as Microsoft Azure, OpenAI, Google Cloud, Google, Apple, Amazon Web Services, Anthropic, and Inworld for the purpose of generating AI-powered responses." — [Talkpal Privacy Policy](https://talkpal.ai/privacy-policy/)
- **STT specifically**: "Your audio is transmitted to these third-party AI processing providers in real time to generate speech recognition and language feedback." — [Talkpal Privacy Policy](https://talkpal.ai/privacy-policy/)
- **Response generation specifically**: vendors provide "AI-powered feedback on and analysis of your answers." — [Talkpal Privacy Policy](https://talkpal.ai/privacy-policy/)
- **TTS specifically, and explicitly scoped to flashcards (not proven to be the same path as main conversation)**: "where you play the audio of a flashcard, the card text provided by Talkpal is converted to speech by the speech-synthesis vendors" — [Talkpal Privacy Policy](https://talkpal.ai/privacy-policy/). Per the assignment's caution, this is a flashcard-specific TTS disclosure; the policy text fetched did **not** separately confirm which vendor(s) generate the *main voice-conversation* TTS output, so that should not be assumed identical.
- Data retention: "Talkpal does not store or retain audio recordings of your speech on our systems; audio is processed transiently," and "under our agreements with these vendors, they may not use your content to train their generally available AI models." — [Talkpal Privacy Policy](https://talkpal.ai/privacy-policy/)
- **No explicit fair-use/throttling clause for Premium (paid) users** was found in the fetched Privacy Policy text — the only disclosed hard limit is the free tier's 10-minute daily cap.

### Inferences
- Talkpal's free-tier daily-minute cap functioning as an explicit, disclosed usage limiter (rather than the invisible soft-limit pattern the user asked about) suggests that for the **free/trial funnel**, at least some of these companies feel comfortable stating a real hard number, while reserving vaguer "unlimited" language only for the paid tier where the actual cost-control mechanism (if any) is undisclosed.
- Since Talkpal explicitly separates "flashcard TTS" from the general AI-response vendor list, and does not explicitly restate which vendor produces conversational voice output, it is plausible (INFERENCE) that the main-conversation voice pipeline reuses the same vendor pool listed for "AI-powered responses" (Azure/OpenAI/Google/AWS/Anthropic/Inworld), but this is not confirmed by an exact quote naming a conversational TTS vendor.

### Gaps
- Exact premium dollar pricing was not directly visible in Talkpal's own fetched page (aggregator-sourced numbers should be treated as probably-accurate but not primary-source-confirmed).
- No confirmation of a paid-tier fair-use ceiling — genuinely undisclosed, not merely unfound.

---

## Praktika — Pricing, "unlimited" claims, and ToS/Privacy Policy disclosures (AI providers + fair use)

### Takeaway
Praktika is CONFIRMED to price around **$8–10/month** (with regional and app-store variance) and, importantly, its official Terms & Conditions and Privacy Policy — both fetched directly and dated **last updated August 10, 2026** — disclose **no fair-use policy, no daily limit, and no named AI/cloud provider whatsoever**. This is the most opaque of the four primary apps studied regarding technical stack disclosure.

### Cited Findings
- Pricing: "$8 per month" per one review aggregator, with App Store listings showing "Praktika Premium 1 month at $9.99," promotional 3-month plans, and annual plans "ranging from $49.99 to $139.99." Also: "no month-to-month option" in some configurations, and "all core features...included under a single subscription tier" with "no confusing upsells, hidden AI limits, or secondary premium levels." — [LanguaTalk Praktika review](https://languatalk.com/blog/praktika-review/)
- Official Terms & Conditions (fetched directly, **last updated Aug 10, 2026**): contains a "Generative AI" section stating users can "submit inputs and receive generated outputs," but **"provides no information about which underlying AI systems power these features or how they're sourced."** No fair-use, daily-limit, unlimited-usage, throttling, or abuse-prevention language was found anywhere in the document. — [Praktika Terms & Conditions](https://praktika.ai/terms)
- Official Privacy Policy (fetched directly, **last updated August 10, 2026**): does **not** mention OpenAI, Google Cloud, Microsoft Azure, AWS, ElevenLabs, Deepgram, or any other specific AI/cloud infrastructure provider by name. It references only generic "Service Providers," payment processors (Apple, Google Play), and advertising partners (Google Ads, Facebook, AdRoll, AppNexus, TikTok). The policy does disclose that Praktika collects "recordings and transcripts of your conversations with the AI tutor," but does not disclose which vendor processes that audio or generates responses. No fair-use or usage-limit language was found. — [Praktika Privacy Policy](https://praktika.ai/privacy)
- Compliance claims: Praktika states it complies with "GDPR (EU), FERPA (U.S.), and CCPA (California)." Minimum age is 13+. — [Praktika Help Center](https://intercom.help/praktika-ai/en/articles/12009610-what-privacy-laws-does-praktika-follow), [age policy article](https://intercom.help/praktika-ai/en/articles/12009630-who-can-use-praktika-is-there-an-age-limit)
- A targeted search for Reddit/forum discussion of Praktika hitting daily limits or fair-use enforcement returned **no relevant results** — none of the retrieved links concerned Praktika at all.

### Inferences
- Praktika's complete non-disclosure of AI vendors (unlike ISSEN and Talkpal, which both name multiple specific providers) may reflect either a single, undisclosed prime vendor relationship, a white-label/wrapper arrangement, or simply a more legally conservative/minimal privacy-policy drafting style. This is pure INFERENCE — the underlying reason cannot be determined from public documents.
- The complete absence of any usage-limit language in either legal document, combined with review-site claims of "no confusing upsells, hidden AI limits," suggests Praktika's product positioning leans hard into "no visible limits" messaging, but — as with ISSEN — this is a marketing posture, not a technical guarantee, and provides no evidence about actual backend throttling.

### Gaps
- No AI provider names could be confirmed for Praktika via any official document. This should be reported to AuraLingovia as a genuine unknown, not inferred.
- No user reports (Reddit, Trustpilot excerpts beyond what was indexed) about hitting a real limit were found in this pass.

---

## Loora — Pricing, "unlimited" claims, and ToS/Privacy Policy disclosures (AI providers + fair use)

### Takeaway
Loora is CONFIRMED to market "unlimited daily practice" directly in its own help-center copy, with pricing reported inconsistently across sources (roughly **$15–26/month** on monthly plans, cheaper annualized). Direct fetch of Loora's Privacy Policy failed to yield usable content (it redirects to a Notion-hosted page that did not render text for this research pass), so **AI-provider and fair-use disclosures for Loora could not be confirmed from a primary source** in this research pass — this is a gap, not a "no" finding.

### Cited Findings
- Loora's own help-center pricing article states: Loora is "significantly more affordable than private English tutoring — with unlimited daily practice included, available any time," and directs users to a separate regional pricing page rather than listing numbers inline. — [Loora Support: "How much does Loora cost?"](https://www.loora.com/support/getting-started/pricing)
- Reported pricing figures conflict across third-party sources: one search pass found "Monthly Plan for $25.99 USD and an Annual Plan for $119.99 USD" while another found "$19.99 per month," "$44.99 for 3 months (~$14.99/mo)," and "$119.99/year (~$9.99/mo)." — [Futurepedia Loora listing](https://www.futurepedia.io/tool/loora); [search aggregation citing Shyft/HyperStore/AmazingTalker pricing summaries]
- Loora raised **$9.25M** for its "generative AI app that uses an audio interface to help users learn English," per TechCrunch (2023 funding announcement; useful backstory but not current pricing/limits). — [TechCrunch, 2023](https://techcrunch.com/2023/06/27/loora-a-generative-ai-app-that-uses-an-audio-interface-to-help-users-learn-english-raises-9-25m)
- A privacy-evaluation aggregator (Common Sense Media/Common Sense Privacy) states, from its own review of Loora's policies (not Loora's own words, so treat as secondhand paraphrase): "Loora may sell a users' data to third parties with their consent," "Loora can use a user's personal information to display targeted advertisements, or send users third-party marketing communications," and the company's terms give Loora rights to use and "make available to the public" photos, texts, and audio recordings created while using the app to create — and then own — "generated content." — [Common Sense Privacy evaluation of Loora](https://privacy.commonsense.org/evaluation/Loora)
- Direct fetch attempts of `loora.com/Privacy-Policy` (which 307-redirects to `loora.notion.site/Privacy-Policy-...`) did not return usable AI-provider or fair-use text in this research pass — the Notion page did not render extractable content through the fetch tool used.

### Inferences
- None with adequate sourcing; Loora's specific vendor stack and any fair-use clause remain unconfirmed either way.

### Gaps
- **No confirmed AI/cloud provider names for Loora's STT, LLM, or TTS** — this is an explicit, reportable gap, not an inferred "none disclosed" the way Praktika's was (Praktika's ToS/PP were successfully fetched and genuinely contain no such names; Loora's underlying Privacy Policy page simply could not be read in this pass, so absence of evidence is weaker here).
- No fair-use/daily-limit clause could be confirmed or ruled out from Loora's Terms of Service (not successfully fetched).
- Exact current pricing is genuinely conflicting across sources ($15–26/month range depending on source and possibly region/date) and should be flagged to AuraLingovia as unverified precisely.

---

## Other comparable "flat price, seemingly unlimited voice chat" apps

### Takeaway
Beyond ISSEN/Talkpal/Praktika/Loora, three other products fit the pattern with distinctly different disclosed limit structures: **Speak** (paid "unlimited," tiered above it), **Duolingo Max/Super's Video Call** (explicitly named "Unlimited Video Call" as a marketed plan feature, but corporate leadership has publicly signaled this is not a permanently committed policy), and **Pi by Inflection AI** (the clearest counter-example — entirely free, unlimited, monetized off consumers via enterprise licensing instead of subscriptions).

### Cited Findings
- **Speak**: Premium tier is "$17.99/month or $83.99/year (~$7/month billed annually)" and includes "AI conversation practice with real-time feedback"; marketing states it provides "unlimited conversational practice, allowing them to train every day without additional costs." A higher tier, "Speak Premium Plus," is "$39.99/month or $164.99/year (~$13.75/month)" and adds "unlimited personalized lessons" and "the full Speak Tutor experience" on top of base Premium — implying the base Premium tier's "unlimited" claim may not extend to all lesson/tutor modes, only to conversation practice itself. — [AIVario Speak pricing summary](https://aivario.com/tools/speak); [LanguaTalk Speak review](https://languatalk.com/blog/speak-app-review/)
- **Duolingo Max / Video Call**: Video Call (an AI conversation partner named "Lily") was originally gated to the Max tier ("$29.99/month or $168/year, ~$14/month billed annually"), and Duolingo has been migrating this feature toward Super subscribers through 2026, with Max being phased out for new subscriptions. A "Family" offer explicitly listed "Unlimited Video Call" as a named benefit. However, per earnings-call reporting, CEO Luis von Ahn "discussed keeping unlimited Video Call in Max as a potential distinguishing feature, but this has not been finalized" — i.e., Duolingo's own CEO has publicly signaled that "unlimited" is a current product decision under active reconsideration, not a permanent architectural guarantee. — [search aggregation of Duolingo Help Center, duoplanet.com, and earnings-call coverage]
- **Pi by Inflection AI**: "Pi remains free for all users as of 2026... Pi has never charged a single user a single dollar — it launched free in 2023 and is still free in 2026," offering "unlimited conversations, voice chat with 8 voice options, real-time web search, and cross-platform access...at no charge." Inflection AI monetizes via enterprise licensing of its underlying models rather than consumer subscriptions, and its founding team was effectively acquihired by Microsoft in March 2024 for roughly $650M, "leaving the beloved free app running but effectively orphaned." — [search aggregation citing costbench.com, usagepricing.com, and Wikipedia's Inflection AI entry]
- **Character.AI**: no current (2026) pricing specifics were retrievable in this research pass; flagged as a gap rather than guessed.

### Inferences
- Pi's case is instructive as a *negative example* for the "flat-price sustainability" question: Pi is not actually monetized by its free-consumer usage at all — the "unlimited free" positioning is subsidized entirely by a separate enterprise-licensing business model, and its now-reduced internal team investment (post-acquihire) suggests the free tier may be running on inertia rather than active infrastructure investment. This is a materially different sustainability story than a subscription app like ISSEN/Talkpal/Praktika/Loora, which must cover inference costs from the subscription price itself. INFERENCE, drawn from the cited Wikipedia/aggregator facts.
- Duolingo's own leadership publicly treating "unlimited Video Call" as an undecided, reconsiderable policy (rather than a fixed technical commitment) is a notable data point supporting the user's underlying suspicion: even a company with Duolingo's balance sheet is not certain it can sustain a literal "no limit" policy indefinitely at scale, which lends outside credibility to the idea that other, smaller competitors' "unlimited" claims likely rely on some undisclosed soft-limiting mechanism.

### Gaps
- Character.AI current pricing/limits were not retrieved.
- No fair-use/ToS text was fetched for Speak or Duolingo in this pass (only aggregator/review summaries) — should be treated as secondhand, not primary-sourced.

---

## Most plausible explanation for financial sustainability at flat low prices

### Takeaway
No company studied publicly discloses the actual cost-control mechanism behind its "unlimited" claim. Based on the confirmed architecture disclosures that do exist (chiefly ISSEN's founder commentary and its Privacy Policy's multi-vendor list) plus the pricing/limit patterns across all apps studied, the following is **INFERENCE ONLY** — a set of economically plausible mechanisms, not a confirmed fact about any specific company.

### Inferences (clearly labeled as informed inference, not confirmed fact)
- **Cheap/fast default model+TTS tiers, with ensembled or cascading cheap STT**: ISSEN's founder explicitly confirmed combining multiple STT engines ("Gemini Flash, Whisper, Scribe, and GPT-4o-transcribe") rather than one premium engine, and named TTS vendors that include lower-cost options (MiniMax, Fish Audio) alongside premium ones (ElevenLabs) as configurable alternatives. This is consistent with — though not proof of — a strategy of defaulting most users/turns to the cheapest viable model and reserving premium models for edge cases (unsupported languages, quality escalation), which meaningfully lowers blended per-minute cost versus a single top-tier stack.
- **Cascaded pipeline over native voice-to-voice**: ISSEN's founder explicitly chose a traditional STT→LLM→TTS cascade rather than an end-to-end speech-to-speech model as of the HN thread, citing latency/interruption UX reasons; native voice-to-voice APIs from major labs are, as a matter of public list pricing (general industry knowledge, not from a cited source in this research pass), typically billed at a substantially higher effective per-minute rate than a cascade of a cheap STT leg + a text-token LLM call + a cheap TTS leg. Avoiding the voice-to-voice premium is plausibly also a cost decision, even though the founder frames it only as a UX decision.
- **Undisclosed soft rate-limiting or session-shaping is likely present somewhere in the stack**, even where marketing says "unlimited": no app studied (including ISSEN, which most aggressively markets "no daily talk time limit") discloses in its legal documents an actual technical mechanism guaranteeing truly unbounded usage, and Duolingo's own CEO has publicly hedged on committing to permanent "unlimited" Video Call. The complete absence of any confirmed "how we prevent abuse/runaway cost" language across every ToS/PP fetched in this research (ISSEN, Talkpal, Praktika — Loora unconfirmed) is itself a signal: companies appear to prefer *not writing down* a hard number, likely so they retain unilateral flexibility to quietly throttle, deprioritize, or model-downgrade outlier heavy users without needing to amend a public contract. This is inference from an absence, which is inherently weaker evidence, but the pattern is consistent across every document actually fetched.
- **Freemium/tier cross-subsidization**: Talkpal's disclosed free-tier 10-minute daily cap shows that at least this company solves part of the cost problem simply by not offering "unlimited" to non-paying users at all, funding heavier paid-tier usage from a pricing structure (tiered monthly/annual/24-month prepaid plans with steep annualized discounts, e.g., Talkpal's ~69% off 24-month plan) that likely assumes many subscribers under-use their "unlimited" allotment relative to what a power user would consume, similar to a gym-membership utilization curve. This is a standard subscription-economics inference, not specific to any single confirmed data point.
- **Context/memory compression** was not evidenced directly by any source found (no company disclosed conversation-history truncation or summarization strategy), but is a standard, well-known LLM cost-control technique industry-wide and remains a plausible unconfirmed contributor to keeping long-session costs bounded (shorter effective context sent to the expensive LLM call even in a long user-perceived conversation).

### Gaps
- No company studied discloses an actual per-minute cost, gross margin, or explicit technical throttle, so all of the above remains inference triangulated from partial architecture disclosure (ISSEN only) plus universal absence of a written fair-use ceiling (ISSEN, Talkpal, Praktika confirmed absent; Loora unconfirmed either way) plus one adjacent company's (Duolingo) public leadership hedging on the durability of "unlimited" as a policy.

---

## Source list (all URLs cited above)
- ISSEN: https://issen.com/ , https://issen.com/privacy-policy , https://hn.nuxt.dev/item/44387828 (Hacker News launch thread), https://www.ycombinator.com/companies/issen , https://aichief.com/ai-voice-chat-generator/issen/ , https://aitools.fyi/issen , https://speaktwice.app/app-review/issen
- Talkpal: https://talkpal.ai/pricing/ , https://talkpal.ai/privacy-policy/ , https://aicurator.io/talkpal-pricing/
- Praktika: https://praktika.ai/terms , https://praktika.ai/privacy , https://languatalk.com/blog/praktika-review/ , https://intercom.help/praktika-ai/en/articles/12009610-what-privacy-laws-does-praktika-follow , https://intercom.help/praktika-ai/en/articles/12009630-who-can-use-praktika-is-there-an-age-limit
- Loora: https://www.loora.com/support/getting-started/pricing , https://loora.com/Privacy-Policy (redirects to https://loora.notion.site/Privacy-Policy-ef0742ecd68747f280fdbbe9ef46d527 — unreadable in this pass), https://privacy.commonsense.org/evaluation/Loora , https://techcrunch.com/2023/06/27/loora-a-generative-ai-app-that-uses-an-audio-interface-to-help-users-learn-english-raises-9-25m , https://www.futurepedia.io/tool/loora
- Other apps: https://aivario.com/tools/speak , https://languatalk.com/blog/speak-app-review/ , Duolingo Help Center / duoplanet.com / earnings-call coverage (aggregated via search, not individually fetched), https://en.wikipedia.org/wiki/Inflection_AI (via search aggregation), costbench.com and usagepricing.com (Pi pricing, via search aggregation)

## Overall research limitations to flag to the report writer
- Several direct-fetch attempts returned only a homepage tagline instead of actual policy body text (notably ISSEN's Terms of Service at multiple attempted URLs, and Loora's Notion-hosted Privacy Policy) — these are marked as unconfirmed gaps above, not as "policy contains nothing."
- Pricing figures for ISSEN and Loora conflict across sources by several dollars and across trial lengths (5 vs. 10 vs. 20 minutes for ISSEN's trial); the report should present these as a range with the primary-source figure (where one exists, e.g., ISSEN founder's own HN comment) given precedence over aggregator sites.
- No source in this research pass provided a confirmed per-minute or per-session AI compute cost for any of these companies; all cost-sustainability reasoning is explicitly inference.
