// Source references, concepts, discrepancies and diagram knowledge for
// Physiology → Central Nervous System.
//
// Lecture sources (define WHAT is taught; see content-catalog.ts):
//   S1 = "Sensory Physiology (first lecture)" — PDF, 31 pages
//   S2 = "Sensory Physiology (second lecture)" — PDF, 30 pages
//   PN = "Pain Transmission (sensory continued)" — 11 slides (repeats S2 pp. 20–29)
//   SC = "Neurophysiology: Spinal Cord" — 14 slides
//   MO = "Motor Activity" — 19 slides
//   CB = "Motor Continued: Cerebellum and Basal Ganglia" — 27 slides
//   BG = "Basal Ganglia" — 12 slides
//   BR = "The Brain" — 30 slides
// The study guides and "CNS First lecture explained" found with the lectures
// are study aids and are not used as sources of facts. Pages that are only
// pictures (spindle, reflex and tract diagrams) are referenced as visual.
//
// Reference (clarification only): Guyton and Hall (14th ed.), via GUYTON.
import type { SourceDiscrepancy, SourceDiagram, SourceReference } from '@/data/lesson-types';
import { pages, slides, type ConceptDraft } from '@/data/topics/build';

export const TOPIC_ID = 'central-nervous-system';

const pdf = (id: string) => (numbers: number[]): SourceReference[] => pages(id, numbers);
const deck = (id: string, visual: number[] = []) => (numbers: number[]): SourceReference[] =>
  slides(id, numbers, numbers.filter((n) => visual.includes(n)));

export const s1 = pdf('cns-cns-notes-sensory-first-lecture');
export const s2 = pdf('cns-cnn-notes-sensory-second-lecture');
export const pn = deck('cns-seconsory-continued-5', [6, 7, 8, 10, 11]);
export const sc = deck('cns-cns-notes-spinal-cord', [3, 5, 6, 7, 9]);
export const mo = deck('cns-cns-notes-motor-1-proper', [12, 13]);
export const cb = deck('cns-cns-notes-cerebelum', [4, 9, 14, 15, 25]);
export const bg = deck('cns-basal-ganglia', [3, 4, 5, 6]);
export const br = deck('cns-cns-notes-brain', [21]);

export const GUYTON: SourceReference[] = [{ sourceId: 'guyton-hall-14e' }];

const L = (n: number) => `${TOPIC_ID}-${n}`;

// ─── Concepts ───────────────────────────────────────────────────────

