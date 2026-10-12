// Source references, concepts, discrepancies and diagram knowledge for
// Anatomy → Upper Limb.
//
// Lecture sources (define WHAT is taught; see content-catalog.ts):
//   UL = "Upper Limbs (HB, updated)" — PPTX, 240 slides
//   UL24 = "Upper Limbs (HB, edited 2024)" — PPTX, 179 slides (versionOf UL)
//
// Reference (clarification only): Gray's Anatomy for Students (4th ed.), via GRAYS.
import type { SourceDiscrepancy, SourceDiagram, SourceReference } from '@/data/lesson-types';
import { slides, type ConceptDraft } from '@/data/topics/build';

export const TOPIC_ID = 'upper-limb';

const UL = 'anat-upper-limbs-updated';
const VISUAL_UL = [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 28, 29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 49, 50, 51, 65, 70, 71, 75, 76, 77, 80, 81, 82, 83, 86, 90, 96, 100, 102, 103, 107, 111, 113, 132, 133, 136, 142, 143, 144, 145, 149, 153, 154, 156, 166, 171, 173, 175, 176, 177, 181, 185, 186, 200, 205, 209, 214, 231, 233, 235, 236, 237, 239];

const deck = (id: string, visual: number[] = []) => (numbers: number[]): SourceReference[] =>
  slides(id, numbers, numbers.filter((n) => visual.includes(n)));

export const ul = deck(UL, VISUAL_UL);
export const GRAYS: SourceReference[] = [{ sourceId: 'grays-anatomy-students-4e' }];

const L = (n: number) => `${TOPIC_ID}-${n}`;

// ─── Concepts ───────────────────────────────────────────────────────

