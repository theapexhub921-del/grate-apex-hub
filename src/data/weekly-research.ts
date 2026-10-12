// Explore → Emerging research, refreshed every Monday from Europe PMC (the
// open index of peer-reviewed life-science literature, including MEDLINE).
// Each week picks three curriculum themes and shows the newest reviews,
// meta-analyses and randomised trials on them from the last two months, with
// the authors' own abstract. Nothing is summarised or invented here: titles,
// journals, dates and abstracts are shown as published, with a link to the
// paper. The list is saved for the week so it stays the same until Monday.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { mondayKey, mondayOf } from '@/data/weekly-explore-picks';

export type LiveResearch = {
  id: string;
  theme: string;
  title: string;
  journal: string;
  date: string; // YYYY-MM-DD
  authors: string;
  design: string;
  abstract: string;
  url: string;
};

/** Curriculum themes (biochemistry, physiology, anatomy, learning), rotated weekly. */
export const RESEARCH_THEMES: readonly { theme: string; terms: readonly string[] }[] = [
  { theme: 'Biochemistry · lipids', terms: ['fatty acid synthesis', 'lipogenesis', 'cholesterol biosynthesis'] },
  { theme: 'Biochemistry · haem and iron', terms: ['heme biosynthesis', 'porphyria', 'iron metabolism'] },
  { theme: 'Biochemistry · inborn errors', terms: ['inborn errors of metabolism', 'phenylketonuria', 'lysosomal storage'] },
  { theme: 'Biochemistry · collagen', terms: ['collagen synthesis', 'osteogenesis imperfecta', 'Ehlers-Danlos'] },
  { theme: 'Haematology · coagulation', terms: ['blood coagulation', 'fibrinolysis', 'anticoagulant'] },
  { theme: 'Physiology · oxygen transport', terms: ['hemoglobin oxygen', 'myoglobin', 'sickle cell disease'] },
  { theme: 'Endocrine biochemistry', terms: ['insulin resistance', 'thyroid hormone', 'cortisol'] },
  { theme: 'Physiology · cardiovascular', terms: ['cardiac physiology', 'blood pressure regulation', 'heart failure'] },
  { theme: 'Physiology · renal', terms: ['glomerular filtration', 'renal physiology', 'acid-base'] },
  { theme: 'Physiology · respiratory', terms: ['pulmonary ventilation', 'gas exchange', 'respiratory physiology'] },
  { theme: 'Anatomy', terms: ['anatomical variation', 'cadaveric', 'clinical anatomy'] },
  { theme: 'Medical education', terms: ['medical students learning', 'retrieval practice', 'spaced repetition'] },
];

const PER_THEME = 2;
const THEMES_PER_WEEK = 3;

/** The three themes for a week (consecutive weeks get different themes). */
export function themesForWeek(time = Date.now()) {
  const weeks = Math.floor(mondayOf(time).getTime() / (7 * 86_400_000));
  return Array.from({ length: THEMES_PER_WEEK }, (_, index) => RESEARCH_THEMES[(weeks * THEMES_PER_WEEK + index) % RESEARCH_THEMES.length]);
}

const day = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** The Europe PMC search for one theme, up to this week's Monday (so the week's list is stable). */
export function researchQuery(terms: readonly string[], time = Date.now()) {
  const monday = mondayOf(time);
  const from = new Date(monday.getTime() - 60 * 86_400_000);
  const titles = terms.map((term) => `TITLE:"${term}"`).join(' OR ');
  const designs = ['review', 'Randomized Controlled Trial', 'Meta-Analysis', 'Systematic Review'].map((type) => `PUB_TYPE:"${type}"`).join(' OR ');
  // English-language human research only (no veterinary or animal-only studies).
  const animals = ['calf', 'calves', 'cattle', 'bovine', 'canine', 'dogs', 'feline', 'cats', 'equine', 'horses', 'poultry', 'veterinary', 'livestock'].map((word) => `TITLE:"${word}"`).join(' OR ');
  return `(${titles}) AND SRC:MED AND LANG:"eng" AND HAS_ABSTRACT:Y AND (${designs}) AND NOT (${animals}) AND FIRST_PDATE:[${day(from)} TO ${day(monday)}]`;
}

export function designOf(pubType: string) {
  const type = pubType.toLowerCase();
  if (type.includes('meta-analysis')) return 'Meta-analysis';
  if (type.includes('systematic review')) return 'Systematic review';
  if (type.includes('randomized controlled trial')) return 'Randomised controlled trial';
  if (type.includes('review')) return 'Review';
  return 'Journal article';
}

const clean = (html: string) =>
  html.replace(/<h4>(.*?)<\/h4>/gi, ' $1: ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\s+([:.,;])/g, '$1').trim();

/** "Journal of neural transmission (Vienna, Austria : 1996)" → "Journal of neural transmission". */
const journalName = (title: string) => title.replace(/\s*\(.*\)\s*$/, '').replace(/\s*:.*$/, '').trim();

async function fetchTheme(theme: { theme: string; terms: readonly string[] }, time: number): Promise<LiveResearch[]> {
  const params = new URLSearchParams({ query: researchQuery(theme.terms, time), format: 'json', pageSize: String(PER_THEME), resultType: 'core', sort: 'P_PDATE_D desc' });
  const response = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`);
  if (!response.ok) throw new Error('Research could not be loaded.');
  const data = await response.json();
  const results: Record<string, any>[] = data?.resultList?.result ?? [];
  return results
    .filter((paper) => paper.pmid && paper.title)
    .map((paper) => {
      const abstract = clean(String(paper.abstractText ?? ''));
      return {
        id: `epmc-${paper.pmid}`,
        theme: theme.theme,
        title: clean(String(paper.title)).replace(/\.$/, ''),
        journal: journalName(String(paper.journalInfo?.journal?.title ?? paper.journalTitle ?? 'Journal')),
        date: String(paper.firstPublicationDate ?? ''),
        authors: String(paper.authorString ?? '').split(', ').slice(0, 3).join(', ') + (String(paper.authorString ?? '').split(', ').length > 3 ? ' et al.' : ''),
        design: designOf(String(paper.pubTypeList?.pubType?.join('; ') ?? paper.pubType ?? '')),
        abstract: abstract.length > 1200 ? `${abstract.slice(0, 1200).trimEnd()}…` : abstract,
        url: `https://europepmc.org/article/MED/${paper.pmid}`,
      };
    });
}

const KEY = 'grateapex_weekly_research';

/** This week's research (cached on the device for the week). */
export async function loadWeeklyResearch(time = Date.now()): Promise<{ week: string; items: LiveResearch[] }> {
  const week = mondayKey(time);
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    if (saved?.week === week && Array.isArray(saved.items) && saved.items.length) return saved;
  } catch {
    // no saved list
  }
  const lists = await Promise.all(themesForWeek(time).map((theme) => fetchTheme(theme, time).catch(() => [])));
  const seen = new Set<string>();
  const items = lists.flat().filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
  if (items.length) await AsyncStorage.setItem(KEY, JSON.stringify({ week, items })).catch(() => {});
  return { week, items };
}

export function useWeeklyResearch() {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'offline'; week: string; items: LiveResearch[] }>({ status: 'loading', week: mondayKey(), items: [] });
  useEffect(() => {
    let live = true;
    void loadWeeklyResearch()
      .then((result) => { if (live) setState({ status: result.items.length ? 'ready' : 'offline', ...result }); })
      .catch(() => { if (live) setState((old) => ({ ...old, status: 'offline' })); });
    return () => { live = false; };
  }, []);
  return state;
}
