import fs from "node:fs";
const env = {};
for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ""); }
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", Prefer: "return=representation" };
const id = "5dd2eb0c-5b6c-4351-8d64-a9d004522788";
// 1,2,3,4,7,8,9 = zertify's own Arabic (name spelling unified to "ماتياس"); 5,6,10 are not translated on zertify -> 6 reuses the identical statement's translation already in our DB, 5 and 10 written here
const questions = {
  "1": "يعمل ماتياس الآن تقريبًا بالتساوي كمدرس وكأخصائي في رعاية الأشجار.",
  "2": "يعمل ماتياس بشكل رئيسي في المناطق الحضرية.",
  "3": "كان العمل كراعي أشجار هو حلم ماتياس منذ الطفولة.",
  "4": "يستخدم ماتياس عادةً رافعة لرفع الأشياء في المدن.",
  "5": "يفحص ماتياس، بصفته أخصائيًا في رعاية الأشجار، الأشجار من حيث سلامتها المرورية (ألّا تشكّل خطرًا على الناس والطرق).",
  "6": "لا يحتاج ماتياس للعناية المهنية بالأشجار سوى إلى أدوات عمل قليلة ورخيصة.",
  "7": "يتعلق الأمر بشجرة واحدة، يبلغ عمر جذعها حوالي 80,000 سنة.",
  "8": "لأسباب تتعلق بالسلامة، لا يُسمح لماتياس بالعمل بمفرده في أعمال التسلق بشكل عام.",
  "9": "ماتياس تعرض لحادث خطير أثناء عمله بالفعل.",
  "10": "يستخدم ماتياس رعاية الأشجار كوسيلة لتحقيق التوازن مع مهنته الأخرى.",
};
const cur = (await (await fetch(`${env.SUPABASE_URL}/rest/v1/hoeren_exercises?select=learning_aids&id=eq.${id}`, { headers: H })).json())[0];
const aids = { ...(cur.learning_aids ?? {}), translation: { questions } };
const r = await fetch(`${env.SUPABASE_URL}/rest/v1/hoeren_exercises?id=eq.${id}`, { method: "PATCH", headers: H, body: JSON.stringify({ learning_aids: aids }) });
console.log("patch", r.status);
const back = (await (await fetch(`${env.SUPABASE_URL}/rest/v1/hoeren_exercises?select=title,learning_aids&id=eq.${id}`, { headers: H })).json())[0];
console.log(back.title, Object.keys(back.learning_aids), Object.keys(back.learning_aids.translation.questions).length);
