import type { LessonConfusion } from '@/data/lesson-types';
import { ask, fill, learn, match, mcq, multi, order, recall, type InteractiveDraft } from '@/data/topics/build';
import { ul, type ConceptId } from '@/data/topics/upper-limb/sources';

type Steps = InteractiveDraft<ConceptId>[];

export const interactive: Record<string, Steps> = {
  // ─── Lesson 1 — Osteology and Limb Development ────────────────────
  'upper-limb-1': [
    ask(
      mcq(
        'c1-01',
        'bones-pectoral-arm',
        'Where is the clavicle most commonly fractured?',
        'At the junction of the medial two-thirds and lateral third (middle third)',
        ['At the sternal end', 'At the acromial end', 'Along the conoid tubercle'],
        { explanation: 'Slide 8 & 9: The middle third is the thinnest part of the bone and where the curvatures meet, making it the most frequent fracture site.', skill: 'prediction' }
      )
    ),
    learn(
      'Bones of the Upper Limb',
      [
        'The clavicle acts as a strut holding the upper limb away from the trunk. The humerus forms the skeleton of the arm, articulating with the glenoid cavity of the scapula proximally and with the radius and ulna distally (slides 6–11).',
        'In the forearm, the radius lies laterally and the ulna medially. The distal radius bears approximately 80% of axial load through the wrist, articulating with the scaphoid and lunate carpal bones (slides 14–17).'
      ],
      { sourceRefs: ul([6, 11, 14, 17]) }
    ),
    ask(
      match(
        'c1-02',
        'bones-forearm-hand',
        'Match each bone or feature to its anatomical role:',
        [
          ['Radial head', 'Rotates around the ulna in pronosupination'],
          ['Coronoid process', 'Anterior buttress preventing posterior ulna subluxation'],
          ['Distal radius', 'Transmits 80% of axial wrist load'],
          ['Scaphoid and lunate', 'Carpal bones articulating directly with the radius']
        ],
        { explanation: 'Slides 14–22: The radial head is offset 15° for pronosupination, the coronoid process acts as an anterior bony buttress, and the distal radius bears 80% of axial force.' }
      )
    ),
    learn(
      'Signaling Axes in Limb Bud Development',
      [
        'Limb bud outgrowth begins in the 3rd to 4th week of embryogenesis from lateral plate mesoderm. Three regulatory axes govern development (slides 28–29):',
        '1. Proximodistal axis (shoulder to fingers): driven by the Apical Ectodermal Ridge (AER) and underlying Progress Zone (PZ).',
        '2. Anteroposterior axis (thumb to little finger): directed by the Zone of Polarizing Activity (ZPA).',
        '3. Dorsoventral axis (dorsum vs palm): established by the dorsal and ventral ectoderm.'
      ],
      { sourceRefs: ul([28, 29]) }
    ),
    ask(
      order(
        'c1-03',
        'growth-plate-zones',
        'Arrange the histologic zones of the epiphyseal growth plate from epiphysis towards metaphysis:',
        ['Reserve (resting) zone', 'Proliferative zone', 'Hypertrophic zone', 'Metaphyseal ossification zone'],
        { explanation: 'Slides 40–43: From the articular end inward: Reserve zone → Proliferative zone (mitosis) → Hypertrophic zone (calcification) → Metaphysis.' }
      )
    ),
    learn(
      'Endochondral Ossification and the Physis',
      [
        'Long bones form by endochondral ossification within a hyaline cartilage template. Primary ossification centres appear in the shaft (diaphysis) by the 7th–8th week, while secondary centres appear postnatally in the epiphyses (slides 30–39).',
        'The hypertrophic zone is the weakest layer of the growth plate and is the primary site of Salter-Harris type I fractures and rickets. Achondroplasia affects chondrocyte proliferation in the proliferative zone (slides 42–48).'
      ],
      { sourceRefs: ul([30, 42, 47]) }
    ),
    ask(
      mcq(
        'c1-04',
        'limb-bud-axes',
        'Which signaling centre regulates the anteroposterior axis (thumb to little finger)?',
        'Zone of polarizing activity (ZPA)',
        ['Apical ectodermal ridge (AER)', 'Progress zone (PZ)', 'Reserve zone of the physis'],
        { explanation: 'Slide 29: The anteroposterior axis is regulated by the zone of polarizing activity (ZPA) located on the posterior margin of the limb bud.', skill: 'terminology' }
      )
    ),
    recall(
      'r1-01',
      'growth-plate-zones',
      'Explain the sequence of growth plate zones and why the hypertrophic zone is clinically vulnerable.',
      [
        'The zones from epiphyseal to diaphyseal ends are the reserve (resting) zone, proliferative zone, hypertrophic zone, and metaphysis.',
        'The hypertrophic zone contains enlarged, swollen chondrocytes surrounded by less extracellular matrix before calcification.',
        'This architectural thinning makes the hypertrophic zone mechanically the weakest layer, predisposing to Salter-Harris physeal fractures and rickets.'
      ]
    )
  ],

  // ─── Lesson 2 — Joints of the Upper Limb ──────────────────────────
  'upper-limb-2': [
    ask(
      mcq(
        'c2-01',
        'glenohumeral-joint',
        'What provides the primary dynamic stability to the glenohumeral (shoulder) joint?',
        'The rotator cuff muscles compressing the humeral head into the glenoid cavity',
        ['The coracoacromial arch', 'The coracohumeral ligament', 'The fibrous joint capsule alone'],
        { explanation: 'Slides 73 & 85: Dynamic stabilization is provided by the rotator cuff muscles (supraspinatus, infraspinatus, teres minor, subscapularis) actively compressing the head against the shallow glenoid.', skill: 'prediction' }
      )
    ),
    learn(
      'Shoulder and Clavicular Joints',
      [
        'The sternoclavicular joint is the only skeletal articulation between the upper limb and axial skeleton, equipped with a fibrocartilaginous intra-articular disc (slides 68–71).',
        'The glenohumeral joint is a multiaxial ball-and-socket joint. Because the glenoid cavity covers only about one-third of the humeral head, stability is sacrificed for mobility. The glenoid labrum deepens the socket (slides 72–74).'
      ],
      { sourceRefs: ul([68, 72, 74]) }
    ),
    ask(
      match(
        'c2-02',
        'clavicular-joints',
        'Match each ligament to its primary joint stabilizing role:',
        [
          ['Costoclavicular ligament', 'Anchors the medial clavicle to the first rib'],
          ['Coracoclavicular ligament', 'Suspends the upper limb from the clavicle (conoid and trapezoid)'],
          ['Inferior glenohumeral ligament (IGHL)', 'Primary static restraint against anterior shoulder dislocation in abduction/external rotation'],
          ['Annular ligament', 'Encircles the radial head for smooth rotation at the PRUJ']
        ],
        { explanation: 'Slides 68, 74, 87: Coracoclavicular provides vertical AC stability; IGHL resists anterior subluxation; annular ligament maintains radial head position.' }
      )
    ),
    learn(
      'Elbow Joint and Ligamentous Restraints',
      [
        'The elbow is a trochlear hinge joint. The medial collateral ligament (MCL) has three bundles; its anterior bundle is the primary restraint to valgus stress (slides 79–83).',
        'The lateral collateral ligament complex includes the lateral ulnar collateral ligament (LUCL), which prevents posterolateral rotatory instability (slide 83). The normal carrying angle is 10–15° valgus in men and 15–20° in women (slide 130).'
      ],
      { sourceRefs: ul([79, 82, 83, 130]) }
    ),
    ask(
      mcq(
        'c2-03',
        'elbow-joint',
        'Which component of the medial collateral ligament (MCL) of the elbow provides the primary resistance to valgus force?',
        'The anterior bundle',
        ['The posterior bundle', 'The transverse (Cooper) ligament', 'The annular ligament'],
        { explanation: 'Slide 82: The anterior bundle of the medial collateral ligament is the primary static restraint to valgus stress at the elbow.', skill: 'recall' }
      )
    ),
    learn(
      'Radioulnar Joints and the Wrist',
      [
        'The proximal radioulnar joint (PRUJ) is a pivot synovial joint within the annular ligament. The distal radioulnar joint (DRUJ) is stabilized by the Triangular Fibrocartilage Complex (TFCC), which attaches to the ulnar fovea (slides 87–89).',
        'The radiocarpal (wrist) joint is condyloid. The radius and TFCC articulate with the scaphoid, lunate, and triquetrum. The distal ulna does NOT articulate directly with the carpus (slide 92).'
      ],
      { sourceRefs: ul([87, 88, 89, 92]) }
    ),
    ask(
      mcq(
        'c2-04',
        'radioulnar-wrist-joints',
        'Which structure attaches to the ulnar fovea and stabilizes the distal radioulnar joint (DRUJ)?',
        'The triangular fibrocartilage complex (TFCC)',
        ['The interosseous membrane', 'The volar radioulnar ligament alone', 'The pronator quadratus aponeurosis'],
        { explanation: 'Slides 88 & 89: The TFCC attaches to the fovea at the base of the ulnar styloid and provides the major stability to the DRUJ.', skill: 'recall' }
      )
    ),
    recall(
      'r2-01',
      'shoulder-dislocation',
      'Describe the anatomic reasons why anterior glenohumeral dislocation is most common and list two associated injuries.',
      [
        'The glenohumeral joint is inherently unstable because the glenoid fossa is shallow and covers only a fraction of the humeral head.',
        'The inferior-anterior capsule lacks strong muscular support (no rotator cuff inferiorly), predisposing to anterior dislocation when the arm is abducted and externally rotated.',
        'Associated injuries include Bankart lesions (tearing of the anterior-inferior glenoid labrum), Hill-Sachs lesions (compression fracture of the posterosuperior humeral head), and axillary nerve neuropraxia.'
      ]
    )
  ],

  // ─── Lesson 3 — Pectoral Region, Rotator Cuff and Axillary Spaces ──
  'upper-limb-3': [
    ask(
      mcq(
        'c3-01',
        'quadrangular-space',
        'Which nerve and artery pass through the quadrangular space of the shoulder?',
        'Axillary nerve and posterior circumflex humeral artery',
        ['Suprascapular nerve and suprascapular artery', 'Radial nerve and profunda brachii artery', 'Thoracodorsal nerve and subscapular artery'],
        { explanation: 'Slides 112 & 115: The quadrangular space transmits the axillary nerve and posterior circumflex humeral vessels as they wind around the surgical neck.', skill: 'prediction' }
      )
    ),
    learn(
      'Pectoral Girdle Muscles',
      [
        'Pectoralis major has clavicular and sternocostal heads innervated by both medial and lateral pectoral nerves; it powerfully adducts and medially rotates the humerus (slides 95–99).',
        'Pectoralis minor attaches to the coracoid process, dividing the axillary artery into three parts. Serratus anterior (long thoracic nerve) protracts the scapula and upwardly rotates the glenoid; injury produces a winged scapula (slides 97, 101).'
      ],
      { sourceRefs: ul([95, 97, 101]) }
    ),
    ask(
      match(
        'c3-02',
        'rotator-cuff',
        'Match each rotator cuff muscle to its primary action on the humerus:',
        [
          ['Supraspinatus', 'Initiates abduction (first 15°)'],
          ['Infraspinatus', 'Lateral rotation of the humerus (middle facet)'],
          ['Teres minor', 'Lateral rotation of the humerus (inferior facet)'],
          ['Subscapularis', 'Medial rotation of the humerus (lesser tubercle)']
        ],
        { explanation: 'Slides 106–110: Supraspinatus abducts (first 15°); infraspinatus and teres minor laterally rotate; subscapularis medially rotates.' }
      )
    ),
    learn(
      'The Rotator Cuff (SITS)',
      [
        'The four rotator cuff muscles (Supraspinatus, Infraspinatus, Teres minor, Subscapularis) form a protective musculotendinous cuff around the shoulder joint (slides 106–110).',
        'Supraspinatus and infraspinatus are innervated by the suprascapular nerve. Teres minor is innervated by the axillary nerve, and subscapularis by the upper and lower subscapular nerves. Supraspinatus is the most frequently torn tendon in impingement syndromes (slide 109).'
      ],
      { sourceRefs: ul([106, 108, 109, 110]) }
    ),
    ask(
      mcq(
        'c3-03',
        'triangular-spaces',
        'What are the contents of the triangular interval (lower triangular space)?',
        'Radial nerve and profunda brachii artery',
        ['Circumflex scapular artery', 'Axillary nerve and posterior circumflex humeral artery', 'Suprascapular nerve and vessels'],
        { explanation: 'Slide 117: The triangular interval transmits the radial nerve and profunda brachii artery as they pass into the posterior compartment of the arm.', skill: 'recall' }
      )
    ),
    learn(
      'Spaces of the Posterior Scapular Region',
      [
        'Three anatomic spaces are formed between the scapula, humerus, and triceps long head (slides 112–117):',
        '1. Quadrangular space: teres minor superiorly, teres major inferiorly, long head of triceps medially, humerus laterally. Transmits axillary nerve and posterior circumflex humeral artery.',
        '2. Upper triangular space: teres minor superiorly, teres major inferiorly, long head of triceps laterally. Transmits circumflex scapular artery.',
        '3. Triangular interval: teres major superiorly, long head of triceps medially, lateral head of triceps laterally. Transmits radial nerve and profunda brachii artery.'
      ],
      { sourceRefs: ul([112, 114, 116, 117]) }
    ),
    ask(
      mcq(
        'c3-04',
        'triangular-spaces',
        'Which vessel passes through the upper triangular space to participate in the scapular anastomosis?',
        'Circumflex scapular artery',
        ['Profunda brachii artery', 'Posterior circumflex humeral artery', 'Suprascapular artery'],
        { explanation: 'Slide 114: The upper triangular space transmits the circumflex scapular artery into the infraspinous fossa.', skill: 'recall' }
      )
    ),
    recall(
      'r3-01',
      'quadrangular-space',
      'List the four boundaries of the quadrangular space and the two structures passing through it.',
      [
        'Superior border: teres minor (or subscapularis anteriorly).',
        'Inferior border: teres major.',
        'Medial border: long head of triceps brachii.',
        'Lateral border: surgical neck of the humerus.',
        'Contents: axillary nerve and posterior circumflex humeral vessels.'
      ]
    )
  ],

  // ─── Lesson 4 — Arm and the Cubital Fossa ─────────────────────────
  'upper-limb-4': [
    ask(
      mcq(
        'c4-01',
        'cubital-fossa-contents',
        'What is the medial-to-lateral order of the four main contents of the cubital fossa?',
        'Median nerve, brachial artery, biceps tendon, radial nerve',
        ['Brachial artery, median nerve, biceps tendon, radial nerve', 'Radial nerve, biceps tendon, brachial artery, median nerve', 'Median nerve, biceps tendon, brachial artery, radial nerve'],
        { explanation: 'Slides 134 & 135: From medial to lateral: Median nerve, Brachial artery, Biceps brachii tendon, Radial nerve (mnemonic: MBBR).', skill: 'prediction' }
      )
    ),
    learn(
      'Muscles of the Arm (Brachium)',
      [
        'The arm is divided into anterior and posterior compartments by medial and lateral intermuscular septa (slides 121–122).',
        'The anterior flexor compartment contains three muscles innervated by the musculocutaneous nerve: biceps brachii, coracobrachialis, and brachialis. Brachialis is the primary flexor of the forearm in all positions of pronation/supination (slides 123–127).',
        'The posterior compartment contains the three heads of triceps brachii, innervated by the radial nerve, which extend the elbow (slide 128).'
      ],
      { sourceRefs: ul([121, 123, 126, 127, 128]) }
    ),
    ask(
      match(
        'c4-02',
        'anterior-arm-muscles',
        'Match each anterior arm muscle to its distal attachment:',
        [
          ['Biceps brachii', 'Radial tuberosity and bicipital aponeurosis'],
          ['Brachialis', 'Coronoid process and tuberosity of the ulna'],
          ['Coracobrachialis', 'Middle third of medial surface of humeral shaft']
        ],
        { explanation: 'Slides 124–127: Biceps inserts on the radius, brachialis on the coronoid process of the ulna, and coracobrachialis on the mid-humerus.' }
      )
    ),
    learn(
      'Boundaries of the Cubital Fossa',
      [
        'The cubital fossa is a triangular depression in front of the elbow (slides 131–134):',
        '• Base (superior): an imaginary horizontal line connecting the medial and lateral humeral epicondyles.',
        '• Medial border: lateral margin of the pronator teres.',
        '• Lateral border: medial margin of the brachioradialis.',
        '• Floor: formed by the brachialis proximally and supinator distally.',
        '• Roof: skin, superficial fascia with the median cubital vein, and deep fascia reinforced by the bicipital aponeurosis.'
      ],
      { sourceRefs: ul([131, 134]) }
    ),
    ask(
      mcq(
        'c4-03',
        'anterior-arm-muscles',
        'Which muscle acts as the most powerful supinator of the flexed forearm?',
        'Biceps brachii',
        ['Brachialis', 'Coracobrachialis', 'Pronator teres'],
        { explanation: 'Slide 124: The biceps brachii is a powerful flexor of the elbow and the most potent supinator of the flexed forearm due to its insertion on the radial tuberosity.', skill: 'recall' }
      )
    ),
    learn(
      'Contents and Clinical Links of the Cubital Fossa',
      [
        'The brachial artery enters the fossa medial to the biceps tendon and bifurcates at the apex into the radial and ulnar arteries (slides 134, 206).',
        'The median nerve runs medial to the brachial artery, leaving between the two heads of pronator teres. The radial nerve descends deep in the groove between brachialis and brachioradialis, dividing into superficial and deep (posterior interosseous) branches (slide 135).'
      ],
      { sourceRefs: ul([134, 135, 206]) }
    ),
    ask(
      mcq(
        'c4-04',
        'cubital-fossa-boundaries',
        'Which two muscles form the muscular floor of the cubital fossa?',
        'Brachialis and supinator',
        ['Biceps brachii and pronator teres', 'Brachioradialis and anconeus', 'Coracobrachialis and brachialis'],
        { explanation: 'Slide 134: The floor of the cubital fossa is formed by brachialis in the upper portion and supinator in the lower portion.', skill: 'recall' }
      )
    ),
    recall(
      'r4-01',
      'cubital-fossa-contents',
      'Name the boundaries of the cubital fossa and list its four major contents from medial to lateral.',
      [
        'Superior boundary (base): imaginary line between the medial and lateral epicondyles of the humerus.',
        'Medial boundary: lateral border of the pronator teres muscle.',
        'Lateral boundary: medial border of the brachioradialis muscle.',
        'Apex: point where pronator teres overlaps brachioradialis.',
        'Contents from medial to lateral: 1) Median nerve, 2) Brachial artery (and its terminal bifurcation), 3) Biceps brachii tendon, 4) Radial nerve.'
      ]
    )
  ],

  // ─── Lesson 5 — Forearm and Anatomical Snuffbox ────────────────────
  'upper-limb-5': [
    ask(
      mcq(
        'c5-01',
        'anatomical-snuffbox',
        'Which tendon forms the posterior (medial) boundary of the anatomical snuffbox?',
        'Extensor pollicis longus (EPL)',
        ['Extensor pollicis brevis (EPB)', 'Abductor pollicis longus (APL)', 'Extensor carpi radialis longus (ECRL)'],
        { explanation: 'Slide 179: The medial (posterior) border is formed solely by the tendon of the extensor pollicis longus, which hooks around Lister’s tubercle.', skill: 'prediction' }
      )
    ),
    learn(
      'Anterior Forearm: Flexors and Pronators',
      [
        'The flexor-pronator compartment contains eight muscles organized in three layers (slides 137–141):',
        '• Superficial (4): Pronator teres, Flexor carpi radialis (FCR), Palmaris longus, Flexor carpi ulnaris (FCU). All arise from the medial epicondyle (common flexor origin).',
        '• Intermediate (1): Flexor digitorum superficialis (FDS), which flexes the PIP joints.',
        '• Deep (3): Flexor digitorum profundus (FDP), Flexor pollicis longus (FPL), Pronator quadratus (PQ).',
        'All anterior forearm muscles are innervated by the median nerve (or AIN), except FCU and the medial half of FDP (fingers 4 & 5), which are supplied by the ulnar nerve (slide 141).'
      ],
      { sourceRefs: ul([137, 138, 140, 141]) }
    ),
    ask(
      match(
        'c5-02',
        'posterior-forearm-muscles',
        'Match each extensor muscle to its functional compartment or role:',
        [
          ['Brachioradialis', 'Mobile wad flexor of forearm in mid-pronation'],
          ['Extensor carpi ulnaris', 'Superficial extensor; extends and adducts the wrist'],
          ['Extensor digitorum', 'Superficial extensor; extends medial four digits at MCP joints'],
          ['Supinator', 'Deep extensor pierced by the posterior interosseous nerve (PIN)']
        ],
        { explanation: 'Slides 157, 161, 162, 167: Brachioradialis is in the mobile wad; ECU extends/adducts; ED extends digits; supinator is pierced by the PIN.' }
      )
    ),
    learn(
      'Posterior Forearm and Dorsal Compartments',
      [
        'The posterior extensor compartment contains 12 muscles innervated by the radial nerve or its deep branch, the posterior interosseous nerve (PIN) (slides 146–172).',
        'Beneath the extensor retinaculum, tendons pass through six distinct dorsal fibro-osseous compartments (slide 178):',
        '1: APL & EPB | 2: ECRL & ECRB | 3: EPL | 4: ED & EI | 5: EDM | 6: ECU.'
      ],
      { sourceRefs: ul([146, 155, 178]) }
    ),
    ask(
      order(
        'c5-03',
        'extensor-compartments',
        'Order the dorsal extensor compartments from radial (lateral) to ulnar (medial):',
        ['Compartment 1 (APL & EPB)', 'Compartment 2 (ECRL & ECRB)', 'Compartment 3 (EPL)', 'Compartment 4 (ED & EI)', 'Compartment 5 (EDM)', 'Compartment 6 (ECU)'],
        { explanation: 'Slide 178: The six compartments run sequentially from lateral (radial) to medial (ulnar).' }
      )
    ),
    learn(
      'The Anatomical Snuffbox',
      [
        'The anatomical snuffbox is a triangular depression on the posterolateral wrist seen during thumb extension (slides 179–183):',
        '• Lateral (anterior) border: tendons of Abductor pollicis longus (APL) and Extensor pollicis brevis (EPB).',
        '• Medial (posterior) border: tendon of Extensor pollicis longus (EPL).',
        '• Floor: scaphoid and trapezium bones.',
        '• Content: the radial artery crosses the floor. Tenderness in the snuffbox indicates a scaphoid fracture, which carries a risk of avascular necrosis (slides 180, 182).'
      ],
      { sourceRefs: ul([179, 180, 182, 183]) }
    ),
    ask(
      mcq(
        'c5-04',
        'anterior-forearm-deep',
        'Which nerve supplies the flexor pollicis longus and pronator quadratus?',
        'Anterior interosseous nerve (branch of median nerve)',
        ['Posterior interosseous nerve (branch of radial nerve)', 'Deep branch of the ulnar nerve', 'Superficial branch of the radial nerve'],
        { explanation: 'Slide 141 & 196: The anterior interosseous nerve (AIN) arises from the median nerve to supply the deep anterior forearm muscles (FPL, PQ, lateral FDP).', skill: 'recall' }
      )
    ),
    recall(
      'r5-01',
      'anatomical-snuffbox',
      'Define the boundaries, floor, and major neurovascular content of the anatomical snuffbox, and explain its clinical significance.',
      [
        'Lateral (anterior) boundary: tendons of abductor pollicis longus (APL) and extensor pollicis brevis (EPB) (compartment 1).',
        'Medial (posterior) boundary: tendon of extensor pollicis longus (EPL) (compartment 3).',
        'Floor: scaphoid proximally, trapezium distally, and the base of the first metacarpal.',
        'Content: radial artery crossing the floor; cephalic vein and superficial branch of radial nerve in the roof.',
        'Clinical link: tenderness indicates a scaphoid fracture; because the scaphoid blood supply enters distally, fracture risks avascular necrosis of the proximal pole.'
      ]
    )
  ],

  // ─── Lesson 6 — Arteries and Nerves of the Upper Limb ─────────────
  'upper-limb-6': [
    ask(
      mcq(
        'c6-01',
        'subclavian-axillary-arteries',
        'How many branches arise from the second part of the axillary artery, and what muscle defines it?',
        'Two branches (thoracoacromial and lateral thoracic); defined by pectoralis minor',
        ['One branch (superior thoracic); defined by subclavius', 'Three branches; defined by teres major', 'Two branches; defined by pectoralis major'],
        { explanation: 'Slides 201–203: Pectoralis minor divides the axillary artery into 3 parts. Part 1 has 1 branch, Part 2 has 2 branches, Part 3 has 3 branches.', skill: 'prediction' }
      )
    ),
    learn(
      'The Axillary Artery and Scapular Anastomosis',
      [
        'The axillary artery begins at the lateral border of the 1st rib as a continuation of the subclavian artery and ends at the lower border of teres major (slides 201–204).',
        'It is divided into three parts by pectoralis minor (slides 202–204):',
        '• 1st part (proximal to muscle): 1 branch — Superior thoracic artery.',
        '• 2nd part (deep to muscle): 2 branches — Thoracoacromial artery and Lateral thoracic artery.',
        '• 3rd part (distal to muscle): 3 branches — Subscapular artery, Anterior circumflex humeral, Posterior circumflex humeral.',
        'The scapular anastomosis links the subclavian (suprascapular, dorsal scapular) and axillary (circumflex scapular, thoracodorsal) systems, protecting blood flow during axillary ligation (slide 210).'
      ],
      { sourceRefs: ul([201, 202, 203, 204, 210]) }
    ),
    ask(
      match(
        'c6-02',
        'subclavian-axillary-arteries',
        'Match each part of the axillary artery to its characteristic branches:',
        [
          ['First part', 'Superior thoracic artery (one branch)'],
          ['Second part', 'Thoracoacromial trunk and lateral thoracic artery (two branches)'],
          ['Third part', 'Subscapular, anterior circumflex humeral, and posterior circumflex humeral (three branches)']
        ],
        { explanation: 'Slides 202–204: The rule of parts: Part 1 has 1 branch, Part 2 has 2 branches, Part 3 has 3 branches.' }
      )
    ),
    learn(
      'Brachial, Radial and Ulnar Arteries',
      [
        'The brachial artery continues from the axillary at the lower border of teres major, running with the median nerve (slides 206, 220). Its largest branch, the profunda brachii, accompanies the radial nerve into the radial groove (slide 221).',
        'In the cubital fossa, the brachial artery bifurcates into the radial and ulnar arteries (slides 211, 215). The radial artery forms the deep palmar arch, while the ulnar artery forms the superficial palmar arch and gives the common interosseous artery (slides 217, 225, 227).'
      ],
      { sourceRefs: ul([206, 211, 215, 221, 225, 227]) }
    ),
    ask(
      mcq(
        'c6-03',
        'radial-nerve-course',
        'A midshaft humeral fracture in the radial groove most characteristically injures which nerve and artery, producing what clinical sign?',
        'Radial nerve and profunda brachii artery; producing wrist drop',
        ['Median nerve and brachial artery; producing hand of benediction', 'Ulnar nerve and superior ulnar collateral artery; producing claw hand', 'Axillary nerve and posterior circumflex humeral artery; producing deltoid paralysis'],
        { explanation: 'Slides 221 & 232: The radial nerve and profunda brachii artery spiral together in the radial groove of the humeral midshaft. Injury denervates wrist extensors, resulting in wrist drop.', skill: 'application', clinical: true }
      )
    ),
    learn(
      'Major Peripheral Nerves of the Upper Limb',
      [
        '• Median nerve (C5–T1): passes anteromedially in the arm without branching; supplies anterior forearm flexors (except FCU and medial half of FDP); enters hand through the carpal tunnel to supply LOAF muscles (slides 229–230).',
        '• Ulnar nerve (C8–T1): descends behind the medial epicondyle (cubital tunnel); supplies FCU, medial FDP, hypothenar muscles, all interossei, and medial two lumbricals (slide 238).',
        '• Radial nerve (C5–T1): traverses triangular interval and radial groove; supplies triceps, mobile wad, and splits into superficial sensory and deep PIN motor branches to the extensor compartment (slides 232, 234).'
      ],
      { sourceRefs: ul([229, 230, 232, 234, 238]) }
    ),
    ask(
      mcq(
        'c6-04',
        'ulnar-nerve-course',
        'Where is the ulnar nerve most vulnerable to compression or direct trauma at the elbow?',
        'Posterior to the medial epicondyle in the cubital tunnel',
        ['Anterior to the lateral epicondyle', 'Within the radial groove', 'Between the heads of pronator teres'],
        { explanation: 'Slide 238: The ulnar nerve passes directly posterior to the medial epicondyle of the humerus ("funny bone"), entering the forearm between the two heads of FCU.', skill: 'recall' }
      )
    ),
    recall(
      'r6-01',
      'subclavian-axillary-arteries',
      'Explain how pectoralis minor divides the axillary artery and list all branches arising from each part.',
      [
        'Pectoralis minor crosses anterior to the axillary artery, dividing it into three anatomical parts.',
        'Part 1 (proximal to the medial border of pectoralis minor) gives 1 branch: the superior thoracic artery.',
        'Part 2 (posterior/deep to pectoralis minor) gives 2 branches: the thoracoacromial artery (which branches into pectoral, acromial, clavicular, and deltoid twigs) and the lateral thoracic artery.',
        'Part 3 (distal to the lateral border of pectoralis minor to the lower border of teres major) gives 3 branches: the subscapular artery (dividing into circumflex scapular and thoracodorsal arteries), the anterior circumflex humeral artery, and the posterior circumflex humeral artery.'
      ]
    )
  ],
};

