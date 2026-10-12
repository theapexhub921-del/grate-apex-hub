// Tappable lecture diagrams for cardiovascular-physiology (see data/figures/index.ts).
// Generated from the slide images; pins and label boxes are fractions of
// the picture. Images: public/figures/cardiovascular-physiology/.
import type { LessonFigure } from '@/data/lesson-types';
import { c1, c4, c5 } from '@/data/topics/cardiovascular-physiology/sources';

export const heart: LessonFigure = {
  id: 'cardiovascular-physiology:heart',
  title: 'The heart',
  src: '/figures/cardiovascular-physiology/heart.jpg',
  width: 1050,
  height: 1051,
  caption: 'Lecture slide 5 (The Heart and Circulation).',
  sourceRefs: c1([5]),
  spots: [
    { id: 'aorta', label: 'Aorta', x: 0.366, y: 0.164 },
    { id: 'pulmonic-valve', label: 'Pulmonic valve', x: 0.415, y: 0.527 },
    { id: 'right-atrium', label: 'Right atrium', x: 0.195, y: 0.575 },
    { id: 'tricuspid', label: 'Tricuspid valve', note: 'The right AV valve, between the right atrium and right ventricle (slide 6).', x: 0.22, y: 0.685 },
    { id: 'right-ventricle', label: 'Right ventricle', x: 0.28, y: 0.788 },
    { id: 'supportive', label: 'Supportive structures', x: 0.476, y: 0.89 },
    { id: 'left-ventricle', label: 'Left ventricle', x: 0.793, y: 0.815 },
    { id: 'mitral', label: 'Mitral valve', note: 'The left AV valve, between the left atrium and left ventricle (slide 6).', x: 0.573, y: 0.548 },
    { id: 'aortic-valve', label: 'Aortic valve', x: 0.707, y: 0.534 },
    { id: 'left-atrium', label: 'Left atrium', x: 0.634, y: 0.418 },
    { id: 'pulmonary-artery', label: 'Pulmonary artery', x: 0.488, y: 0.315 },
  ],
};

export const conduction: LessonFigure = {
  id: 'cardiovascular-physiology:conduction',
  title: 'The conducting tissues',
  src: '/figures/cardiovascular-physiology/conduction.jpg',
  width: 1200,
  height: 622,
  caption: 'Lecture slide 7. All parts of the conduction system can discharge spontaneously, but the SA node controls them: it is the pacemaker.',
  sourceRefs: c1([7]),
  spots: [
    { id: 'sa-node', label: 'Sinoatrial (SA) node', note: 'The pacemaker: its discharge controls the rest of the conducting system.', x: 0.317, y: 0.374, boxes: [[0.106, 0.344, 0.176, 0.049]] },
    { id: 'av-node', label: 'Atrioventricular (AV) node', x: 0.479, y: 0.481, boxes: [[0.056, 0.664, 0.19, 0.049]] },
    { id: 'bundle-of-his', label: 'Bundle of His', x: 0.535, y: 0.435, boxes: [[0.768, 0.313, 0.12, 0.049]] },
    { id: 'bundle-branches', label: 'Bundle branches', x: 0.563, y: 0.55, boxes: [[0.782, 0.397, 0.148, 0.049]] },
    { id: 'purkinje', label: 'Purkinje fibres', x: 0.697, y: 0.656, boxes: [[0.782, 0.565, 0.155, 0.049], [0.521, 0.893, 0.134, 0.049]] },
    { id: 'right-atrium', label: 'Right atrium', x: 0.394, y: 0.366, boxes: [[0.134, 0.473, 0.113, 0.049]] },
    { id: 'left-atrium', label: 'Left atrium', x: 0.592, y: 0.198, boxes: [[0.704, 0.221, 0.127, 0.049]] },
    { id: 'left-ventricle', label: 'Left ventricle', x: 0.69, y: 0.504, boxes: [[0.782, 0.481, 0.141, 0.049]] },
    { id: 'right-ventricle', label: 'Right ventricle', x: 0.451, y: 0.702, boxes: [[0.317, 0.878, 0.127, 0.049]] },
    { id: 'svc', label: 'Superior vena cava', x: 0.282, y: 0.168, boxes: [[0.063, 0.038, 0.176, 0.049]] },
    { id: 'papillary', label: 'Papillary muscle', x: 0.521, y: 0.763, boxes: [[0.373, 0.939, 0.148, 0.049]] },
  ],
};

