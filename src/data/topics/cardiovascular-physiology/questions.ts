// Physiology → Cardiovascular Physiology — the topic question bank.
//
// Rules: only what the lessons teach (the five circulation lectures, and
// labelled Guyton clarifications). Not asked: where the coronary arteries
// arise (slide slip), the effect of β-stimulated metabolites (unclear),
// brain weight in air or the Monro–Kellie CSF volume (slides differ), and
// any speaker-note annotation. Options are shuffled at quiz time.
// IDs: qN-xx, N = lesson.
import { fill, match, mcq, multi, order, tf, type QuestionDraft } from '@/data/topics/build';
import type { ConceptId } from '@/data/topics/cardiovascular-physiology/sources';

type Q = QuestionDraft<ConceptId>;

// ─── Lesson 1 — Conduction and the cardiac cycle ───────────────────
const lesson1: Q[] = [
  mcq('q1-01', 'conduction-system', 'Where is the SA node?', 'At the junction of the superior vena cava and the right atrium', ['In the interventricular septum', 'Behind the mitral valve', 'At the apex of the left ventricle'], { explanation: 'Slide 9.' }),
  mcq('q1-02', 'conduction-system', 'Where is the AV node?', 'In the right posterior interatrial septum, just behind the tricuspid valve', ['At the junction of the SVC and right atrium', 'In the left atrial appendage', 'At the apex of the heart'], { explanation: 'Slide 9.' }),
  match('q1-03', 'conduction-system', 'Match each internodal tract to its eponym.', [
    ['Anterior tract', 'Bachmann'],
    ['Middle tract', 'Wenckebach'],
    ['Posterior tract', 'Thorel'],
  ], { explanation: 'Slide 9.' }),
  tf({ id: 'q1-04', conceptId: 'conduction-system', statement: 'Only the SA node in the conduction system is capable of spontaneous discharge.', answer: false, explanation: 'Slide 7: all parts can discharge spontaneously, but the SA node controls them.', skill: 'misconception' }),
  mcq('q1-05', 'conduction-system', 'What starts contraction of cardiac muscle?', 'Depolarisation spreading from the SA node', ['Closure of the AV valves', 'Filling of the ventricle', 'Repolarisation of the ventricles'], { explanation: 'Slide 10: contraction starts after depolarisation.' }),
  mcq('q1-06', 'cycle-phases', 'In diastole, which valves are open?', 'Mitral and tricuspid', ['Aortic and pulmonary', 'All four', 'None'], { explanation: 'Slide 12.' }),
  mcq('q1-07', 'cycle-phases', 'What proportion of ventricular filling is passive?', 'About 70%', ['About 30%', 'About 50%', 'About 95%'], { explanation: 'Slide 13: the other 30% is atrial contraction.' }),
  mcq('q1-08', 'cycle-phases', 'What starts ventricular systole?', 'Closure of the mitral and tricuspid valves', ['Opening of the aortic valve', 'Closure of the aortic valve', 'The P wave alone'], { explanation: 'Slide 13.' }),
  mcq('q1-09', 'cycle-phases', 'During isovolumetric contraction…', 'Pressure rises with very little muscle shortening, all valves shut', ['Blood is ejected rapidly', 'The ventricles fill passively', 'The AV valves are open'], { explanation: 'Slides 13–14.' }),
  mcq('q1-10', 'cycle-phases', 'Ventricular pressure must exceed about what aortic pressure for the aortic valve to open?', '80 mmHg', ['10 mmHg', '120 mmHg', '25 mmHg'], { explanation: 'Slide 14: aorta ~80 mmHg, pulmonary artery ~10 mmHg.' }),
  mcq('q1-11', 'cycle-phases', 'Why is there a small rise in atrial pressure during isovolumetric contraction?', 'The closed AV valves bulge into the atria', ['The atria contract', 'Blood flows back through the aortic valve', 'Venous return stops'], { explanation: 'Slide 15.', skill: 'cause-effect' }),
  mcq('q1-12', 'cycle-phases', 'What ends isovolumetric relaxation?', 'The AV valves opening when ventricular pressure falls below atrial pressure', ['Closure of the aortic valve', 'Atrial contraction', 'Opening of the pulmonary valve'], { explanation: 'Slide 17.' }),
  fill('q1-13', 'cycle-phases', 'The period when ventricular pressure starts falling after full contraction, ending with closure of the semilunar valves, is ____.', ['protodiastole', 'proto-diastole', 'proto diastole'], { explanation: 'Slide 17.', skill: 'terminology' }),
  mcq('q1-14', 'cycle-volumes', 'Typical stroke volume is about…', '70–90 mL', ['130 mL', '20–30 mL', '5 L'], { explanation: 'Slide 16.' }),
  mcq('q1-15', 'cycle-volumes', 'What is the end-systolic volume?', 'The volume left in the ventricle after systolic contraction', ['The volume ejected per beat', 'The volume in the fully filled ventricle', 'The volume pumped per minute'], { explanation: 'Slide 16.', skill: 'terminology' }),
  mcq('q1-16', 'valve-timing', 'Which ventricle starts ejecting first?', 'The right, because pulmonary artery pressure is lower', ['The left, because it contracts first', 'Both at exactly the same time', 'The left, because aortic pressure is lower'], { explanation: 'Slide 18.' }),
  mcq('q1-17', 'valve-timing', 'In expiration, the aortic and pulmonary valves…', 'Close together at the same time', ['Close with the aortic first', 'Close with the pulmonary first', 'Do not close'], { explanation: 'Slide 18. In inspiration the aortic closes first.' }),
  multi('q1-18', 'valve-timing', 'Why does the pulmonary valve close late in inspiration? Select all that apply.', ['Negative intrathoracic pressure increases venous return', 'Pulmonary vascular impedance falls', 'Right ventricular ejection is prolonged'], ['The pulmonary valve is stiffer', 'The aortic pressure falls'], { explanation: 'Slide 19.', skill: 'cause-effect' }),
  tf({ id: 'q1-19', conceptId: 'fast-heart-rate', statement: 'Cardiac muscle can be tetanised by rapid stimulation, like skeletal muscle.', answer: false, explanation: 'Slide 20: its long refractory period makes tetanus impossible.', skill: 'misconception' }),
  multi('q1-20', 'fast-heart-rate', 'Which happen in diastole (slide 20)? Select all that apply.', ['Coronary blood flow to the myocardium', 'Ventricular filling', 'The heart rests'], ['Ejection into the aorta'], { explanation: 'Slide 20.' }),
];