export const concepts = {
  // Lesson 1 — Osteology and Limb Development
  'bones-pectoral-arm': { lessonId: L(1), name: 'Bones of the shoulder girdle and arm: clavicle, scapula and humerus', category: 'core', relevance: 'core', sourceRefs: ul([5, 6, 7, 8, 9, 10, 11]) },
  'bones-forearm-hand': { lessonId: L(1), name: 'Bones of the forearm and hand: radius, ulna and carpals', category: 'core', relevance: 'core', sourceRefs: ul([12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26]) },
  'limb-bud-axes': { lessonId: L(1), name: 'Limb bud development and signaling axes: AER, PZ and ZPA', category: 'visual-process', relevance: 'core', sourceRefs: ul([28, 29]) },
  'endochondral-ossification': { lessonId: L(1), name: 'Endochondral ossification and primary ossification centres', category: 'core', relevance: 'core', sourceRefs: ul([30, 31, 32, 33, 35, 36, 37, 38, 39, 49]) },
  'growth-plate-zones': { lessonId: L(1), name: 'Zonation of the physis and growth plate pathologies', category: 'clinical', relevance: 'core', sourceRefs: ul([40, 41, 42, 43, 44, 45, 46, 47, 48]) },

  // Lesson 2 — Joints of the Upper Limb
  'clavicular-joints': { lessonId: L(2), name: 'Sternoclavicular and acromioclavicular joints', category: 'core', relevance: 'core', sourceRefs: ul([62, 64, 66, 67, 68, 69, 71]) },
  'glenohumeral-joint': { lessonId: L(2), name: 'Glenohumeral joint stability, static and dynamic restraints', category: 'core', relevance: 'core', sourceRefs: ul([72, 73, 74, 77, 78]) },
  'shoulder-dislocation': { lessonId: L(2), name: 'Shoulder dislocation and labral pathology', category: 'clinical', relevance: 'core', sourceRefs: ul([76, 77]) },
  'elbow-joint': { lessonId: L(2), name: 'Elbow joint anatomy, collateral ligaments and carrying angle', category: 'core', relevance: 'core', sourceRefs: ul([79, 81, 82, 83, 84, 85, 86, 130]) },
  'radioulnar-wrist-joints': { lessonId: L(2), name: 'Radioulnar joints, the TFCC and the radiocarpal (wrist) joint', category: 'core', relevance: 'core', sourceRefs: ul([87, 88, 89, 91, 92]) },

  // Lesson 3 — Pectoral Region, Rotator Cuff and Axillary Spaces
  'pectoral-muscles': { lessonId: L(3), name: 'Pectoral region and shoulder girdle musculature', category: 'core', relevance: 'core', sourceRefs: ul([93, 95, 97, 98, 99, 101, 105]) },
  'rotator-cuff': { lessonId: L(3), name: 'Rotator cuff muscles (SITS) and their actions', category: 'core', relevance: 'core', sourceRefs: ul([106, 108, 109, 110]) },
  'quadrangular-space': { lessonId: L(3), name: 'Quadrangular space: boundaries and neurovascular contents', category: 'visual-process', relevance: 'core', sourceRefs: ul([112, 115]) },
  'triangular-spaces': { lessonId: L(3), name: 'Upper triangular space and triangular interval', category: 'visual-process', relevance: 'core', sourceRefs: ul([114, 116, 117]) },

  // Lesson 4 — Arm and the Cubital Fossa
  'anterior-arm-muscles': { lessonId: L(4), name: 'Anterior compartment of the arm: biceps, coracobrachialis and brachialis', category: 'core', relevance: 'core', sourceRefs: ul([118, 119, 120, 121, 122, 123, 124, 125, 126, 127]) },
  'posterior-arm-muscles': { lessonId: L(4), name: 'Posterior compartment of the arm: triceps brachii', category: 'core', relevance: 'core', sourceRefs: ul([128, 129]) },
  'cubital-fossa-boundaries': { lessonId: L(4), name: 'Cubital fossa boundaries, floor and roof', category: 'visual-process', relevance: 'core', sourceRefs: ul([131, 134]) },
  'cubital-fossa-contents': { lessonId: L(4), name: 'Contents and neurovascular relations in the cubital fossa', category: 'core', relevance: 'core', sourceRefs: ul([135, 191]) },

  // Lesson 5 — Forearm and Anatomical Snuffbox
  'anterior-forearm-superficial': { lessonId: L(5), name: 'Anterior forearm: superficial and intermediate flexor-pronator muscles', category: 'core', relevance: 'core', sourceRefs: ul([137, 138, 139, 140]) },
  'anterior-forearm-deep': { lessonId: L(5), name: 'Anterior forearm: deep flexor layer and anterior interosseous nerve', category: 'core', relevance: 'core', sourceRefs: ul([141, 196]) },
  'posterior-forearm-muscles': { lessonId: L(5), name: 'Posterior compartment of the forearm: mobile wad, superficial and deep extensors', category: 'core', relevance: 'core', sourceRefs: ul([146, 147, 148, 150, 151, 152, 155, 157, 158, 159, 160, 161, 162, 163, 164, 165, 167, 168, 169, 170, 172]) },
  'extensor-compartments': { lessonId: L(5), name: 'The six dorsal extensor tendon compartments', category: 'visual-process', relevance: 'core', sourceRefs: ul([178]) },
  'anatomical-snuffbox': { lessonId: L(5), name: 'The anatomical snuffbox: boundaries, floor, contents and clinical link', category: 'clinical', relevance: 'core', sourceRefs: ul([179, 180, 182, 183]) },

  // Lesson 6 — Arteries and Nerves of the Upper Limb
  'subclavian-axillary-arteries': { lessonId: L(6), name: 'Subclavian and axillary arteries: parts and branches', category: 'core', relevance: 'core', sourceRefs: ul([198, 199, 201, 202, 203, 204]) },
  'brachial-radial-ulnar-arteries': { lessonId: L(6), name: 'Brachial, radial, ulnar and interosseous arteries', category: 'core', relevance: 'core', sourceRefs: ul([206, 207, 208, 210, 211, 212, 213, 215, 216, 217, 218, 220, 221, 223, 224, 225, 227, 228]) },
  'median-nerve-course': { lessonId: L(6), name: 'The median nerve: course, motor and sensory distribution', category: 'core', relevance: 'core', sourceRefs: ul([229, 230]) },
  'radial-nerve-course': { lessonId: L(6), name: 'The radial nerve: course, motor and sensory distribution', category: 'core', relevance: 'core', sourceRefs: ul([232, 234]) },
  'ulnar-nerve-course': { lessonId: L(6), name: 'The ulnar nerve: course, motor and sensory distribution', category: 'core', relevance: 'core', sourceRefs: ul([238]) },
} satisfies Record<string, ConceptDraft>;

