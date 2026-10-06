// v2 (B2-style): Clara arbeitet noch zwei Wochen, hat dann Urlaub und möchte neue Kleidung kaufen; sie fragt nach einem gemeinsamen Einkauf, Online-Erfahrungen, Lieblingsorten zum Kleiderkaufen und Urlaubsplänen. Points: Ihre Erfahrungen mit Online-Shopping ·
// wo Sie lieber Kleidung kaufen · Ihre Urlaubspläne für diesen Sommer · ob Sie mit Clara einkaufen gehen möchten — plus: "Kaufst du lieber online oder in Geschäften?", "Schreib mir bitte bald".
export const kw = [/online|Online|Internet|Shopping|bestell/i, /Geschäft|Laden|Kleidung|kaufe|anprobieren|Läden/i, /Urlaub|Ferien|Reise|verreis|fahre/i, /einkaufen|Einkaufen|shoppen|mitgehen|mitkommen/i, /Sommer/];
export default [
  // 1
  { label: "herzlich, ausführlich", t: `Liebe [[Name der Freundin|Clara]],

deine E-Mail kam genau zur richtigen Zeit! Schön, dass du bald Urlaub hast. [[Reaktion auf den Urlaub|Nach den zwei Wochen Arbeit hast du dir die Erholung wirklich verdient]]. Ich wünsche dir viel Kraft für die Arbeitstage.

Du fragst nach Online-Shopping: [[Erfahrung mit Online-Shopping|Ich habe schon oft Kleidung im Internet bestellt, meistens war ich zufrieden]]. Der Vorteil ist, dass [[Vorteil des Online-Kaufs|man in Ruhe vergleichen kann und die Auswahl riesig ist]]. Ein Nachteil ist, dass [[Nachteil des Online-Kaufs|die Größen manchmal nicht passen und man zurückschicken muss]].

Ich kaufe Kleidung lieber [[Lieblingsort zum Kaufen|in Geschäften]], weil [[Grund für das Geschäft|ich Stoffe anfassen und alles anprobieren kann]].

Meine Urlaubspläne für diesen Sommer: [[Urlaubsziel|Ich fahre im August mit meiner Familie nach Italien]]. Wir bleiben [[Dauer|zwei Wochen]], und ich freue mich schon sehr.

Mit dir einkaufen zu gehen, wäre schön. [[Termin für den Einkauf|Wie wäre es am Samstag in zwei Wochen in der Innenstadt]]?

Wenn du online bestellst, solltest du auf einige Dinge achten: [[Tipp 1|Prüfe das Rückgaberecht und die Versandkosten]], denn das spart später Ärger. Außerdem [[Tipp 2|schau dir Fotos von echten Kunden an, nicht nur die Modellbilder]]. So siehst du, wie die Kleidung wirklich aussieht.

Zu meinem Sommer möchte ich ergänzen: [[Plan|Neben der Reise mache ich Tagesausflüge mit meiner Familie und gehe viel schwimmen]]. Das ist für mich perfekte Erholung. Wenn du aus deinem Urlaub zurück bist, [[Wunsch|erzählen wir uns alles bei einem Kaffee]].

Beim Einkaufen können wir auch [[Idee|nach passenden Schuhen für den Urlaub suchen]], zum Beispiel Sandalen oder Wanderschuhe. Ich helfe dir bei der Auswahl, [[Hilfsangebot|ich habe ein gutes Gefühl für bequeme Modelle]]. Danach gehen wir etwas essen und planen deinen Urlaub weiter.

Schreib mir bitte, [[Frage an die Freundin|ob dir der Termin passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Samir]]` },

  // 2
  { label: "locker, freundschaftlich", t: `Hi [[Name der Freundin|Clara]],

ich habe mich total über deine Zeilen gefreut! Urlaub, juhu! [[Reaktion auf den Urlaub|Die zwei Wochen Arbeit gehen schnell rum, dann kannst du chillen]].

Online-Shopping? Klar, [[Erfahrung mit Online-Shopping|ich bestelle ständig was, Hosen, Schuhe, alles]]. Praktisch ist, [[Vorteil des Online-Kaufs|dass man nicht aus dem Haus muss]]. Nervig ist, [[Nachteil des Online-Kaufs|wenn man alles zurückschicken muss]].

Wo ich lieber kaufe? [[Lieblingsort zum Kaufen|Im Laden]], [[Grund für das Geschäft|da sieht man gleich, ob es steht]].

Mein Sommer: [[Urlaubsziel|Zwei Wochen in Spanien mit Freunden]].

Einkaufen gehen? Gern! [[Termin für den Einkauf|Wie wäre es am Samstag in der City]]?

Ein Trick beim Online-Kauf: [[Tipp|Bestelle zwei Größen und schicke eine zurück]]. Das kostet nichts, wenn die Rücksendung gratis ist, und du hast die richtige Größe sicher. Ich mache das oft, [[Folge|und nur selten bleibt etwas Unpassendes bei mir]].

Im Sommer will ich viel draußen sein: [[Plan|Radtouren, Picknicks und Baden im See]]. Ich brauche keine große Reise, [[Begründung|ich genieße einfach die Sonne]]. Wenn du Lust hast, kannst du dich einem Ausflug anschließen, [[Einladung|wir fahren sicher einmal gemeinsam]].

Für den Einkauf schlage ich vor, dass wir [[Idee|mit einer Liste losgehen, was du brauchst]]. Dann sind wir effektiv und verlieren uns nicht in den Läden. Zwischendurch machen wir [[Pause|eine Pause bei einem Eis]], denn das gehört dazu.

Meld dich, [[Frage an die Freundin|wann es klappt]].

[[Grußformel|Bis bald]]
[[Dein Name|Jonas]]` },

  // 3
  { label: "begeistert, lebendig", t: `Liebe [[Name der Freundin|Clara]],

wow, bald Urlaub, wie wunderbar! [[Reaktion auf den Urlaub|Ich freue mich so für dich, du hast so viel gearbeitet]]. Die zwei Wochen schaffst du locker.

Online-Shopping finde ich toll: [[Erfahrung mit Online-Shopping|Ich habe schon viele schöne Sachen im Internet entdeckt]]. Es ist [[Vorteil des Online-Kaufs|bequem und die Auswahl ist riesig]], nur [[Nachteil des Online-Kaufs|die Größen sind ein Risiko]].

Am liebsten kaufe ich [[Lieblingsort zum Kaufen|in kleinen Boutiquen]], weil [[Grund für das Geschäft|ich dort die besten Stücke finde und beraten werde]].

Meine Urlaubspläne: [[Urlaubsziel|Im Sommer fliege ich nach Griechenland]]. Ich freue mich unglaublich!

Einkaufen gehen? Unbedingt! [[Termin für den Einkauf|Ich habe am Samstag Zeit, und wir machen einen Shoppingtag mit Eis]].

Online habe ich schon [[Beispiel|ein schönes Sommerkleid und eine leichte Jacke]] gefunden, die ich im Urlaub trage. Die Qualität war gut, und der Preis noch besser. Aber ich muss zugeben, [[Einschränkung|dass nicht alles so aussieht wie auf dem Foto]].

Mein Sommerurlaub ist schon gebucht: [[Details|Eine Ferienwohnung am Meer, mit Balkon und Blick auf die Wellen]]. Ich kann es kaum erwarten. Dafür möchte ich auch etwas Neues zum Anziehen, [[Folge|weshalb dein Vorschlag so gut kommt]].

Wenn du magst, gehen wir in drei Läden, die ich kenne: [[Läden|einen mit schönen Kleidern, einen mit Jeans und einen mit Taschen]]. Ich habe dort schon oft etwas Gutes gefunden. Du kannst alles anprobieren, [[Folge|und ich sage dir ehrlich, was dir steht]].

Schreib mir bald, [[Frage an die Freundin|ob wir uns um zehn treffen]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Marie]]` },

  // 4
  { label: "sachlich-strukturiert", t: `Liebe [[Name der Freundin|Clara]],

ich habe deine Zeilen gelesen und antworte dir gern. Hier meine Stellungnahme zu deinen Punkten, schön geordnet.

Erstens, dein Urlaub: [[Reaktion auf den Urlaub|Ich freue mich, dass du bald frei hast, und wünsche dir eine gute Erholung]].

Zweitens, Online-Shopping: [[Erfahrung mit Online-Shopping|Ich habe damit gemischte Erfahrungen, meistens gute]]. Der Vorteil ist [[Vorteil des Online-Kaufs|der Preisvergleich]], der Nachteil [[Nachteil des Online-Kaufs|die fehlende Anprobe]].

Drittens, wo ich kaufe: [[Lieblingsort zum Kaufen|Ich bevorzuge Geschäfte]], weil [[Grund für das Geschäft|ich die Qualität sehe]].

Viertens, meine Pläne: [[Urlaubsziel|Ich verreise im August an die Ostsee]].

Fünftens, dein Vorschlag: Ich gehe gern mit dir einkaufen, [[Termin für den Einkauf|am liebsten am Samstag]].

Ergänzend empfehle ich, [[Empfehlung|Preise auf mehreren Seiten zu vergleichen]], bevor man etwas kauft. Es gibt oft große Unterschiede. Ich benutze dafür [[Hilfsmittel|eine Vergleichsseite im Internet]], das geht schnell und lohnt sich.

Ergänzend: Mein Sommerurlaub dauert [[Dauer|zwei Wochen]], und ich fahre [[Verkehrsmittel|mit dem Auto]]. Wir übernachten in einer Pension und besichtigen Städte. Dafür brauche ich [[Bedarf|leichte Kleidung und bequeme Schuhe]].

Ergänzend schlage ich vor, den Einkauf [[Terminvorschlag|am Samstagvormittag]] zu machen, weil [[Grund|die Läden dann noch nicht so voll sind]]. Danach können wir Mittagessen gehen, [[Idee|in einem kleinen Restaurant in der Nähe]]. Das wird ein schöner Tag.

Bitte teile mir mit, [[Frage an die Freundin|ob der Termin passt]].

[[Grußformel|Mit freundlichen Grüßen]]
[[Dein Name|Daniel]]` },

  // 5
  { label: "hilfsbereit, praktisch", t: `Liebe [[Name der Freundin|Clara]],

ich danke dir für dein Schreiben. [[Reaktion auf den Urlaub|Schön, dass dein Urlaub bald beginnt, und ich helfe dir gern beim Einkaufen]].

Zu Online-Shopping: [[Erfahrung mit Online-Shopping|Ich habe viel Erfahrung, vor allem mit Rückgabe und Größentabellen]]. Praktische Tipps: [[Tipp zum Online-Kauf|Lies Bewertungen und prüfe die Rückgabefrist]]. Ich kann dir [[Praktische Hilfe|helfen, die richtige Größe zu finden]].

Ich kaufe lieber [[Lieblingsort zum Kaufen|im Geschäft]], da [[Grund für das Geschäft|ich dort anprobieren kann]].

Mein Sommer: [[Urlaubsziel|Ich bleibe in der Nähe und mache Tagesausflüge]].

Ich gehe gern mit dir einkaufen, [[Termin für den Einkauf|am Samstag um zehn Uhr]].

Wenn du magst, zeige ich dir, wie ich nach Angeboten suche: [[Hilfsangebot|Wir sitzen zusammen vor dem Computer und suchen die besten Sachen]]. Das kann auch lustig sein, und du lernst ein paar Tricks. Es ist praktisch, besonders wenn man wenig Zeit hat.

Ich plane meinen Sommer ziemlich ruhig: [[Plan|Wochenenden bei meiner Familie, ein paar Tage Urlaub zu Hause]]. Ich spare Geld für den Herbst. Wenn du etwas Schönes für deinen Urlaub planst, [[Angebot|helfe ich dir gern bei der Suche nach Unterkunft oder Ticket]].

Ich bringe gern eine Tasche mit, in der wir alles tragen können. [[Hilfsangebot|Wenn du viel kaufst, nehme ich eine zweite]]. Mit meinem Auto können wir die Sachen schnell nach Hause bringen, falls es zu viel wird. Das mache ich gern für dich.

Sag mir bitte, [[Frage an die Freundin|was du alles kaufen möchtest]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Kerem]]` },

  // 6
  { label: "begründend, argumentativ", t: `Hallo [[Name der Freundin|Clara]],

ich freue mich über deine Mail, denn [[Begründung für die Freude|ich habe schon lange nichts mehr von dir gehört]]. [[Reaktion auf den Urlaub|Der Urlaub kommt zur rechten Zeit]].

Online-Shopping hat Vor- und Nachteile, weil [[Begründung zum Online-Kauf|man vergleichen kann, aber nichts anprobieren]]. [[Erfahrung mit Online-Shopping|Meine Erfahrungen sind insgesamt gut]].

Ich kaufe lieber [[Lieblingsort zum Kaufen|im Geschäft]], denn [[Grund für das Geschäft|ich will die Kleidung sehen und fühlen]].

Mein Sommer: [[Urlaubsziel|Ich fahre in die Berge]], weil [[Grund für das Ziel|ich dort Ruhe finde]].

Ich gehe gern mit dir einkaufen, weil [[Grund für den Einkauf|wir gemeinsam mehr Spaß haben]]. [[Termin für den Einkauf|Der Samstag passt gut]].

Beim Geschäft schätze ich besonders [[Vorteil|die persönliche Beratung und die Möglichkeit, alles in die Hand zu nehmen]]. Online ersetzt das nie ganz, das habe ich oft gemerkt. Außerdem [[Vorteil 2|kann ich die Sachen sofort mitnehmen und muss nicht warten]].

Mein Sommer wird abwechslungsreich: [[Plan|Erst Arbeit, dann zwei Wochen Urlaub in den Bergen, dann ein Fest mit Freunden]]. Das ist genau richtig für mich. Und neue Kleidung kann ich dafür auch brauchen, [[Folge|also komme ich gern mit]].

Ich schlage vor, dass wir uns [[Treffpunkt|um zehn Uhr am Marktplatz]] treffen. Danach schauen wir uns erst die Geschäfte an und dann entscheiden wir. Es ist wichtig, nicht zu schnell zu kaufen, [[Rat|sonst bereut man es später]].

Schreib mir, [[Frage an die Freundin|ob dir meine Gründe einleuchten]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Selin]]` },

  // 7
  { label: "klar und kompakt", t: `Liebe [[Name der Freundin|Clara]],

vielen Dank für deine Zeilen, ich fasse mich kurz.

Urlaub: [[Reaktion auf den Urlaub|Schön, viel Erholung]].

Online-Shopping: [[Erfahrung mit Online-Shopping|Meist gute Erfahrungen]].

Kleidung kaufe ich: [[Lieblingsort zum Kaufen|Lieber im Laden]].

Mein Sommer: [[Urlaubsziel|Italien]].

Einkaufen: Ja, gern, [[Termin für den Einkauf|Samstag]].

Ich finde, dass es auf die Kleidung ankommt: [[Unterscheidung|Basics wie T-Shirts bestelle ich online, aber Hosen und Jacken kaufe ich im Laden]]. So habe ich das Beste aus beiden Welten, [[Folge|und ich bin selten enttäuscht]].

Ich habe vor, im Sommer [[Plan|eine Radreise entlang des Rheins zu machen]]. Ich freue mich darauf, und ich brauche dafür leichte Sportkleidung. Vielleicht können wir beim Einkaufen auch danach suchen, [[Vorschlag|ich zeige dir, was ich meine]].

Falls du keine Lust auf große Läden hast, gehen wir einfach [[Alternative|in die Fußgängerzone und bummeln]]. Dort gibt es kleine Geschäfte, in denen die Beratung besser ist. Das gefällt mir sogar mehr, [[Begründung|weil es ruhiger ist]].

Ich freue mich sehr auf den gemeinsamen Einkaufstag und auf deinen Urlaub, denn nach zwei Wochen Arbeit hast du dir wirklich eine Pause verdient. Wir finden bestimmt schöne Sachen für den Sommer, die zu dir passen und nicht zu teuer sind. Gib mir bitte kurz Bescheid, [[Frage an die Freundin|ob es passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Lukas]]` },

  // 8
  { label: "humorvoll, augenzwinkernd", t: `Liebe [[Name der Freundin|Clara]],

zwei Wochen Arbeit, dann Urlaub, das nenne ich einen Plan! [[Reaktion auf den Urlaub|Danach bist du reif für die Insel, und dein Schrank auch]].

Online-Shopping? [[Erfahrung mit Online-Shopping|Ich habe schon Hosen bestellt, die für einen Riesen gemacht waren]]. Ein Vorteil ist [[Vorteil des Online-Kaufs|man kann im Schlafanzug shoppen]], ein Nachteil [[Nachteil des Online-Kaufs|die Hose passt trotzdem nicht]].

Ich kaufe lieber [[Lieblingsort zum Kaufen|im Laden]], [[Grund für das Geschäft|da kann man sich mit dem Spiegel streiten]].

Mein Sommer: [[Urlaubsziel|Ich fahre ans Meer und tue so, als wäre ich eine Meerjungfrau]].

Einkaufen gehen? Aber sicher! [[Termin für den Einkauf|Samstag, wir nehmen den Geldbeutel mit]].

In meiner Stadt gibt es ein Einkaufszentrum, das ich sehr mag: [[Beschreibung|Dort gibt es viele Läden unter einem Dach, und man kann zwischendurch Kaffee trinken]]. Das ist praktisch, besonders bei schlechtem Wetter. Wir könnten dort hingehen, [[Vorschlag|wenn du keine andere Idee hast]].

In diesem Sommer möchte ich [[Plan|ein Konzert besuchen und ein paar Tage in einer Stadt verbringen]]. Das ist mein Traum. Und natürlich will ich etwas Passendes anziehen, [[Folge|also kommt dein Einkaufsvorschlag gelegen]].

Ich freue mich besonders darauf, mit dir zu reden: [[Wunsch|über deine Pläne, über deine Arbeit und über alles, was in letzter Zeit war]]. Beim Einkaufen hat man dafür die beste Gelegenheit, und [[Folge|man lacht dabei oft viel]].

Ich freue mich trotz aller Scherze wirklich auf den Tag mit dir und darauf, gemeinsam zu lachen und etwas Schönes für deinen Urlaub zu finden. Schreib bald, [[Frage an die Freundin|ob du Taschen tragen kannst]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Tim]]` },

  // 9
  { label: "persönlich, erzählend", t: `Liebe [[Name der Freundin|Clara]],

als ich deine Mail gelesen habe, musste ich an unseren letzten Einkaufsbummel denken. [[Erinnerung an früher|Wir haben stundenlang nach dem perfekten Kleid gesucht und es dann doch online gefunden]]. Schön, dass du bald Urlaub hast.

Online-Shopping: [[Erfahrung mit Online-Shopping|Ich habe vor einem Jahr angefangen und finde es praktisch]].

Ich kaufe lieber [[Lieblingsort zum Kaufen|im Geschäft, in einer kleinen Boutique, die ich seit Jahren mag]].

Mein Sommer: [[Urlaubsziel|Ich bleibe zu Hause und besuche meine Familie]].

Einkaufen gehen? [[Termin für den Einkauf|Gern am Wochenende]].

Ich erinnere mich an einen Shoppingtag mit dir: [[Erinnerung|Wir haben alles anprobiert, gelacht und am Ende nur ein Paar Socken gekauft]]. Das war herrlich. So einen Tag wünsche ich uns wieder, [[Wunsch|diesmal mit etwas mehr Erfolg]].

Ich erinnere mich, wie wir vor zwei Jahren zusammen am Meer waren: [[Erinnerung|Wir haben Muscheln gesammelt und Eis gegessen]]. Ich wünsche mir wieder so einen Sommer, [[Wunsch|vielleicht sogar gemeinsam]], wenn dein Urlaub und meiner sich überschneiden.

Wenn wir einkaufen gehen, denke ich an [[Erinnerung|unsere erste gemeinsame Jeans, die wir beide gekauft haben]]. Sie ist immer noch mein Lieblingsstück. Vielleicht finden wir wieder so ein Stück, [[Wunsch|das uns Jahre begleitet]].

Ich freue mich auf einen schönen Tag mit dir. Erzähl mir, [[Frage an die Freundin|was du dir wünschst]].

[[Grußformel|Herzlich]]
[[Dein Name|Emma]]` },

  // 10
  { label: "vorschlagsorientiert", t: `Hallo [[Name der Freundin|Clara]],

wie wunderbar, dass du dich bei mir meldest! [[Reaktion auf den Urlaub|Schön, dass dein Urlaub bald beginnt]]. Ich möchte dir ein paar Vorschläge machen.

Zum Online-Shopping: [[Erfahrung mit Online-Shopping|Ich habe gute und schlechte Erfahrungen]]. Mein erster Vorschlag: [[Tipp zum Online-Kauf|Bestell nur bei Shops mit kostenloser Rücksendung]]. Mein zweiter: [[Tipp 2|Prüfe die Größentabelle]].

Ich kaufe lieber [[Lieblingsort zum Kaufen|im Geschäft]].

Mein dritter Vorschlag: Wir gehen [[Termin für den Einkauf|am Samstag zusammen einkaufen]]. Mein Sommer: [[Urlaubsziel|Urlaub am See]].

Mein dritter Vorschlag zum Kleiderkauf: [[Vorschlag|Wir gehen erst zu Second-Hand-Läden, dort gibt es schöne Sachen für wenig Geld]]. Mein vierter: [[Vorschlag 2|Danach suchen wir gezielt in einem Kaufhaus, was noch fehlt]]. So sparen wir, und der Einkauf bleibt spannend.

Mein fünfter Vorschlag: [[Vorschlag|Wir planen im Sommer einen gemeinsamen Tag am See, mit Picknick]]. Mein sechster: [[Vorschlag 2|Wir gehen nach dem Einkaufen in ein Café und ruhen uns aus]]. So ist für alles gesorgt.

Mein siebter Vorschlag: [[Vorschlag|Wir machen vor dem Einkauf ein Foto von jedem Outfit, das wir anprobieren]]. Mein achter: [[Vorschlag 2|Wir entscheiden erst am Ende, was wir kaufen]]. So bleiben wir ruhig und treffen gute Entscheidungen.

Was hältst du davon? Ich freue mich auf deine Antwort und auf einen schönen gemeinsamen Tag in der Stadt. Teile mir bitte mit, [[Frage an die Freundin|welcher Vorschlag dir gefällt]].

[[Grußformel|Viele Grüße]]
[[Dein Name|Paula]]` },

  // 11
  { label: "abwägend, vorsichtig", t: `Liebe [[Name der Freundin|Clara]],

danke, dass du mir geschrieben hast. [[Reaktion auf den Urlaub|Ich freue mich über deinen Urlaub, auch wenn die Arbeit davor anstrengend ist]].

Beim Online-Shopping bin ich vorsichtig: Einerseits [[Vorteil des Online-Kaufs|ist es bequem]], andererseits [[Nachteil des Online-Kaufs|passt nicht alles]]. [[Erfahrung mit Online-Shopping|Ich habe gemischte Erfahrungen]].

Ich kaufe [[Lieblingsort zum Kaufen|eher im Geschäft]], wenn ich Zeit habe.

Mein Sommer: [[Urlaubsziel|Ich bin noch unsicher, vielleicht fahre ich weg]].

Einkaufen gehen würde ich gern, [[Termin für den Einkauf|wenn ich am Wochenende frei habe]].

Ich bin kein großer Fan von Sonderangeboten, [[Einschränkung|weil man oft Dinge kauft, die man nicht braucht]]. Deshalb schreibe ich vorher eine Liste. Das hilft mir, [[Folge|beim Thema zu bleiben und nicht zu viel Geld auszugeben]].

Mein Sommer ist noch nicht ganz klar: [[Unsicherheit|Ich muss erst meinen Urlaub bei der Arbeit abstimmen]]. Aber ich plane auf jeden Fall [[Plan|ein paar Tage Erholung]]. Wenn es klappt, erzähle ich dir sofort davon.

Ich komme gern mit, [[Bedingung|wenn der Einkauf nicht zu lange dauert]]. Ich werde schnell müde in Geschäften, besonders wenn es voll ist. Aber mit dir ist es immer unterhaltsam, [[Folge|und ich nehme mir extra Zeit]].

Ich freue mich auf einen schönen Sommer mit viel Sonne und guten Gesprächen. Sag mir bitte, [[Frage an die Freundin|ob dir das passt]].

[[Grußformel|Liebe Grüße]]
[[Dein Name|Hannah]]` },

  // 12
  { label: "Schritt für Schritt", t: `Liebe [[Name der Freundin|Clara]],

schön, von dir zu lesen, ich antworte dir Punkt für Punkt. Als Erstes: [[Reaktion auf den Urlaub|Schön, dass du bald Urlaub hast]].

Als Nächstes zum Online-Shopping: [[Erfahrung mit Online-Shopping|Gute Erfahrungen]].

Dann zum Kaufen: [[Lieblingsort zum Kaufen|Im Geschäft]].

Danach zu meinen Plänen: [[Urlaubsziel|Italien]].

Zuletzt zum Einkaufen: Ja, [[Termin für den Einkauf|am Samstag]].

Als dritten Schritt sollten wir [[Schritt|klären, was du genau suchst]]: Kleider, Hosen, Schuhe oder Taschen? Dann können wir gezielter planen. Ich helfe dir gern bei der Liste, [[Angebot|wenn du sie mir schickst]].

Als vierten Schritt will ich [[Schritt|im Juni entscheiden, wohin ich fahre]], und dir dann Bescheid geben. Dann können wir sehen, ob unsere Pläne zusammenpassen, [[Folge|und vielleicht verreisen wir sogar gemeinsam]].

Als fünften Schritt schreibe ich dir [[Schritt|kurz vorher, wo wir uns treffen und wann]]. Dann gibt es keine Missverständnisse. Und ich erinnere dich an deine Liste, [[Hinweis|damit du nichts vergisst]].

Ich freue mich sehr auf den Sommer, auf deinen Urlaub und auf den gemeinsamen Einkaufstag, und ich bin sicher, dass wir gemeinsam schöne Sachen für die warmen Tage finden, die dir gut stehen und die du lange tragen kannst, auch noch im nächsten Jahr, ohne dass sie aus der Mode kommen. Wie geht es weiter? Schreib mir, [[Frage an die Freundin|ob das passt]].

[[Grußformel|Bis bald]]
[[Dein Name|Leyla]]` },

  // 13
  { label: "warmherzig, unterstützend", t: `Liebe [[Name der Freundin|Clara]],

wie toll, von dir zu hören! [[Reaktion auf den Urlaub|Ich wünsche dir einen erholsamen Urlaub, du hast ihn dir verdient]].

Zum Online-Shopping: [[Erfahrung mit Online-Shopping|Ich habe gute Erfahrungen, wenn man sich Zeit nimmt]].

Ich kaufe lieber [[Lieblingsort zum Kaufen|im Geschäft]], weil [[Grund für das Geschäft|ich mich dort beraten lasse]].

Mein Sommer: [[Urlaubsziel|Ich verbringe ruhige Tage mit der Familie]].

Mit dir einkaufen zu gehen, wäre schön, [[Termin für den Einkauf|am Wochenende, wenn du Zeit hast]].

Es freut mich, dass du mich fragst: [[Gefühl|Ich liebe gemeinsames Einkaufen, es macht Spaß und ist eine schöne Gelegenheit zum Reden]]. Danke für die Idee, [[Dank|sie kommt genau zur richtigen Zeit]].

Ich freue mich, dass du nach meinen Plänen fragst: [[Gefühl|Es zeigt, dass du dich für mich interessierst]]. Mein Sommer wird schön, und ich teile ihn gern mit dir, [[Angebot|mit Ausflügen oder einem Abendessen]].

Ich bin sehr froh, dass du mich gefragt hast: [[Gefühl|Gemeinsame Einkäufe sind für mich kleine Feste]]. Ich freue mich auf die Zeit mit dir und bin sicher, [[Folge|dass wir viel Spaß haben werden]].

Ich freue mich auf unseren gemeinsamen Tag und hoffe, dass wir viel lachen und schöne Sachen für deinen Urlaub finden, ohne uns zu stressen. Erzähl mir, [[Frage an die Freundin|wie ich dir helfen kann]].

[[Grußformel|Alles Liebe]]
[[Dein Name|Sarah]]` },

  // 14
  { label: "spontan, entspannt", t: `Hi [[Name der Freundin|Clara]],

Urlaub in Sicht, super! [[Reaktion auf den Urlaub|Genieß es]].

Online-Shopping: [[Erfahrung mit Online-Shopping|Mach ich viel, klappt meist]].

Kleider: [[Lieblingsort zum Kaufen|Lieber im Laden]].

Mein Sommer: [[Urlaubsziel|Weiß noch nicht, vielleicht Italien]].

Einkaufen? [[Termin für den Einkauf|Klar, am Samstag]].

Noch ein Tipp: [[Tipp|Zieh bequeme Schuhe an, wenn wir shoppen gehen]], denn man läuft viel. Und nimm eine große Tasche mit, [[Folge|damit du alles tragen kannst]]. Ich bringe auch eine mit, falls du eine vergisst.

Mein Sommer ist [[Beschreibung|ruhig, sonnig und voller kleiner Ausflüge]]. Ich brauche nichts Besonderes. Aber ein neues Kleid wäre schön, [[Folge|deshalb komme ich gern zum Einkaufen mit]].

Wir brauchen nur [[Bedarf|gute Laune, bequeme Schuhe und Geld]]. Alles andere ergibt sich. Ich freue mich schon darauf, dich wiederzusehen, [[Wunsch|und mit dir einen schönen Tag zu verbringen]]. Das wird toll.

Ich freue mich echt auf den Einkaufstag mit dir und hoffe, dass wir schöne Sachen für deinen Urlaub finden. Online bestelle ich viel, aber im Laden macht es mehr Spaß, besonders zu zweit, und wir können zwischendurch einen Kaffee trinken und über alles reden. Bring einfach gute Laune mit, den Rest regeln wir schon, versprochen, und nach dem Einkauf gehen wir noch etwas essen. Ich freue mich auf deine Antwort und möchte wissen, [[Frage an die Freundin|wann es passt]].

[[Grußformel|Bis dann]]
[[Dein Name|Max]]` },
];
