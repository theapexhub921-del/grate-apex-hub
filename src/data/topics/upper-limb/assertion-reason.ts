// Anatomy → Upper Limb: Assertion–Reason questions (5 per lesson).
// Authored factual medical claims with explanations.
import { assertionReason as ar, type QuestionDraft } from '@/data/topics/build';
import type { ConceptId } from '@/data/topics/upper-limb/sources';

type Q = QuestionDraft<ConceptId>;

export const assertionReasonQuestions: Q[] = [
  // ─── Lesson 1 — Osteology and Limb Development ────────────────────
  ar(
    'ar1-01',
    'bones-pectoral-arm',
    'The junction of the medial two-thirds and lateral third of the clavicle is the most common fracture site in the human body.',
    'This region represents the transition zone between the anterior convexity of the medial two-thirds and anterior concavity of the lateral third, making it mechanically the thinnest and weakest part of the bone.',
    'explains',
    'Both statements are true. The transition in curvature and structural thinness concentrates bending stresses, directly explaining why fractures cluster at this junction.'
  ),
  ar(
    'ar1-02',
    'bones-forearm-hand',
    'The distal radius transmits the vast majority of axial load from the hand to the forearm.',
    'The distal ulna does not articulate directly with the proximal carpal row, being separated from it by the triangular fibrocartilage complex.',
    'explains',
    'Both statements are true. Because the TFCC separates the ulna from the carpus, approximately 80% of axial force is transferred directly across the radiocarpal articulation to the radius.'
  ),
  ar(
    'ar1-03',
    'limb-bud-axes',
    'Surgical removal of the apical ectodermal ridge (AER) during early limb bud development results in truncated limb development.',
    'The zone of polarizing activity (ZPA) regulates the anteroposterior axis of digit development from thumb to little finger.',
    'true-unrelated',
    'Both statements are true facts of embryology. However, the reason why AER removal truncates the limb is loss of proximodistal proliferative signaling in the progress zone, not ZPA anteroposterior specification.'
  ),
  ar(
    'ar1-04',
    'growth-plate-zones',
    'Achondroplasia causes severe disproportionate short stature because it primary impairs chondrocyte hypertrophy in the hypertrophic zone of the physis.',
    'The proliferative zone of the growth plate contains active stacks of dividing chondrocytes responsible for longitudinal bone growth.',
    'a-false-r-true',
    'The Assertion is false: achondroplasia is caused by an FGFR3 mutation that inhibits chondrocyte proliferation in the proliferative zone, not the hypertrophic zone. The Reason is true.'
  ),
  ar(
    'ar1-05',
    'growth-plate-zones',
    'Salter-Harris type I growth plate fractures characteristically propagate through the reserve zone of the physis.',
    'The reserve zone contains the lowest concentration of extracellular matrix in the epiphyseal plate.',
    'both-false',
    'Both statements are false. Salter-Harris type I fractures propagate through the hypertrophic zone (which is mechanically the weakest), and the hypertrophic zone has enlarged cells and thinned matrix, whereas the reserve zone has abundant matrix.'
  ),

  // ─── Lesson 2 — Joints of the Upper Limb ──────────────────────────
  ar(
    'ar2-01',
    'glenohumeral-joint',
    'The glenohumeral joint is the most frequently dislocated large joint in the human body.',
    'The glenoid fossa covers only approximately one-third of the large spherical humeral head, sacrificing bony congruence for multiaxial mobility.',
    'explains',
    'Both statements are true. The marked disproportion between the shallow glenoid and large humeral head makes the joint inherently dependent on soft-tissue restraints, directly explaining its high dislocation rate.'
  ),
  ar(
    'ar2-02',
    'glenohumeral-joint',
    'Dynamic compression by the rotator cuff muscles is essential for maintaining glenohumeral joint stability during active arm motion.',
    'The anterior bundle of the medial collateral ligament is the primary restraint to valgus stress at the elbow joint.',
    'true-unrelated',
    'Both statements are true anatomic facts, but the stability of the elbow’s medial collateral ligament does not explain rotator cuff concavity-compression at the shoulder.'
  ),
  ar(
    'ar2-03',
    'shoulder-dislocation',
    'Posterior shoulder dislocation occurs far more commonly than anterior shoulder dislocation.',
    'Anterior shoulder dislocation frequently produces a Bankart lesion of the anterior-inferior glenoid labrum.',
    'a-false-r-true',
    'The Assertion is false: over 95% of shoulder dislocations are anterior, with posterior dislocations accounting for only 2–4%. The Reason is true: anterior dislocation commonly avulses the anterior-inferior labrum (Bankart lesion).'
  ),
  ar(
    'ar2-04',
    'clavicular-joints',
    'The coracoclavicular ligament provides the primary vertical stability to the acromioclavicular articulation.',
    'The coracoclavicular ligament is composed of the medial conoid and lateral trapezoid ligaments, which suspend the scapula from the clavicle.',
    'explains',
    'Both statements are true. The dense conoid and trapezoid ligaments directly anchor the clavicle to the coracoid process, explaining vertical suspension of the scapula and AC joint stability.'
  ),
  ar(
    'ar2-05',
    'elbow-joint',
    'The normal carrying angle of the human elbow is a varus angulation directing the forearm toward the midline.',
    'The carrying angle in females is typically narrower than in males because of narrower pelvic dimensions.',
    'both-false',
    'Both statements are false. The normal carrying angle is a valgus angulation (forearm directed laterally away from the body), and it is typically wider in females (15°–20°) than in males (10°–15°).'
  ),

  // ─── Lesson 3 — Pectoral Region, Rotator Cuff and Axillary Spaces ──
  ar(
    'ar3-01',
    'pectoral-muscles',
    'Paralysis of the serratus anterior muscle causes medial winging of the scapula.',
    'The long thoracic nerve innervates serratus anterior, which normally holds the medial border and inferior angle of the scapula firmly against the thoracic cage.',
    'explains',
    'Both statements are true. When the long thoracic nerve is injured, serratus anterior fails to anchor the scapula against the thoracic wall during pushing, causing the medial border to wing backward.'
  ),
  ar(
    'ar3-02',
    'rotator-cuff',
    'Supraspinatus tendon tears impair the initiation of shoulder abduction.',
    'The subscapularis muscle is the primary medial rotator of the humerus, inserting into the lesser tubercle.',
    'true-unrelated',
    'Both statements are true. However, subscapularis medial rotation does not explain why supraspinatus tears impair the initial 15° of abduction (which is the specific biomechanical role of supraspinatus).'
  ),
  ar(
    'ar3-03',
    'quadrangular-space',
    'Fractures of the surgical neck of the humerus frequently lead to paralysis of the deltoid and sensory loss over the regimental badge area.',
    'The axillary nerve and posterior circumflex humeral artery exit the axilla through the quadrangular space and wind directly around the surgical neck of the humerus.',
    'explains',
    'Both statements are true. The direct anatomical path of the axillary nerve around the surgical neck within the quadrangular space explains why surgical neck fractures cause axillary neuropraxia.'
  ),
  ar(
    'ar3-04',
    'triangular-spaces',
    'The upper triangular space transmits the radial nerve into the posterior compartment of the arm.',
    'The circumflex scapular artery traverses the upper triangular space to participate in the scapular anastomosis.',
    'a-false-r-true',
    'The Assertion is false: the radial nerve passes through the triangular interval (lower triangular space), not the upper triangular space. The Reason is true: the upper triangular space transmits the circumflex scapular artery.'
  ),
  ar(
    'ar3-05',
    'rotator-cuff',
    'Teres major is the most commonly torn muscle of the rotator cuff.',
    'Teres major inserts into the greater tubercle alongside supraspinatus and infraspinatus.',
    'both-false',
    'Both statements are false. Teres major is not even a member of the rotator cuff (which is SITS), and it inserts onto the medial lip of the bicipital groove of the humerus, not the greater tubercle.'
  ),

  // ─── Lesson 4 — Arm and the Cubital Fossa ─────────────────────────
  ar(
    'ar4-01',
    'anterior-arm-muscles',
    'The brachialis muscle can powerfully flex the elbow joint regardless of whether the forearm is supinated, neutral, or pronated.',
    'Brachialis inserts into the coronoid process and tuberosity of the ulna, so its mechanical axis of pull is unaffected by rotation of the radius around the ulna.',
    'explains',
    'Both statements are true. Because the ulna does not rotate during pronosupination, brachialis acts as a pure, unaffected elbow flexor in all forearm positions.'
  ),
  ar(
    'ar4-02',
    'cubital-fossa-contents',
    'Accidental intra-arterial injection into the brachial artery is a recognized risk during venipuncture of the median cubital vein.',
    'The bicipital aponeurosis descends medially across the cubital fossa, interposing a fibrous protective layer between the superficial vein and the deeper brachial artery.',
    'explains',
    'Both statements are true. The bicipital aponeurosis normally protects the underlying brachial artery from superficial needle puncture; misplacement or deep puncture past the aponeurosis risks intra-arterial injection.'
  ),
  ar(
    'ar4-03',
    'posterior-arm-muscles',
    'The long head of triceps brachii assists in adduction and extension of the humerus at the glenohumeral joint.',
    'The musculocutaneous nerve pierces the coracobrachialis muscle to enter the flexor compartment of the arm.',
    'true-unrelated',
    'Both statements are true. The long head of triceps crosses the shoulder because of its infraglenoid origin, but coracobrachialis innervation is an unrelated feature of the anterior compartment.'
  ),
  ar(
    'ar4-04',
    'cubital-fossa-boundaries',
    'The muscular floor of the cubital fossa is formed by the pronator teres and brachioradialis muscles.',
    'The medial boundary of the cubital fossa is formed by the lateral margin of pronator teres, and its lateral boundary by the medial margin of brachioradialis.',
    'a-false-r-true',
    'The Assertion is false: the floor of the cubital fossa is formed by brachialis and supinator, not pronator teres and brachioradialis (which form its medial and lateral walls). The Reason is true.'
  ),
  ar(
    'ar4-05',
    'cubital-fossa-contents',
    'The ulnar nerve is the most medial content of the cubital fossa.',
    'The cubital fossa contains the terminal bifurcation of the brachial artery into the radial and ulnar arteries.',
    'a-false-r-true',
    'The Assertion is false: the ulnar nerve passes behind the medial epicondyle and does not enter the cubital fossa (the median nerve is the most medial content). The Reason is true.'
  ),

  // ─── Lesson 5 — Forearm and Anatomical Snuffbox ────────────────────
  ar(
    'ar5-01',
    'anterior-forearm-deep',
    'A patient with an isolated anterior interosseous nerve (AIN) palsy is unable to make a normal "OK" sign with the thumb and index finger.',
    'The AIN innervates the flexor pollicis longus and the lateral half of flexor digitorum profundus, which flex the interphalangeal joint of the thumb and distal interphalangeal joint of the index finger respectively.',
    'explains',
    'Both statements are true. Without AIN innervation, the terminal phalanges cannot flex into an "O" shape, resulting in a flat pinch grip (abnormal "OK" sign).'
  ),
  ar(
    'ar5-02',
    'anatomical-snuffbox',
    'Tenderness in the anatomical snuffbox raises high clinical suspicion of a scaphoid fracture.',
    'The scaphoid bone receives its primary arterial blood supply from distal branches of the radial artery, which enter the bone distally and course retrogradely to the proximal pole.',
    'true-unrelated',
    'Both statements are true facts. The reason why snuffbox pressure causes pain is direct palpation of the fractured scaphoid in the floor, not the retrograde vascular anatomy (which instead explains the subsequent risk of avascular necrosis).'
  ),
  ar(
    'ar5-03',
    'extensor-compartments',
    'De Quervain’s tenosynovitis causes severe pain along the radial side of the wrist during thumb movement.',
    'De Quervain’s tenosynovitis involves stenosing inflammation of the extensor pollicis longus tendon as it hooks around Lister’s tubercle.',
    'a-true-r-false',
    'The Assertion is true, but the Reason is false: De Quervain’s affects Compartment 1 (abductor pollicis longus and extensor pollicis brevis), not Compartment 3 (extensor pollicis longus).'
  ),
  ar(
    'ar5-04',
    'anterior-forearm-superficial',
    'All eight muscles of the anterior flexor-pronator compartment of the forearm are innervated by the median nerve or its branches.',
    'Flexor carpi ulnaris and the medial half of flexor digitorum profundus are innervated by the ulnar nerve.',
    'a-false-r-true',
    'The Assertion is false: two muscles (FCU and medial half of FDP) are innervated by the ulnar nerve. The Reason is true and directly disproves the Assertion.'
  ),
  ar(
    'ar5-05',
    'anatomical-snuffbox',
    'The tendon of the extensor pollicis brevis forms the medial (posterior) boundary of the anatomical snuffbox.',
    'The ulnar artery crosses the floor of the anatomical snuffbox before entering the deep palm.',
    'both-false',
    'Both statements are false. The medial boundary of the snuffbox is formed by the extensor pollicis longus (not brevis), and the radial artery (not ulnar) traverses its floor.'
  ),

  // ─── Lesson 6 — Arteries and Nerves of the Upper Limb ─────────────
  ar(
    'ar6-01',
    'subclavian-axillary-arteries',
    'Ligation of the first part of the axillary artery between the 1st rib and pectoralis minor can be tolerated without causing gangrene of the arm.',
    'The scapular anastomosis connects branches of the subclavian artery (suprascapular and dorsal scapular) with branches of the third part of the axillary artery (circumflex scapular and thoracodorsal), preserving collateral flow to the brachial artery.',
    'explains',
    'Both statements are true. The extensive anastomotic network around the scapula provides a natural bypass route connecting the subclavian and distal axillary systems.'
  ),
  ar(
    'ar6-02',
    'radial-nerve-course',
    'A midshaft humeral fracture in the radial groove characteristically produces wrist drop while leaving triceps extension largely intact.',
    'Motor branches of the radial nerve to the long, lateral, and medial heads of triceps brachii arise in the axilla and proximal arm, proximal to the radial groove.',
    'explains',
    'Both statements are true. Because the branches supplying the triceps originate above the spiral groove, a midshaft fracture paralyzes wrist and finger extensors while sparing triceps elbow extension.'
  ),
  ar(
    'ar6-03',
    'median-nerve-course',
    'Carpal tunnel syndrome commonly causes sensory impairment over the palmar aspect of the lateral three and a half digits and thenar muscle weakness.',
    'The ulnar nerve passes behind the medial epicondyle through the cubital tunnel to supply the intrinsic hand muscles.',
    'true-unrelated',
    'Both statements are true. But ulnar nerve anatomy in the cubital tunnel does not explain median nerve compression in the carpal tunnel.'
  ),
  ar(
    'ar6-04',
    'ulnar-nerve-course',
    'The ulnar nerve passes through the carpal tunnel beneath the flexor retinaculum alongside the long flexor tendons.',
    'Compression of the ulnar nerve in Guyon’s canal produces sensory loss restricted to the medial one and a half digits.',
    'a-false-r-true',
    'The Assertion is false: the ulnar nerve passes superficial to the flexor retinaculum through Guyon’s canal; it does not traverse the carpal tunnel. The Reason is true.'
  ),
  ar(
    'ar6-05',
    'brachial-radial-ulnar-arteries',
    'The profunda brachii artery is the primary continuation of the axillary artery at the lower border of teres major.',
    'The radial artery forms the superficial palmar arch, while the ulnar artery forms the deep palmar arch.',
    'both-false',
    'Both statements are false. The main continuation of the axillary artery is the brachial artery (profunda brachii is just a branch), and the superficial palmar arch is primarily formed by the ulnar artery, whereas the deep arch is formed by the radial artery.'
  ),
];