export const concepts = {
  // Lesson 1 — Organisation and sensory receptors
  'cns-organisation': { lessonId: L(1), name: 'Organisation and functions of the CNS', category: 'core', relevance: 'core', sourceRefs: [...s1([1, 2]), ...sc([2])] },
  'sensory-system': { lessonId: L(1), name: 'The sensory system and its modalities', category: 'core', relevance: 'core', sourceRefs: s1([3, 4, 5]) },
  'receptor-classes': { lessonId: L(1), name: 'Classification of sensory receptors', category: 'core', relevance: 'core', sourceRefs: s1([6]) },
  'generator-potential': { lessonId: L(1), name: 'Generator potentials and coding intensity', category: 'visual-process', relevance: 'core', sourceRefs: s1([8, 9]) },
  'adaptation-muller': { lessonId: L(1), name: 'Adaptation and Müller’s doctrine', category: 'core', relevance: 'core', sourceRefs: s1([10]) },

  // Lesson 2 — Reflexes
  'reflex-arc': { lessonId: L(2), name: 'The reflex arc', category: 'core', relevance: 'core', sourceRefs: s1([11, 13]) },
  'muscle-spindle': { lessonId: L(2), name: 'The muscle spindle', category: 'core', relevance: 'core', sourceRefs: s1([14, 15, 19, 22]) },
  'stretch-reflex': { lessonId: L(2), name: 'The stretch (myotatic) reflex', category: 'visual-process', relevance: 'core', sourceRefs: s1([12, 13, 20]) },
  'gamma-efferents': { lessonId: L(2), name: 'γ-efferent control and reciprocal innervation', category: 'core', relevance: 'core', sourceRefs: s1([24, 25]) },
  'inverse-stretch': { lessonId: L(2), name: 'The inverse stretch reflex and muscle tone', category: 'core', relevance: 'core', sourceRefs: s1([26, 27, 28, 29]) },

  // Lesson 3 — Somatic sensation and ascending pathways
  'sensation-types': { lessonId: L(3), name: 'Cutaneous, deep and visceral sensation; afferent fibres', category: 'core', relevance: 'core', sourceRefs: s1([30]) },
  'dorsal-columns': { lessonId: L(3), name: 'The dorsal column (lemniscal) pathway', category: 'visual-process', relevance: 'core', sourceRefs: s2([7, 8, 13, 14]) },
  'spinothalamic': { lessonId: L(3), name: 'The spinothalamic pathway', category: 'visual-process', relevance: 'core', sourceRefs: s2([9, 10, 11, 12, 14]) },
  'sensory-cortex': { lessonId: L(3), name: 'The somatic sensory cortex', category: 'core', relevance: 'core', sourceRefs: s2([2, 3, 5]) },
  'temperature': { lessonId: L(3), name: 'Temperature sensation', category: 'core', relevance: 'core', sourceRefs: s2([15]) },

  // Lesson 4 — Pain
  'pain-types': { lessonId: L(4), name: 'Fast and slow pain', category: 'core', relevance: 'core', sourceRefs: s2([16, 17]) },
  'pain-features': { lessonId: L(4), name: 'Pain receptors and pain chemicals', category: 'core', relevance: 'core', sourceRefs: s2([17, 18, 19]) },
  'pain-pathways': { lessonId: L(4), name: 'Fast and slow pain pathways', category: 'visual-process', relevance: 'core', sourceRefs: [...s2([20, 21]), ...pn([2, 3])] },
  'pain-control': { lessonId: L(4), name: 'Pain control: local suppression and the analgesic system', category: 'core', relevance: 'core', sourceRefs: [...s2([22, 23, 24]), ...pn([4, 5, 6])] },
  'referred-pain': { lessonId: L(4), name: 'Referred pain, headache and dermatomes', category: 'clinical', relevance: 'core', sourceRefs: [...s2([28, 29]), ...pn([9, 10])] },

  // Lesson 5 — The spinal cord
  'cord-structure': { lessonId: L(5), name: 'Structure of the spinal cord', category: 'core', relevance: 'core', sourceRefs: sc([2, 4]) },
  'cord-tracts': { lessonId: L(5), name: 'Naming the spinal tracts', category: 'core', relevance: 'core', sourceRefs: sc([8, 9]) },
  'plexuses': { lessonId: L(5), name: 'Plexuses and their nerves', category: 'supporting', relevance: 'supporting', sourceRefs: sc([10, 11]) },
  'dorsal-horn-laminae': { lessonId: L(5), name: 'Laminae of the dorsal horn', category: 'core', relevance: 'core', sourceRefs: sc([12, 13, 14]) },

  // Lesson 6 — Motor cortex and descending control
  'final-common-path': { lessonId: L(6), name: 'The final common pathway', category: 'core', relevance: 'core', sourceRefs: mo([2, 3]) },
  'motor-areas': { lessonId: L(6), name: 'Motor areas of the cortex', category: 'core', relevance: 'core', sourceRefs: mo([4, 5, 6, 7]) },
  'corticospinal': { lessonId: L(6), name: 'The corticospinal (pyramidal) tracts', category: 'visual-process', relevance: 'core', sourceRefs: mo([8, 9, 10, 11]) },
  'brainstem-motor': { lessonId: L(6), name: 'Brainstem control of posture', category: 'core', relevance: 'core', sourceRefs: mo([16, 17]) },
  'motor-lesions': { lessonId: L(6), name: 'Cortical and cord lesions', category: 'clinical', relevance: 'core', sourceRefs: mo([14, 17, 18]) },
  'myotomes': { lessonId: L(6), name: 'Myotomes', category: 'supporting', relevance: 'supporting', sourceRefs: mo([15]) },

  // Lesson 7 — The cerebellum
  'cerebellum-anatomy': { lessonId: L(7), name: 'Anatomy of the cerebellum', category: 'core', relevance: 'core', sourceRefs: cb([2, 3, 5, 6]) },
  'cerebellum-inputs': { lessonId: L(7), name: 'Inputs and outputs of the cerebellum', category: 'core', relevance: 'core', sourceRefs: cb([7, 10, 11]) },
  'cerebellum-function': { lessonId: L(7), name: 'How the cerebellum coordinates movement', category: 'core', relevance: 'core', sourceRefs: cb([12, 13, 16, 17]) },
  'cerebellar-signs': { lessonId: L(7), name: 'Signs of cerebellar dysfunction', category: 'clinical', relevance: 'core', sourceRefs: cb([8, 16, 18]) },

  // Lesson 8 — The basal ganglia
  'bg-structure': { lessonId: L(8), name: 'Structure of the basal ganglia', category: 'core', relevance: 'core', sourceRefs: [...cb([19]), ...bg([2, 3])] },
  'bg-circuits': { lessonId: L(8), name: 'Putamen and caudate circuits', category: 'core', relevance: 'core', sourceRefs: [...cb([20, 21]), ...bg([5])] },
  'bg-transmitters': { lessonId: L(8), name: 'Neurotransmitters of the basal ganglia', category: 'core', relevance: 'core', sourceRefs: [...cb([22]), ...bg([6])] },
  'bg-disorders': { lessonId: L(8), name: 'Basal ganglia disorders', category: 'clinical', relevance: 'core', sourceRefs: [...cb([23, 24, 26, 27]), ...bg([7, 8, 9, 10])] },

  // Lesson 9 — The brain
  'brain-overview': { lessonId: L(9), name: 'Parts of the brain', category: 'core', relevance: 'core', sourceRefs: br([2, 3, 4, 5, 15]) },
  'brain-lobes': { lessonId: L(9), name: 'The four lobes and their lesions', category: 'core', relevance: 'core', sourceRefs: br([6, 7, 8, 9, 10, 11, 12, 13, 14]) },
  'brainstem': { lessonId: L(9), name: 'The brainstem and cerebellum', category: 'core', relevance: 'core', sourceRefs: br([16, 17, 18, 19]) },
  'cortex-dominance': { lessonId: L(9), name: 'Cerebral dominance and the corpus callosum', category: 'core', relevance: 'core', sourceRefs: br([22, 23, 24]) },
  'deep-structures': { lessonId: L(9), name: 'Thalamus, hypothalamus and limbic system', category: 'core', relevance: 'core', sourceRefs: br([25, 26, 27, 28]) },
} satisfies Record<string, ConceptDraft>;