export const jvp: LessonFigure = {
  id: 'cardiovascular-physiology:jvp',
  title: 'The jugular venous pulse',
  src: '/figures/cardiovascular-physiology/jvp.jpg',
  width: 947,
  height: 504,
  caption: 'Lecture slide 27 (The Heart and Circulation).',
  sourceRefs: c1([27]),
  spots: [
    { id: 'a', label: 'a wave', note: 'Atrial contraction: blood regurgitates into the great veins and venous inflow stops.', x: 0.216, y: 0.2, boxes: [[0.17, 0.043, 0.081, 0.114]] },
    { id: 'c', label: 'c wave', note: 'Isovolumetric ventricular contraction: the tricuspid valve moves upward.', x: 0.324, y: 0.443, boxes: [[0.292, 0.3, 0.081, 0.114]] },
    { id: 'x', label: 'x descent', note: 'Atrial relaxation after emptying.', x: 0.473, y: 0.771, boxes: [[0.359, 0.671, 0.081, 0.114]] },
    { id: 'v', label: 'v wave', note: 'Passive filling of the atrium with the tricuspid valve closed.', x: 0.703, y: 0.543, boxes: [[0.684, 0.386, 0.081, 0.114]] },
    { id: 'y', label: 'y descent', note: 'Opening of the tricuspid valve.', x: 0.905, y: 0.729, boxes: [[0.914, 0.786, 0.081, 0.114]] },
  ],
};

export const starlingCurves: LessonFigure = {
  id: 'cardiovascular-physiology:starling-curves',
  title: 'Starling’s curves',
  src: '/figures/cardiovascular-physiology/starling-curves.jpg',
  width: 1200,
  height: 958,
  caption: 'Lecture slide 46 (The Heart and Circulation): stroke volume against ventricular end-diastolic volume.',
  sourceRefs: c1([46]),
  spots: [
    { id: 'exercise', label: 'Normal heart during exercise', x: 0.5, y: 0.233, boxes: [[0.661, 0.019, 0.313, 0.101]] },
    { id: 'rest', label: 'Normal heart at rest', x: 0.634, y: 0.27, boxes: [[0.723, 0.201, 0.214, 0.101]] },
    { id: 'failure', label: 'Heart failure', x: 0.759, y: 0.547, boxes: [[0.83, 0.491, 0.152, 0.101]] },
    { id: 'shock', label: 'Cardiogenic shock', x: 0.92, y: 0.698, boxes: [[0.643, 0.692, 0.268, 0.107]] },
    { id: 'contractility', label: 'Contractile state', note: 'Moving between the curves: a higher contractile state raises stroke volume at the same end-diastolic volume.', x: 0.67, y: 0.447, boxes: [[0.589, 0.365, 0.286, 0.107]] },
  ],
};

export const circleOfWillis: LessonFigure = {
  id: 'cardiovascular-physiology:circle-of-willis',
  title: 'The circle of Willis',
  src: '/figures/cardiovascular-physiology/circle-of-willis.jpg',
  width: 640,
  height: 734,
  caption: 'Lecture slide 3 (Regional Circulation).',
  sourceRefs: c4([3]),
  spots: [
    { id: 'internal-carotid', label: 'Internal carotid artery', x: 0.26, y: 0.265, boxes: [[0.012, 0.039, 0.3, 0.147]] },
    { id: 'middle-cerebral', label: 'Middle cerebral artery', x: 0.74, y: 0.304, boxes: [[0.652, 0.039, 0.292, 0.147]] },
    { id: 'circle', label: 'Circle of Willis', x: 0.44, y: 0.255, boxes: [[0.272, 0.304, 0.32, 0.137]] },
    { id: 'basilar', label: 'Basilar artery', x: 0.4, y: 0.725, boxes: [[0, 0.667, 0.26, 0.137]] },
  ],
};