// ─── Lesson 2 — Pulse, JVP, heart sounds and murmurs ───────────────
const lesson2: Q[] = [
  multi('q2-01', 'arterial-pulse', 'Which are characteristics of the pulse listed in the lecture? Select all that apply.', ['Rate', 'Volume', 'Character', 'Location'], ['Colour', 'Viscosity'], { explanation: 'Slide 25: rate, volume, strength, character, location.' }),
  tf({ id: 'q2-02', conceptId: 'arterial-pulse', statement: 'As arteries become rigid with age, the pulse wave travels faster.', answer: true, explanation: 'Slide 24.' }),
  mcq('q2-03', 'arterial-pulse', 'How does pulse wave speed change from the aorta to the small arteries?', 'It increases', ['It decreases', 'It stays the same', 'It stops at the arterioles'], { explanation: 'Slide 24.' }),
  mcq('q2-04', 'jvp-waves', 'Why do pressure changes in the right atrium appear in the neck?', 'The internal jugular vein communicates directly with the right atrium', ['The carotid artery transmits them', 'The vagus nerve carries them', 'The trachea moves with the heart'], { explanation: 'Slide 26.' }),
  mcq('q2-05', 'jvp-waves', 'What happens to the venous level in the neck during inspiration?', 'It falls, as blood is drawn into the heart', ['It rises', 'It stays the same', 'It becomes pulsatile'], { explanation: 'Slide 26.' }),
  mcq('q2-06', 'jvp-waves', 'The x descent of the JVP corresponds to…', 'Atrial relaxation after emptying', ['Opening of the tricuspid valve', 'Atrial contraction', 'Isovolumetric contraction'], { explanation: 'Slide 27.' }),
  mcq('q2-07', 'jvp-waves', 'How many positive waves does the JVP have?', 'Three (a, c, v)', ['Two (a, v)', 'Four (a, c, v, y)', 'One'], { explanation: 'Slide 27.' }),
  mcq('q2-08', 'jvp-clinical', 'A big c wave in the JVP suggests…', 'Tricuspid incompetence', ['Complete heart block', 'Aortic stenosis', 'Hypovolaemia'], { explanation: 'Slide 28: regurgitation of flow.', clinical: true }),
  mcq('q2-09', 'jvp-clinical', 'At what position is the JVP normally measured?', 'Reclining at 45°', ['Lying flat', 'Standing', 'Head down'], { explanation: 'Slide 28: sit upright if the veins are very engorged.' }),
  mcq('q2-10', 'heart-sounds', 'S1 occurs at…', 'The beginning of ventricular systole', ['The beginning of diastole', 'The end of atrial systole only', 'Mid-diastole'], { explanation: 'Slide 30.' }),
  mcq('q2-11', 'heart-sounds', 'S2 is produced by closure of which valves?', 'Aortic and pulmonary', ['Mitral and tricuspid', 'Mitral and aortic', 'Tricuspid and pulmonary'], { explanation: 'Slide 30.' }),
  mcq('q2-12', 'heart-sounds', 'The third and fourth heart sounds are due to…', 'Rapid ventricular filling', ['Valve closure', 'Atrial relaxation', 'Turbulence in the aorta'], { explanation: 'Slide 31.' }),
  mcq('q2-13', 'heart-sounds', 'Why is S1 soft when the heart is slow?', 'The ventricles fill fully and the valves float closed', ['Aortic pressure is high', 'The valves close briskly', 'Pulmonary pressure is raised'], { explanation: 'Slide 33.', skill: 'cause-effect' }),
  multi('q2-14', 'heart-sounds', 'S2 is loud when… Select all that apply.', ['Aortic pressure is high', 'Pulmonary artery pressure is elevated'], ['The heart is slow', 'The ventricles are underfilled'], { explanation: 'Slide 33: brisk closure of the valves.' }),
  tf({ id: 'q2-15', conceptId: 'heart-sounds', statement: 'Physiological splitting of S2 occurs in inspiration, with the aortic component before the pulmonary.', answer: true, explanation: 'Slide 34.' }),
  mcq('q2-16', 'murmurs', 'What causes a murmur?', 'Turbulent blood flow', ['Laminar blood flow', 'Normal valve closure', 'Slow heart rate'], { explanation: 'Slide 35.' }),
  multi('q2-17', 'murmurs', 'Which can cause turbulence and murmurs (slide 35)? Select all that apply.', ['Abnormal valves', 'A hyperdynamic circulation', 'Backflow of blood'], ['Streamlined flow', 'Bradycardia'], { explanation: 'Slide 35.' }),
  mcq('q2-18', 'murmurs', 'Pulmonary stenosis produces a murmur in…', 'Systole', ['Diastole', 'Both equally', 'Neither'], { explanation: 'Slide 36: forward flow during ejection.', skill: 'application' }),
  mcq('q2-19', 'murmurs', 'Tricuspid incompetence produces a murmur in…', 'Systole', ['Diastole', 'Only in inspiration', 'Neither'], { explanation: 'Slide 36: backward flow during systole.', skill: 'application' }),
  multi('q2-20', 'murmurs', 'Which conditions can produce murmurs or bruits outside the valves (slide 40)? Select all that apply.', ['Arteriovenous fistula', 'Patent ductus arteriosus', 'Anaemia', 'Aneurysm'], ['Polycythaemia', 'Bradycardia'], { explanation: 'Slide 40.' }),
  mcq('q2-21', 'murmurs', 'Why can anaemia produce a murmur?', 'Low blood viscosity increases flow rate and turbulence', ['High viscosity slows flow', 'The valves thicken', 'The heart slows'], { explanation: 'Slide 40.', skill: 'cause-effect' }),
];

