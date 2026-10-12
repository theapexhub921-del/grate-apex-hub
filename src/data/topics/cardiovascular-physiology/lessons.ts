// Physiology → Cardiovascular Physiology — the nine lessons (reading layer).
// Sources: the five circulation lectures (c1–c5 in sources.ts); Guyton
// only clarifies points within their scope, always labelled.
import type { LessonDraft } from '@/data/topics/build';
import { interactive, readingExtras } from '@/data/topics/cardiovascular-physiology/interactive';
import { c1, c2, c3, c4, c5, GUYTON, type ConceptId } from '@/data/topics/cardiovascular-physiology/sources';

type Draft = LessonDraft<ConceptId>;

// ─── Lesson 1 ───────────────────────────────────────────────────────

const lesson1: Draft = {
  id: 'cardiovascular-physiology-1',
  title: 'The Heart: Conduction and the Cardiac Cycle',
  description: 'How the impulse spreads from the SA node, and the pressure and volume changes of systole and diastole.',
  xp: 25,
  sourceRefs: c1([4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
  objectives: [
    'Trace the conduction system from the SA node to the Purkinje fibres',
    'Describe each phase of the cardiac cycle and which valves are open',
    'Recall end-diastolic volume, stroke volume and ejection fraction',
    'Explain why the right ventricle ejects first and why S2 splits in inspiration',
    'Explain why a fast heart rate is dangerous',
  ],
  chunks: [
    {
      title: 'What the heart does',
      kind: 'overview',
      paragraphs: [
        'The heart is built from cardiac muscle and a specialised conducting system. Its job is to move blood about — to send blood to all the tissues (slide 4).',
        'It works in two alternating states: systole (contraction) and diastole (relaxation). Contraction and relaxation produce changes in both volume and pressure, in the chambers and in the vessels (slide 11).',
      ],
      sourceRefs: c1([4, 11]),
    },
    {
      title: 'The conducting system',
      kind: 'pathway',
      paragraphs: [
        'All parts of the conduction system can discharge spontaneously, but they are controlled by the discharge of the SA node — the pacemaker (slide 7). The impulse travels (slide 8):',
      ],
      steps: [
        { label: 'SA (sinoatrial) node', detail: 'At the junction of the superior vena cava and the right atrium.' },
        { label: 'Internodal pathways', detail: 'Three tracts connecting the atria to the AV node: anterior (Bachmann), middle (Wenckebach), posterior (Thorel).' },
        { label: 'AV (atrioventricular) node', detail: 'In the right posterior interatrial septum, just behind the tricuspid valve.' },
        { label: 'Bundle of His' },
        { label: 'Purkinje fibres', detail: 'Carry depolarisation to all the ventricular muscle.' },
      ],
      keyPoints: ['Depolarisation spreads from the SA node through the AV node and bundle of His to the rest of the heart; contraction starts after depolarisation (slide 10).'],
      sourceRefs: c1([7, 8, 9, 10]),
    },
    {
      title: 'Diastole and atrial systole',
      kind: 'mechanism',
      paragraphs: [
        'In diastole the heart relaxes so the chambers can fill. The mitral and tricuspid valves are open; the aortic and pulmonary valves are closed. Filling slows as the ventricles fill, but the pressure stays low (slide 12).',
        'Most ventricular filling is passive — about 70%. The other 30% comes from contraction of the atria (atrial systole) (slide 13).',
      ],
      sourceRefs: c1([12, 13]),
    },
    {
      title: 'Ventricular systole',
      kind: 'pathway',
      paragraphs: ['Closure of the mitral and tricuspid valves starts ventricular systole (slide 13). Then:'],
      steps: [
        { label: 'Isovolumetric contraction', detail: 'The myocardium presses on the blood with very little shortening, so pressure rises. The AV valves bulge into the atria, giving a small rise in atrial pressure (slides 13–15).' },
        { label: 'Aortic and pulmonary valves open', detail: 'When ventricular pressure exceeds the pressure in the aorta (about 80 mmHg) and the pulmonary artery (about 10 mmHg) (slide 14).' },
        { label: 'Ejection', detail: 'Initially slow, then rapid; left intraventricular pressure rises to about 120 mmHg (slide 15).' },
        { label: 'Protodiastole', detail: 'Ventricular pressure starts falling; ends when the aortic and pulmonary valves close (slide 17).' },
        { label: 'Isovolumetric relaxation', detail: 'A further drop in pressure with all valves shut; ends when ventricular pressure falls below atrial pressure and the AV valves open for filling (slide 17).' },
      ],
      sourceRefs: c1([13, 14, 15, 17]),
    },
    {
      title: 'Volumes in the cycle',
      kind: 'definitions',
      terms: [
        { term: 'End-diastolic volume', meaning: 'Blood in the fully filled ventricle — about 130 mL (slide 16).' },
        { term: 'Stroke volume', meaning: 'Blood ejected per contraction — about 70–90 mL.' },
        { term: 'Ejection fraction', meaning: 'Fraction of the end-diastolic volume ejected — about 65%.' },
        { term: 'End-systolic volume', meaning: 'Volume left in the ventricle after systolic contraction.' },
      ],
      sourceRefs: c1([16]),
    },
    {
      title: 'Right versus left, inspiration versus expiration',
      kind: 'comparison',
      paragraphs: [
        'Although the left ventricle contracts before the right, ejection from the right ventricle comes first, because the pulmonary artery pressure it pushes against is smaller (slide 18).',
        'In expiration the aortic and pulmonary valves close together. In inspiration the aortic valve closes before the pulmonary valve (slide 18). The pulmonary valve closes late because right ventricular ejection is prolonged: the negative intrathoracic pressure of inspiration increases venous return and lowers the impedance of the pulmonary vessels (slide 19). This is the basis of splitting of the second heart sound (Lesson 2).',
      ],
      sourceRefs: c1([18, 19]),
    },
    {
      title: 'Why a fast heart rate is dangerous',
      kind: 'clinical',
      paragraphs: [
        'A faster heart rate is achieved by contracting and repolarising faster — a shorter systolic ejection — but diastole is shortened to a much greater extent (slide 20).',
        'That is dangerous because diastole is the resting period: coronary blood flow to the myocardium happens in diastole, and the ventricles fill in diastole.',
        'Cardiac muscle cannot be tetanised, because its action potential has a long refractory period (slide 20).',
      ],
      sourceRefs: c1([20]),
    },
  ],
  summary: [
    'Conduction: SA node (pacemaker) → internodal tracts (Bachmann, Wenckebach, Thorel) → AV node → bundle of His → Purkinje fibres.',
    'Diastole: AV valves open, semilunar valves shut; filling is 70% passive, 30% atrial systole.',
    'Systole: AV valves close → isovolumetric contraction → semilunar valves open (aorta ~80, pulmonary ~10 mmHg) → ejection (LV ~120 mmHg) → protodiastole → isovolumetric relaxation.',
    'EDV ~130 mL; SV ~70–90 mL; EF ~65%.',
    'Right ventricle ejects first (lower pulmonary pressure); in inspiration the aortic valve closes before the pulmonary valve.',
    'Tachycardia shortens diastole most — less coronary flow and filling. Cardiac muscle cannot be tetanised (long refractory period).',
  ],
};

// ─── Lesson 2 ───────────────────────────────────────────────────────

const lesson2: Draft = {
  id: 'cardiovascular-physiology-2',
  title: 'Pulse, JVP, Heart Sounds and Murmurs',
  description: 'The arterial pulse, the waves of the jugular venous pulse, the four heart sounds and how murmurs are timed.',
  xp: 25,
  sourceRefs: c1([24, 25, 26, 27, 28, 30, 31, 33, 34, 35, 36, 38, 40]),
  objectives: [
    'Explain what the pulse is and list its characteristics',
    'Name the waves of the JVP and what causes each',
    'Use the JVP to recognise tricuspid incompetence and heart block',
    'Explain the timing of S1 and S2 and why S2 splits',
    'Predict whether a valve lesion gives a systolic or diastolic murmur',
  ],
  chunks: [
    {
      title: 'The arterial pulse',
      kind: 'definitions',
      paragraphs: [
        'Ejection of blood into the aorta sends a pressure wave along all the arteries. The wave expands the arterial walls, and that expansion is what you feel (palpate) as the pulse — it is independent of the velocity of the blood (slide 24).',
        'The wave speeds up from the aorta to the small arteries, and as we age the arteries become rigid and the wave moves faster.',
        'Characteristics of the pulse (slide 25): rate, volume, strength, character and location.',
      ],
      sourceRefs: c1([24, 25]),
    },
    {
      title: 'The jugular venous pulse',
      kind: 'mechanism',
      paragraphs: [
        'The neck veins (internal jugular) communicate with the right atrium, so pressure changes in the atrium show as visible pressure changes in the neck veins. The venous level falls in inspiration, when blood is drawn into the heart. The JVP is seen, not palpated (slide 26). The waves (slide 27):',
      ],
      steps: [
        { label: 'a wave', detail: 'Atrial contraction — blood regurgitates into the great veins and venous inflow stops.' },
        { label: 'x descent', detail: 'Atrial relaxation after emptying.' },
        { label: 'c wave', detail: 'Isovolumetric ventricular contraction — the tricuspid valve moves upward.' },
        { label: 'v wave', detail: 'Passive filling of the atrium with the tricuspid valve closed.' },
        { label: 'y descent', detail: 'Opening of the tricuspid valve.' },
      ],
      sourceRefs: c1([26, 27]),
    },
    {
      title: 'The JVP in disease',
      kind: 'clinical',
      paragraphs: ['Slide 28 uses the JVP to diagnose:'],
      table: {
        columns: ['Condition', 'JVP finding'],
        rows: [
          ['Tricuspid incompetence', 'Big c wave, from regurgitation of flow'],
          ['Heart block', 'Giant “a” wave — the atrium contracts against a closed tricuspid valve (asynchronous beating)'],
          ['Heart failure', 'Raised JVP with venous congestion'],
        ],
      },
      keyPoints: ['Measure it as a vertical distance from the sternum, with the patient reclining at 45° (sit them upright if the veins are very engorged).'],
      sourceRefs: c1([28]),
    },
    {
      title: 'Heart sounds',
      kind: 'overview',
      paragraphs: [
        'Heart sounds are made by valves closing (slide 30). S1 — tricuspid and mitral closing at about the same time — occurs at the beginning of ventricular systole. S2 — aortic and pulmonary closing — occurs at the end of ventricular systole, i.e. the beginning of diastole.',
        'Normal sounds in diastole come from rapid ventricular filling: the third and fourth heart sounds (slide 31).',
        'S1 lasts about 0.15 s and is soft when the heart is slow, because the ventricles fill fully and the valves float closed. S2 lasts about 0.12 s and is loud when aortic or pulmonary artery pressure is high, because the valves close briskly (slide 33).',
        'S2 is split physiologically in inspiration — aortic before pulmonary — because venous return rises and pulmonary resistance falls, giving the right ventricle a longer time for flow (slide 34).',
      ],
      notes: [
        { kind: 'annotation', text: 'A speaker note added to slide 33 lists clinical examples: loud A2 in systemic hypertension and coarctation; loud P2 in pulmonary hypertension, ASD and VSD; soft or absent S2 in aortic or pulmonary stenosis. Not quizzed until confirmed.' },
      ],
      sourceRefs: c1([30, 31, 33, 34]),
    },
    {
      title: 'Murmurs and bruits',
      kind: 'clinical',
      paragraphs: [
        'Normal flow is streamlined (laminar) and silent. Murmurs come from turbulent flow — abnormal valves, a hyperdynamic circulation (high speed) or backflow (slide 35). They are heard with a stethoscope (auscultation), best over the surface marking of each valve (slide 38).',
        'To time a murmur, remember which valves close together — aortic with pulmonary, tricuspid with mitral — and ask when blood flows through the faulty valve (slide 36):',
      ],
      table: {
        columns: ['Lesion', 'Flow', 'Murmur'],
        rows: [
          ['Aortic / pulmonary stenosis', 'Forward flow during ejection', 'Systolic'],
          ['Aortic / pulmonary incompetence', 'Backflow in diastole', 'Diastolic'],
          ['Mitral / tricuspid stenosis', 'Forward flow during ventricular filling', 'Diastolic'],
          ['Mitral / tricuspid incompetence', 'Backflow during systole', 'Systolic'],
        ],
      },
      keyPoints: ['Murmurs or bruits also occur with aneurysms, AV fistula, patent ductus arteriosus, goitre (raised blood flow), anaemia (low viscosity, high flow rate) and VSD (slide 40).'],
      sourceRefs: c1([35, 36, 38, 40]),
    },
  ],
  summary: [
    'Pulse: a pressure wave expanding the arteries, not the blood itself; faster in small and rigid arteries. Rate, volume, strength, character, location.',
    'JVP: a = atrial contraction; x = atrial relaxation; c = tricuspid bulging in isovolumetric contraction; v = atrial filling; y = tricuspid opens.',
    'Big c wave → tricuspid incompetence; giant a wave → heart block; raised JVP → heart failure. Measured at 45°.',
    'S1 = AV valves close (start of systole); S2 = semilunar valves close (start of diastole); S3/S4 = rapid filling.',
    'S2 splits in inspiration (aortic before pulmonary).',
    'Stenosis of semilunar valves or incompetence of AV valves → systolic murmur; the reverse → diastolic.',
  ],
};

// ─── Lesson 3 ───────────────────────────────────────────────────────

const lesson3: Draft = {
  id: 'cardiovascular-physiology-3',
  title: 'Cardiac Output and Its Control',
  description: 'CO = HR × SV, the Frank–Starling law, contractility, Fick’s principle and the work of the heart.',
  xp: 25,
  sourceRefs: c1([41, 42, 44, 45, 48, 49, 50, 51, 52, 53, 54, 57, 58]),
  objectives: [
    'Define cardiac output and cardiac index',
    'Explain preload, afterload and the Frank–Starling law',
    'List what increases and decreases end-diastolic volume',
    'Explain how catecholamines and xanthines increase contractility',
    'Use Fick’s principle to measure cardiac output',
    'Explain why pressure work costs more oxygen than volume work',
  ],
  chunks: [
    {
      title: 'Cardiac output',
      kind: 'definitions',
      paragraphs: [
        'Cardiac output is the amount of blood pumped out of the heart per unit time. It depends on the number of beats per unit time and the volume pumped by each beat (slide 41):',
        'CO = heart rate × stroke volume. Right and left outputs are equal — about 5.5 L. Cardiac index is the cardiac output per unit area of body surface.',
        'So output changes through the rate or the stroke volume (slide 42). Rate is set by the cardiac innervation (sympathetic and parasympathetic); stroke volume rises when the heart contracts forcibly (e.g. sympathetic stimulation).',
      ],
      terms: [
        { term: 'Inotropic effect', meaning: 'A change in the strength of contraction (positive or negative).' },
        { term: 'Chronotropic effect', meaning: 'A change in rate.' },
      ],
      sourceRefs: c1([41, 42]),
    },
    {
      title: 'Preload, afterload and Starling’s law',
      kind: 'mechanism',
      paragraphs: [
        'The force of contraction depends on preload and afterload — liken it to an elastic band or sling shot (slide 44).',
        'Preload is the degree to which the myocardium is stretched before it contracts. Afterload is the resistance against which blood is expelled — through the aortic valve and against the peripheral resistance (systemic BP) (slides 44, 50).',
        'Frank–Starling law: the energy of contraction is proportional to the initial length of the cardiac muscle. The curve relating stroke volume to end-diastolic volume is the Frank–Starling curve (slides 44–47).',
        'Regulation through changes in fibre length is heterometric regulation; changes in contractility that do not involve muscle length are homometric regulation (slide 48).',
      ],
      sourceRefs: c1([44, 45, 46, 47, 48, 50]),
    },
    {
      title: 'What changes end-diastolic volume',
      kind: 'comparison',
      table: {
        columns: ['Increase EDV (slide 48)', 'Decrease EDV (slide 49)'],
        rows: [
          ['Stronger atrial contraction', 'Standing — pooling of blood by gravity'],
          ['Increased total blood volume', 'Increased intrapericardial pressure (pericardial effusion)'],
          ['Increased venous tone', 'Increased ventricular stiffness'],
          ['Increased pumping by skeletal muscle', 'Diseased cardiac muscle — MI, infiltrative disease (EMF)'],
          ['More negative intrathoracic pressure (inspiration)', ''],
        ],
      },
      sourceRefs: c1([48, 49]),
    },
    {
      title: 'Contractility',
      kind: 'mechanism',
      paragraphs: [
        'Myocardial contractility is a determinant of stroke volume (slide 50). Catecholamines (adrenaline and noradrenaline) act through β1 receptors and adenylyl cyclase, which makes cAMP as a second messenger; accumulating cAMP gives a positive inotropic effect (slides 50–52).',
        'Xanthines — caffeine and theophylline — prevent the breakdown of cAMP, so they too raise inotropy (slide 52).',
        'Vagal stimulation has negative chronotropic and inotropic effects (slide 51).',
        'Inotropy is depressed by hypercapnia, hypoxia, acidosis, drugs (quinidine, procainamide) and cardiac failure (slide 53).',
      ],
      notes: [
        { kind: 'clarified', text: 'Slides 50–51 attribute adrenaline to sympathetic nerve endings and noradrenaline to the adrenals. Guyton: sympathetic nerve endings release noradrenaline; the adrenal medulla secretes mainly adrenaline. Both act via β1 receptors and cAMP.' },
      ],
      sourceRefs: [...c1([50, 51, 52, 53]), ...GUYTON],
    },
    {
      title: 'Cardiac output in exercise and other states',
      kind: 'regulation',
      paragraphs: [
        'In exercise, catecholamines and sympathetic discharge rise, increasing contractility and rate; venous return increases because of muscle pumping; and afterload falls because of vasodilatation and reduced peripheral resistance (slide 54).',
        'Cardiac output also rises with eating, exercise, high temperature, pregnancy, adrenaline, thyrotoxicosis, and anxiety and excitement (slide 54).',
      ],
      sourceRefs: c1([54, 55, 56]),
    },
    {
      title: 'Fick’s principle',
      kind: 'definitions',
      paragraphs: [
        'The amount of a substance taken up or added by an organ equals the arteriovenous concentration difference × the blood flow (slide 57). Using oxygen:',
        'O₂ consumption = (arterial O₂ − venous O₂) × ventricular output. Arterial blood can be taken from any artery, because arterial blood is the same everywhere; venous blood must come from the pulmonary artery (mixed venous blood).',
      ],
      sourceRefs: c1([57]),
    },
    {
      title: 'Work done by the heart',
      kind: 'mechanism',
      paragraphs: [
        'The heart’s oxygen is supplied by the coronary arteries. Coronary venous blood is already low in O₂ because so much is extracted, so to get more O₂ the heart must increase coronary blood flow (slide 58).',
        'Work = stroke volume × mean arterial pressure (aorta or pulmonary artery). Its determinants are intramyocardial tension, the contractile state of the myocardium and heart rate.',
        'Pressure work demands more O₂ than volume work; afterload work is more demanding than preload. That is why angina pectoris is more common in aortic stenosis (afterload) than in aortic incompetence (preload) (slide 58).',
      ],
      sourceRefs: c1([58]),
    },
  ],
  summary: [
    'CO = HR × SV ≈ 5.5 L/min (right = left). Cardiac index = CO per m² body surface.',
    'Inotropic = strength; chronotropic = rate.',
    'Preload = stretch before contraction; afterload = resistance to ejection. Starling: energy of contraction ∝ initial fibre length (heterometric). Contractility changes = homometric.',
    'EDV rises with atrial kick, blood volume, venous tone, muscle pump, inspiration; falls with standing, pericardial effusion, stiff or diseased ventricles.',
    'Catecholamines → β1 → cAMP → +inotropy; xanthines block cAMP breakdown; vagus → −inotropy/−chronotropy; hypoxia, hypercapnia, acidosis depress inotropy.',
    'Fick: O₂ consumption = (arterial − mixed venous O₂) × CO.',
    'Pressure (afterload) work costs more O₂ than volume work → angina commoner in aortic stenosis.',
  ],
};

// ─── Lesson 4 ───────────────────────────────────────────────────────

const lesson4: Draft = {
  id: 'cardiovascular-physiology-4',
  title: 'Vessels, Flow and Blood Pressure',
  description: 'Vessel structure, flow = pressure ÷ resistance, Poiseuille, turbulence, viscosity, and measuring blood pressure.',
  xp: 30,
  sourceRefs: c1([60, 61, 62, 63, 65, 66, 67, 70, 71, 72, 73, 74, 75, 77, 78, 79, 81, 82, 85, 86, 87, 91]),
  objectives: [
    'List what keeps blood moving forward',
    'Compare arteries, arterioles, capillaries and veins',
    'Use flow = ΔP ÷ R and Poiseuille’s law to explain why radius matters most',
    'Explain when flow becomes turbulent (Reynolds number)',
    'Relate velocity to cross-sectional area',
    'Define pulse pressure and mean pressure and measure BP correctly',
  ],
  chunks: [
    {
      title: 'What moves blood forward',
      kind: 'overview',
      paragraphs: ['Blood flows from the heart to arteries, capillaries, veins and back to the heart, driven by (slide 60):'],
      steps: [
        { label: 'The heart pump' },
        { label: 'Elastic recoil of the arteries during diastole' },
        { label: 'Venous compression by skeletal muscle', detail: 'Limb veins, especially in the legs, are surrounded by muscle and have one-way valves.' },
        { label: 'Negative pressure during inspiration' },
      ],
      keyPoints: ['The calibre of the vessels determines resistance to flow; the viscosity of blood is a minor factor.'],
      sourceRefs: c1([60]),
    },
    {
      title: 'Structure and function of the vessels',
      kind: 'structure',
      table: {
        columns: ['Vessel', 'Structure and function'],
        rows: [
          ['Large arteries', 'Much elastic tissue: stretched in systole, recoil in diastole'],
          ['Arterioles', 'Less elastic tissue, more smooth muscle; noradrenergic (constrictor) and sometimes cholinergic (dilator) nerves; the main resistance to flow, by varying their diameter'],
          ['Metarterioles and precapillary sphincters', 'Smaller muscle-walled vessels; sphincters have no innervation but respond to local vasodilators and vasoconstrictors'],
          ['Capillaries', 'A single layer of endothelium; red cells pass in single file; fenestrations let larger molecules through (kidney, intestinal villi, endocrine glands)'],
          ['Venules and veins', 'Thin, easily distended walls with little smooth muscle, very sensitive to noradrenergic nerves (venoconstriction); valves prevent backflow (none in very small veins, the great veins, or veins from brain and viscera)'],
          ['Lymph vessels', 'Have valves, pass through lymph nodes, drain into the subclavian veins'],
        ],
      },
      notes: [{ kind: 'clarified', text: 'Slide 62 gives pore sizes as “10 mm” and “20–100 mm”; these are nanometre-scale openings (Guyton).' }],
      sourceRefs: [...c1([61, 62, 63, 65]), ...GUYTON],
    },
    {
      title: 'Flow, pressure and resistance',
      kind: 'mechanism',
      paragraphs: [
        'Blood flows from high to low pressure, in proportion to the pressure drop and inversely to resistance. The pressure drop — mean pressure at the arterial end minus that at the venous end — is the effective perfusion pressure (slide 66).',
        'Flow = ΔP ÷ Resistance, so Resistance = ΔP ÷ Flow.',
        'For a long tube, the Poiseuille–Hagen formula gives Flow = (P_A − P_B) × π/8 × 1/η × r⁴/L, where η is viscosity, r the radius and L the length (slide 74). So Resistance = 8ηL/πr⁴ — resistance varies with 1/r⁴ (slides 75–76).',
        'Increase the radius and resistance falls and flow rises: organ blood flow can be regulated by changing vessel diameter.',
      ],
      notes: [{ kind: 'annotation', text: 'A note added to slide 74: if the radius doubles, flow rises 16-fold; if it halves, flow falls to 1/16 — which is why arterioles are the main resistance vessels.' }],
      sourceRefs: c1([66, 74, 75, 76]),
    },
    {
      title: 'Laminar and turbulent flow',
      kind: 'mechanism',
      paragraphs: [
        'In laminar flow the velocity is greatest in the centre and falls towards the wall, where a thin layer does not move at all. Laminar flow is silent. Above a critical velocity, flow becomes turbulent and makes noise (slide 70).',
        'The probability of turbulence is expressed by Reynolds’ number, Re = ρDv/η: it rises with fluid density, tube diameter and velocity, and falls with viscosity (slide 71).',
        'So turbulence occurs in anaemia (low viscosity) and in a constricted vessel (high velocity) — giving a bruit over a narrowed artery and the Korotkov sounds of BP measurement (slide 72).',
      ],
      notes: [{ kind: 'clarified', text: 'Slide 72 writes anaemia as giving a “small R”; low viscosity actually raises Reynolds’ number, which is why turbulence occurs (Guyton).' }],
      sourceRefs: [...c1([70, 71, 72]), ...GUYTON],
    },
    {
      title: 'Velocity and cross-sectional area',
      kind: 'definitions',
      paragraphs: [
        'Velocity is displacement per unit time (cm/s); flow is volume moved per unit time (cm³/s). Average velocity v = Q/A (slide 73).',
        'As vessels divide, total cross-sectional area increases, so velocity is greatest in the aorta, falls towards the capillaries, and rises again towards the big veins. Arm-to-tongue circulation time is about 15 s.',
      ],
      sourceRefs: c1([73]),
    },
    {
      title: 'Viscosity',
      kind: 'mechanism',
      paragraphs: [
        'Blood viscosity depends on the haematocrit and affects resistance (slide 77). Flow in large vessels is affected most; viscosity changes in small vessels matter little because of the way blood flows through them, so peripheral resistance changes little unless the change in viscosity is very large.',
        'In polycythaemia, viscosity and resistance rise — more afterload and more work for the heart. In anaemia viscosity is lower, but the heart does extra (volume) work to make up for the low Hb (slide 78). Viscosity also rises with more plasma protein and with rigid cells (hereditary spherocytosis, sickle cell disease).',
      ],
      sourceRefs: c1([77, 78]),
    },
    {
      title: 'Capacitance and distribution of blood',
      kind: 'comparison',
      paragraphs: [
        'Fill an artery and pressure rises linearly; a big vein takes a lot of fluid before its pressure rises. Veins hold blood — capacitance vessels. Small arteries and arterioles generate the peripheral resistance — resistance vessels (slide 79).',
        'At rest (slide 81): about 50% of blood is in the veins, 12% in the heart, 18% in the pulmonary circulation, 2% in the aorta, 8% in arteries and 5% in capillaries. Of transfused blood, about 90% ends up in systemic veins, the pulmonary circulation and the right heart; only 1% goes to the arteries.',
      ],
      sourceRefs: c1([79, 81]),
    },
    {
      title: 'Arterial blood pressure',
      kind: 'definitions',
      paragraphs: [
        'Systole gives peak arterial pressure; diastole the minimum. Flow continues in diastole because of the elastic recoil of the arterial walls — the Windkessel effect. By convention BP is written systolic/diastolic (slide 82).',
        'Arterial pressure is quoted at heart level. Because of gravity, pressure is lower above the heart and higher below it (about 0.77 mmHg per cm) (slide 85).',
        'Pulse pressure is systolic minus diastolic — it causes the pulse. Mean pressure is the average over the cycle ≈ diastolic + ⅓ pulse pressure. Pressure drops further down the arterial tree (slide 91).',
      ],
      sourceRefs: c1([82, 85, 91]),
    },
    {
      title: 'Measuring blood pressure',
      kind: 'clinical',
      paragraphs: [
        'Methods: cannulation with a strain gauge, a mercury manometer, and the cuff method by palpation and auscultation over the brachial artery (slide 86). The first sound heard is the systolic pressure; the Korotkov sounds then become louder, dull and muffled, and disappear — they come from turbulent flow through the compressed artery.',
        'Precautions (slide 87): the cuff must be at heart level. In obese people fat absorbs some cuff pressure, giving a falsely high reading. A cuff too big gives a falsely low result; too small, falsely high. Palpate first for the systolic pressure. Normal ≈ 120/70 (range down to about 90/60).',
      ],
      sourceRefs: c1([86, 87, 88, 89]),
    },
    {
      title: 'Measuring blood flow',
      kind: 'definitions',
      terms: [
        { term: 'Electromagnetic flow meter', meaning: 'Blood, a conductor, moves through a magnetic field; the voltage generated is measured.' },
        { term: 'Doppler flow meter', meaning: 'Measures velocity and direction of flow by the Doppler effect.' },
        { term: 'Plethysmography', meaning: 'Measures changes in volume of an organ or body part, usually from changes in blood flow.' },
      ],
      sourceRefs: c1([67]),
    },
  ],
  summary: [
    'Forward flow: heart, arterial recoil, skeletal muscle pump (with valves), inspiration.',
    'Arterioles are the main resistance vessels; veins are capacitance vessels holding ~50% of blood.',
    'Flow = ΔP/R; R = 8ηL/πr⁴, so radius dominates.',
    'Turbulence: Re = ρDv/η — high velocity or low viscosity → noise (bruits, Korotkov sounds).',
    'v = Q/A: velocity highest in aorta, lowest in capillaries.',
    'Pulse pressure = systolic − diastolic; mean ≈ diastolic + ⅓ pulse pressure. Windkessel recoil maintains diastolic flow.',
    'Cuff at heart level; big cuff → falsely low, small cuff or obesity → falsely high.',
  ],
};

// ─── Lesson 5 ───────────────────────────────────────────────────────

const lesson5: Draft = {
  id: 'cardiovascular-physiology-5',
  title: 'Capillaries, Oedema, Lymph and Veins',
  description: 'Starling’s forces across the capillary wall, the causes of oedema, lymphatic drainage and venous return.',
  xp: 25,
  sourceRefs: c1([62, 93, 94, 95, 97, 99, 100, 101, 102, 106, 107, 109, 110]),
  objectives: [
    'Describe the capillary wall and how substances cross it',
    'Name the four Starling forces and which way each moves fluid',
    'Classify the causes of oedema',
    'Explain what lymph does and why lymphoedema does not pit',
    'Describe what drives venous return and the effects of gravity on veins',
  ],
  chunks: [
    {
      title: 'Capillary circulation',
      kind: 'overview',
      paragraphs: [
        'Capillaries hold a small part of the blood volume — about 5% — and serve nutrient distribution and absorption and waste disposal. Capillary pressure is estimated from the external pressure that occludes the capillary (slide 93).',
        'Substances cross the capillary wall by fenestrations, diffusion, filtration and vesicular transport (slide 93).',
      ],
      sourceRefs: c1([62, 93]),
    },
    {
      title: 'Starling’s forces',
      kind: 'mechanism',
      paragraphs: ['The rate of filtration at any point depends on a balance of forces that push fluid out and pull it in (slides 94–95):'],
      table: {
        columns: ['Pushes fluid out of the capillary', 'Draws fluid into the capillary'],
        rows: [
          ['Capillary hydrostatic pressure', 'Plasma (capillary) oncotic pressure'],
          ['Interstitial colloid osmotic pressure', 'Tissue hydrostatic pressure'],
        ],
      },
      keyPoints: [
        'About 24 L of fluid is filtered daily: 85% is reabsorbed into capillaries and 15% returns via lymph (slide 97).',
        'In inactive tissue capillaries are usually collapsed; when metarterioles and precapillary sphincters dilate, intracapillary pressure rises above the critical closing pressure (slide 97).',
      ],
      sourceRefs: c1([94, 95, 96, 97, 98]),
    },
    {
      title: 'Oedema',
      kind: 'clinical',
      paragraphs: [
        'Oedema is an abnormal, excessive collection of fluid in the interstitial space, from increased filtration or inadequate reabsorption (slide 99). The amount of interstitial fluid depends on the capillary filtration coefficient, the number of active capillaries, hydrostatic and oncotic pressures, and pre- and post-capillary resistance.',
      ],
      table: {
        columns: ['Mechanism', 'Causes'],
        rows: [
          ['Raised hydrostatic pressure (slide 100)', 'Arteriolar dilatation; venular constriction; raised venous pressure (heart failure, incompetent valves, venous obstruction); raised ECF volume (transfusion); gravity in pregnancy or long standing without the muscle pump'],
          ['Increased capillary permeability (slide 101)', 'Substance P, histamine, bradykinins; vasodilators from active tissue dilate precapillary sphincters and metarterioles'],
          ['Low oncotic pressure gradient (slide 102)', 'Low plasma proteins — liver disease, kidney disease, malnutrition; osmotically active substances accumulating in the tissues'],
          ['Lymphatic obstruction (slides 106–107)', 'Filarial worms (elephantiasis); radical mastectomy'],
        ],
      },
      sourceRefs: c1([99, 100, 101, 102, 104, 105, 106, 107]),
    },
    {
      title: 'Lymphatic drainage',
      kind: 'mechanism',
      paragraphs: [
        'More fluid leaves capillaries than returns, so interstitial fluid would build up — but lymph takes it back (slide 106). Lymph flow is aided by the skeletal muscle pump, negative intrathoracic pressure, the suction of the subclavian veins it drains into, contractions of the lymphatic walls, and valves.',
        'The lymph system takes up protein in the intestine and returns it to the circulation, helps reabsorb water, and absorbs fatty acids and cholesterol (slide 106).',
        'Lymphoedema — from obstruction — is not pitting (slide 107).',
      ],
      sourceRefs: c1([106, 107]),
    },
    {
      title: 'Venous circulation',
      kind: 'mechanism',
      paragraphs: [
        'Blood moves in veins by the negative intrathoracic pressure of inspiration, the skeletal muscle pump, the heartbeat and the thoracic pump; arterial pulsation also compresses neighbouring veins (slides 109–110).',
        'Venous pressure is about 12–18 mmHg and falls nearer the heart: at the entrance to the right atrium it is 4–6 mmHg — the central venous pressure (CVP), which fluctuates with respiration and the heartbeat. Velocity rises nearer the heart as total cross-section falls (slide 109).',
        'Standing causes pooling. Because venous pressure is affected by gravity, some head veins may have zero pressure and collapse — but the dural sinuses have rigid walls and stay open at subatmospheric pressure, so opening them risks air embolism (slide 110).',
      ],
      sourceRefs: c1([109, 110]),
    },
  ],
  summary: [
    'Capillaries hold ~5% of blood; exchange by fenestrations, diffusion, filtration, vesicles.',
    'Out: capillary hydrostatic + interstitial oncotic. In: plasma oncotic + tissue hydrostatic.',
    '24 L/day filtered: 85% reabsorbed, 15% via lymph.',
    'Oedema: ↑hydrostatic (heart failure, venous obstruction), ↑permeability (histamine, bradykinin, substance P), ↓plasma protein (liver, kidney, malnutrition), lymphatic obstruction (filaria, mastectomy — non-pitting).',
    'Venous return: inspiration, muscle pump, heartbeat. CVP 4–6 mmHg.',
    'Dural sinuses do not collapse → subatmospheric pressure → air embolism risk.',
  ],
};

// ─── Lesson 6 ───────────────────────────────────────────────────────

const lesson6: Draft = {
  id: 'cardiovascular-physiology-6',
  title: 'Regulation of the Cardiovascular System',
  description: 'Local autoregulation, humoral and nervous control, the vasomotor centre, baroreceptors and Cushing’s reflex.',
  xp: 30,
  sourceRefs: c2([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 28, 31, 32, 33, 34, 35, 36, 37, 38, 40]),
  objectives: [
    'State BP = CO × TPR and the three levels of control',
    'Explain the metabolic and myogenic theories of autoregulation',
    'Describe sympathetic constrictor tone and sympathetic vasodilator fibres',
    'Trace the baroreceptor reflex for a rise and a fall in BP',
    'Explain the atrial receptor exception and Cushing’s reflex',
  ],
  chunks: [
    {
      title: 'Levels of control',
      kind: 'overview',
      paragraphs: [
        'Blood pressure = cardiac output × total peripheral resistance (slide 4). Regulation works locally, systemically and centrally (slide 2), through nerves, local vasoactive substances and circulating vasoactive substances, which dilate or constrict the resistance vessels and the capacitance vessels (slide 3).',
      ],
      sourceRefs: c2([1, 2, 3, 4]),
    },
    {
      title: 'Autoregulation: the metabolic theory',
      kind: 'mechanism',
      paragraphs: [
        'Autoregulation is the capacity of a tissue to keep its blood flow relatively constant despite minor changes in perfusion pressure, by changing its vascular resistance (slide 5).',
        'Metabolic theory: when blood flow falls, vasoactive metabolites accumulate and dilate the vessels, increasing flow; the extra flow washes them away, allowing constriction (slide 6).',
      ],
      table: {
        columns: ['Local vasodilators (slides 7–8)', 'Local vasoconstrictors (slide 9)'],
        rows: [
          ['↓O₂ tension, ↓pH, ↑CO₂ tension', 'Serotonin from platelets'],
          ['↑Temperature, accumulation of K⁺', 'Cold'],
          ['Lactic acid; ADP (heart, from ATP breakdown)', 'Angiotensin'],
          ['Nitric oxide (EDRF) — through which bradykinin and substance P act; histamine (H2); ANP', ''],
        ],
      },
      sourceRefs: c2([5, 6, 7, 8, 9]),
    },
    {
      title: 'Autoregulation: the myogenic theory',
      kind: 'mechanism',
      paragraphs: [
        'When pressure rises it distends the vessels, and vascular smooth muscle contracts in response to the increased transmural pressure (slide 10).',
        'Law of Laplace: the distending pressure equals the wall tension divided by the radii — P = T(1/R₁ + 1/R₂), or P = T/R for a cylinder (slides 11–12). The small radius of small vessels lets them withstand pressure without rupturing.',
        'Two examples of autoregulation are reactive hyperaemia and active hyperaemia (slide 13).',
      ],
      sourceRefs: c2([10, 11, 12, 13, 14]),
    },
    {
      title: 'Systemic control: humoral and nervous',
      kind: 'regulation',
      paragraphs: [
        'Circulating vasodilators include kinins (plasma and tissue bradykinin, which relax vascular smooth muscle through NO), VIP and ANP (slide 15).',
        'Sympathetic noradrenergic fibres supply all vessels except capillaries and venules and cause vasoconstriction. On resistance vessels they regulate flow and BP; on capacitance vessels they regulate the volume of blood stored — constriction moves blood to the arterial side (slide 16).',
        'There is tonic discharge of the sympathetic constrictor fibres (not the dilator fibres), so reducing that tonic discharge causes vasodilatation (slide 17).',
        'Sympathetic vasodilator fibres travel with the sympathetic but are cholinergic and dilate vessels in muscle (slide 18).',
      ],
      sourceRefs: c2([15, 16, 17, 18]),
    },
    {
      title: 'The vasomotor centre',
      kind: 'structure',
      paragraphs: [
        'The heart and vessels are controlled by a collection of neurons in the medulla oblongata — the vasomotor centre (VMC). It has a dorsolateral pressor area and a caudal, ventromedial depressor area; the depressor area inhibits the pressor area (slides 19–20).',
        'Varying the tonic sympathetic discharge controls the radius of arterioles, peripheral resistance and so BP (slide 20). Pressor neurons project directly to sympathetic neurons in the spinal cord: arteriolar constriction, venoconstriction (blood moved out of the reservoir), more venous return and, with the effects on the heart, more cardiac output (slide 22).',
        'The heart: sympathetic increases rate and strength; parasympathetic reduces rate. Rate is controlled mainly by tonic vagal discharge, so vagotomy or atropine increases heart rate (slide 21).',
      ],
      sourceRefs: c2([19, 20, 21, 22]),
    },
    {
      title: 'The baroreceptor reflex',
      kind: 'pathway',
      paragraphs: [
        'Baroreceptors are stretch receptors in high-pressure areas: the carotid sinus (a dilatation at the bifurcation of the common carotid) and the aortic arch (slide 23). Afferents run in the carotid sinus nerve (a branch of the glossopharyngeal, IX) and the vagus (X) to the nucleus of the tractus solitarius in the medulla (slide 24). Low-pressure receptors lie in the atrial walls at the entrances of the venae cavae and in the pulmonary veins.',
      ],
      table: {
        columns: ['BP rises (slide 26)', 'BP falls (slide 28)'],
        rows: [
          ['Baroreceptors stretched → more discharge', 'Not stretched → less discharge'],
          ['Depressor area excited; VMC inhibited', 'Depressor area not stimulated; pressor area not inhibited'],
          ['Vagus stimulated → slower heart', 'No vagal stimulation → faster heart'],
          ['Less sympathetic discharge → negative inotropy, vasodilatation', 'More sympathetic discharge → positive inotropy, vasoconstriction (↑TPR)'],
          ['BP falls', 'Tachycardia; BP rises'],
        ],
      },
      notes: [{ kind: 'clarified', text: 'Slide 24 labels the glossopharyngeal nerve “XI”; it is cranial nerve IX.' }],
      sourceRefs: c2([23, 24, 25, 26, 27, 28, 29, 30]),
    },
    {
      title: 'Atrial (volume) receptors',
      kind: 'mechanism',
      paragraphs: [
        'Atrial receptors are of two types: type A discharge in atrial systole; type B discharge later, in atrial diastole, and more when the atrial wall is distended (slide 31).',
        'Type B stimulation causes vasodilatation and a fall in BP — but an increased, not decreased, heart rate, which may combat an excessive rise in CVP and congestion (slide 31). Through the hypothalamus the impulses also reduce ACTH and ADH; the reflex tachycardia pumps out the extra volume (slide 32).',
        'So there are two exceptions to the rule that HR and BP move together (slides 37–38): reflex hypotension with tachycardia when atrial stretch receptors are stimulated, and hypertension with reflex bradycardia in raised intracranial pressure.',
      ],
      sourceRefs: c2([31, 32, 37, 38]),
    },
    {
      title: 'Other influences on the vasomotor centre',
      kind: 'regulation',
      paragraphs: [
        'Hypoxia and hypercapnia stimulate the VMC directly (slides 33, 35). The cortex, via the hypothalamus, raises BP in anger and sexual excitement. Sharp, short pain raises BP; prolonged pain causes vasodilatation and fainting (slide 33).',
        'The VMC is inhibited by the cortex (fear), by lung inflation through vagal afferents (vasodilatation and lower BP), and by the carotid, aortic and pulmonary baroreceptors (slide 34). Fear and grief cause bradycardia and hypotension (slide 37).',
      ],
      notes: [{ kind: 'annotation', text: 'A note added to slide 34 explains that lung inflation stimulates pulmonary stretch receptors whose vagal afferents inhibit the vasomotor centre.' }],
      sourceRefs: c2([33, 34, 35, 37]),
    },
    {
      title: 'Cushing’s reflex',
      kind: 'clinical',
      paragraphs: [
        'Raised intracranial pressure (hydrocephalus, tumours, a blood clot) reduces blood flow to the VMC. The resulting ischaemia, hypoxia and hypercapnia stimulate the VMC directly → more sympathetic discharge → systemic arterial pressure rises, which restores blood flow to the medulla (slides 35–36, 40).',
        'The rise in BP is sensed by the arterial baroreceptors, giving reflex bradycardia. Result: hypertension with bradycardia (slides 36, 40). Cushing’s reflex is triggered when intracranial pressure rises by more than about 33 mmHg (Regional Circulation, slide 23).',
      ],
      notes: [{ kind: 'annotation', text: 'A note added to slide 36 gives Cushing’s triad: hypertension (wide pulse pressure), bradycardia and irregular breathing.' }],
      sourceRefs: [...c2([35, 36, 39, 40]), ...c4([23])],
    },
  ],
  summary: [
    'BP = CO × TPR; control is local, systemic and central.',
    'Metabolic autoregulation: ↓O₂, ↑CO₂, ↓pH, ↑K⁺, ↑temperature, lactate, adenosine/ADP, NO dilate. Constrictors: serotonin, cold, angiotensin.',
    'Myogenic: stretch → smooth muscle contracts. Laplace: P = T/R.',
    'Tonic sympathetic constrictor discharge sets TPR; cholinergic sympathetic dilators supply muscle.',
    'VMC in medulla: pressor (dorsolateral) and depressor (ventromedial). HR set mainly by tonic vagal discharge.',
    'Baroreceptors: carotid sinus (IX) and aortic arch (X) → NTS. ↑BP → bradycardia + vasodilatation.',
    'Exceptions: atrial type B stretch → hypotension with tachycardia; Cushing’s reflex → hypertension with bradycardia.',
  ],
};

// ─── Lesson 7 ───────────────────────────────────────────────────────

const lesson7: Draft = {
  id: 'cardiovascular-physiology-7',
  title: 'Gravity, Shock and Heart Failure',
  description: 'Compensating for standing up, orthostatic hypotension, g forces, the types and signs of shock, and forward and backward heart failure.',
  xp: 30,
  sourceRefs: c3([3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29, 30, 31, 32, 33]),
  objectives: [
    'Explain the compensation when you stand up',
    'List causes of orthostatic hypotension',
    'Classify shock into four types with examples',
    'Explain each sign of hypovolaemic shock',
    'Explain irreversible shock and syncope',
    'Contrast forward and backward heart failure',
  ],
  chunks: [
    {
      title: 'Standing up',
      kind: 'mechanism',
      paragraphs: [
        'On standing, blood pools in the peripheral capacitance vessels, hydrostatic pressure increases and interstitial fluid collects; venous return falls, and cerebral blood flow falls (slide 3).',
        'The pressure drop in the aortic arch and carotid sinus (above heart level) triggers the VMC: vasoconstriction in the periphery, renin–aldosterone release, more venous return and positive inotropic and chronotropic effects, restoring cardiac output and BP (slide 4).',
        'Cerebral flow is protected because venous pressure (JVP) falls along with arterial pressure, keeping the perfusion pressure; intracranial pressure falls; and the rise in PCO₂ and fall in PO₂ dilate cerebral vessels (slide 5).',
        'With prolonged standing and no muscle pump, excessive pooling reduces venous return, cardiac output and cerebral flow → fainting, which brings the head to the level of the heart (slide 6).',
      ],
      notes: [{ kind: 'annotation', text: 'A note added to slide 4 likens renin to an alarm bell, angiotensin II to an enforcer that tightens the pipes, and aldosterone to a water collector.' }],
      sourceRefs: c3([2, 3, 4, 5, 6]),
    },
    {
      title: 'Orthostatic (postural) hypotension',
      kind: 'clinical',
      paragraphs: [
        'A fall in BP on suddenly rising upright from lying (slide 8). Causes: disrupted sympathetic innervation — during surgery, sympatholytic drugs, nerve damage in diabetes or syphilis, autonomic insufficiency. Vasoconstrictor fibres have no effect, noradrenaline does not rise on standing, and there is no response to baroreceptor stimulation.',
      ],
      sourceRefs: c3([7, 8]),
    },
    {
      title: 'Acceleration',
      kind: 'comparison',
      table: {
        columns: ['Positive g (blood moves down) — slide 9', 'Negative g (blood moves up) — slide 10'],
        rows: [
          ['Cerebral circulation threatened, but maintained by falls in venous and intracranial pressure', 'Cerebral arterial pressure rises; head and neck vessels congest'],
          ['VMC discharge rises → more inotropy and chronotropy; CO maintained for a while', 'Bleeding around the eyes, throbbing headache, mental confusion (“red-out”)'],
          ['Above about 5 g: vision fails, blackout, unconsciousness', 'No rupture of brain vessels, because intracranial pressure rises too and supports them'],
        ],
      },
      keyPoints: ['Pressure suits compress the abdomen and legs to reduce pooling; g is better tolerated when it acts across the body, lying horizontally (slide 11).'],
      sourceRefs: c3([9, 10, 11]),
    },
    {
      title: 'Shock and its types',
      kind: 'classification',
      paragraphs: ['Shock is a clinical syndrome of tissue perfusion inadequate to maintain normal metabolic and nutritional activity, with a relative or absolute inadequate cardiac output (slide 12).'],
      table: {
        columns: ['Type', 'Examples'],
        rows: [
          ['Hypovolaemic (low volume)', 'Haemorrhage, trauma, surgery, burns, diarrhoea and vomiting'],
          ['Distributive (low resistance, vasogenic)', 'Marked vasodilatation and pooling: fainting (neurogenic), anaphylaxis, sepsis'],
          ['Cardiogenic (inadequate pumping)', 'MI, congestive cardiac failure, arrhythmias'],
          ['Obstructive', 'Cardiac tamponade, tension pneumothorax, pulmonary embolism, cardiac tumour'],
        ],
      },
      sourceRefs: c3([12, 13, 14, 15, 16, 17]),
    },
    {
      title: 'Signs of hypovolaemic shock — and why',
      kind: 'mechanism',
      paragraphs: [
        'Haemorrhage → reduced blood volume → reduced venous return → reduced cardiac output → reduced tissue perfusion (slide 18). You see low BP, a fast pulse, pale cool skin, rapid respiration and intense thirst (slide 19).',
      ],
      table: {
        columns: ['Sign', 'Why (slides 20–23)'],
        rows: [
          ['Tachycardia, weak pulse', 'Low BP releases the VMC from inhibition → sympathetic discharge'],
          ['Pale, cool skin', 'Generalised vasoconstriction, marked in skin (spares heart and brain)'],
          ['Low urine output, Na⁺ retention, urea accumulation', 'Renal vasoconstriction lowers GFR; renin–angiotensin–aldosterone stimulated'],
          ['Lactic acidosis', 'Low O₂ → anaerobic glycolysis; acidosis depresses the heart and vascular response to catecholamines'],
          ['Rapid respiration', 'Lost O₂-carrying capacity stimulates chemoreceptors, which also drive the VMC'],
          ['Restless, then dull and apathetic', 'Restlessness increases the muscle pump; later cerebral ischaemia'],
          ['Thirst and fluid shift', 'Angiotensin II, vasopressin, ACTH/corticosteroids; low capillary hydrostatic pressure draws interstitial fluid into vessels'],
        ],
      },
      keyPoints: [
        'Blood is shifted out of the splanchnic bed and pulmonary veins into the systemic circulation; the adrenal medulla releases catecholamines; acute renal tubular damage may follow (slide 22).',
        'If bleeding stops, blood volume is restored in 12–72 hours by fluid mobilisation — diluting plasma protein and Hb; erythropoietin restores Hb in 4–5 weeks (slide 24).',
      ],
      sourceRefs: c3([18, 19, 20, 21, 22, 23, 24]),
    },
    {
      title: 'Irreversible shock',
      kind: 'clinical',
      paragraphs: [
        'In irreversible shock there is no response to compensation even when blood volume is restored (slide 25). Prolonged cerebral ischaemia depresses the VMC → slowing of the heart and vasodilatation → further falls in BP and cerebral flow. Myocardial ischaemia worsens the shock. Precapillary sphincters relax while venules do not, causing stasis, a rise in hydrostatic pressure and loss of fluid into the interstitium (slide 26).',
      ],
      sourceRefs: c3([25, 26, 27]),
    },
    {
      title: 'Other causes of shock, and syncope',
      kind: 'clinical',
      paragraphs: [
        'Hidden bleeding: fractured femur, ruptured ectopic pregnancy, ruptured spleen. In traumatic shock, myoglobin from muscle damages the kidneys. Burns shock: plasma exudes from the skin, giving haemoconcentration. Also diabetes, diarrhoea and adrenal insufficiency (slide 28).',
        'Low-resistance shock: normal blood volume but massive vasodilatation and pooling — neurogenic (fainting from fear or grief), septic/endotoxic (bacterial toxins cause vasodilatation and increased permeability) and anaphylactic (antigen–antibody complexes release histamine → widespread dilatation and permeability) (slide 29).',
        'Syncope (fainting) is caused by inadequate cerebral blood flow and is usually harmless. Vasovagal syncope: abrupt vasodilatation, hypotension and bradycardia after strong emotion. Others: postural syncope, micturition syncope, and carotid sinus syncope from pressure on the carotids (e.g. a tight collar) (slide 30).',
      ],
      sourceRefs: c3([28, 29, 30]),
    },
    {
      title: 'Heart failure',
      kind: 'clinical',
      paragraphs: ['Heart failure: the heart as a pump cannot meet the tissues’ needs for oxygen and substrates even though venous return is normal or increased (slide 31).'],
      table: {
        columns: ['', 'Left heart', 'Right heart'],
        rows: [
          ['Forward failure (can’t pump enough out)', 'Tissue hypoperfusion: muscle weakness, fatigue, dyspepsia, oliguria', 'Lung hypoperfusion: disordered gas exchange; less blood to the left heart'],
          ['Backward failure (can’t accept returning blood)', '↑Pulmonary capillary pressure: dyspnoea, PND, tachypnoea, pulmonary oedema (cardiac asthma), hypoxaemia, hypercapnia', '↑Systemic venous pressure: peripheral oedema, hepatomegaly, ascites, nocturnal diuresis, raised JVP'],
        ],
      },
      sourceRefs: c3([31, 32, 33, 34]),
    },
  ],
  summary: [
    'Standing: pooling → ↓venous return → baroreceptors → VMC → vasoconstriction, renin–aldosterone, +inotropy/chronotropy. Cerebral flow protected by falling venous/intracranial pressure and CO₂ vasodilatation.',
    'Orthostatic hypotension: failed sympathetic response (surgery, sympatholytics, diabetes, autonomic failure).',
    '+g → blackout above ~5 g; −g → red-out without vessel rupture.',
    'Shock: hypovolaemic, distributive, cardiogenic, obstructive.',
    'Hypovolaemic signs: low BP, tachycardia, pale cool skin, rapid breathing, thirst, oliguria, lactic acidosis.',
    'Irreversible shock: VMC depression, myocardial ischaemia, capillary stasis.',
    'Left backward failure → pulmonary oedema; right backward failure → peripheral oedema, hepatomegaly, ascites, raised JVP.',
  ],
};

// ─── Lesson 8 ───────────────────────────────────────────────────────

const lesson8: Draft = {
  id: 'cardiovascular-physiology-8',
  title: 'Regional Circulations',
  description: 'The brain (CSF, blood–brain barrier, cerebral flow), heart, lungs, gut and liver, skin and the fetus.',
  xp: 30,
  sourceRefs: c4([2, 5, 6, 7, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 27, 28, 29, 31, 32, 34, 35, 36, 37, 39, 40, 45]),
  objectives: [
    'Describe the cerebral blood supply and the flow of CSF',
    'List the functions and composition of CSF and the types of hydrocephalus',
    'Explain what crosses the blood–brain barrier',
    'Explain why coronary flow occurs in diastole and what causes angina',
    'Describe pulmonary, splanchnic and skin circulations, including ascites and the triple response',
  ],
  chunks: [
    {
      title: 'Cerebral blood supply and the meninges',
      kind: 'structure',
      paragraphs: [
        'The brain is supplied through the circle of Willis, formed from the internal carotids and the basilar artery (from the vertebral arteries), giving the anterior, middle and posterior cerebral arteries. Each artery is almost the exclusive supply to its region, with little anastomosis (slide 2).',
        'The meninges: tough outer dura mater; the subdural space; the arachnoid membrane; the subarachnoid space containing CSF; and the thin pia mater adhering to the brain and cord, following every sulcus (slide 5).',
      ],
      sourceRefs: c4([2, 3, 4, 5]),
    },
    {
      title: 'Cerebrospinal fluid',
      kind: 'pathway',
      paragraphs: ['CSF is a clear, colourless fluid bathing the CNS, contained in the ventricles and made mainly by the choroid plexus of the lateral, third and fourth ventricles (slide 7). It flows:'],
      steps: [
        { label: 'Lateral ventricles' },
        { label: 'Interventricular foramen (of Monro)' },
        { label: 'Third ventricle' },
        { label: 'Cerebral aqueduct (of Sylvius)' },
        { label: 'Fourth ventricle → foramina of Luschka and Magendie' },
        { label: 'Subarachnoid space → absorbed through arachnoid villi into the blood' },
      ],
      sourceRefs: c4([6, 7, 8, 9, 10, 11, 12]),
    },
    {
      title: 'What CSF does',
      kind: 'definitions',
      terms: [
        { term: 'Protection', meaning: 'Cushions a blow to the head.' },
        { term: 'Buoyancy', meaning: 'The brain’s net weight falls to about 50 g, reducing pressure at its base.' },
        { term: 'Excretion', meaning: 'One-way flow to blood removes harmful metabolites and drugs.' },
        { term: 'Endocrine medium', meaning: 'Carries hormones to other areas of the brain.' },
      ],
      paragraphs: [
        'Volume 150 mL; production 550 mL/day; 15% of brain volume. Composition like brain ECF: protein 20 mg/dL, glucose 64 mg/dL; lumbar pressure 70–180 mm CSF (slide 14).',
        'Hydrocephalus is accumulation of CSF: external (communicating) — reduced reabsorption by the arachnoid villi; internal (non-communicating) — obstruction of the ventricular drainage system (slide 16).',
      ],
      sourceRefs: c4([13, 14, 15, 16]),
    },
    {
      title: 'The blood–brain barrier',
      kind: 'mechanism',
      paragraphs: [
        'The barrier insulates the brain and its ECF, including CSF, from blood-borne chemicals such as drugs, antigens and electrolyte changes. It lies in the intracranial endothelium. Only small, non-polar, lipid-soluble substances, or those with specific carriers, cross (slide 18).',
        'Easy passage: water, CO₂, O₂, lipid-soluble steroid hormones. Difficult: proteins and protein-bound substances. Glucose diffuses slowly but is carried fast by a transporter (slide 19).',
        'It keeps the neuronal environment constant and protects from endogenous toxins. Clinically, drug penetration must be known, and the barrier breaks down in infection and injury (slide 20).',
      ],
      sourceRefs: c4([18, 19, 20]),
    },
    {
      title: 'Cerebral blood flow',
      kind: 'regulation',
      paragraphs: [
        'Flow is greater to active parts. Cerebral vessels have adrenergic, cholinergic and sensory nerves — touching them causes pain (slide 21).',
        'Monro–Kellie doctrine: the volumes of blood, CSF and brain in the skull remain relatively constant, so vessels are compressed when intracranial pressure rises; perfusion pressure is nonetheless maintained (slide 22). A rise of more than about 33 mmHg triggers Cushing’s reflex (slide 23).',
        'Autoregulation is prominent. The brain is very sensitive to hypoxia: 10 s of occlusion causes unconsciousness. Brainstem vegetative structures resist hypoxia better than the cortex; the basal ganglia and thalamus are also very sensitive (slide 23).',
        'Glucose supplies 90% of the energy and is taken up without insulin; hypoglycaemia causes convulsions and coma (slide 24).',
        'Stroke is loss of blood supply to an area of brain → ischaemia → cell death: haemorrhagic (rupture, usually of an aneurysm) or ischaemic (atherosclerotic plaque, thrombus, embolus) (slide 25).',
      ],
      sourceRefs: c4([21, 22, 23, 24, 25]),
    },
    {
      title: 'Coronary circulation',
      kind: 'mechanism',
      paragraphs: [
        'There are right and left coronary arteries: the right is larger in 50% of people, the left in 20%, and they are equal in 30% (slide 27). Venous return is through the coronary sinus and anterior cardiac veins; others drain directly into the chambers.',
        'Flow occurs during diastole; in systole the vessels are compressed (slide 27). Coronary vasodilatation is caused by ↓O₂, ADP, K⁺, H⁺, lactate, CO₂ and adenosine, and reactive hyperaemia occurs; α-receptor stimulation constricts the vessels (slide 28).',
        'Coronary artery disease (slide 29): hypoxia from occlusion — at about 75% occlusion, a “P factor” causes pain. In angina pectoris, resting flow is normal but problems appear in exercise; severe, prolonged hypoxia causes myocardial infarction. Partial obstruction by atheromatous plaque is aggravated by spasm, thrombus, emboli, haemorrhage and platelet aggregation.',
      ],
      notes: [
        { kind: 'clarified', text: 'Slide 27 says the coronary vessels arise “behind the mitral valve cusps”. Guyton: they arise from the aortic sinuses behind the aortic valve cusps.' },
        { kind: 'check', text: 'Slide 28 says β stimulation produces metabolites that cause constriction, while the same slide lists metabolites as dilators. Confirm with the lecturer.' },
      ],
      sourceRefs: [...c4([26, 27, 28, 29]), ...GUYTON],
    },
    {
      title: 'Pulmonary circulation',
      kind: 'mechanism',
      paragraphs: [
        'The lungs have two systems: the respiratory (pulmonary) circulation and the supporting bronchial arteries from the aorta, which empty into the pulmonary veins (slide 31).',
        'Pulmonary capillary hydrostatic pressure is low (10 mmHg) against an oncotic pressure of 25 mmHg, so it is difficult for fluid to accumulate in the alveoli. Gravity matters: upright, the apices are above the heart; lying flat, the whole lung is at heart level — important in orthopnoea and heart failure (slide 31).',
        'The lungs are a blood reservoir: lying down adds about 400 mL to the lungs; standing returns it to the circulation. There is autonomic innervation for constriction and NO for dilatation. Hypoxia constricts pulmonary vessels, shunting blood to better-ventilated areas; CO₂ and H⁺ also constrict; persistent constriction leads to pulmonary hypertension (slide 32).',
      ],
      sourceRefs: c4([30, 31, 32]),
    },
    {
      title: 'Splanchnic and liver circulation',
      kind: 'structure',
      paragraphs: [
        'Arterial supply from the coeliac, superior and inferior mesenteric arteries; drainage via the hepatic portal vein, liver, hepatic vein and IVC (slide 34).',
        'The liver’s functional unit is the acinus. Blood flows from the portal triad (portal vein, hepatic artery, bile duct branches) toward the central vein, so the area near the vein is less oxygenated and prone to anoxic damage. Pressures: portal vein 10 mmHg, hepatic vein 5 mmHg, hepatic artery 90 mmHg (slide 35).',
        'There is extensive anastomosis in the mesentery; flow to mucosa exceeds flow to muscle; flow rises for about 3 h after a meal; metabolic autoregulation is prominent. Sympathetic outflow constricts the arteries, diverting blood away in shock (which can cause necrosis). The splanchnic bed is a large venous reservoir (slide 36).',
        'Ascites (free fluid in the peritoneal cavity): a rise in hepatic venous pressure raises sinusoidal hydrostatic pressure; fluid moves into the space of Disse and lymph and leaks from the liver surface. Because sinusoids have pores, this fluid is rich in protein, and its osmotic pull draws more fluid from the gut and mesentery (slide 37).',
      ],
      sourceRefs: c4([33, 34, 35, 36, 37]),
    },
    {
      title: 'Skin circulation',
      kind: 'mechanism',
      paragraphs: [
        'The skin is used for heat regulation, has many anastomoses, and is shunted in shock (slide 39).',
        'White reaction: paleness after stroking the skin, from contraction of precapillary sphincters; blood drains from capillaries and small veins; lasts about 15 s (slide 39).',
      ],
      table: {
        columns: ['Triple response (firmer stroke, slide 40)', 'Cause'],
        rows: [
          ['Red reaction', 'Capillary dilatation'],
          ['Wheal', 'Local oedema — increased permeability of capillaries and post-capillary venules'],
          ['Flare', 'Arteriolar dilatation spreading from the site, by an axon reflex (antidromic)'],
        ],
      },
      sourceRefs: c4([38, 39, 40]),
    },
    {
      title: 'Fetal respiration',
      kind: 'overview',
      paragraphs: [
        'Fetal haemoglobin has a higher O₂ affinity than the mother’s adult haemoglobin, because it binds 2,3-DPG less. HbF usually disappears by about 4 months after birth. The placenta is cut off at birth and the baby adjusts to adult respiration (slide 45). Slides 43–46 show the fetal circulation and its changes after birth as diagrams.',
      ],
      sourceRefs: c4([42, 43, 44, 45, 46]),
    },
  ],
  summary: [
    'Circle of Willis (internal carotids + basilar) → anterior, middle, posterior cerebral arteries with little anastomosis.',
    'CSF: choroid plexus → lateral → Monro → third → Sylvius → fourth → Luschka/Magendie → subarachnoid → arachnoid villi. 150 mL; 550 mL/day.',
    'CSF functions: protection, buoyancy (brain ~50 g), excretion, endocrine medium. Hydrocephalus: communicating (absorption) vs non-communicating (obstruction).',
    'BBB: water, gases, steroids cross; proteins don’t; glucose by transporter.',
    'Brain: Monro–Kellie; 10 s ischaemia → unconscious; glucose without insulin.',
    'Coronary flow in diastole; dilated by metabolites and adenosine; angina at ~75% occlusion.',
    'Pulmonary capillaries: 10 mmHg hydrostatic vs 25 oncotic; hypoxic vasoconstriction.',
    'Liver: zone near central vein most hypoxic; ascites from raised hepatic venous pressure with protein-rich fluid.',
    'Triple response: red reaction, wheal, flare (axon reflex).',
  ],
};

// ─── Lesson 9 ───────────────────────────────────────────────────────

const lesson9: Draft = {
  id: 'cardiovascular-physiology-9',
  title: 'The ECG and Cardiac Rhythms',
  description: 'Leads, waves and intervals, calculating heart rate, sinus rhythm and arrhythmia, and the degrees of heart block.',
  xp: 25,
  sourceRefs: c5([2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]),
  objectives: [
    'Explain what the ECG records and how it is calibrated',
    'Place the chest leads V1–V6',
    'Name what each wave and interval represents, with normal durations',
    'Calculate heart rate from an ECG',
    'Distinguish first-, second- (Mobitz I and II) and third-degree heart block',
  ],
  chunks: [
    {
      title: 'What the ECG records',
      kind: 'overview',
      paragraphs: [
        'Currents generated as the heart depolarises and repolarises spread through the whole body, so they can be recorded by electrodes on the body surface: the electrocardiogram (ECG or EKG). It is recorded at 25 mm/s and calibrated so that 1 mV = 10 mm vertically (slide 2).',
        'Leads: standard limb leads (bipolar), augmented limb leads (unipolar) and chest leads (unipolar) (slides 3–5).',
      ],
      sourceRefs: c5([2, 3, 4, 5]),
    },
    {
      title: 'Chest lead positions',
      kind: 'structure',
      steps: [
        { label: 'V1', detail: '4th intercostal space, just right of the sternum.' },
        { label: 'V2', detail: '4th intercostal space, just left of the sternum.' },
        { label: 'V3', detail: 'Between V2 and V4.' },
        { label: 'V4', detail: '5th intercostal space, mid-clavicular line.' },
        { label: 'V5', detail: 'Level with V4, left anterior axillary line.' },
        { label: 'V6', detail: 'Level with V4 and V5, mid-axillary line.' },
      ],
      sourceRefs: c5([6]),
    },
    {
      title: 'Waves and intervals',
      kind: 'pathway',
      table: {
        columns: ['Feature', 'Represents', 'Normal duration'],
        rows: [
          ['P wave', 'Atrial depolarisation spreading from the SA node', '0.08–0.1 s'],
          ['PR interval', 'Onset of atrial depolarisation to onset of ventricular depolarisation', '0.12–0.20 s'],
          ['QRS complex', 'Ventricular depolarisation', '0.06–0.1 s'],
          ['ST segment', 'Whole ventricle depolarised — roughly the plateau of the ventricular action potential; depressed or elevated in ischaemia or hypoxia', 'Isoelectric'],
          ['T wave', 'Ventricular repolarisation (longer than depolarisation)', '—'],
          ['U wave', 'Last remnants of ventricular repolarisation (sometimes seen)', '—'],
          ['QT interval', 'Ventricular depolarisation + repolarisation ≈ an average ventricular action potential', '0.2–0.4 s, depending on heart rate'],
        ],
      },
      sourceRefs: c5([8, 9, 10, 11, 12, 13]),
    },
    {
      title: 'Reading the paper',
      kind: 'definitions',
      paragraphs: [
        'Each small 1-mm square is 0.04 s (40 ms) and 0.1 mV; one big square (5 small squares) is 0.2 s (slide 15).',
        'Heart rate = 1500 ÷ number of small squares between two R waves, or 300 ÷ number of large squares. Example: 1500/22 ≈ 68 beats/min; 300/4.4 ≈ 68 (slide 16).',
        'Uses of the ECG (slide 17): anatomical orientation of the heart, relative chamber sizes, rhythm disturbances, ischaemic damage, electrolyte imbalances and the influence of drugs.',
      ],
      sourceRefs: c5([14, 15, 16, 17]),
    },
    {
      title: 'Cardiac rhythms',
      kind: 'definitions',
      paragraphs: [
        'At rest the heart beats regularly at about 70/min, controlled by discharges from the SA node: sinus rhythm. Faster is tachycardia; slower is bradycardia (slide 18).',
        'Exercise, fever, emotions and drugs affect the heart. An arrhythmia is an abnormal rhythm. In sinus arrhythmia the rate varies with respiration — slowing in expiration and speeding up in inspiration — due mainly to the parasympathetic outflow to the heart (slide 19).',
      ],
      sourceRefs: c5([18, 19]),
    },
    {
      title: 'Heart block',
      kind: 'clinical',
      table: {
        columns: ['Degree', 'What happens', 'ECG'],
        rows: [
          ['First degree', 'Signals slowed from atria to ventricles; rarely symptoms or treatment', 'Long PR interval'],
          ['Second degree, Mobitz I (Wenckebach)', 'Delay grows with each beat until a beat is skipped; may cause dizziness', 'PR lengthens progressively until a P wave has no QRS'],
          ['Second degree, Mobitz II', 'Some signals blocked, less regularly', 'Normal PR, but a QRS is sometimes missing; atria:ventricles e.g. 2:1 or 3:1'],
          ['Third degree (complete)', 'Conduction interrupted; atria and ventricles beat independently; ventricles beat slowly (idioventricular rhythm)', 'Regular P–P and regular R–R with no relationship between P and QRS'],
        ],
      },
      keyPoints: ['Lack of cerebral blood flow in complete heart block causes fainting and dizziness: Stokes–Adams syndrome (slide 20).'],
      sourceRefs: c5([20, 21, 22, 23, 24, 25, 26]),
    },
  ],
  summary: [
    'ECG at 25 mm/s; 1 mV = 10 mm. Small square = 0.04 s, 0.1 mV; large square = 0.2 s.',
    'P = atrial depolarisation (0.08–0.1 s); PR 0.12–0.20 s; QRS = ventricular depolarisation (0.06–0.1 s); ST = plateau (shifts in ischaemia); T = ventricular repolarisation; QT 0.2–0.4 s.',
    'HR = 1500 ÷ small squares or 300 ÷ large squares between R waves.',
    'Sinus rhythm ~70/min; sinus arrhythmia: faster in inspiration (parasympathetic).',
    'Heart block: 1st = long PR; Mobitz I = progressive PR lengthening then dropped beat; Mobitz II = sudden dropped QRS; 3rd = P and QRS independent → Stokes–Adams.',
  ],
};

export const lessons: Draft[] = [lesson1, lesson2, lesson3, lesson4, lesson5, lesson6, lesson7, lesson8, lesson9].map((lesson) => ({
  ...lesson,
  ...readingExtras[lesson.id],
  interactive: interactive[lesson.id],
}));
