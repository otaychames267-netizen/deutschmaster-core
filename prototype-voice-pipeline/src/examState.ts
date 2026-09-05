/** Minimal, hardcoded Teil-1 exam state for this prototype — deliberately a
 * strict subset of the production room's real state machine
 * (muendlich-relay/src/server.ts), not a reimplementation of it. No A/B
 * alternation, no timers, no takeover/moderator logic — just enough state to
 * make one realistic single-candidate presentation + follow-up exchange. */

export interface HistoryTurn {
  speaker: "examiner" | "candidate";
  text: string;
}

export interface ExamState {
  level: "B2";
  teil: 1;
  candidateName: string;
  /** "title (guiding points)" — same shape as formatTopic() in server.ts. */
  candidateTopic: string;
  history: HistoryTurn[];
  followUpsAsked: number;
  maxFollowUps: number;
}

/** Original, non-copyrighted topic — not reproducing any real telc exam
 * material, just representative of the "Präsentation" task shape. */
export function makeInitialExamState(): ExamState {
  return {
    level: "B2",
    teil: 1,
    candidateName: "Julia",
    candidateTopic: "Digitale Kommunikation im Familienalltag (Vor- und Nachteile, eigene Erfahrung, persönliche Meinung)",
    history: [],
    followUpsAsked: 0,
    maxFollowUps: 2,
  };
}