// ─── Lesson 3 — Cardiac output ─────────────────────────────────────
const lesson3: Q[] = [
  mcq('q3-01', 'cardiac-output-definition', 'Cardiac output is…', 'The volume of blood pumped by the heart per unit time', ['The volume ejected per beat', 'The fraction of EDV ejected', 'The pressure in the aorta'], { explanation: 'Slide 41.', skill: 'terminology' }),
  mcq('q3-02', 'cardiac-output-definition', 'Cardiac index is cardiac output per…', 'Unit area of body surface', ['Kilogram of body weight', 'Beat', 'Litre of blood'], { explanation: 'Slide 41.', skill: 'terminology' }),
  tf({ id: 'q3-03', conceptId: 'cardiac-output-definition', statement: 'The outputs of the right and left ventricles are equal, about 5.5 L/min.', answer: true, explanation: 'Slide 41.' }),
  match('q3-04', 'cardiac-output-definition', 'Match each term to its meaning.', [
    ['Inotropic effect', 'Change in strength of contraction'],
    ['Chronotropic effect', 'Change in heart rate'],
  ], { explanation: 'Slide 42.' }),
  mcq('q3-05', 'frank-starling', 'Preload is…', 'The degree of stretch of the myocardium before it contracts', ['The resistance against which blood is expelled', 'The heart rate', 'The aortic diastolic pressure'], { explanation: 'Slide 44.', skill: 'terminology' }),
  mcq('q3-06', 'frank-starling', 'Afterload depends on…', 'Resistance through the aortic valve and the peripheral resistance', ['Venous return', 'Atrial contraction', 'End-diastolic volume'], { explanation: 'Slides 44, 50.' }),
  mcq('q3-07', 'frank-starling', 'The Frank–Starling law states that the energy of contraction is proportional to…', 'The initial length of the cardiac muscle fibre', ['The heart rate', 'The afterload', 'The blood viscosity'], { explanation: 'Slide 44.' }),
  mcq('q3-08', 'frank-starling', 'Regulation of output by changes in muscle fibre length is called…', 'Heterometric regulation', ['Homometric regulation', 'Autoregulation', 'Chronotropic regulation'], { explanation: 'Slide 48. Changes in contractility without a length change are homometric.', skill: 'terminology' }),
  multi('q3-09', 'frank-starling', 'Which decrease end-diastolic volume (slide 49)? Select all that apply.', ['Standing (pooling by gravity)', 'Pericardial effusion', 'Increased ventricular stiffness', 'Myocardial infarction'], ['Increased blood volume', 'Increased venous tone'], { explanation: 'Slide 49.' }),
  mcq('q3-10', 'contractility', 'Through which receptor do catecholamines increase contractility?', 'β1', ['α1', 'Muscarinic M2', 'H2'], { explanation: 'Slides 50–51.' }),
  order('q3-11', 'contractility', 'Order the steps by which a catecholamine increases contractility.', ['Catecholamine binds β1 receptor', 'Adenylyl cyclase is activated', 'cAMP accumulates as second messenger', 'Positive inotropic effect'], { explanation: 'Slides 50–52.' }),
  mcq('q3-12', 'contractility', 'Vagal stimulation of the heart is…', 'Negatively chronotropic and inotropic', ['Positively chronotropic', 'Positively inotropic', 'Without effect'], { explanation: 'Slide 51.' }),
  multi('q3-13', 'contractility', 'Which depress inotropy (slide 53)? Select all that apply.', ['Hypoxia', 'Hypercapnia', 'Acidosis', 'Quinidine'], ['Adrenaline', 'Caffeine'], { explanation: 'Slide 53.' }),
  multi('q3-14', 'output-changes', 'In exercise, cardiac output rises because… Select all that apply.', ['Catecholamines and sympathetic discharge rise', 'Muscle pumping increases venous return', 'Vasodilatation lowers afterload'], ['Vagal tone increases', 'Blood viscosity falls'], { explanation: 'Slide 54.' }),
  multi('q3-15', 'output-changes', 'Which raise cardiac output (slide 54)? Select all that apply.', ['Eating', 'Pregnancy', 'Thyrotoxicosis', 'Anxiety'], ['Sleep', 'Hypothermia'], { explanation: 'Slide 54.' }),
  mcq('q3-16', 'fick-principle', 'Fick’s principle: substance taken up by an organ = …', 'Arteriovenous concentration difference × blood flow', ['Arterial concentration × heart rate', 'Venous concentration ÷ blood flow', 'Blood flow ÷ arteriovenous difference'], { explanation: 'Slide 57.' }),
  mcq('q3-17', 'fick-principle', 'O₂ consumption 250 mL/min; arterial O₂ 200 mL/L; mixed venous O₂ 150 mL/L. Cardiac output?', '5 L/min', ['1.25 L/min', '50 L/min', '0.2 L/min'], { explanation: 'CO = 250 ÷ (200 − 150) = 5 L/min (slide 57).', skill: 'application' }),
  mcq('q3-18', 'fick-principle', 'Why can the arterial sample for Fick’s method be taken from any artery?', 'Arterial blood is the same everywhere', ['All arteries carry mixed venous blood', 'Only the aorta is accurate', 'Arteries have no O₂ extraction'], { explanation: 'Slide 57.' }),
  mcq('q3-19', 'cardiac-work', 'How does the heart mainly increase its O₂ supply?', 'By increasing coronary blood flow, since extraction is already high', ['By extracting more O₂ from each litre', 'By anaerobic metabolism', 'By slowing down'], { explanation: 'Slide 58.', skill: 'cause-effect' }),
  mcq('q3-20', 'cardiac-work', 'Work done by the heart per beat = stroke volume × …', 'Mean arterial pressure (aorta or pulmonary artery)', ['Heart rate', 'Ejection fraction', 'Venous pressure'], { explanation: 'Slide 58.' }),
  tf({ id: 'q3-21', conceptId: 'cardiac-work', statement: 'Pressure work increases myocardial O₂ demand more than volume work.', answer: true, explanation: 'Slide 58.' }),
];

// ─── Lesson 4 — Vessels, flow and blood pressure ───────────────────
const lesson4: Q[] = [
  multi('q4-01', 'blood-propulsion', 'Which move blood forward (slide 60)? Select all that apply.', ['The heart pump', 'Elastic recoil of arteries in diastole', 'Skeletal muscle compressing veins', 'Negative pressure in inspiration'], ['High blood viscosity'], { explanation: 'Slide 60.' }),
  mcq('q4-02', 'vessel-structure', 'Which vessels provide the main resistance to flow?', 'Arterioles', ['Large arteries', 'Capillaries', 'Veins'], { explanation: 'Slide 61.' }),
  mcq('q4-03', 'vessel-structure', 'Precapillary sphincters are controlled by…', 'Local vasodilator and vasoconstrictor substances — they have no innervation', ['Sympathetic nerves only', 'The vagus', 'Somatic motor nerves'], { explanation: 'Slide 62.' }),
  multi('q4-04', 'vessel-structure', 'Where are fenestrated capillaries found (slide 62)? Select all that apply.', ['Kidney', 'Intestinal villus', 'Endocrine glands'], ['Brain'], { explanation: 'Slide 62.' }),
  tf({ id: 'q4-05', conceptId: 'vessel-structure', statement: 'Venous smooth muscle, though scanty, is very sensitive to noradrenergic nerves.', answer: true, explanation: 'Slide 63.' }),
  multi('q4-06', 'vessel-structure', 'Which veins have no valves (slide 63)? Select all that apply.', ['Very small veins', 'The great veins such as the IVC', 'Veins from the brain and viscera'], ['Leg veins'], { explanation: 'Slide 63.' }),
  mcq('q4-07', 'flow-pressure-resistance', 'Effective perfusion pressure is…', 'Mean arterial-end pressure minus mean venous-end pressure', ['Systolic minus diastolic pressure', 'Capillary minus tissue pressure', 'Aortic pressure alone'], { explanation: 'Slide 66.', skill: 'terminology' }),
  mcq('q4-08', 'flow-pressure-resistance', 'In Poiseuille’s law, resistance is proportional to…', '1/r⁴', ['r⁴', '1/r', 'r²'], { explanation: 'Slides 74–76: R = 8ηL/πr⁴.' }),
  multi('q4-09', 'flow-pressure-resistance', 'Resistance to flow increases with… Select all that apply.', ['Greater viscosity', 'Greater tube length', 'Smaller radius'], ['Greater pressure difference'], { explanation: 'R = 8ηL/πr⁴ (slide 75).' }),
  mcq('q4-10', 'flow-pressure-resistance', 'How can an organ regulate its blood flow most effectively?', 'By changing the diameter of its vessels', ['By changing blood viscosity', 'By changing vessel length', 'By changing heart rate'], { explanation: 'Slide 75.' }),
  mcq('q4-11', 'laminar-turbulent', 'In laminar flow, where is velocity greatest?', 'In the centre of the vessel', ['At the wall', 'Equal everywhere', 'At branch points only'], { explanation: 'Slide 70.' }),
  mcq('q4-12', 'laminar-turbulent', 'Korotkov sounds are caused by…', 'Turbulent flow through the compressed artery', ['Valve closure', 'Laminar flow', 'Arterial wall vibration at rest'], { explanation: 'Slides 72, 86.' }),
  mcq('q4-13', 'velocity-area', 'Where is blood velocity greatest?', 'Aorta', ['Capillaries', 'Venules', 'Arterioles'], { explanation: 'Slide 73.' }),
  mcq('q4-14', 'velocity-area', 'Normal arm-to-tongue circulation time is about…', '15 s', ['1 s', '60 s', '5 min'], { explanation: 'Slide 73.' }),
  mcq('q4-15', 'viscosity', 'Blood viscosity depends mainly on…', 'The haematocrit', ['The heart rate', 'The vessel length', 'Blood pressure'], { explanation: 'Slide 77.' }),
  mcq('q4-16', 'viscosity', 'Polycythaemia affects the heart by…', 'Raising viscosity, resistance and afterload', ['Lowering afterload', 'Reducing work', 'Causing turbulence from low viscosity'], { explanation: 'Slide 78.', skill: 'cause-effect' }),
  multi('q4-17', 'viscosity', 'Which raise blood viscosity (slide 78)? Select all that apply.', ['Increased plasma protein', 'Hereditary spherocytosis', 'Sickle cell disease'], ['Anaemia'], { explanation: 'Slide 78.' }),
  mcq('q4-18', 'blood-distribution', 'At rest, roughly what share of blood is in the veins?', '50%', ['5%', '18%', '80%'], { explanation: 'Slide 81.' }),
  mcq('q4-19', 'blood-distribution', 'Why are veins called capacitance vessels?', 'They take a lot of blood before their pressure rises', ['Their pressure rises linearly with volume', 'They generate peripheral resistance', 'They store electrical charge'], { explanation: 'Slide 79.' }),
  mcq('q4-20', 'arterial-pressure', 'What maintains arterial flow during diastole?', 'Elastic recoil of the arterial walls (Windkessel effect)', ['Atrial contraction', 'The skeletal muscle pump', 'Venous valves'], { explanation: 'Slide 82.' }),
  mcq('q4-21', 'arterial-pressure', 'Mean arterial pressure is approximately…', 'Diastolic + ⅓ pulse pressure', ['(Systolic + diastolic) ÷ 2 exactly', 'Systolic − diastolic', 'Systolic + ⅓ pulse pressure'], { explanation: 'Slide 91.' }),
  mcq('q4-22', 'arterial-pressure', 'Why does an obese arm give a falsely high BP reading?', 'Fat absorbs some cuff pressure, so a higher pressure is needed to occlude the artery', ['Fat increases arterial stiffness', 'The artery is larger', 'The heart works harder'], { explanation: 'Slide 87.', skill: 'cause-effect' }),
  tf({ id: 'q4-23', conceptId: 'arterial-pressure', statement: 'BP should be measured with the cuff at heart level.', answer: true, explanation: 'Slide 87.' }),
  match('q4-24', 'flow-measurement', 'Match each flow-measuring method to its principle.', [
    ['Electromagnetic flow meter', 'Voltage from blood moving in a magnetic field'],
    ['Doppler flow meter', 'Doppler effect for velocity and direction'],
    ['Plethysmography', 'Changes in volume of a body part'],
  ], { explanation: 'Slide 67.' }),
];