// ─── Reading Extras ─────────────────────────────────────────────────

type ReadingExtras = {
  estimatedMinutes: number;
  xp: number;
  highYield: string[];
  confusions: LessonConfusion[];
};

export const readingExtras: Record<string, ReadingExtras> = {
  'upper-limb-1': {
    estimatedMinutes: 14,
    xp: 25,
    highYield: [
      'The clavicle is most commonly fractured at the junction of the medial two-thirds and lateral third (middle third).',
      'The distal radius transmits 80% of axial force through the wrist and articulates with the scaphoid and lunate.',
      'The coronoid process of the ulna functions as an essential anterior bony buttress against posterior elbow dislocation.',
      'Limb bud axes: AER + PZ regulate proximodistal outgrowth; ZPA regulates anteroposterior (thumb-to-little finger) patterning.',
      'The hypertrophic zone of the epiphyseal growth plate is the mechanically weakest zone (vulnerable in Salter-Harris fractures and rickets).'
    ],
    confusions: [
      {
        confusion: 'Students often assume the ulna articulates directly with the carpal bones at the wrist.',
        clarification: 'Actually, the distal ulna is separated from the carpus by the triangular fibrocartilage complex (TFCC); only the radius articulates directly with scaphoid and lunate (slides 17, 92).'
      },
      {
        confusion: 'Confusing the roles of AER and ZPA during embryogenesis.',
        clarification: 'The apical ectodermal ridge (AER) controls longitudinal outgrowth (proximodistal axis), whereas the zone of polarizing activity (ZPA) controls digit identity across the anteroposterior axis (slide 29).'
      }
    ]
  },

  'upper-limb-2': {
    estimatedMinutes: 14,
    xp: 25,
    highYield: [
      'The sternoclavicular joint is the only true articulation between the upper limb and axial skeleton.',
      'Glenohumeral stability relies primarily on dynamic rotator cuff compression and the inferior glenohumeral ligament (IGHL).',
      'Anterior shoulder dislocation is the most common dislocation; risks include Bankart labral tears and Hill-Sachs fractures.',
      'The anterior bundle of the medial collateral ligament (MCL) is the primary restraint to valgus stress at the elbow.',
      'The TFCC anchors to the ulnar fovea and provides primary stability to the distal radioulnar joint (DRUJ).'
    ],
    confusions: [
      {
        confusion: 'Thinking that static capsular ligaments are the primary stabilizers of the shoulder in all positions.',
        clarification: 'The rotator cuff muscles provide critical dynamic compression throughout active motion; the IGHL provides static restraint only when the shoulder is abducted and externally rotated (slides 73–74).'
      },
      {
        confusion: 'Believing that radial head subluxation (nursemaid’s elbow) involves torn collateral ligaments.',
        clarification: 'Nursemaid’s elbow is a slippage of the radial head beneath the annular ligament, usually caused by sudden longitudinal traction on an extended, pronated forearm in young children.'
      }
    ]
  },

  'upper-limb-3': {
    estimatedMinutes: 12,
    xp: 25,
    highYield: [
      'Pectoralis minor divides the axillary artery into three parts and is innervated by the medial pectoral nerve.',
      'Serratus anterior is innervated by the long thoracic nerve (C5–C7); paralysis produces a winged scapula.',
      'Supraspinatus initiates abduction (first 15°) and is the most commonly torn rotator cuff tendon.',
      'Quadrangular space transmits the axillary nerve and posterior circumflex humeral artery.',
      'Triangular interval transmits the radial nerve and profunda brachii artery.'
    ],
    confusions: [
      {
        confusion: 'Mixing up the contents of the quadrangular space and triangular interval.',
        clarification: 'The quadrangular space transmits the axillary nerve and posterior circumflex humeral artery; the triangular interval transmits the radial nerve and profunda brachii artery (slides 112, 117).'
      },
      {
        confusion: 'Assuming teres major is a member of the rotator cuff.',
        clarification: 'The rotator cuff consists strictly of SITS: Supraspinatus, Infraspinatus, Teres minor, and Subscapularis. Teres major is not part of the rotator cuff (slide 106).'
      }
    ]
  },

  'upper-limb-4': {
    estimatedMinutes: 12,
    xp: 25,
    highYield: [
      'Brachialis is the workhorse flexor of the forearm in all positions, inserting on the ulnar coronoid process.',
      'Biceps brachii is the primary supinator of the flexed forearm, inserting into the radial tuberosity.',
      'Triceps brachii is innervated by the radial nerve and inserts on the olecranon process.',
      'Cubital fossa contents from medial to lateral: Median nerve, Brachial artery, Biceps tendon, Radial nerve (MBBR).',
      'The floor of the cubital fossa is formed by brachialis and supinator; the roof is protected by the bicipital aponeurosis.'
    ],
    confusions: [
      {
        confusion: 'Believing the biceps brachii flexes the forearm equally in full pronation.',
        clarification: 'The biceps brachii loses mechanical leverage when the forearm is fully pronated; brachialis flexes the elbow regardless of forearm rotation (slide 127).'
      },
      {
        confusion: 'Looking for the radial nerve superficial in the center of the cubital fossa.',
        clarification: 'The radial nerve lies deeply sheltered under the brachioradialis on the lateral boundary of the fossa, dividing into superficial and deep branches (slide 135).'
      }
    ]
  },

  'upper-limb-5': {
    estimatedMinutes: 14,
    xp: 25,
    highYield: [
      'All anterior forearm muscles are supplied by the median nerve except FCU and the medial half of FDP (ulnar nerve).',
      'The anterior interosseous nerve (AIN) supplies FPL, PQ, and lateral FDP; tested clinically by the "OK" sign.',
      'The 6 dorsal extensor compartments: 1 (APL, EPB), 2 (ECRL, ECRB), 3 (EPL), 4 (ED, EI), 5 (EDM), 6 (ECU).',
      'Anatomical snuffbox boundaries: lateral by APL & EPB; medial by EPL; floor by scaphoid & trapezium.',
      'The radial artery crosses the floor of the snuffbox; tenderness raises high suspicion for scaphoid fracture.'
    ],
    confusions: [
      {
        confusion: 'Confusing which muscles make up the lateral vs medial border of the anatomical snuffbox.',
        clarification: 'Lateral (anterior) border = APL and EPB (compartment 1); Medial (posterior) border = EPL (compartment 3) (slide 179).'
      },
      {
        confusion: 'Assuming flexor digitorum superficialis and profundus insert on the same phalanges.',
        clarification: 'FDS tendons split into two slips to insert on the middle phalanges (flexing PIP joints); FDP tendons pass through the split to insert on the distal phalanges (flexing DIP joints).'
      }
    ]
  },

  'upper-limb-6': {
    estimatedMinutes: 15,
    xp: 25,
    highYield: [
      'The 3 parts of the axillary artery give 1, 2, and 3 branches respectively (rule of parts).',
      'The scapular anastomosis links branches of the subclavian and axillary arteries, bypassing axillary obstruction.',
      'Profunda brachii artery travels with the radial nerve in the radial groove of the humerus.',
      'Radial nerve injury in the midshaft humerus denervates wrist extensors, causing wrist drop.',
      'The ulnar nerve passes behind the medial epicondyle into the cubital tunnel, supplying the intrinsic hand muscles.'
    ],
    confusions: [
      {
        confusion: 'Thinking the median nerve gives off branches to muscles in the arm (brachium).',
        clarification: 'The median nerve passes down the arm with the brachial artery without giving any motor or sensory branches until it reaches the cubital fossa (slide 230).'
      },
      {
        confusion: 'Confusing deep palmar arch and superficial palmar arch parent vessels.',
        clarification: 'The radial artery is the predominant contributor to the deep palmar arch, while the ulnar artery is the predominant contributor to the superficial palmar arch.'
      }
    ]
  }
};