export const coronaryArteries: LessonFigure = {
  id: 'cardiovascular-physiology:coronary-arteries',
  title: 'The coronary arteries',
  src: '/figures/cardiovascular-physiology/coronary-arteries.jpg',
  width: 1200,
  height: 1043,
  caption: 'Lecture slide 27 (Regional Circulation). Coronary flow happens during diastole.',
  sourceRefs: c4([27]),
  spots: [
    { id: 'aorta', label: 'Aorta', x: 0.351, y: 0.307, boxes: [[0.058, 0.28, 0.113, 0.047]] },
    { id: 'rca', label: 'Right coronary artery', x: 0.32, y: 0.56, boxes: [[0.016, 0.413, 0.144, 0.107]] },
    { id: 'left-main', label: 'Left main coronary artery', x: 0.536, y: 0.347, boxes: [[0.707, 0.147, 0.165, 0.107]] },
    { id: 'circumflex', label: 'Left circumflex artery', x: 0.629, y: 0.453, boxes: [[0.728, 0.3, 0.155, 0.107]] },
    { id: 'marginal', label: 'Obtuse marginal artery', x: 0.68, y: 0.527, boxes: [[0.769, 0.433, 0.144, 0.107]] },
    { id: 'lad', label: 'Left anterior descending artery', x: 0.606, y: 0.513, boxes: [[0.79, 0.56, 0.186, 0.107]] },
    { id: 'diagonal', label: 'Diagonal artery', x: 0.649, y: 0.653, boxes: [[0.79, 0.693, 0.134, 0.073]] },
    { id: 'posterior-lateral', label: 'Posterior lateral artery', x: 0.371, y: 0.653, boxes: [[0.016, 0.593, 0.144, 0.107]] },
    { id: 'pda', label: 'Posterior descending artery', x: 0.351, y: 0.76, boxes: [[0, 0.753, 0.171, 0.107]] },
  ],
};

export const fetalCirculation: LessonFigure = {
  id: 'cardiovascular-physiology:fetal-circulation',
  title: 'Fetal circulation',
  src: '/figures/cardiovascular-physiology/fetal-circulation.jpg',
  width: 1200,
  height: 743,
  caption: 'Lecture slide 43 (Regional Circulation). Red: oxygen-rich blood; blue: oxygen-poor; purple: mixed.',
  sourceRefs: c4([43]),
  spots: [
    { id: 'placenta', label: 'Placenta', x: 0.229, y: 0.364, boxes: [[0.179, 0.136, 0.114, 0.047]] },
    { id: 'umbilical-cord', label: 'Umbilical cord', x: 0.4, y: 0.584, boxes: [[0.279, 0.714, 0.171, 0.047]] },
    { id: 'umbilical-vein', label: 'Umbilical vein', x: 0.65, y: 0.675, boxes: [[0.457, 0.779, 0.171, 0.047]] },
    { id: 'umbilical-arteries', label: 'Umbilical arteries', x: 0.771, y: 0.844, boxes: [[0.457, 0.864, 0.207, 0.047]] },
    { id: 'ductus-venosus', label: 'Ductus venosus', x: 0.743, y: 0.481, boxes: [[0.429, 0.442, 0.186, 0.047]] },
    { id: 'liver', label: 'Liver', x: 0.7, y: 0.519, boxes: [[0.55, 0.513, 0.071, 0.047]] },
    { id: 'foramen-ovale', label: 'Foramen ovale', x: 0.757, y: 0.299, boxes: [[0.429, 0.214, 0.179, 0.047]] },
    { id: 'ductus-arteriosus', label: 'Ductus arteriosus', x: 0.807, y: 0.227, boxes: [[0.771, 0.013, 0.207, 0.047]] },
    { id: 'aorta', label: 'Aorta', x: 0.764, y: 0.212, boxes: [[0.579, 0.143, 0.071, 0.047]] },
    { id: 'pulmonary-artery', label: 'Pulmonary artery', x: 0.793, y: 0.331, boxes: [[0.386, 0.364, 0.193, 0.047]] },
    { id: 'lung', label: 'Lung', x: 0.929, y: 0.325, boxes: [[0.521, 0.286, 0.064, 0.047], [0.914, 0.474, 0.064, 0.047]] },
    { id: 'left-kidney', label: 'Left kidney', x: 0.857, y: 0.571, boxes: [[0.843, 0.649, 0.129, 0.047]] },
  ],
};

export const limbLeads: LessonFigure = {
  id: 'cardiovascular-physiology:limb-leads',
  title: 'Standard limb leads',
  src: '/figures/cardiovascular-physiology/limb-leads.jpg',
  width: 1200,
  height: 869,
  caption: 'Lecture slide 3 (Cardiac Rhythms and the Electrocardiogram): the three bipolar limb leads.',
  sourceRefs: c5([3]),
  spots: [
    { id: 'ra', label: 'Right arm (RA) electrode', x: 0.237, y: 0.243, boxes: [[0.039, 0.118, 0.119, 0.072]] },
    { id: 'la', label: 'Left arm (LA) electrode', x: 0.763, y: 0.243, boxes: [[0.861, 0.118, 0.11, 0.072]] },
    { id: 'll', label: 'Left leg (LL) electrode', x: 0.593, y: 0.842, boxes: [[0.598, 0.888, 0.11, 0.072]] },
    { id: 'rl', label: 'Right leg (RL) electrode', x: 0.415, y: 0.842, boxes: [[0.344, 0.888, 0.11, 0.072]] },
    { id: 'lead-i', label: 'Lead I', note: 'RA (−) to LA (+).', x: 0.508, y: 0.204, boxes: [[0.488, 0.171, 0.051, 0.059]] },
    { id: 'lead-ii', label: 'Lead II', note: 'RA (−) to LL (+).', x: 0.373, y: 0.553, boxes: [[0.344, 0.513, 0.068, 0.059]] },
    { id: 'lead-iii', label: 'Lead III', note: 'LA (−) to LL (+).', x: 0.627, y: 0.553, boxes: [[0.581, 0.513, 0.085, 0.059]] },
  ],
};