// ─── Lesson 5 — Capillaries, oedema, lymph, veins ──────────────────
const lesson5: Q[] = [
  mcq('q5-01', 'capillary-exchange', 'About what share of total blood volume is in capillaries?', '5%', ['50%', '18%', '12%'], { explanation: 'Slide 93.' }),
  multi('q5-02', 'capillary-exchange', 'By which methods do substances cross the capillary wall (slide 93)? Select all that apply.', ['Fenestrations', 'Diffusion', 'Filtration', 'Vesicular transport'], ['Active contraction of capillaries'], { explanation: 'Slide 93.' }),
  mcq('q5-03', 'capillary-exchange', 'How is capillary pressure estimated?', 'From the external pressure that occludes the capillary', ['From the brachial cuff pressure', 'From the JVP', 'From the ECG'], { explanation: 'Slide 93: it is only an estimate.' }),
  mcq('q5-04', 'starling-forces', 'Which force pushes fluid OUT of the capillary?', 'Capillary hydrostatic pressure', ['Plasma oncotic pressure', 'Tissue hydrostatic pressure', 'Lymph flow'], { explanation: 'Slide 95.' }),
  mcq('q5-05', 'starling-forces', 'How much fluid is filtered from capillaries daily?', 'About 24 L', ['About 2.4 L', 'About 240 L', 'About 180 L'], { explanation: 'Slide 97.' }),
  mcq('q5-06', 'starling-forces', 'What proportion of filtered fluid returns via lymph?', '15%', ['85%', '50%', '1%'], { explanation: 'Slide 97: 85% is reabsorbed into capillaries.' }),
  tf({ id: 'q5-07', conceptId: 'starling-forces', statement: 'In inactive tissue, capillaries are usually collapsed.', answer: true, explanation: 'Slide 97.' }),
  mcq('q5-08', 'oedema', 'Oedema is…', 'Abnormal excess fluid in the interstitial space', ['Excess fluid in the blood', 'Fluid in the alveoli only', 'Loss of interstitial fluid'], { explanation: 'Slide 99.', skill: 'terminology' }),
  multi('q5-09', 'oedema', 'Which raise capillary hydrostatic pressure (slide 100)? Select all that apply.', ['Arteriolar dilatation', 'Venular constriction', 'Heart failure', 'Venous obstruction'], ['Malnutrition', 'Arteriolar constriction'], { explanation: 'Slide 100.' }),
  multi('q5-10', 'oedema', 'Which cause oedema by lowering plasma proteins (slide 102)? Select all that apply.', ['Liver disease', 'Kidney disease', 'Malnutrition'], ['Heart failure', 'Histamine release'], { explanation: 'Slide 102.' }),
  mcq('q5-11', 'oedema', 'Why can prolonged standing cause ankle oedema?', 'Gravity raises venous and capillary pressure without the muscle pump', ['Plasma proteins fall', 'Capillary permeability falls', 'Lymph flow increases'], { explanation: 'Slide 100.', skill: 'cause-effect' }),
  multi('q5-12', 'lymphatics', 'What aids lymph flow (slide 106)? Select all that apply.', ['Skeletal muscle pump', 'Negative intrathoracic pressure', 'Contractions of the lymphatic walls', 'Valves'], ['High arterial pressure'], { explanation: 'Slide 106.' }),
  multi('q5-13', 'lymphatics', 'What does the lymph system do (slide 106)? Select all that apply.', ['Returns protein to the circulation', 'Absorbs fatty acids and cholesterol', 'Takes up protein in the intestine'], ['Makes red cells'], { explanation: 'Slide 106.' }),
  mcq('q5-14', 'lymphatics', 'Lymphoedema is characteristically…', 'Non-pitting', ['Pitting', 'Painful and red', 'Only in the lungs'], { explanation: 'Slide 107.' }),
  multi('q5-15', 'lymphatics', 'Which cause lymphoedema (slide 107)? Select all that apply.', ['Filarial worms (elephantiasis)', 'Radical mastectomy'], ['Heart failure', 'Liver disease'], { explanation: 'Slide 107.' }),
  mcq('q5-16', 'venous-circulation', 'Normal central venous pressure at the right atrium is about…', '4–6 mmHg', ['12–18 mmHg', '25 mmHg', '0 mmHg always'], { explanation: 'Slide 109.' }),
  multi('q5-17', 'venous-circulation', 'What drives venous return (slides 109–110)? Select all that apply.', ['Negative intrathoracic pressure in inspiration', 'Skeletal muscle pump', 'The heartbeat', 'Arterial pulsation compressing veins'], ['Gravity in the standing position'], { explanation: 'Slides 109–110.' }),
  mcq('q5-18', 'venous-circulation', 'How does venous velocity change nearer the heart?', 'It increases, as total cross-section decreases', ['It decreases', 'It stays the same', 'It reverses'], { explanation: 'Slide 109.' }),
  tf({ id: 'q5-19', conceptId: 'venous-circulation', statement: 'Dural venous sinuses collapse when their pressure falls, which protects against air embolism.', answer: false, explanation: 'Slide 110: rigid walls keep them open at subatmospheric pressure — opening them risks air embolism.', skill: 'misconception' }),
];