export type ConceptId = keyof typeof concepts;

// ─── Discrepancies and Clarifications ───────────────────────────────

export const discrepancies: SourceDiscrepancy[] = [
  {
    id: 'clavicle-fracture-site',
    concept: 'Weakest site of clavicular fracture',
    status: 'resolved',
    statements: [
      { text: 'Upper Limbs HB, slide 9: “Middle third is weakest portion of clavicle. Clavicular fracture commonest.”', sourceRefs: ul([8, 9]) },
      { text: 'Gray’s: most fractures occur at the junction of the medial two-thirds and lateral third, where the curvature changes.', sourceRefs: GRAYS },
    ],
    resolution: {
      text: 'Both statements describe the same anatomical transitional zone between the curvatures. Gray’s clarifies the mechanical stress concentration.',
      sourceRefs: [...ul([8, 9]), ...GRAYS],
    },
    note: 'In exams, both middle third and junction of medial two-thirds/lateral third refer to this same standard site.',
  },
  {
    id: 'musculocutaneous-fossa-position',
    concept: 'Musculocutaneous nerve position relative to cubital fossa',
    status: 'resolved',
    statements: [
      { text: 'Upper Limbs HB, slide 135: “In the cubital fossa, the musculocutaneous nerve lie at the lateral margin of the biceps tendon.”', sourceRefs: ul([135]) },
      { text: 'Gray’s: the musculocutaneous nerve pierces coracobrachialis, supplies anterior arm flexors, and emerges lateral to biceps tendon as the lateral cutaneous nerve of the forearm.', sourceRefs: GRAYS },
    ],
    resolution: {
      text: 'The main trunk does not enter the deep fossa; its terminal branch (lateral cutaneous nerve of forearm) emerges superficially at the lateral margin of the biceps tendon.',
      sourceRefs: [...ul([135]), ...GRAYS],
    },
  },
];

// ─── Diagram Knowledge ──────────────────────────────────────────────

export const diagrams: SourceDiagram[] = [
  {
    id: 'posterior-scapular-spaces',
    title: 'Spaces of the Posterior Scapular Region (slides 112–117)',
    sourceRefs: ul([112, 114, 116, 117]),
    shows: [
      'Quadrangular space: bounded by teres minor, teres major, triceps long head, and humeral surgical neck; transmits axillary nerve and posterior circumflex humeral artery.',
      'Upper triangular space: bounded by teres minor, teres major, and triceps long head; transmits circumflex scapular artery.',
      'Triangular interval: bounded by teres major, triceps long head, and humerus/lateral head of triceps; transmits radial nerve and profunda brachii artery.',
    ],
  },
  {
    id: 'cubital-fossa-anatomy',
    title: 'Anatomy of the Cubital Fossa (slides 131–135)',
    sourceRefs: ul([131, 134, 135]),
    shows: [
      'Boundaries: epicondylar line superiorly, pronator teres medially, brachioradialis laterally. Floor: brachialis and supinator. Roof: skin, median cubital vein, bicipital aponeurosis.',
      'Contents from medial to lateral: Median nerve, Brachial artery, Biceps tendon, Radial nerve (MBBR).',
    ],
  },
  {
    id: 'extensor-compartments-wrist',
    title: 'Extensor Tendon Compartments of the Wrist (slide 178)',
    sourceRefs: ul([178]),
    shows: [
      'Six dorsal compartments under extensor retinaculum: 1 (APL, EPB), 2 (ECRL, ECRB), 3 (EPL), 4 (ED, EI), 5 (EDM), 6 (ECU).',
    ],
  },
];