export type ConceptId = keyof typeof concepts;

// ─── Discrepancies ──────────────────────────────────────────────────

export const discrepancies: SourceDiscrepancy[] = [
  {
    id: 'parietal-language',
    concept: 'What the parietal lobe mainly does',
    status: 'unresolved',
    statements: [
      { text: 'The Brain, slide 6: “The parietal lobe is mainly to do with language.”', sourceRefs: br([6]) },
      { text: 'Slide 11: the parietal lobe controls bodily sensation, shape, texture and position; the left side participates in reading, writing and naming; the right in attention and visuospatial skills.', sourceRefs: br([11]) },
    ],
    note: 'Only the slide-11 description is quizzed; whether the lecturer means “mainly language” is not.',
  },
  {
    id: 'parietal-apraxia',
    concept: 'Lack of awareness of body parts after parietal damage',
    status: 'unresolved',
    statements: [
      { text: 'The Brain, slide 12: “Lack of awareness of certain body parts and/or surrounding space (Apraxia)”.', sourceRefs: br([12]) },
      { text: 'Motor Activity, slide 7: damage to the hand skills area causes non-purposeful hand movement, or apraxia; Sensory II, p. 3: loss of awareness of the opposite side is amorphosynthesis.', sourceRefs: [...mo([7]), ...s2([3])] },
    ],
    note: 'The term “apraxia” is used for two different deficits. The quiz uses apraxia only for the motor meaning (Motor Activity, slide 7) and amorphosynthesis for neglect.',
  },
  {
    id: 'spindle-motor',
    concept: 'Motor supply of the muscle spindle',
    status: 'resolved',
    statements: [
      { text: 'Sensory I, p. 14: motor supply “γ efferents of Leksell; β fibres”.', sourceRefs: s1([14]) },
    ],
    resolution: {
      text: 'Guyton: intrafusal fibres are supplied by small γ motor neurons; some β fibres supply both intrafusal and extrafusal fibres. The γ supply is what the lesson stresses.',
      sourceRefs: [...s1([14]), ...GUYTON],
    },
  },
];

// ─── Diagram knowledge ──────────────────────────────────────────────

export const diagrams: SourceDiagram[] = [
  {
    id: 'stretch-reflex-loop',
    title: 'The stretch reflex (Sensory I, pp. 12–20)',
    sourceRefs: s1([12, 13, 17, 20]),
    shows: ['Muscle stretched → spindle stretched → nerve endings distorted → Ia afferent (dorsal root) → α-motor neuron (ventral horn) → muscle contracts. Monosynaptic: knee and ankle jerks.'],
  },
  {
    id: 'pain-pathways-figure',
    title: 'Fast and slow pain pathways (Sensory II, pp. 20–21)',
    sourceRefs: s2([20, 21]),
    shows: [
      'Fast: receptor → Aδ → dorsal horn → crosses → neospinothalamic tract → thalamus → sensory cortex.',
      'Slow: receptor → C → dorsal horn laminae II/III → relay to lamina V → crosses → paleospinothalamic tract → reticular nuclei, tectum, periaqueductal grey; only 10–25% reach the thalamus. Transmitter: substance P.',
    ],
  },
];