// ─── Lesson 6 — Regulation ─────────────────────────────────────────
const lesson6: Q[] = [
  mcq('q6-01', 'regulation-overview', 'Blood pressure = …', 'Cardiac output × total peripheral resistance', ['Heart rate × stroke volume', 'Cardiac output ÷ resistance', 'Stroke volume × viscosity'], { explanation: 'Slide 4.' }),
  multi('q6-02', 'regulation-overview', 'At which levels is the CVS regulated (slide 2)? Select all that apply.', ['Local', 'Systemic', 'Central'], ['Cellular only'], { explanation: 'Slide 2.' }),
  mcq('q6-03', 'autoregulation-metabolic', 'Autoregulation is…', 'A tissue’s ability to keep its blood flow constant despite small changes in perfusion pressure', ['Nervous control of heart rate', 'Hormonal control of blood volume', 'The baroreceptor reflex'], { explanation: 'Slide 5.', skill: 'terminology' }),
  multi('q6-04', 'autoregulation-metabolic', 'Which metabolic changes cause local vasodilatation (slide 7)? Select all that apply.', ['Decreased O₂ tension', 'Decreased pH', 'Increased CO₂ tension', 'Accumulation of K⁺'], ['Cold', 'Serotonin'], { explanation: 'Slide 7.' }),
  mcq('q6-05', 'autoregulation-metabolic', 'Bradykinin and substance P dilate vessels by acting through…', 'Nitric oxide (endothelium-derived relaxing factor)', ['Serotonin', 'Angiotensin', 'β1 receptors'], { explanation: 'Slide 8.' }),
  mcq('q6-06', 'autoregulation-myogenic', 'The myogenic theory says vascular smooth muscle contracts in response to…', 'Increased transmural pressure (stretch)', ['Accumulating metabolites', 'Vagal stimulation', 'Low CO₂'], { explanation: 'Slide 10.' }),
  mcq('q6-07', 'autoregulation-myogenic', 'For a cylinder, the law of Laplace is…', 'P = T/R', ['P = T × R', 'P = R/T', 'P = T × R²'], { explanation: 'Slide 12.' }),
  mcq('q6-08', 'autoregulation-myogenic', 'Why don’t small vessels rupture under arterial pressure?', 'Their small radius means less wall tension is needed (Laplace)', ['They have thick elastic walls', 'Their pressure is zero', 'They are protected by veins'], { explanation: 'Slide 11.', skill: 'cause-effect' }),
  multi('q6-09', 'systemic-control', 'Which are circulating vasodilators (slide 15)? Select all that apply.', ['Kinins (bradykinin)', 'VIP', 'ANP'], ['Angiotensin', 'Serotonin'], { explanation: 'Slide 15.' }),
  mcq('q6-10', 'systemic-control', 'Sympathetic constrictor fibres supply all vessels except…', 'Capillaries and venules', ['Arterioles', 'Veins', 'Large arteries'], { explanation: 'Slide 16.' }),
  mcq('q6-11', 'systemic-control', 'How do sympathetic nerves cause vasodilatation in most vessels?', 'By reducing their tonic constrictor discharge', ['By releasing acetylcholine everywhere', 'By stimulating the vagus', 'By releasing histamine'], { explanation: 'Slide 17.' }),
  mcq('q6-12', 'systemic-control', 'Sympathetic vasodilator fibres to muscle are…', 'Cholinergic', ['Noradrenergic', 'Dopaminergic', 'Purinergic'], { explanation: 'Slide 18.' }),
  mcq('q6-13', 'vasomotor-centre', 'Where is the vasomotor centre?', 'Medulla oblongata', ['Hypothalamus', 'Cerebral cortex', 'Spinal cord'], { explanation: 'Slide 20.' }),
  mcq('q6-14', 'vasomotor-centre', 'What does the depressor area of the VMC do?', 'Inhibits the pressor area', ['Stimulates the sympathetic', 'Releases adrenaline', 'Raises heart rate'], { explanation: 'Slide 19.' }),
  multi('q6-15', 'vasomotor-centre', 'Pressor-area discharge leads to… Select all that apply.', ['Arteriolar constriction', 'Venoconstriction', 'More venous return', 'Increased cardiac output'], ['Bradycardia'], { explanation: 'Slide 22.' }),
  mcq('q6-16', 'baroreceptor-reflex', 'What stimulates baroreceptors?', 'Stretch (distension)', ['Low O₂', 'High CO₂', 'Pain'], { explanation: 'Slides 23–24.' }),
  match('q6-17', 'baroreceptor-reflex', 'Match each baroreceptor to its afferent nerve.', [
    ['Carotid sinus', 'Glossopharyngeal (IX)'],
    ['Aortic arch', 'Vagus (X)'],
  ], { explanation: 'Slide 24.' }),
  mcq('q6-18', 'baroreceptor-reflex', 'Baroreceptor afferents end in which nucleus?', 'Nucleus of the tractus solitarius', ['Nucleus ambiguus', 'Red nucleus', 'Supraoptic nucleus'], { explanation: 'Slide 24.' }),
  multi('q6-19', 'baroreceptor-reflex', 'A fall in BP leads reflexly to… Select all that apply.', ['Tachycardia', 'Positive inotropy', 'Vasoconstriction'], ['Vagal stimulation', 'Inhibition of the pressor area'], { explanation: 'Slide 28.' }),
  mcq('q6-20', 'atrial-receptors', 'Type B atrial receptor stimulation causes…', 'Vasodilatation, a fall in BP and an increased heart rate', ['Vasoconstriction and bradycardia', 'A rise in BP and bradycardia', 'No change'], { explanation: 'Slide 31.' }),
  mcq('q6-21', 'atrial-receptors', 'When atrial stretch receptors signal volume overload, the hypothalamus reduces…', 'ADH and ACTH', ['ANP', 'Renin only', 'Insulin'], { explanation: 'Slide 32.' }),
  multi('q6-22', 'vmc-influences', 'Which inhibit the vasomotor centre (slide 34)? Select all that apply.', ['Fear (via the cortex)', 'Lung inflation', 'Baroreceptor discharge'], ['Hypoxia', 'Sharp short pain'], { explanation: 'Slide 34.' }),
  mcq('q6-23', 'vmc-influences', 'Prolonged pain tends to cause…', 'Vasodilatation and fainting', ['A sustained rise in BP', 'Tachycardia and hypertension', 'No change'], { explanation: 'Slide 33: sharp, short pain raises BP.' }),
  mcq('q6-24', 'cushing-reflex', 'Cushing’s reflex produces…', 'Hypertension with bradycardia', ['Hypotension with tachycardia', 'Hypotension with bradycardia', 'Hypertension with tachycardia'], { explanation: 'Slides 36, 40.' }),
  multi('q6-25', 'cushing-reflex', 'Which can trigger Cushing’s reflex (slide 40)? Select all that apply.', ['Hydrocephalus', 'Brain tumour', 'Intracranial blood clot'], ['Haemorrhagic shock', 'Fainting'], { explanation: 'Slide 40.' }),
];