export const chestLeads: LessonFigure = {
  id: 'cardiovascular-physiology:chest-leads',
  title: 'Chest leads',
  src: '/figures/cardiovascular-physiology/chest-leads.jpg',
  width: 1178,
  height: 1109,
  caption: 'Lecture slide 5 (Cardiac Rhythms and the Electrocardiogram): front view, and a cross-section of the chest from below.',
  sourceRefs: c5([5]),
  spots: [
    { id: 'v1', label: 'V1', x: 0.402, y: 0.87, boxes: [[0.326, 0.26, 0.087, 0.058], [0.376, 0.89, 0.087, 0.058]] },
    { id: 'v2', label: 'V2', x: 0.511, y: 0.87, boxes: [[0.463, 0.234, 0.087, 0.058], [0.496, 0.89, 0.087, 0.058]] },
    { id: 'v3', label: 'V3', x: 0.598, y: 0.851, boxes: [[0.457, 0.357, 0.087, 0.058], [0.583, 0.877, 0.087, 0.058]] },
    { id: 'v4', label: 'V4', x: 0.674, y: 0.825, boxes: [[0.561, 0.357, 0.087, 0.058], [0.659, 0.838, 0.087, 0.058]] },
    { id: 'v5', label: 'V5', x: 0.717, y: 0.779, boxes: [[0.637, 0.344, 0.087, 0.058], [0.724, 0.792, 0.087, 0.058]] },
    { id: 'v6', label: 'V6', x: 0.739, y: 0.721, boxes: [[0.637, 0.247, 0.087, 0.058], [0.757, 0.708, 0.087, 0.058]] },
  ],
};

export const ecg: LessonFigure = {
  id: 'cardiovascular-physiology:ecg',
  title: 'The ECG waveform',
  src: '/figures/cardiovascular-physiology/ecg.jpg',
  width: 1200,
  height: 861,
  caption: 'Lecture slide 8 (Cardiac Rhythms and the Electrocardiogram).',
  sourceRefs: c5([8]),
  spots: [
    { id: 'p', label: 'P wave', x: 0.197, y: 0.642, boxes: [[0.181, 0.58, 0.047, 0.044]] },
    { id: 'q', label: 'Q wave', x: 0.38, y: 0.735, boxes: [[0.37, 0.778, 0.047, 0.044]] },
    { id: 'r', label: 'R wave', x: 0.417, y: 0.123, boxes: [[0.386, 0.031, 0.047, 0.044]] },
    { id: 's', label: 'S wave', x: 0.461, y: 0.79, boxes: [[0.433, 0.858, 0.047, 0.044]] },
    { id: 't', label: 'T wave', x: 0.677, y: 0.617, boxes: [[0.661, 0.556, 0.047, 0.044]] },
    { id: 'u', label: 'U wave', x: 0.843, y: 0.648, boxes: [[0.835, 0.605, 0.047, 0.044]] },
    { id: 'pr-segment', label: 'P–R segment', x: 0.307, y: 0.691, boxes: [[0.244, 0.525, 0.15, 0.086]] },
    { id: 'st-segment', label: 'S–T segment', x: 0.543, y: 0.673, boxes: [[0.48, 0.519, 0.15, 0.086]] },
    { id: 'pr-interval', label: 'P–R interval', x: 0.26, y: 0.858, boxes: [[0.189, 0.84, 0.142, 0.093]] },
    { id: 'qrs', label: 'QRS interval', x: 0.422, y: 0.901, boxes: [[0.354, 0.901, 0.134, 0.093]] },
    { id: 'st-interval', label: 'S–T interval', x: 0.622, y: 0.858, boxes: [[0.567, 0.84, 0.142, 0.093]] },
  ],
};

export const figures = [heart, conduction, jvp, starlingCurves, circleOfWillis, coronaryArteries, fetalCirculation, limbLeads, chestLeads, ecg];
