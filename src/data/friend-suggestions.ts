// Friend suggestions, recovered from the original app (src/social.ts →
// suggestFollows): people who follow you but you don't follow back, people your
// follows follow, classmates in your hall, and top students — scored the same
// way. Pure so it can be tested (npm test).

export type Edge = { uid: string; username: string | null };
export type ScoreRow = { uid: string; username?: string | null; hall?: string | null; semester?: number | null };

export type Suggestion = {
  uid: string;
  username: string;
  reason: string;
  score: number;
  sameClass: boolean;
  sharedConnections: number;
};

export function rankSuggestions(input: {
  me: { uid: string; hall?: string | null; semester?: number | null };
  following: Edge[];
  followers: Edge[];
  /** For each of my follows (first few): who they follow. */
  secondDegree: { via: Edge; follows: Edge[] }[];
  /** Top students by XP (scores collection), highest first. */
  top: ScoreRow[];
  max?: number;
}): Suggestion[] {
  const { me, following, followers, secondDegree, top, max = 8 } = input;
  const mine = new Set(following.map((edge) => edge.uid));
  const found = new Map<string, Suggestion & { best: number }>();

  const add = (edge: { uid: string; username?: string | null }, score: number, reason: string, extra: Partial<Suggestion> = {}) => {
    if (!edge?.uid || edge.uid === me.uid || mine.has(edge.uid) || !edge.username) return;
    const current = found.get(edge.uid);
    if (!current) {
      found.set(edge.uid, { uid: edge.uid, username: edge.username, reason, score, best: score, sameClass: false, sharedConnections: 0, ...extra });
      return;
    }
    current.score += score;
    if (score > current.best) {
      current.best = score;
      current.reason = reason;
    }
    if (extra.sameClass) current.sameClass = true;
    if (extra.sharedConnections) current.sharedConnections += extra.sharedConnections;
  };

  followers.forEach((edge) => add(edge, 1000, 'Follows you'));
  secondDegree.forEach(({ via, follows }) => follows.forEach((edge) => add(edge, 3, `Followed by @${via.username ?? 'a friend'}`, { sharedConnections: 1 })));
  top.forEach((row, index) => {
    const sameClass = Boolean(me.hall) && row.hall === me.hall && (me.semester == null || row.semester === me.semester);
    add({ uid: row.uid, username: row.username }, (sameClass ? 3 : 0) + (index < 15 ? 1 : 0), sameClass ? `Same class: ${row.hall}` : 'Top student', { sameClass });
  });

  return [...found.values()]
    .filter((suggestion) => suggestion.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ best: _best, ...suggestion }) => suggestion);
}

/** Relationship from the two directions of follows: mutual = friends. */
export function relationshipOf(iFollow: boolean, followsMe: boolean): 'friends' | 'outgoing' | 'incoming' | 'none' {
  if (iFollow && followsMe) return 'friends';
  if (iFollow) return 'outgoing';
  if (followsMe) return 'incoming';
  return 'none';
}