// ─── Lesson 7 — Gravity, shock, heart failure ──────────────────────
const lesson7: Q[] = [
  multi('q7-01', 'gravity-effects', 'What happens on standing, before compensation (slide 3)? Select all that apply.', ['Blood pools in capacitance vessels', 'Venous return falls', 'Cerebral blood flow falls'], ['Venous return rises'], { explanation: 'Slide 3.' }),
  multi('q7-02', 'gravity-effects', 'Which compensations follow standing (slide 4)? Select all that apply.', ['Peripheral vasoconstriction', 'Renin–aldosterone release', 'Positive inotropic and chronotropic effects'], ['Vagal slowing of the heart'], { explanation: 'Slide 4.' }),
  multi('q7-03', 'gravity-effects', 'Why does cerebral blood flow fall only a little on standing (slide 5)? Select all that apply.', ['Venous pressure falls too, preserving perfusion pressure', 'Intracranial pressure falls', 'Rising PCO₂ dilates cerebral vessels'], ['Brain vessels have valves'], { explanation: 'Slide 5.', skill: 'cause-effect' }),
  mcq('q7-04', 'gravity-effects', 'Why is fainting after prolonged standing protective?', 'It brings the head to the level of the heart', ['It raises BP', 'It increases heart rate', 'It closes the venous valves'], { explanation: 'Slide 6.' }),
  multi('q7-05', 'orthostatic-hypotension', 'Which cause orthostatic hypotension (slide 8)? Select all that apply.', ['Sympatholytic drugs', 'Diabetic nerve damage', 'Autonomic insufficiency'], ['Exercise training', 'Hypertension'], { explanation: 'Slide 8.' }),
  mcq('q7-06', 'acceleration', 'At about what positive g do vision failure and blackout occur?', 'Above about 5 g', ['1 g', '2 g', '20 g'], { explanation: 'Slide 9.' }),
  mcq('q7-07', 'acceleration', 'Why don’t brain vessels rupture in negative g?', 'Intracranial pressure rises too and supports them', ['Cerebral arterial pressure falls', 'Blood moves to the legs', 'The heart slows'], { explanation: 'Slide 10.', skill: 'cause-effect' }),
  mcq('q7-08', 'shock-types', 'Shock is best defined as…', 'Tissue perfusion inadequate to maintain normal metabolic activity', ['Any fall in blood pressure', 'Loss of blood', 'A fast heart rate'], { explanation: 'Slide 12.', skill: 'terminology' }),
  multi('q7-09', 'shock-types', 'Which are causes of obstructive shock? Select all that apply.', ['Cardiac tamponade', 'Pulmonary embolism', 'Tension pneumothorax'], ['Sepsis', 'Burns'], { explanation: 'Slide 17.' }),
  multi('q7-10', 'shock-types', 'Which are causes of hypovolaemic shock? Select all that apply.', ['Burns', 'Diarrhoea and vomiting', 'Haemorrhage'], ['Anaphylaxis', 'Arrhythmia'], { explanation: 'Slide 14.' }),
  order('q7-11', 'shock-features', 'Order the events in haemorrhagic shock.', ['Loss of blood', 'Reduced blood volume', 'Reduced venous return', 'Reduced cardiac output', 'Reduced tissue perfusion'], { explanation: 'Slide 18.' }),
  multi('q7-12', 'shock-features', 'Which are signs of hypovolaemic shock (slide 19)? Select all that apply.', ['Low BP', 'Tachycardia', 'Pale cool skin', 'Intense thirst'], ['Warm flushed skin', 'Bradycardia'], { explanation: 'Slide 19.' }),
  mcq('q7-13', 'shock-features', 'Why is urine output low in shock?', 'Renal vasoconstriction lowers the GFR', ['ADH falls', 'The bladder is paralysed', 'Plasma proteins rise'], { explanation: 'Slide 20.', skill: 'cause-effect' }),
  mcq('q7-14', 'shock-features', 'Why does lactic acidosis develop in shock?', 'Poor perfusion causes anaerobic glycolysis', ['The kidneys excrete too much bicarbonate', 'Respiration is depressed', 'The liver makes lactate from protein'], { explanation: 'Slide 21.' }),
  mcq('q7-15', 'shock-features', 'After bleeding stops, blood volume is restored within about…', '12–72 hours', ['5 minutes', '4–5 weeks', '6 months'], { explanation: 'Slide 24. Erythropoietin restores Hb in 4–5 weeks.' }),
  mcq('q7-16', 'shock-features', 'In haemorrhage, how does the fall in capillary hydrostatic pressure help?', 'Fluid moves from the interstitial space into the vessels', ['Fluid leaves the vessels', 'Lymph flow stops', 'Protein enters the tissues'], { explanation: 'Slide 23.', skill: 'cause-effect' }),
  multi('q7-17', 'irreversible-shock', 'What drives irreversible shock (slide 26)? Select all that apply.', ['Depression of the VMC by cerebral ischaemia', 'Myocardial ischaemia', 'Capillary stasis as sphincters relax but venules do not'], ['Excess sympathetic discharge'], { explanation: 'Slide 26.' }),
  mcq('q7-18', 'other-shock-syncope', 'In burns shock, what happens to the blood?', 'Haemoconcentration, as plasma exudes from the skin', ['Haemodilution', 'Haemolysis only', 'No change'], { explanation: 'Slide 28.' }),
  mcq('q7-19', 'other-shock-syncope', 'How does anaphylactic shock lower BP?', 'Antigen–antibody complexes release histamine → widespread vasodilatation and permeability', ['Blood loss', 'Cardiac tamponade', 'Heart block'], { explanation: 'Slide 29.' }),
  mcq('q7-20', 'other-shock-syncope', 'Vasovagal syncope involves…', 'Abrupt vasodilatation with hypotension and bradycardia after strong emotion', ['Hypertension and tachycardia', 'Blood loss', 'Raised intracranial pressure'], { explanation: 'Slide 30.' }),
  mcq('q7-21', 'other-shock-syncope', 'A tight collar pressing on the neck can cause…', 'Carotid sinus syncope', ['Micturition syncope', 'Cushing’s reflex', 'Orthostatic hypotension'], { explanation: 'Slide 30.' }),
  mcq('q7-22', 'heart-failure', 'Heart failure is defined as the heart being unable to meet tissue needs…', 'Despite normal or increased venous return', ['Because of low venous return', 'Only during exercise', 'Because of low blood volume'], { explanation: 'Slide 31.' }),
  multi('q7-23', 'heart-failure', 'Which are features of backward failure of the LEFT heart? Select all that apply.', ['Dyspnoea', 'Paroxysmal nocturnal dyspnoea', 'Pulmonary oedema'], ['Hepatomegaly', 'Ascites'], { explanation: 'Slide 33.', skill: 'comparison' }),
  multi('q7-24', 'heart-failure', 'Which are features of forward failure of the left heart (slide 32)? Select all that apply.', ['Muscle weakness', 'Fatigue', 'Oliguria'], ['Raised JVP'], { explanation: 'Slide 32: tissue hypoperfusion.' }),
];

