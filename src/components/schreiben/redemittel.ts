/**
 * Redemittel & Synonyme — a shared reference of professional B2+ phrase
 * alternatives for each beat of the connected Beschwerdebrief (owner spec
 * 2026-09-11: "Redemittel und Synonyme sollen als Lernhilfe AUSSERHALB des
 * Briefes angeboten werden, nicht den Brief selbst mit mehreren Alternativen
 * überladen"). Shown once per card, in the Struktur tab only, as a distinct
 * panel below the letter — never inline in the letter text.
 *
 * Same set for every card (Produkt and Dienstleistung alike): the beats are
 * identical across the whole bank, so one well-organized reference serves
 * every register and every theme equally, instead of duplicating near-
 * identical phrase lists 150-fold.
 */
export interface RedemittelGroup {
  title: string;
  phrases: string[];
}

export const REDEMITTEL: RedemittelGroup[] = [
  {
    title: "Grund der Beschwerde nennen",
    phrases: [
      "hiermit möchte ich mich über … beschweren",
      "mit diesem Schreiben reklamiere ich …",
      "ich sehe mich veranlasst, mich schriftlich über … zu beschweren",
      "ich muss mich über … beschweren",
      "hiermit erhebe ich Mängelrüge hinsichtlich …",
      "ich wende mich heute an Sie, weil ich mit … unzufrieden war",
    ],
  },
  {
    title: "Kauf-/Buchungssituation schildern",
    phrases: [
      "ich habe … am [Datum] bei … gekauft/gebucht",
      "gebucht/erworben habe ich … am [Datum] über …",
      "der Vertrag über … kam am [Datum] zustande",
      "aufmerksam wurde ich durch … auf das Angebot",
      "den Ausschlag für meine Entscheidung gab …",
      "überzeugt hat mich letztlich …",
    ],
  },
  {
    title: "Erwartung ausdrücken",
    phrases: [
      "sodass ich davon ausgehen durfte, dass …",
      "entsprechend ging ich fest davon aus, dass …",
      "ich rechnete daher fest damit, dass …",
      "daraus ergab sich für mich die klare Erwartung, dass …",
      "eine solche Aussage begründet berechtigterweise die Erwartung, dass …",
    ],
  },
  {
    title: "Übergang zur Realität/zum Problem",
    phrases: [
      "bei der eigentlichen Nutzung am [Datum/Ort] zeigte sich jedoch …",
      "schon bei … zeigte sich jedoch ein anderes Bild",
      "die tatsächliche Leistung entspricht diesen Zusagen jedoch nicht",
      "diese Erwartung wurde jedoch klar enttäuscht",
      "bereits am/bei … stellte ich das Gegenteil fest",
      "die Realität sah anders aus",
    ],
  },
  {
    title: "Probleme konkret benennen",
    phrases: [
      "konkret …; darüber hinaus …",
      "zum einen …, zum anderen …",
      "erstens …, zweitens …",
      "erschwerend kommt hinzu, dass …",
      "wie [Foto/Beleg/Rechnung] zeigt, …",
      "hinzu kommt, dass …",
    ],
  },
  {
    title: "Enttäuschung formulieren",
    phrases: [
      "diese Erfahrung hat mich sehr enttäuscht",
      "das hat mich besonders enttäuscht",
      "dass … so wenig hält, hat mich sehr enttäuscht",
      "die anhaltende Beeinträchtigung hat mich sehr enttäuscht",
      "ich bin darüber sehr enttäuscht",
    ],
  },
  {
    title: "Kontakt mit dem Kundenservice",
    phrases: [
      "ich habe daraufhin telefonisch/per E-Mail Kontakt aufgenommen",
      "ich habe mich umgehend an … gewandt",
      "ich habe den Vorgang gemeldet und um Abhilfe gebeten",
      "ich habe mich hilfesuchend an … gewandt",
    ],
  },
  {
    title: "Reaktion/Rückmeldung des Anbieters",
    phrases: [
      "eine zufriedenstellende Rückmeldung habe ich jedoch nicht erhalten",
      "die Reaktion war jedoch ernüchternd: …",
      "die Rückmeldung fiel jedoch unzureichend aus: …",
      "eine hilfreiche Antwort blieb allerdings aus",
      "eine verbindliche Rückmeldung steht bis heute aus",
    ],
  },
  {
    title: "Forderung / Lösung",
    phrases: [
      "als Lösung erwarte ich …",
      "als Lösung fordere ich Sie auf, …",
      "ich schlage als Lösung vor, dass Sie …",
      "vor diesem Hintergrund fordere ich, dass Sie …",
      "ich bitte Sie um … als Lösung",
    ],
  },
  {
    title: "Alternative Lösung anbieten",
    phrases: [
      "… oder alternativ …",
      "entweder … oder aber …",
      "wahlweise erwarte ich …",
      "als Alternative käme auch … infrage",
      "sollte dies nicht möglich sein, erwarte ich stattdessen …",
    ],
  },
  {
    title: "Frist setzen",
    phrases: [
      "ich bitte Sie, mir bis zum [Datum] schriftlich zu antworten",
      "ich setze Ihnen hierfür eine Frist bis zum [Datum]",
      "ich erwarte Ihre Rückmeldung innerhalb von [Zeitraum]",
      "sollte bis dahin keine Lösung vorliegen, behalte ich mir weitere Schritte vor",
    ],
  },
  {
    title: "Professioneller Schluss",
    phrases: [
      "ich hoffe auf eine schnelle und zufriedenstellende Lösung",
      "ich hoffe, dass sich die Angelegenheit zufriedenstellend lösen lässt",
      "in der Hoffnung auf eine rasche Klärung verbleibe ich",
      "vielen Dank im Voraus für Ihr Entgegenkommen",
      "mit freundlichen Grüßen",
    ],
  },
];
