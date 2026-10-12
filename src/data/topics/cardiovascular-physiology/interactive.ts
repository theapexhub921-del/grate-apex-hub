// Physiology → Cardiovascular Physiology — layer 1 (learn by answering) and
// reading-layer extras. Checkpoint IDs: cN-xx; recall prompts: rN-xx.
import type { LessonConfusion } from '@/data/lesson-types';
import { ask, fill, learn, match, mcq, multi, order, recall, type InteractiveDraft } from '@/data/topics/build';
import { c1, c2, c3, c4, c5, type ConceptId } from '@/data/topics/cardiovascular-physiology/sources';

type Steps = InteractiveDraft<ConceptId>[];

export const interactive: Record<string, Steps> = {
  // ─── Lesson 1 — Conduction and the cardiac cycle ───────────────────
  'cardiovascular-physiology-1': [
    ask(
      mcq('c1-01', 'conduction-system', 'Every part of the conduction system can fire on its own. Which part normally sets the heart rate?', 'The SA node', ['The AV node', 'The bundle of His', 'The Purkinje fibres'], {
        explanation: 'Slide 7: all parts can discharge spontaneously, but they are controlled by the SA node — the pacemaker.',
        skill: 'prediction',
      })
    ),
    learn('The conduction path', ['SA node (junction of SVC and right atrium) → internodal tracts (Bachmann, Wenckebach, Thorel) → AV node (behind the tricuspid valve) → bundle of His → Purkinje fibres. Contraction follows depolarisation.'], {
      sourceRefs: c1([8, 9, 10]),
    }),
    ask(
      order('c1-02', 'conduction-system', 'Put the conduction system in order.', ['SA node', 'Internodal pathways', 'AV node', 'Bundle of His', 'Purkinje fibres'], {
        explanation: 'Slide 8.',
      })
    ),
    learn('Filling and ejecting', [
      'Diastole: AV valves open, semilunar valves shut; 70% of filling is passive, 30% from atrial systole.',
      'Systole: AV valves close → isovolumetric contraction → semilunar valves open (aorta ~80, pulmonary ~10 mmHg) → ejection → protodiastole → isovolumetric relaxation → AV valves open.',
    ], { sourceRefs: c1([12, 13, 14, 15, 17]) }),
    ask(
      order('c1-03', 'cycle-phases', 'Order the events from the end of diastole.', ['Mitral and tricuspid valves close', 'Isovolumetric contraction', 'Aortic and pulmonary valves open', 'Ejection', 'Aortic and pulmonary valves close', 'Isovolumetric relaxation'], {
        explanation: 'Slides 13–17.',
      })
    ),
    ask(
      fill('c1-04', 'cycle-volumes', 'With an end-diastolic volume of about 130 mL, the ejection fraction is about ____%.', ['65', '65%'], {
        explanation: 'Slide 16: EDV ≈ 130 mL, stroke volume ≈ 70–90 mL, ejection fraction ≈ 65%.',
      })
    ),
    learn('Tachycardia steals diastole', ['A faster rate shortens systole a little but diastole much more — and diastole is when the ventricles fill and the coronary arteries flow.'], {
      sourceRefs: c1([20]),
    }),
    ask(
      mcq('c1-05', 'fast-heart-rate', 'Why is a very fast heart rate dangerous to the myocardium?', 'Diastole, when coronary flow occurs, is shortened much more than systole', ['Systole becomes longer than diastole', 'The heart becomes tetanised', 'The SA node stops firing'], {
        explanation: 'Slide 20. Cardiac muscle cannot be tetanised because of its long refractory period.',
        skill: 'cause-effect',
      })
    ),
    recall('r1-01', 'valve-timing', 'Explain why the right ventricle ejects before the left, and why the aortic valve closes before the pulmonary valve in inspiration.', [
      'The right ventricle pushes against the lower pressure of the pulmonary artery, so it starts ejecting first even though the left contracts first.',
      'In inspiration, negative intrathoracic pressure increases venous return and lowers pulmonary impedance, prolonging right ventricular ejection.',
      'So the pulmonary valve closes after the aortic valve — the basis of splitting of S2.',
    ]),
  ],

  // ─── Lesson 2 — Pulse, JVP, sounds and murmurs ─────────────────────
  'cardiovascular-physiology-2': [
    ask(
      mcq('c2-01', 'arterial-pulse', 'When you feel the radial pulse, what are you actually feeling?', 'A pressure wave expanding the arterial wall', ['Blood arriving from the heart at that moment', 'The arterial wall contracting', 'The heart sound transmitted along the artery'], {
        explanation: 'Slide 24: the pulse is a pressure wave, independent of the velocity of blood.',
        skill: 'prediction',
      })
    ),
    learn('JVP waves', ['a = atrial contraction; x = atrial relaxation; c = tricuspid valve bulging up in isovolumetric contraction; v = atrial filling with tricuspid shut; y = tricuspid opens.'], {
      sourceRefs: c1([26, 27]),
    }),
    ask(
      match('c2-02', 'jvp-waves', 'Match each JVP feature to its cause.', [
        ['a wave', 'Atrial contraction'],
        ['c wave', 'Tricuspid valve moving up in isovolumetric contraction'],
        ['v wave', 'Passive atrial filling with the tricuspid closed'],
        ['y descent', 'Opening of the tricuspid valve'],
      ], { explanation: 'Slide 27.' })
    ),
    ask(
      mcq('c2-03', 'jvp-clinical', 'In complete heart block a “giant a wave” appears in the JVP. Why?', 'The atrium contracts against a closed tricuspid valve', ['The tricuspid valve leaks', 'Venous return falls', 'The right ventricle fails'], {
        explanation: 'Slide 28. A big c wave suggests tricuspid incompetence instead.',
        skill: 'cause-effect',
      })
    ),
    learn('Sounds and murmurs', [
      'S1 = mitral and tricuspid closing (start of systole); S2 = aortic and pulmonary closing (start of diastole). S2 splits in inspiration.',
      'Murmurs come from turbulence. A semilunar stenosis or an AV-valve leak happens in systole; the reverse lesions are diastolic.',
    ], { sourceRefs: c1([30, 34, 35, 36]) }),
    ask(
      match('c2-04', 'murmurs', 'Match each lesion to the timing of its murmur.', [
        ['Aortic stenosis', 'Systolic'],
        ['Aortic incompetence', 'Diastolic'],
        ['Mitral stenosis', 'Diastolic'],
        ['Mitral incompetence', 'Systolic'],
      ], { explanation: 'Slide 36.' })
    ),
    recall('r2-01', 'heart-sounds', 'Describe S1 and S2: which valves, when in the cycle, and what makes S2 loud.', [
      'S1: tricuspid and mitral valves closing at about the same time, at the beginning of ventricular systole.',
      'S2: aortic and pulmonary valves closing, at the end of systole/beginning of diastole.',
      'S2 is loud when aortic or pulmonary artery pressure is high, because the valves close briskly.',
    ]),
  ],

  // ─── Lesson 3 — Cardiac output ─────────────────────────────────────
  'cardiovascular-physiology-3': [
    ask(
      mcq('c3-01', 'cardiac-output-definition', 'Heart rate 70/min, stroke volume 80 mL. What is the cardiac output?', '5.6 L/min', ['0.875 L/min', '150 mL/min', '56 L/min'], {
        explanation: 'CO = HR × SV = 70 × 80 mL = 5,600 mL/min (slide 41).',
        skill: 'application',
      })
    ),
    learn('Starling’s law', ['Preload = how far the muscle is stretched before contracting; afterload = the resistance it ejects against. The energy of contraction is proportional to the initial fibre length (heterometric regulation).'], {
      sourceRefs: c1([44, 48]),
    }),
    ask(
      multi('c3-02', 'frank-starling', 'Which increase end-diastolic volume? Select all that apply.', ['Stronger atrial contraction', 'Increased total blood volume', 'Increased venous tone', 'Skeletal muscle pumping'], ['Standing still for a long time', 'Pericardial effusion'], {
        explanation: 'Slides 48–49: standing and pericardial effusion decrease EDV.',
      })
    ),
    learn('Contractility', ['Catecholamines → β1 → adenylyl cyclase → cAMP → positive inotropy. Xanthines (caffeine, theophylline) block cAMP breakdown. The vagus is negatively inotropic and chronotropic.'], {
      sourceRefs: c1([50, 51, 52]),
    }),
    ask(
      mcq('c3-03', 'contractility', 'How do caffeine and theophylline increase myocardial contractility?', 'They prevent the breakdown of cAMP', ['They block β1 receptors', 'They stimulate the vagus', 'They lower afterload'], {
        explanation: 'Slide 52.',
        skill: 'cause-effect',
      })
    ),
    ask(
      fill('c3-04', 'fick-principle', 'In Fick’s method, mixed venous blood must be sampled from the ____ artery.', ['pulmonary', 'pulmonary artery'], {
        explanation: 'Slide 57: arterial blood can come from any artery; venous blood from the pulmonary artery.',
      })
    ),
    recall('r3-01', 'cardiac-work', 'Explain why angina pectoris is more common in aortic stenosis than in aortic incompetence.', [
      'Work = stroke volume × mean arterial pressure.',
      'Pressure (afterload) work needs more O₂ than volume (preload) work.',
      'Aortic stenosis raises afterload; incompetence raises preload — so stenosis increases O₂ demand more, and angina is commoner.',
    ]),
  ],

  // ─── Lesson 4 — Vessels, flow and pressure ─────────────────────────
  'cardiovascular-physiology-4': [
    ask(
      mcq('c4-01', 'flow-pressure-resistance', 'An arteriole doubles its radius. Roughly what happens to its resistance?', 'It falls to about 1/16', ['It halves', 'It doubles', 'It falls to about 1/4'], {
        explanation: 'Resistance = 8ηL/πr⁴, so resistance varies with 1/r⁴ (slides 74–76).',
        skill: 'prediction',
      })
    ),
    learn('Resistance and capacitance', ['Arterioles, with much smooth muscle, are the main resistance vessels. Veins are distensible capacitance vessels holding about half the blood.'], {
      sourceRefs: c1([61, 63, 79, 81]),
    }),
    ask(
      match('c4-02', 'vessel-structure', 'Match each vessel to its main feature.', [
        ['Large arteries', 'Elastic recoil in diastole'],
        ['Arterioles', 'Main resistance to flow'],
        ['Precapillary sphincters', 'No nerves; respond to local substances'],
        ['Veins', 'Capacitance — store blood'],
      ], { explanation: 'Slides 61–63, 79.' })
    ),
    learn('Turbulence', ['Reynolds’ number Re = ρDv/η. High velocity (a narrowed vessel) or low viscosity (anaemia) makes turbulence — and noise: bruits and Korotkov sounds.'], {
      sourceRefs: c1([71, 72]),
    }),
    ask(
      mcq('c4-03', 'laminar-turbulent', 'Which change makes turbulent flow more likely?', 'Lower blood viscosity, as in anaemia', ['Lower blood velocity', 'Higher blood viscosity', 'A smaller vessel diameter at the same velocity'], {
        explanation: 'Slide 71: Re rises with density, diameter and velocity and falls with viscosity.',
        skill: 'cause-effect',
      })
    ),
    ask(
      fill('c4-04', 'arterial-pressure', 'BP 120/75 mmHg. Pulse pressure = ____ mmHg.', ['45'], {
        explanation: 'Pulse pressure = systolic − diastolic (slide 91). Mean ≈ 75 + 45/3 = 90 mmHg.',
        skill: 'application',
      })
    ),
    ask(
      mcq('c4-05', 'arterial-pressure', 'A cuff that is too small for the arm gives…', 'A falsely high reading', ['A falsely low reading', 'An accurate reading', 'No Korotkov sounds'], {
        explanation: 'Slide 87: big cuff → falsely low; small cuff → falsely high.',
      })
    ),
    recall('r4-01', 'velocity-area', 'Explain why blood velocity is lowest in the capillaries.', [
      'Average velocity v = Q/A.',
      'As vessels divide, total cross-sectional area increases, so velocity falls toward the capillaries.',
      'It rises again as veins join into fewer, larger vessels.',
    ]),
  ],

  // ─── Lesson 5 — Capillaries, oedema, lymph, veins ──────────────────
  'cardiovascular-physiology-5': [
    ask(
      mcq('c5-01', 'starling-forces', 'Plasma proteins fall in liver disease. Which way does fluid tend to move?', 'Out of capillaries into the tissues, causing oedema', ['Into the capillaries from the tissues', 'No change', 'Into the lymphatics only'], {
        explanation: 'Slide 102: a low plasma oncotic pressure reduces the force drawing fluid back in.',
        skill: 'prediction',
      })
    ),
    learn('Starling’s forces', ['Out: capillary hydrostatic pressure and interstitial colloid osmotic pressure. In: plasma oncotic pressure and tissue hydrostatic pressure. Of 24 L filtered daily, 85% is reabsorbed and 15% returns as lymph.'], {
      sourceRefs: c1([95, 97]),
    }),
    ask(
      match('c5-02', 'starling-forces', 'Sort each force by its effect on fluid.', [
        ['Capillary hydrostatic pressure', 'Pushes fluid out'],
        ['Interstitial colloid osmotic pressure', 'Pushes fluid out'],
        ['Plasma oncotic pressure', 'Draws fluid in'],
        ['Tissue hydrostatic pressure', 'Draws fluid in'],
      ], { explanation: 'Slide 95.' })
    ),
    ask(
      multi('c5-03', 'oedema', 'Which increase capillary permeability (slide 101)? Select all that apply.', ['Histamine', 'Bradykinin', 'Substance P'], ['Albumin', 'Noradrenaline'], {
        explanation: 'Slide 101.',
      })
    ),
    learn('Lymph and veins', ['Lymphoedema from obstruction (filaria, radical mastectomy) is non-pitting. Venous return depends on inspiration, the muscle pump and the heartbeat; CVP is 4–6 mmHg.'], {
      sourceRefs: c1([107, 109]),
    }),
    ask(
      mcq('c5-04', 'venous-circulation', 'Why is opening a dural sinus with the head raised dangerous?', 'Its rigid walls keep it open at subatmospheric pressure, so air can be sucked in', ['It has the highest venous pressure in the body', 'It collapses and blocks venous drainage', 'It contains arterial blood'], {
        explanation: 'Slide 110: air embolism.',
        skill: 'cause-effect',
      })
    ),
    recall('r5-01', 'oedema', 'List the four mechanisms of oedema with one cause of each.', [
      'Raised capillary hydrostatic pressure — e.g. heart failure, venous obstruction.',
      'Increased capillary permeability — e.g. histamine, bradykinin.',
      'Reduced plasma oncotic pressure — e.g. liver disease, kidney disease, malnutrition.',
      'Lymphatic obstruction — e.g. filariasis, radical mastectomy.',
    ]),
  ],

  // ─── Lesson 6 — Regulation ─────────────────────────────────────────
  'cardiovascular-physiology-6': [
    ask(
      mcq('c6-01', 'autoregulation-metabolic', 'A muscle starts working hard. What happens to its arterioles, and why?', 'They dilate as metabolites (low O₂, high CO₂, H⁺, K⁺) accumulate', ['They constrict to save blood', 'Nothing — flow is set only by the heart', 'They dilate because the vagus is stimulated'], {
        explanation: 'Slides 6–7: metabolic autoregulation.',
        skill: 'prediction',
      })
    ),
    learn('Two theories of autoregulation', ['Metabolic: metabolites accumulate when flow is low and dilate vessels. Myogenic: stretch from a rise in transmural pressure makes smooth muscle contract.'], {
      sourceRefs: c2([6, 10]),
    }),
    ask(
      multi('c6-02', 'autoregulation-metabolic', 'Which are local vasoconstrictors in the lecture? Select all that apply.', ['Serotonin from platelets', 'Cold', 'Angiotensin'], ['Raised CO₂', 'Lactic acid', 'Histamine'], {
        explanation: 'Slide 9.',
      })
    ),
    learn('The baroreflex', ['Carotid sinus (IX) and aortic arch (X) → NTS. A rise in BP stretches them: vagus stimulated, VMC inhibited → slower heart, vasodilatation, BP falls.'], {
      sourceRefs: c2([23, 24, 26]),
    }),
    ask(
      order('c6-03', 'baroreceptor-reflex', 'Order the reflex response to a rise in BP.', ['Carotid sinus is stretched', 'Afferent discharge rises in the glossopharyngeal nerve', 'Nucleus of the tractus solitarius / depressor area excited', 'Vagus stimulated and VMC inhibited', 'Heart slows and vessels dilate'], {
        explanation: 'Slides 24–26.',
      })
    ),
    ask(
      mcq('c6-04', 'vasomotor-centre', 'Atropine increases heart rate. What does this tell you about resting heart rate?', 'It is controlled mainly by tonic vagal discharge', ['It is controlled mainly by sympathetic tone', 'The SA node is inactive at rest', 'The heart has no parasympathetic supply'], {
        explanation: 'Slide 21: vagotomy and atropine both raise HR.',
        skill: 'cause-effect',
      })
    ),
    ask(
      mcq('c6-05', 'cushing-reflex', 'A patient with a growing brain tumour has BP 190/100 and a pulse of 48. Which reflex explains this?', 'Cushing’s reflex', ['The Bainbridge (atrial) reflex', 'Vasovagal syncope', 'Orthostatic hypotension'], {
        explanation: 'Slides 36, 40: raised intracranial pressure → hypertension with reflex bradycardia.',
        skill: 'application',
        clinical: true,
      })
    ),
    recall('r6-01', 'cushing-reflex', 'Explain Cushing’s reflex step by step.', [
      'Raised intracranial pressure compresses vessels and reduces blood flow to the vasomotor centre.',
      'Ischaemia, hypoxia and hypercapnia stimulate the VMC directly → sympathetic discharge → BP rises, restoring medullary flow.',
      'The baroreceptors sense the high BP → reflex bradycardia.',
    ]),
  ],

  // ─── Lesson 7 — Gravity, shock and heart failure ───────────────────
  'cardiovascular-physiology-7': [
    ask(
      mcq('c7-01', 'gravity-effects', 'You stand up quickly. What is the first stimulus for compensation?', 'A fall in pressure at the carotid sinus and aortic arch', ['A rise in cerebral blood flow', 'A rise in venous return', 'Stretch of the atrial receptors'], {
        explanation: 'Slide 4.',
        skill: 'prediction',
      })
    ),
    learn('Four kinds of shock', ['Hypovolaemic (haemorrhage, burns, diarrhoea), distributive (anaphylaxis, sepsis, neurogenic), cardiogenic (MI, arrhythmia) and obstructive (tamponade, tension pneumothorax, pulmonary embolism).'], {
      sourceRefs: c3([13, 14, 15, 16, 17]),
    }),
    ask(
      match('c7-02', 'shock-types', 'Match each cause to its type of shock.', [
        ['Haemorrhage', 'Hypovolaemic'],
        ['Anaphylaxis', 'Distributive'],
        ['Myocardial infarction', 'Cardiogenic'],
        ['Tension pneumothorax', 'Obstructive'],
      ], { explanation: 'Slides 13–17.' })
    ),
    ask(
      mcq('c7-03', 'shock-features', 'Why is the skin pale and cool in haemorrhagic shock?', 'Sympathetic vasoconstriction is marked in the skin', ['The skin is warmed by lactic acid', 'Skin vessels dilate', 'The heart stops pumping to the skin'], {
        explanation: 'Slide 20: generalised vasoconstriction, sparing heart and brain, marked in the skin.',
        skill: 'cause-effect',
      })
    ),
    learn('Forward and backward failure', ['Forward: the heart cannot pump enough out (tissue or lung hypoperfusion). Backward: it cannot accept returning blood — left → pulmonary oedema; right → peripheral oedema, hepatomegaly, ascites, raised JVP.'], {
      sourceRefs: c3([32, 33]),
    }),
    ask(
      multi('c7-04', 'heart-failure', 'Which are features of backward failure of the RIGHT heart? Select all that apply.', ['Peripheral oedema', 'Hepatomegaly', 'Ascites', 'Raised JVP'], ['Pulmonary oedema', 'Paroxysmal nocturnal dyspnoea'], {
        explanation: 'Slide 33: pulmonary oedema and PND are backward failure of the left heart.',
        skill: 'comparison',
      })
    ),
    recall('r7-01', 'irreversible-shock', 'Why can shock become irreversible even after blood volume is restored?', [
      'Prolonged cerebral ischaemia depresses the vasomotor centre → heart slows and vessels dilate → BP and cerebral flow fall further.',
      'Myocardial ischaemia makes the shock worse.',
      'Precapillary sphincters relax while venules stay constricted → stasis, raised hydrostatic pressure, fluid loss into the interstitium.',
    ]),
  ],

  // ─── Lesson 8 — Regional circulations ──────────────────────────────
  'cardiovascular-physiology-8': [
    ask(
      mcq('c8-01', 'coronary-circulation', 'When does most blood flow through the left ventricular coronary vessels?', 'During diastole', ['During systole', 'Equally throughout the cycle', 'Only during exercise'], {
        explanation: 'Slide 27: in systole the vessels are compressed.',
        skill: 'prediction',
      })
    ),
    learn('CSF pathway', ['Choroid plexus → lateral ventricles → foramen of Monro → third ventricle → aqueduct of Sylvius → fourth ventricle → foramina of Luschka and Magendie → subarachnoid space → arachnoid villi.'], {
      sourceRefs: c4([6, 7]),
    }),
    ask(
      order('c8-02', 'csf', 'Order the flow of CSF.', ['Lateral ventricle', 'Foramen of Monro', 'Third ventricle', 'Aqueduct of Sylvius', 'Fourth ventricle', 'Subarachnoid space'], {
        explanation: 'Slide 7.',
      })
    ),
    ask(
      mcq('c8-03', 'csf', 'Hydrocephalus from reduced absorption by the arachnoid villi is called…', 'External (communicating)', ['Internal (non-communicating)', 'Obstructive', 'Ex vacuo'], {
        explanation: 'Slide 16: internal (non-communicating) hydrocephalus is from obstruction of the ventricular drainage system.',
      })
    ),
    learn('Lungs, gut, skin', ['Pulmonary capillaries: hydrostatic 10 vs oncotic 25 mmHg; hypoxia constricts. Liver: the zone near the central vein is least oxygenated. Skin: white reaction, then the triple response (red reaction, wheal, flare).'], {
      sourceRefs: c4([31, 32, 35, 39, 40]),
    }),
    ask(
      match('c8-04', 'skin-circulation', 'Match each part of the triple response to its cause.', [
        ['Red reaction', 'Capillary dilatation'],
        ['Wheal', 'Increased capillary and venular permeability'],
        ['Flare', 'Arteriolar dilatation by axon reflex'],
      ], { explanation: 'Slide 40.' })
    ),
    recall('r8-01', 'splanchnic-circulation', 'Explain how a rise in hepatic venous pressure produces ascites.', [
      'Hydrostatic pressure in the liver sinusoids rises.',
      'Fluid moves into the space of Disse and lymph and leaks from the liver surface into the peritoneal cavity.',
      'Sinusoidal pores let protein through, so the fluid is protein-rich and its osmotic pull draws more fluid from the gut and mesentery.',
    ]),
  ],

  // ─── Lesson 9 — The ECG ───────────────────────────────────────────
  'cardiovascular-physiology-9': [
    ask(
      mcq('c9-01', 'ecg-waves', 'Which part of the ECG shows ventricular depolarisation?', 'The QRS complex', ['The P wave', 'The T wave', 'The ST segment'], {
        explanation: 'Slide 10.',
        skill: 'prediction',
      })
    ),
    learn('Waves and intervals', ['P = atrial depolarisation; PR 0.12–0.20 s; QRS = ventricular depolarisation (0.06–0.1 s); ST = plateau; T = ventricular repolarisation; QT 0.2–0.4 s.'], {
      sourceRefs: c5([9, 10, 11, 12, 13]),
    }),
    ask(
      match('c9-02', 'ecg-waves', 'Match each ECG feature to what it represents.', [
        ['P wave', 'Atrial depolarisation'],
        ['QRS complex', 'Ventricular depolarisation'],
        ['T wave', 'Ventricular repolarisation'],
        ['ST segment', 'Whole ventricle depolarised (plateau)'],
      ], { explanation: 'Slides 9–12.' })
    ),
    ask(
      fill('c9-03', 'ecg-rate', 'There are 20 small squares between two R waves. Heart rate = ____ beats/min.', ['75'], {
        explanation: 'Slide 16: 1500 ÷ 20 = 75.',
        skill: 'application',
      })
    ),
    learn('Heart block', ['1st degree: long PR. Mobitz I: PR lengthens until a beat drops. Mobitz II: a QRS drops without warning. 3rd degree: P waves and QRS complexes are independent.'], {
      sourceRefs: c5([21, 23, 24, 26]),
    }),
    ask(
      mcq('c9-04', 'heart-block', 'The PR interval gets longer with each beat until a P wave is not followed by a QRS. This is…', 'Mobitz type I (Wenckebach) second-degree block', ['First-degree block', 'Mobitz type II block', 'Complete heart block'], {
        explanation: 'Slide 23.',
        skill: 'application',
      })
    ),
    recall('r9-01', 'heart-block', 'Describe complete heart block and its danger.', [
      'Conduction from atria to ventricles is interrupted; atria and ventricles beat independently.',
      'The ventricles beat slowly in an idioventricular rhythm; P waves and QRS complexes have no fixed relationship.',
      'Low cerebral blood flow causes fainting and dizziness — Stokes–Adams syndrome.',
    ]),
  ],
};