// ─── Lesson 8 — Regional circulations ──────────────────────────────
const lesson8: Q[] = [
  multi('q8-01', 'cerebral-supply', 'Which arteries form the circle of Willis supply (slide 2)? Select all that apply.', ['Internal carotids', 'Basilar (from the vertebrals)'], ['External carotids', 'Subclavian directly'], { explanation: 'Slide 2.' }),
  tf({ id: 'q8-02', conceptId: 'cerebral-supply', statement: 'Each cerebral artery is almost the exclusive supply to its region, with little anastomosis.', answer: true, explanation: 'Slide 2.' }),
  order('q8-03', 'cerebral-supply', 'Order the meninges from outside in.', ['Dura mater', 'Arachnoid', 'Pia mater'], { explanation: 'Slide 5.' }),
  mcq('q8-04', 'cerebral-supply', 'Which space contains CSF?', 'Subarachnoid space', ['Subdural space', 'Epidural space', 'Inside the pia mater'], { explanation: 'Slide 5.' }),
  mcq('q8-05', 'csf', 'CSF is produced mainly by…', 'The choroid plexus', ['The arachnoid villi', 'The pia mater', 'The dural sinuses'], { explanation: 'Slide 7.' }),
  mcq('q8-06', 'csf', 'Through what is CSF absorbed into the blood?', 'Arachnoid villi', ['Choroid plexus', 'Foramen of Monro', 'Aqueduct of Sylvius'], { explanation: 'Slide 7.' }),
  mcq('q8-07', 'csf', 'Daily production of CSF is about…', '550 mL', ['150 mL', '50 mL', '2 L'], { explanation: 'Slide 14.' }),
  mcq('q8-08', 'csf', 'Because of buoyancy, the brain’s effective weight in CSF is about…', '50 g', ['500 g', '1,000 g', '5 g'], { explanation: 'Slides 13, 15.' }),
  multi('q8-09', 'csf', 'Which are functions of CSF (slide 13)? Select all that apply.', ['Protection', 'Buoyancy', 'Excretion of waste', 'Transport of hormones'], ['Oxygen transport to neurons'], { explanation: 'Slide 13.' }),
  mcq('q8-10', 'csf', 'Hydrocephalus from obstruction of the ventricular drainage system is…', 'Internal (non-communicating)', ['External (communicating)', 'Normal-pressure', 'Compensatory'], { explanation: 'Slide 16.' }),
  multi('q8-11', 'blood-brain-barrier', 'Which cross the blood–brain barrier easily (slide 19)? Select all that apply.', ['Water', 'O₂ and CO₂', 'Lipid-soluble steroid hormones'], ['Proteins', 'Protein-bound substances'], { explanation: 'Slide 19.' }),
  mcq('q8-12', 'blood-brain-barrier', 'Where does the anatomical blood–brain barrier lie?', 'In the intracranial endothelium', ['In the pia mater', 'In the choroid plexus only', 'In the skull'], { explanation: 'Slide 18.' }),
  mcq('q8-13', 'blood-brain-barrier', 'How does glucose cross the blood–brain barrier quickly?', 'By a specific transporter', ['By free diffusion', 'By pinocytosis of plasma', 'It does not cross'], { explanation: 'Slide 19.' }),
  mcq('q8-14', 'cerebral-flow', 'The Monro–Kellie doctrine states that…', 'The volumes of blood, CSF and brain in the skull stay relatively constant', ['Cerebral blood flow is proportional to BP', 'CSF is made at a constant rate', 'The brain uses only glucose'], { explanation: 'Slide 22.' }),
  mcq('q8-15', 'cerebral-flow', 'How long an occlusion of brain blood supply causes unconsciousness?', 'About 10 s', ['About 1 min', 'About 5 min', 'About 1 s'], { explanation: 'Slide 23.' }),
  tf({ id: 'q8-16', conceptId: 'cerebral-flow', statement: 'Brainstem vegetative centres are more resistant to hypoxia than cerebral structures.', answer: true, explanation: 'Slide 23.' }),
  mcq('q8-17', 'cerebral-flow', 'Stroke from a ruptured aneurysm is…', 'Haemorrhagic', ['Ischaemic', 'Embolic', 'Thrombotic'], { explanation: 'Slide 25.' }),
  mcq('q8-18', 'coronary-circulation', 'In what proportion of people is the right coronary artery larger?', 'About 50%', ['About 20%', 'About 30%', 'About 90%'], { explanation: 'Slide 27: left larger in 20%, equal in 30%.' }),
  multi('q8-19', 'coronary-circulation', 'Which cause coronary vasodilatation (slide 28)? Select all that apply.', ['Adenosine', 'Low O₂', 'K⁺ and H⁺', 'CO₂'], ['α-receptor stimulation'], { explanation: 'Slide 28.' }),
  mcq('q8-20', 'coronary-circulation', 'In angina pectoris, coronary flow is typically…', 'Normal at rest but inadequate during exercise', ['Absent at rest', 'Excessive', 'Unaffected by exercise'], { explanation: 'Slide 29.' }),
  mcq('q8-21', 'pulmonary-circulation', 'Why does fluid not easily accumulate in the alveoli?', 'Pulmonary capillary hydrostatic pressure (10 mmHg) is below oncotic pressure (25 mmHg)', ['Alveoli have no capillaries', 'Pulmonary capillaries are impermeable', 'Lymph flow is absent'], { explanation: 'Slide 31.' }),
  mcq('q8-22', 'pulmonary-circulation', 'How do pulmonary vessels respond to regional hypoxia?', 'They constrict, shunting blood to better-ventilated areas', ['They dilate', 'No response', 'They rupture'], { explanation: 'Slide 32.' }),
  mcq('q8-23', 'pulmonary-circulation', 'About how much blood moves into the lungs on lying down?', '400 mL', ['40 mL', '4 L', '1.5 L'], { explanation: 'Slide 32.' }),
  mcq('q8-24', 'splanchnic-circulation', 'Which part of the liver acinus is most prone to anoxic damage?', 'The area near the central vein', ['The portal triad', 'The capsule', 'The bile canaliculi'], { explanation: 'Slide 35.' }),
  mcq('q8-25', 'splanchnic-circulation', 'Normal portal vein pressure is about…', '10 mmHg', ['90 mmHg', '5 mmHg', '25 mmHg'], { explanation: 'Slide 35: hepatic vein 5, hepatic artery 90.' }),
  mcq('q8-26', 'splanchnic-circulation', 'Why is ascitic fluid from raised hepatic venous pressure rich in protein?', 'Liver sinusoids have pores that let protein through', ['The gut secretes protein', 'Albumin is made in the peritoneum', 'Lymph removes water only'], { explanation: 'Slide 37.' }),
  mcq('q8-27', 'skin-circulation', 'The white reaction after stroking the skin is due to…', 'Contraction of precapillary sphincters', ['Arteriolar dilatation', 'Histamine release', 'Venous obstruction'], { explanation: 'Slide 39.' }),
  mcq('q8-28', 'skin-circulation', 'The flare of the triple response is mediated by…', 'An axon reflex causing arteriolar dilatation', ['Capillary dilatation alone', 'Precapillary sphincter contraction', 'Local oedema'], { explanation: 'Slide 40.' }),
  mcq('q8-29', 'fetal-circulation', 'Why does fetal haemoglobin have a higher O₂ affinity?', 'It binds 2,3-DPG less', ['It binds 2,3-DPG more', 'It has no haem', 'It binds CO₂ instead'], { explanation: 'Slide 45.' }),
];

