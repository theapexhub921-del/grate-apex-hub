// Ids of the original app's courses and lessons ('biochemistry-03'…). Pure.
// Their completions are kept ONLY in progress/{uid}/completions: the shared
// progress/{uid}.lessons map belongs to the original app (section counts).
export const LEGACY_COURSE_IDS = ['biolchem', 'medgen', 'cellstruct', 'bmc', 'algebra', 'stats', 'commskills', 'compapp', 'biochemistry', 'physiology', 'anatomy', 'behavioural', 'entomology'] as const;

/** True for an original app lesson id such as 'anatomy-02'. */
export const isLegacyLessonId = (id: string) => /^[a-z]+-\d{2}$/.test(id) && (LEGACY_COURSE_IDS as readonly string[]).includes(id.split('-')[0]);