type ReadingExtras = {
  estimatedMinutes: number;
  xp: number;
  highYield: string[];
  confusions: LessonConfusion[];
};

export const readingExtras: Record<string, ReadingExtras> = {
  'cardiovascular-physiology-1': {
    estimatedMinutes: 12,
    xp: 25,
    highYield: [
      'SA node → internodal tracts → AV node → bundle of His → Purkinje fibres.',
      'Filling: 70% passive, 30% atrial systole. EDV 130 mL, SV 70–90 mL, EF 65%.',
      'Tachycardia shortens diastole most — less coronary flow and filling.',
    ],
    confusions: [
      { confusion: 'The left ventricle ejects first because it contracts first.', clarification: 'The right ventricle ejects first, because pulmonary artery pressure is lower (slide 18).' },
      { confusion: 'A faster heart shortens systole and diastole equally.', clarification: 'Diastole is shortened to a much greater extent (slide 20).' },
    ],
  },
  'cardiovascular-physiology-2': {
    estimatedMinutes: 12,
    xp: 25,
    highYield: [
      'JVP: a (atrial contraction), c (tricuspid bulge), v (atrial filling), x and y descents.',
      'Giant a wave → heart block; big c wave → tricuspid incompetence.',
      'Semilunar stenosis and AV incompetence → systolic murmurs; the opposite → diastolic.',
    ],
    confusions: [
      { confusion: 'The pulse is blood rushing past your finger.', clarification: 'It is a pressure wave expanding the arterial wall, independent of blood velocity (slide 24).' },
      { confusion: 'The JVP is palpated like the carotid pulse.', clarification: 'The JVP is seen, not palpated (slide 26).' },
    ],
  },
  'cardiovascular-physiology-3': {
    estimatedMinutes: 12,
    xp: 25,
    highYield: [
      'CO = HR × SV (~5.5 L/min). Inotropic = force; chronotropic = rate.',
      'Starling: energy of contraction ∝ initial fibre length.',
      'β1 → cAMP → +inotropy; xanthines block cAMP breakdown.',
      'Fick: O₂ uptake = (arterial − mixed venous O₂) × CO.',
    ],
    confusions: [
      { confusion: 'Afterload is the stretch on the ventricle before it contracts.', clarification: 'That is preload. Afterload is the resistance to ejection (slide 44).' },
      { confusion: 'Volume work costs the heart more O₂ than pressure work.', clarification: 'Pressure work is more demanding (slide 58).' },
    ],
  },
  'cardiovascular-physiology-4': {
    estimatedMinutes: 15,
    xp: 30,
    highYield: [
      'Flow = ΔP/R; R ∝ 1/r⁴ — arterioles are the resistance vessels.',
      'Re = ρDv/η: high velocity or low viscosity → turbulence and noise.',
      'v = Q/A: slowest in capillaries.',
      'Mean pressure ≈ diastolic + ⅓ pulse pressure.',
    ],
    confusions: [
      { confusion: 'Viscosity is the main determinant of resistance.', clarification: 'Vessel calibre is; viscosity is a minor factor (slide 60).' },
      { confusion: 'A bigger cuff gives a higher BP reading.', clarification: 'A big cuff gives a falsely low reading; a small cuff a falsely high one (slide 87).' },
    ],
  },
  'cardiovascular-physiology-5': {
    estimatedMinutes: 10,
    xp: 25,
    highYield: [
      'Out: capillary hydrostatic + interstitial oncotic. In: plasma oncotic + tissue hydrostatic.',
      '24 L/day filtered: 85% reabsorbed, 15% via lymph.',
      'Lymphoedema is non-pitting.',
    ],
    confusions: [
      { confusion: 'Plasma oncotic pressure pushes fluid out of capillaries.', clarification: 'It draws fluid in; capillary hydrostatic pressure pushes it out (slide 95).' },
    ],
  },
  'cardiovascular-physiology-6': {
    estimatedMinutes: 15,
    xp: 30,
    highYield: [
      'BP = CO × TPR.',
      'Baroreceptors: carotid sinus (IX), aortic arch (X) → NTS.',
      'Resting HR is set by tonic vagal discharge (atropine and vagotomy raise it).',
      'Exceptions: atrial stretch → hypotension + tachycardia; Cushing’s → hypertension + bradycardia.',
    ],
    confusions: [
      { confusion: 'Sympathetic vasodilator fibres are noradrenergic.', clarification: 'They travel with the sympathetic but are cholinergic (slide 18).' },
      { confusion: 'In Cushing’s reflex the bradycardia comes from the brain compression itself.', clarification: 'It is a baroreceptor reflex response to the high BP (slide 36).' },
    ],
  },
  'cardiovascular-physiology-7': {
    estimatedMinutes: 15,
    xp: 30,
    highYield: [
      'Shock: hypovolaemic, distributive, cardiogenic, obstructive.',
      'Hypovolaemic shock: low BP, tachycardia, pale cool skin, rapid breathing, thirst, oliguria.',
      'Left backward failure → pulmonary oedema; right → peripheral oedema, hepatomegaly, ascites, raised JVP.',
    ],
    confusions: [
      { confusion: 'Shock means low blood volume.', clarification: 'Shock is inadequate tissue perfusion; distributive shock has normal blood volume with massive vasodilatation (slide 29).' },
      { confusion: 'Negative g ruptures brain vessels.', clarification: 'Intracranial pressure rises too and supports them (slide 10).' },
    ],
  },
  'cardiovascular-physiology-8': {
    estimatedMinutes: 18,
    xp: 30,
    highYield: [
      'CSF: choroid plexus → ventricles → subarachnoid → arachnoid villi; 150 mL, 550 mL/day.',
      'BBB: gases, water and steroids cross; glucose by carrier; proteins don’t.',
      'Coronary flow in diastole; angina at ~75% occlusion.',
      'Pulmonary hypoxia → vasoconstriction (opposite of systemic).',
    ],
    confusions: [
      { confusion: 'The brain needs insulin to take up glucose.', clarification: 'Insulin is not needed (slide 24).' },
      { confusion: 'Hypoxia dilates pulmonary vessels as it does systemic ones.', clarification: 'It constricts them, shunting blood to better-ventilated areas (slide 32).' },
    ],
  },
  'cardiovascular-physiology-9': {
    estimatedMinutes: 12,
    xp: 25,
    highYield: [
      'Small square 0.04 s; large 0.2 s; HR = 1500/small squares = 300/large squares.',
      'PR 0.12–0.20 s; QRS 0.06–0.1 s; QT 0.2–0.4 s.',
      'Mobitz I = progressive PR prolongation; Mobitz II = sudden dropped beat; 3rd degree = AV dissociation.',
    ],
    confusions: [
      { confusion: 'The T wave is atrial repolarisation.', clarification: 'The T wave is ventricular repolarisation (slide 12).' },
      { confusion: 'In Mobitz II the PR interval lengthens before the dropped beat.', clarification: 'That is Mobitz I; in Mobitz II the conducted beats have a normal PR (slide 24).' },
    ],
  },
};