// ─── Lesson 9 — ECG and rhythms ───────────────────────────────────
const lesson9: Q[] = [
  mcq('q9-01', 'ecg-basics', 'Standard ECG paper speed is…', '25 mm/s', ['50 mm/s', '10 mm/s', '100 mm/s'], { explanation: 'Slide 2.' }),
  mcq('q9-02', 'ecg-basics', 'ECG voltage calibration: 1 mV = …', '10 mm', ['1 mm', '5 mm', '25 mm'], { explanation: 'Slide 2.' }),
  match('q9-03', 'ecg-basics', 'Match each lead group to its type.', [
    ['Standard limb leads', 'Bipolar'],
    ['Augmented limb leads', 'Unipolar'],
    ['Chest leads', 'Unipolar'],
  ], { explanation: 'Slides 3–5.' }),
  mcq('q9-04', 'ecg-basics', 'Where is V1 placed?', '4th intercostal space, just right of the sternum', ['4th intercostal space, just left of the sternum', '5th intercostal space, mid-clavicular line', 'Mid-axillary line'], { explanation: 'Slide 6.' }),
  mcq('q9-05', 'ecg-basics', 'Where is V4 placed?', '5th intercostal space, mid-clavicular line', ['4th intercostal space, left sternal edge', 'Anterior axillary line', 'Between V1 and V2'], { explanation: 'Slide 6.' }),
  mcq('q9-06', 'ecg-waves', 'Normal PR interval is…', '0.12–0.20 s', ['0.06–0.1 s', '0.2–0.4 s', '0.5–1.0 s'], { explanation: 'Slide 9.' }),
  mcq('q9-07', 'ecg-waves', 'Normal QRS duration is…', '0.06–0.1 s', ['0.12–0.20 s', '0.2–0.4 s', '0.3–0.5 s'], { explanation: 'Slide 10.' }),
  mcq('q9-08', 'ecg-waves', 'The PR interval represents…', 'Time from onset of atrial to onset of ventricular depolarisation', ['Ventricular repolarisation', 'Atrial repolarisation', 'The whole ventricular action potential'], { explanation: 'Slide 9.' }),
  mcq('q9-09', 'ecg-waves', 'Why is the ST segment important clinically?', 'It becomes depressed or elevated in ventricular ischaemia or hypoxia', ['It shows atrial enlargement', 'It measures heart rate', 'It shows the P wave'], { explanation: 'Slide 11.' }),
  mcq('q9-10', 'ecg-waves', 'The QT interval roughly estimates…', 'The duration of an average ventricular action potential', ['Atrial conduction time', 'AV nodal delay', 'The cardiac cycle length'], { explanation: 'Slide 13.' }),
  mcq('q9-11', 'ecg-waves', 'The U wave represents…', 'The last remnants of ventricular repolarisation', ['Atrial depolarisation', 'Ventricular depolarisation', 'SA node firing'], { explanation: 'Slide 12.' }),
  order('q9-12', 'ecg-waves', 'Order the ECG features in one beat.', ['P wave', 'QRS complex', 'ST segment', 'T wave', 'U wave'], { explanation: 'Slides 9–12.' }),
  mcq('q9-13', 'ecg-rate', 'One small square on ECG paper represents…', '0.04 s', ['0.2 s', '0.4 s', '1 s'], { explanation: 'Slide 15.' }),
  mcq('q9-14', 'ecg-rate', 'One large square represents…', '0.2 s', ['0.04 s', '1 s', '0.5 s'], { explanation: 'Slide 15.' }),
  fill('q9-15', 'ecg-rate', 'There are 5 large squares between R waves. Heart rate = ____ beats/min.', ['60'], { explanation: 'Slide 16: 300 ÷ 5 = 60.', skill: 'application' }),
  multi('q9-16', 'ecg-rate', 'What can the ECG show (slide 17)? Select all that apply.', ['Rhythm disturbances', 'Ischaemic damage', 'Electrolyte imbalance', 'Relative chamber sizes'], ['Cardiac output'], { explanation: 'Slide 17.' }),
  mcq('q9-17', 'cardiac-rhythms', 'The normal resting rhythm controlled by the SA node is…', 'Sinus rhythm', ['Idioventricular rhythm', 'Atrial fibrillation', 'Heart block'], { explanation: 'Slide 18.', skill: 'terminology' }),
  mcq('q9-18', 'cardiac-rhythms', 'In sinus arrhythmia, heart rate…', 'Rises in inspiration and falls in expiration', ['Falls in inspiration', 'Is fixed', 'Is chaotic and irregular'], { explanation: 'Slide 19: due mainly to parasympathetic outflow.' }),
  mcq('q9-19', 'heart-block', 'First-degree heart block shows…', 'A prolonged PR interval with every P followed by QRS', ['Dropped QRS complexes', 'No relationship between P and QRS', 'Absent P waves'], { explanation: 'Slide 26.' }),
  mcq('q9-20', 'heart-block', 'In Mobitz type II block…', 'QRS complexes drop without progressive PR lengthening', ['PR lengthens progressively before a dropped beat', 'Every P is conducted', 'Atria and ventricles beat independently'], { explanation: 'Slide 24.' }),
  mcq('q9-21', 'heart-block', 'In complete (third-degree) heart block, the ventricles beat…', 'Slowly, in an idioventricular rhythm independent of the atria', ['Faster than the atria', 'In time with every P wave', 'Not at all'], { explanation: 'Slide 20.' }),
  mcq('q9-22', 'heart-block', 'Fainting from low cerebral flow in complete heart block is called…', 'Stokes–Adams syndrome', ['Cushing’s reflex', 'Vasovagal syncope', 'Wenckebach phenomenon'], { explanation: 'Slide 20.', skill: 'terminology' }),
];

export const questions: Q[] = [...lesson1, ...lesson2, ...lesson3, ...lesson4, ...lesson5, ...lesson6, ...lesson7, ...lesson8, ...lesson9];
