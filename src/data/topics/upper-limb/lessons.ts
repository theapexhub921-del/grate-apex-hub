import type { LessonDraft } from '@/data/topics/build';
import { interactive, readingExtras } from '@/data/topics/upper-limb/interactive';
import { ul, GRAYS, type ConceptId } from '@/data/topics/upper-limb/sources';

type Draft = LessonDraft<ConceptId>;

// ─── Lesson 1: Osteology and Limb Development ────────────────────────

const lesson1: Draft = {
  id: 'upper-limb-1',
  title: 'Osteology and Limb Development',
  description: 'Bones of the shoulder, arm, forearm, and hand, alongside embryological limb bud patterning and growth plate biology.',
  xp: 25,
  sourceRefs: ul([5, 6, 7, 8, 9, 11, 14, 15, 17, 19, 20, 22, 23, 26, 28, 29, 30, 40, 41, 42]),
  objectives: [
    'Describe the osteology of the clavicle, scapula, humerus, radius, ulna, and carpal bones.',
    'Identify the functional biomechanics of the radial head, coronoid process, and distal radius.',
    'Explain the signaling axes governing limb bud development (AER, PZ, and ZPA).',
    'Outline the stages of endochondral ossification and the histologic zones of the physis.',
    'Correlate growth plate zones with clinical disorders such as achondroplasia and rickets.'
  ],
  chunks: [
    {
      title: 'Bones of the Shoulder Girdle and Arm',
      kind: 'structure',
      paragraphs: [
        'The skeleton of the upper limb begins with the pectoral girdle, composed of the clavicle anteriorly and the scapula posteriorly (slide 5). The clavicle is an S-shaped bone that functions as a rigid strut, holding the upper limb away from the thoracic wall to allow maximal freedom of movement (slides 6, 7).',
        'Biomechanically, the clavicle is thinnest and undergoes transition between its medial and lateral curvatures at the middle third. Consequently, the junction between the medial two-thirds and lateral third is the most common site of fracture in the human body (slides 8, 9).',
        'The humerus forms the skeleton of the arm. Its proximal head articulates with the shallow glenoid fossa of the scapula. The surgical neck lies immediately inferior to the greater and lesser tubercles, representing a frequent site of fracture and putting the axillary nerve at risk (slides 10, 11).'
      ],
      steps: [
        { label: 'Sternal articulation', detail: 'The enlarged medial end of the clavicle articulates with the manubrium sterni at the sternoclavicular joint (slide 7).' },
        { label: 'Shaft transition', detail: 'The medial two-thirds are convex anteriorly, while the lateral third is concave anteriorly, creating a junction vulnerable to fracture (slides 8, 9).' },
        { label: 'Acromial articulation', detail: 'The flattened lateral end articulates with the acromion of the scapula at the acromioclavicular joint (slide 7).' }
      ],
      terms: [
        { term: 'Clavicle', meaning: 'S-shaped strut bone connecting the axial skeleton to the pectoral girdle.' },
        { term: 'Surgical neck', meaning: 'Constriction of the humerus distal to the tubercles, frequent site of fracture.' }
      ],
      keyPoints: [
        'The clavicle transmits forces from the upper limb to the axial skeleton.',
        'The middle third of the clavicle is the commonest fracture site due to bone thinness and curvature change.'
      ],
      notes: [
        { kind: 'clarified', text: 'Slide 9 notes the middle third as the most frequent fracture site; Gray’s specifies the junction of the medial two-thirds and lateral third.' }
      ],
      sourceRefs: ul([6, 7, 8, 9, 11])
    },
    {
      title: 'Bones of the Forearm and Wrist',
      kind: 'structure',
      paragraphs: [
        'The forearm skeleton consists of two parallel long bones: the radius laterally and the ulna medially (slide 12). The axis of rotation during pronosupination runs from the radial head proximally through the ulnar fovea distally, with the distal radius rotating around the distal ulna (slide 14).',
        'The radial head is offset by approximately 15° from the neck, conferring vital valgus stability to the elbow during movement (slides 15, 16). At the wrist, the expanded distal radius bears approximately 80% of axial load, articulating with the scaphoid and lunate bones (slide 17).',
        'The proximal ulna features the olecranon and the coronoid process, which together form the greater sigmoid (trochlear) notch (slide 19). The coronoid process serves as an essential anterior bony buttress, preventing posterior subluxation of the elbow joint (slide 22).'
      ],
      steps: [
        { label: 'Radius', detail: 'Lateral forearm bone; its distal end carries 80% of wrist load and articulates with scaphoid and lunate (slides 14–17).' },
        { label: 'Ulna', detail: 'Medial forearm bone; its coronoid process acts as an anterior buttress to stabilize the elbow (slides 19–22).' },
        { label: 'Carpals', detail: 'Eight carpal bones arranged in proximal (scaphoid, lunate, triquetrum, pisiform) and distal (trapezium, trapezoid, capitate, hamate) rows (slides 23–26).' }
      ],
      terms: [
        { term: 'Coronoid process', meaning: 'Anterior projection of proximal ulna serving as an anterior buttress against elbow subluxation.' },
        { term: 'TFCC', meaning: 'Triangular fibrocartilage complex cushioning the distal ulna and carpus.' }
      ],
      table: {
        columns: ['Row', 'Bones (Radial to Ulnar)', 'Clinical Feature'],
        rows: [
          ['Proximal carpal row', 'Scaphoid, Lunate, Triquetrum, Pisiform', 'Scaphoid is most fractured; lunate is most dislocated'],
          ['Distal carpal row', 'Trapezium, Trapezoid, Capitate, Hamate', 'Capitate is the largest carpal bone; hamate possesses a palpable hook']
        ]
      },
      keyPoints: [
        'Distal radius bears 80% of axial load; the ulna is separated from the carpus by the TFCC.',
        'Coronoid process fractures destabilize the elbow and permit recurrent posterior dislocation.'
      ],
      sourceRefs: ul([14, 15, 17, 19, 22, 23, 26])
    },
    {
      title: 'Embryology of the Limb Bud and Patterning Axes',
      kind: 'pathway',
      paragraphs: [
        'Limb development initiates in the late 3rd to early 4th week of gestation as paired outgrowths from the lateral plate mesoderm (slide 28). The somatic mesoderm produces the mesenchymal core of the limb bud, covered by an ectodermal cap.',
        'Limb outgrowth and digit specification depend upon three strictly coordinated morphogenetic signaling axes (slide 29):',
        '1. Proximodistal axis: The apical ectodermal ridge (AER) at the distal tip maintains underlying undifferentiated mesenchymal cells in the Progress Zone (PZ) in a state of rapid proliferation, driving longitudinal elongation (slide 29).',
        '2. Anteroposterior axis: Regulated by the zone of polarizing activity (ZPA), a cluster of mesenchymal cells on the posterior limb margin that secretes Sonic Hedgehog (Shh) to pattern thumb-to-little finger identity (slide 29).',
        '3. Dorsoventral axis: Controlled by ectodermal signaling that defines the dorsal surface (extensor) versus the ventral surface (flexor/palmar).'
      ],
      steps: [
        { label: 'Week 3–4', detail: 'Mesenchymal cells from lateral plate mesoderm aggregate to form the initial limb bud (slide 28).' },
        { label: 'AER formation', detail: 'Specialized ectoderm at the distal tip thickens to establish the apical ectodermal ridge (AER) (slide 29).' },
        { label: 'Progress Zone outgrowth', detail: 'Mesenchymal cells proliferate within the progress zone (PZ), driving proximodistal elongation (slide 29).' },
        { label: 'ZPA patterning', detail: 'Posterior ZPA directs anteroposterior digit polarity from digit 1 (thumb) to digit 5 (little finger) (slide 29).' }
      ],
      terms: [
        { term: 'AER', meaning: 'Apical ectodermal ridge; ectodermal thickening driving longitudinal limb bud outgrowth.' },
        { term: 'ZPA', meaning: 'Zone of polarizing activity; posterior mesenchymal organizing centre directing thumb-to-pinky polarity.' },
        { term: 'Progress Zone', meaning: 'Sub-ridge mesenchyme characterized by high proliferative capacity.' }
      ],
      keyPoints: [
        'AER drives proximodistal outgrowth; its disruption causes limb truncation.',
        'ZPA drives anteroposterior patterning; ectopic ZPA transplantation results in mirror-image polydactyly.'
      ],
      sourceRefs: ul([28, 29])
    },
    {
      title: 'Endochondral Ossification and Growth Plate Biology',
      kind: 'mechanism',
      paragraphs: [
        'By the 6th embryonic week, mesenchymal condensation forms a hyaline cartilage model (anlage) of the future long bone (slides 30–32). At the centre of the diaphysis, chondrocytes hypertrophy, secrete alkaline phosphatase, and calcify the surrounding matrix (slides 33–36).',
        'Vascular invasion brings osteoblasts that deposit osteoid (primarily type I collagen) over the calcified cartilage scaffolding, creating the primary ossification centre (slides 35–37). Secondary ossification centres appear in the epiphyses postnatally (slide 49).',
        'Between the epiphysis and metaphysis lies the physis (growth plate), organized into four distinct histologic zones: reserve (resting) zone, proliferative zone, hypertrophic zone, and zone of provisional calcification/metaphysis (slides 40–43).',
        'The hypertrophic zone is mechanically the weakest region of the physis, making it the site of fracture propagation in Salter-Harris type I injuries and the focus of matrix failure in rickets (slides 45–47). Achondroplasia results from defective chondrocyte proliferation in the proliferative zone (slide 57).'
      ],
      steps: [
        { label: 'Reserve zone', detail: 'Resting chondrocytes with low mitotic rate; stores lipids and glycogen (slide 41).' },
        { label: 'Proliferative zone', detail: 'Chondrocytes actively divide in longitudinal columns; site of linear growth; affected in achondroplasia (slides 41, 57).' },
        { label: 'Hypertrophic zone', detail: 'Cells enlarge 5-fold and mineralize matrix; mechanically weakest layer; site of Salter-Harris fractures and rickets (slides 42, 47).' },
        { label: 'Metaphysis', detail: 'Vascular loops invade; osteoblasts lay down woven bone over calcified cartilage bars (slide 43).' }
      ],
      terms: [
        { term: 'Physis', meaning: 'Epiphyseal growth plate responsible for longitudinal bone growth.' },
        { term: 'Hypertrophic zone', meaning: 'Layer of enlarged chondrocytes and matrix mineralization; weakest zone of the physis.' },
        { term: 'Endochondral ossification', meaning: 'Formation of bone within a pre-existing hyaline cartilage template.' }
      ],
      keyPoints: [
        'The primary ossification centre develops diaphyseally prior to birth; secondary centres appear postnatally in epiphyses.',
        'The hypertrophic zone is the weakest structural zone, predisposing to growth plate fractures.'
      ],
      sourceRefs: ul([30, 31, 35, 41, 42, 43, 47, 49, 57])
    }
  ],
  summary: [
    'The clavicle is an S-shaped strut most commonly fractured at the junction of its medial two-thirds and lateral third.',
    'The distal radius transmits 80% of axial force through the wrist and articulates with scaphoid and lunate.',
    'Limb bud development is regulated by the AER/PZ (proximodistal axis) and ZPA (anteroposterior axis).',
    'Long bones form via endochondral ossification; the growth plate consists of reserve, proliferative, hypertrophic, and metaphyseal zones.',
    'The hypertrophic zone is mechanically the weakest layer of the growth plate and is involved in rickets and Salter-Harris fractures.'
  ]
};

// ─── Lesson 2: Joints of the Upper Limb ───────────────────────────────

const lesson2: Draft = {
  id: 'upper-limb-2',
  title: 'Joints of the Upper Limb',
  description: 'Sternoclavicular, acromioclavicular, glenohumeral, elbow, radioulnar, and radiocarpal joints: stability, kinematics, and clinical links.',
  xp: 25,
  sourceRefs: ul([62, 64, 66, 68, 69, 71, 72, 73, 74, 76, 79, 82, 83, 85, 87, 88, 89, 92, 130]),
  objectives: [
    'Describe the articulations of the pectoral girdle (sternoclavicular and acromioclavicular joints).',
    'Explain the static and dynamic stabilizers of the glenohumeral joint.',
    'Understand the mechanism and pathology of anterior shoulder dislocation.',
    'Detail the collateral ligament complexes and carrying angle of the elbow joint.',
    'Describe the distal radioulnar joint (DRUJ), the TFCC, and the radiocarpal (wrist) joint.'
  ],
  chunks: [
    {
      title: 'Articulations of the Pectoral Girdle',
      kind: 'structure',
      paragraphs: [
        'The upper limb is connected to the axial skeleton exclusively via the sternoclavicular (SC) joint (slide 68). The SC joint is a saddle synovial joint that functions functionally as a multiaxial ball-and-socket articulation (slide 71).',
        'Stability at the SC joint is provided by a dense fibrocartilaginous intra-articular disc that divides the joint into two cavities, alongside the costoclavicular ligament, anterior and posterior sternoclavicular ligaments, and interclavicular ligament (slide 68).',
        'The acromioclavicular (AC) joint is a plane synovial joint between the lateral clavicle and the acromion (slide 69). While the acromioclavicular ligament resists horizontal displacement, the strong coracoclavicular ligament (comprising the medial conoid and lateral trapezoid ligaments) provides primary vertical stability, suspending the scapula from the clavicle (slide 69).'
      ],
      steps: [
        { label: 'Sternoclavicular joint', detail: 'Saddle joint with an internal disc; resists clavicular displacement via the costoclavicular ligament (slide 68).' },
        { label: 'Acromioclavicular joint', detail: 'Plane joint; primary vertical restraint provided by the coracoclavicular ligament (conoid and trapezoid) (slide 69).' }
      ],
      terms: [
        { term: 'Costoclavicular ligament', meaning: 'Dense ligament binding the medial clavicle to the first rib and cartilage.' },
        { term: 'Coracoclavicular ligament', meaning: 'Conoid and trapezoid ligaments anchoring the clavicle to the coracoid process.' }
      ],
      keyPoints: [
        'The SC joint is the only skeletal link between the upper extremity and trunk.',
        'AC joint vertical stability depends on the coracoclavicular ligament (conoid and trapezoid).'
      ],
      sourceRefs: ul([68, 69, 71])
    },
    {
      title: 'The Glenohumeral Joint and Stability',
      kind: 'mechanism',
      paragraphs: [
        'The glenohumeral (shoulder) joint is a multiaxial ball-and-socket synovial joint characterized by high mobility and low intrinsic bony constraint (slides 72, 73). The shallow glenoid fossa accommodates only one-third of the large spherical humeral head (slide 77).',
        'Joint stability is achieved through a coordinated combination of static and dynamic stabilizers (slides 73, 74):',
        '• Static stabilizers include the glenoid labrum (a fibrocartilaginous rim that deepens the glenoid socket by 50%), the fibrous joint capsule, the glenohumeral ligaments (superior, middle, inferior), and negative intra-articular pressure (slide 74).',
        '• Dynamic stabilizers comprise the rotator cuff muscles (supraspinatus, infraspinatus, teres minor, subscapularis) and the long head of the biceps brachii tendon (slides 73, 85). Active contraction compresses the humeral head into the glenoid cavity (concavity-compression mechanism).'
      ],
      steps: [
        { label: 'Glenoid labrum', detail: 'Fibrocartilaginous ring that deepens the shallow glenoid socket (slide 74).' },
        { label: 'Inferior Glenohumeral Ligament (IGHL)', detail: 'Composed of anterior and posterior bands; primary static restraint to anterior dislocation during abduction and external rotation (slide 74).' },
        { label: 'Dynamic compression', detail: 'Rotator cuff muscles actively centralize the humeral head within the glenoid fossa during all motions (slides 73, 85).' }
      ],
      terms: [
        { term: 'Glenoid labrum', meaning: 'Fibrocartilage lip deepening the glenoid fossa.' },
        { term: 'IGHL', meaning: 'Inferior glenohumeral ligament complex, primary hammock stabilizing the abducted shoulder.' }
      ],
      keyPoints: [
        'The shoulder sacrifices bony congruence for extensive range of motion.',
        'Dynamic stability is provided by the rotator cuff via concavity-compression.'
      ],
      sourceRefs: ul([72, 73, 74, 77, 85])
    },
    {
      title: 'Shoulder Dislocation and Labral Injuries',
      kind: 'clinical',
      paragraphs: [
        'The glenohumeral joint is the most frequently dislocated large joint in the body, with over 95% of dislocations occurring in an anterior (subcoracoid) direction (slide 76). Anterior dislocation typically occurs when a force is applied to an abducted, externally rotated, and extended arm.',
        'In anterior dislocation, the humeral head avulses the anterior-inferior glenoid labrum and attached anterior band of the IGHL, producing a Bankart lesion (slide 76).',
        'Simultaneously, the posterolateral humeral head impacts the hard anterior glenoid rim, creating a compression fracture known as a Hill-Sachs lesion (slide 76). The axillary nerve, which winds tightly around the surgical neck of the humerus, is at direct risk of neuropraxia or traction injury.'
      ],
      steps: [
        { label: 'Injury mechanism', detail: 'Forceful abduction, external rotation, and extension levers the humeral head anteriorly (slide 76).' },
        { label: 'Bankart lesion', detail: 'Tear or avulsion of the anterior-inferior glenoid labrum and attached IGHL (slide 76).' },
        { label: 'Hill-Sachs lesion', detail: 'Impaction fracture of the posterolateral humeral head against the anterior glenoid rim (slide 76).' },
        { label: 'Neurologic risk', detail: 'Traction or compression on the axillary nerve, leading to deltoid weakness and loss of sensation over the lateral arm.' }
      ],
      terms: [
        { term: 'Bankart lesion', meaning: 'Avulsion of the anterior-inferior glenoid labrum following anterior shoulder dislocation.' },
        { term: 'Hill-Sachs lesion', meaning: 'Compression fracture of the posterolateral humeral head against the anterior glenoid rim.' }
      ],
      keyPoints: [
        'Anterior shoulder dislocation is the most common form; Bankart and Hill-Sachs lesions frequently co-occur.',
        'Always assess axillary nerve sensory integrity over the regimental badge area before and after reduction.'
      ],
      sourceRefs: ul([74, 76, 77])
    },
    {
      title: 'The Elbow Joint, Collateral Ligaments and Carrying Angle',
      kind: 'structure',
      paragraphs: [
        'The elbow is a compound trochlear hinge synovial joint composed of the humeroulnar, humeroradial, and proximal radioulnar articulations within a single joint capsule (slide 79).',
        'Medial stability is governed by the medial collateral ligament (MCL) complex. Its anterior bundle is the primary restraint to valgus stress from 20° to 120° of elbow flexion (slide 82). The lateral collateral ligament (LCL) complex includes the lateral ulnar collateral ligament (LUCL), which prevents posterolateral rotatory instability (slide 83).',
        'In the anatomical position with the elbow fully extended and supinated, the forearm angles laterally relative to the arm, forming the carrying angle (typically 10–15° in males and 15–20° in females) (slide 130). An increased angle is cubitus valgus; a decreased angle is cubitus varus (gunstock deformity).'
      ],
      steps: [
        { label: 'MCL anterior bundle', detail: 'Originates on medial epicondyle and inserts on sublime tubercle; primary restraint to valgus stress (slide 82).' },
        { label: 'LUCL', detail: 'Lateral ulnar collateral ligament; prevents posterolateral rotatory subluxation (slide 83).' },
        { label: 'Annular ligament', detail: 'Encircles the radial head, allowing axial rotation while securing the PRUJ (slides 81, 87).' },
        { label: 'Carrying angle', detail: 'Physiologic valgus angle (10–15° men, 15–20° women) allowing swinging clearance past the hips (slide 130).' }
      ],
      terms: [
        { term: 'Carrying angle', meaning: 'Lateral deviation of the extended, supinated forearm relative to the axis of the arm.' },
        { term: 'LUCL', meaning: 'Lateral ulnar collateral ligament resisting posterolateral rotatory instability.' }
      ],
      keyPoints: [
        'The anterior bundle of the MCL is the primary restraint against valgus stress.',
        'The carrying angle averages 10–15° in men and 15–20° in women.'
      ],
      sourceRefs: ul([79, 81, 82, 83, 130])
    },
    {
      title: 'Radioulnar Joints, the TFCC and the Radiocarpal Joint',
      kind: 'structure',
      paragraphs: [
        'Forearm pronation and supination occur at the proximal and distal radioulnar joints (PRUJ and DRUJ), which function synchronously as a bicentric pivot articulation (slides 87, 88).',
        'At the DRUJ, the head of the ulna articulates with the ulnar notch of the distal radius. The primary stabilizer is the Triangular Fibrocartilage Complex (TFCC), a fibrocartilaginous disc anchored to the ulnar fovea at the base of the styloid process (slides 88, 89). The TFCC cushions the ulnocarpal joint and transmits 20% of wrist axial load.',
        'The radiocarpal (wrist) joint is a condyloid synovial articulation where the distal articular surface of the radius and the TFCC articulate with the scaphoid, lunate, and triquetrum (slide 92). The distal ulna does not articulate directly with carpal bones.'
      ],
      steps: [
        { label: 'PRUJ', detail: 'Pivot joint; radial head rotates within the annular ligament and radial notch of ulna (slide 87).' },
        { label: 'DRUJ', detail: 'Pivot joint; radius rotates around the ulnar head, stabilized by the TFCC (slides 88, 89).' },
        { label: 'TFCC attachment', detail: 'Attaches to the base of the ulnar styloid (fovea); stabilizes DRUJ and cushions carpus (slide 89).' },
        { label: 'Radiocarpal articulation', detail: 'Radius + TFCC articulate with scaphoid, lunate, and triquetrum (slide 92).' }
      ],
      terms: [
        { term: 'DRUJ', meaning: 'Distal radioulnar joint responsible for forearm pronosupination.' },
        { term: 'TFCC', meaning: 'Triangular fibrocartilage complex, principal stabilizer of the DRUJ.' }
      ],
      keyPoints: [
        'The TFCC anchors to the ulnar fovea, stabilizing the DRUJ.',
        'The ulna does not articulate directly with carpal bones; it is separated by the TFCC.'
      ],
      sourceRefs: ul([87, 88, 89, 92])
    }
  ],
  summary: [
    'The SC joint is the only skeletal articulation of the upper limb to the axial skeleton.',
    'Dynamic shoulder stability is achieved by active rotator cuff concavity-compression.',
    'Anterior shoulder dislocation causes Bankart labral tears, Hill-Sachs fractures, and axillary nerve vulnerability.',
    'The anterior bundle of the MCL provides primary valgus restraint at the elbow.',
    'The DRUJ is stabilized by the TFCC, which attaches to the ulnar fovea and cushions the wrist.'
  ]
};

// ─── Lesson 3: Pectoral Region, Rotator Cuff and Axillary Spaces ──────

const lesson3: Draft = {
  id: 'upper-limb-3',
  title: 'Pectoral Region, Rotator Cuff and Axillary Spaces',
  description: 'Anterior chest wall musculature, rotator cuff anatomy and actions, and the surgical anatomy of the quadrangular and triangular spaces.',
  xp: 25,
  sourceRefs: ul([93, 95, 97, 98, 99, 101, 105, 106, 108, 109, 110, 112, 114, 115, 116, 117]),
  objectives: [
    'Describe the attachments, innervation, and actions of pectoralis major, pectoralis minor, subclavius, and serratus anterior.',
    'Explain the clinical presentation and neurovascular cause of a winged scapula.',
    'Detail the rotator cuff muscles (SITS), their individual actions, and innervation.',
    'Define the boundaries and neurovascular contents of the quadrangular space, upper triangular space, and triangular interval.'
  ],
  chunks: [
    {
      title: 'Muscles of the Pectoral Region and Shoulder Girdle',
      kind: 'structure',
      paragraphs: [
        'The pectoral region forms the anterior muscular wall of the axilla and comprises pectoralis major, pectoralis minor, and subclavius (slides 95–99).',
        'Pectoralis major has two heads: a clavicular head (from medial half of clavicle) and a sternocostal head (from sternum and costal cartilages 1–6). It inserts into the lateral lip of the bicipital groove of the humerus (slides 97, 99). Innervation is provided by both the lateral pectoral nerve (C5–C7) and medial pectoral nerve (C8–T1). The muscle is a powerful adductor and medial rotator of the humerus; its clavicular head flexes the extended arm.',
        'Pectoralis minor arises from ribs 3–5 and inserts on the medial border of the coracoid process, innervated by the medial pectoral nerve (slide 97). It stabilizes the scapula and serves as the key landmark dividing the axillary artery into three parts (slides 97, 202).',
        'Serratus anterior arises from the upper 8 ribs and inserts on the costal surface of the medial scapular border (slide 101). Innervated by the long thoracic nerve of Bell (C5–C7), it protracts the scapula and rotates the glenoid cavity upward during arm abduction above 90°. Damage to the long thoracic nerve causes medial winging of the scapula (slide 101).'
      ],
      steps: [
        { label: 'Pectoralis major', detail: 'Clavicular and sternocostal heads; lateral and medial pectoral nerves; adducts and medially rotates humerus (slides 97, 99).' },
        { label: 'Pectoralis minor', detail: 'Attaches to coracoid process; medial pectoral nerve; anatomical landmark for axillary artery parts (slides 97, 202).' },
        { label: 'Serratus anterior', detail: 'Arises from ribs 1–8; long thoracic nerve; protracts scapula; paralysis produces winged scapula (slide 101).' },
        { label: 'Subclavius', detail: 'Small muscle beneath clavicle; nerve to subclavius; protects subclavian vessels during clavicle fractures (slide 97).' }
      ],
      terms: [
        { term: 'Winged scapula', meaning: 'Prominence of the medial scapular border due to serratus anterior paralysis from long thoracic nerve injury.' },
        { term: 'Long thoracic nerve', meaning: 'Arises from C5–C7 nerve roots; travels superficially down the lateral thoracic wall.' }
      ],
      keyPoints: [
        'Pectoralis major receives dual innervation from both lateral and medial pectoral nerves.',
        'Serratus anterior upwardly rotates the scapula for abduction above 90°; long thoracic nerve injury results in scapular winging.'
      ],
      sourceRefs: ul([95, 97, 99, 101])
    },
    {
      title: 'The Rotator Cuff (SITS)',
      kind: 'mechanism',
      paragraphs: [
        'The rotator cuff is formed by four intrinsic scapulohumeral muscles whose tendons blend with the fibrous capsule of the glenohumeral joint (slide 106). The muscles are remembered by the acronym SITS: Supraspinatus, Infraspinatus, Teres minor, and Subscapularis (slides 106–110).',
        '• Supraspinatus arises from the supraspinous fossa and inserts on the superior facet of the greater tubercle. Innervated by the suprascapular nerve (C5, C6), it initiates the first 15° of arm abduction before deltoid takes over (slide 109). It is the most commonly torn rotator cuff tendon.',
        '• Infraspinatus arises from the infraspinous fossa and inserts on the middle facet of the greater tubercle. Innervated by the suprascapular nerve, it laterally rotates the humerus (slide 110).',
        '• Teres minor arises from the lateral border of the scapula and inserts on the inferior facet of the greater tubercle. Innervated by the axillary nerve (C5, C6), it assists infraspinatus in lateral rotation (slides 110, 112).',
        '• Subscapularis arises from the subscapular fossa on the anterior scapula and inserts on the lesser tubercle of the humerus. Innervated by upper and lower subscapular nerves (C5, C6), it is the primary medial rotator of the humerus (slide 108).'
      ],
      table: {
        columns: ['Muscle', 'Origin & Insertion', 'Innervation', 'Primary Action'],
        rows: [
          ['Supraspinatus', 'Supraspinous fossa → Greater tubercle (superior facet)', 'Suprascapular nerve (C5, C6)', 'Initiates abduction (first 15°)'],
          ['Infraspinatus', 'Infraspinous fossa → Greater tubercle (middle facet)', 'Suprascapular nerve (C5, C6)', 'Lateral rotation'],
          ['Teres minor', 'Lateral border of scapula → Greater tubercle (inferior facet)', 'Axillary nerve (C5, C6)', 'Lateral rotation'],
          ['Subscapularis', 'Subscapular fossa → Lesser tubercle', 'Upper and lower subscapular nerves (C5, C6)', 'Medial rotation']
        ]
      },
      terms: [
        { term: 'Rotator cuff', meaning: 'Musculotendinous sleeve (supraspinatus, infraspinatus, teres minor, subscapularis) dynamic stabilizer of shoulder.' },
        { term: 'Suprascapular nerve', meaning: 'Arises from superior trunk of brachial plexus, passes through suprascapular notch.' }
      ],
      keyPoints: [
        'Supraspinatus initiates abduction (0–15°); deltoid continues abduction to 90°.',
        'Subscapularis is the only rotator cuff muscle inserting on the lesser tubercle and mediating medial rotation.'
      ],
      sourceRefs: ul([106, 108, 109, 110])
    },
    {
      title: 'Posterior Scapular Spaces (Quadrangular and Triangular)',
      kind: 'structure',
      figure: 'upper-limb:axillary-spaces',
      paragraphs: [
        'The arrangement of muscles crossing from the scapula to the humerus creates three distinct surgical spaces in the posterior scapular and axillary regions (slides 112–117):',
        '• Quadrangular space: Bounded superiorly by teres minor (subscapularis anteriorly), inferiorly by teres major, medially by the long head of triceps brachii, and laterally by the surgical neck of the humerus (slides 112, 115). It transmits the axillary nerve and posterior circumflex humeral vessels.',
        '• Upper triangular space: Bounded superiorly by teres minor, inferiorly by teres major, and laterally by the long head of triceps brachii (slide 114). It transmits the circumflex scapular artery (branch of the subscapular artery).',
        '• Triangular interval (lower triangular space): Bounded superiorly by teres major, medially by the long head of triceps brachii, and laterally by the lateral head of triceps (or humeral shaft) (slide 117). It transmits the radial nerve and profunda brachii artery into the posterior arm compartment.'
      ],
      steps: [
        { label: 'Quadrangular space', detail: 'Teres minor, teres major, triceps long head, humeral surgical neck; contains axillary nerve and posterior circumflex humeral artery (slides 112, 115).' },
        { label: 'Upper triangular space', detail: 'Teres minor, teres major, triceps long head; contains circumflex scapular artery (slide 114).' },
        { label: 'Triangular interval', detail: 'Teres major, triceps long head, triceps lateral head/humerus; contains radial nerve and profunda brachii artery (slide 117).' }
      ],
      terms: [
        { term: 'Quadrangular space', meaning: 'Anatomic space transmitting axillary nerve and posterior circumflex humeral artery.' },
        { term: 'Triangular interval', meaning: 'Passageway transmitting radial nerve and profunda brachii artery to radial groove.' }
      ],
      keyPoints: [
        'Axillary nerve and posterior circumflex humeral vessels pass through the quadrangular space.',
        'The radial nerve and profunda brachii artery exit the axilla via the triangular interval.'
      ],
      sourceRefs: ul([112, 114, 115, 116, 117])
    }
  ],
  summary: [
    'Pectoralis major has dual innervation (lateral and medial pectoral nerves) and adducts and medially rotates the arm.',
    'Serratus anterior is supplied by the long thoracic nerve; injury causes a winged scapula.',
    'Rotator cuff muscles (SITS) provide dynamic stability: supraspinatus initiates abduction, infraspinatus/teres minor rotate laterally, subscapularis rotates medially.',
    'The quadrangular space transmits the axillary nerve and posterior circumflex humeral vessels.',
    'The triangular interval transmits the radial nerve and profunda brachii artery.'
  ]
};

// ─── Lesson 4: Arm and the Cubital Fossa ───────────────────────────────

const lesson4: Draft = {
  id: 'upper-limb-4',
  title: 'Arm and the Cubital Fossa',
  description: 'Anterior flexor and posterior extensor compartments of the brachium, alongside the boundaries, floor, roof, and contents of the cubital fossa.',
  xp: 25,
  sourceRefs: ul([118, 121, 122, 123, 124, 126, 127, 128, 131, 134, 135, 187, 191]),
  objectives: [
    'Describe the muscles of the anterior compartment of the arm (biceps brachii, coracobrachialis, brachialis) and their innervation.',
    'Detail the heads, innervation, and action of triceps brachii in the posterior compartment.',
    'Define the boundaries, floor, and roof of the cubital fossa.',
    'List the four contents of the cubital fossa in order from medial to lateral.'
  ],
  chunks: [
    {
      title: 'Anterior Compartment of the Arm',
      kind: 'structure',
      paragraphs: [
        'The arm is divided into anterior (flexor) and posterior (extensor) compartments by the humerus and medial and lateral intermuscular septa (slides 121, 122).',
        'The anterior compartment contains three muscles innervated by the musculocutaneous nerve (C5–C7) (slides 118, 123):',
        '• Biceps brachii: Consists of a short head (originating from the tip of the coracoid process) and a long head (originating from the supraglenoid tubercle, with an intracapsular tendon) (slide 124). It inserts into the radial tuberosity and sends the bicipital aponeurosis into the deep fascia of the forearm. It is the most powerful supinator of the flexed forearm and a potent elbow flexor (slides 124, 125).',
        '• Coracobrachialis: Arises from the coracoid process and inserts onto the medial border of the humeral shaft (slide 126). It is pierced by the musculocutaneous nerve and acts to flex and adduct the arm.',
        '• Brachialis: Arises from the distal half of the anterior humerus and inserts onto the coronoid process and ulnar tuberosity (slide 127). It is the workhorse flexor of the elbow, generating powerful flexion regardless of forearm pronation or supination (slide 127).'
      ],
      steps: [
        { label: 'Biceps brachii', detail: 'Short head (coracoid) + long head (supraglenoid); inserts on radial tuberosity; powerful supinator and flexor (slides 124, 125).' },
        { label: 'Coracobrachialis', detail: 'Pierced by musculocutaneous nerve; flexes and adducts the arm (slide 126).' },
        { label: 'Brachialis', detail: 'Inserts on coronoid process of ulna; workhorse elbow flexor in all forearm positions (slide 127).' }
      ],
      terms: [
        { term: 'Musculocutaneous nerve', meaning: 'Terminal branch of lateral cord of brachial plexus, pierces coracobrachialis and supplies BBC.' },
        { term: 'Bicipital aponeurosis', meaning: 'Fibrous expansion of biceps tendon passing medially over the brachial artery and median nerve.' }
      ],
      keyPoints: [
        'Biceps brachii supinates the flexed forearm; brachialis is the primary flexor in all rotational positions.',
        'The musculocutaneous nerve pierces coracobrachialis and terminates as the lateral cutaneous nerve of the forearm.'
      ],
      sourceRefs: ul([118, 123, 124, 126, 127])
    },
    {
      title: 'Posterior Compartment of the Arm',
      kind: 'structure',
      paragraphs: [
        'The posterior compartment of the arm is occupied primarily by the triceps brachii muscle, innervated by the radial nerve (C6–C8) (slides 128, 129).',
        'Triceps brachii has three heads of origin:',
        '• Long head: Arises from the infraglenoid tubercle of the scapula. Because it crosses the glenohumeral joint, it assists in adduction and extension of the arm in addition to stabilizing the abducted shoulder (slide 128).',
        '• Lateral head: Arises from the posterior humerus superior to the radial groove (slide 128).',
        '• Medial head: Arises from the extensive posterior surface of the humerus inferior to the radial groove (slide 128).',
        'All three heads converge onto a common tendon that inserts onto the proximal olecranon process of the ulna, acting as the primary extensor of the elbow joint (slides 128, 129).'
      ],
      steps: [
        { label: 'Long head', detail: 'Originates from infraglenoid tubercle; crosses shoulder and elbow joints (slide 128).' },
        { label: 'Lateral head', detail: 'Originates superior to radial groove on posterior humerus (slide 128).' },
        { label: 'Medial head', detail: 'Originates inferior to radial groove; deep workhorse extensor (slide 128).' },
        { label: 'Insertion', detail: 'All heads insert into the olecranon process of the ulna via a stout tendon (slide 128).' }
      ],
      terms: [
        { term: 'Triceps brachii', meaning: 'Three-headed posterior arm muscle; chief extensor of the elbow.' },
        { term: 'Radial groove', meaning: 'Spiral groove on posterior humerus carrying radial nerve and profunda brachii artery.' }
      ],
      keyPoints: [
        'Triceps brachii is innervated by the radial nerve and inserts on the olecranon process.',
        'The long head of triceps crosses both shoulder and elbow joints, helping prevent inferior humeral displacement.'
      ],
      sourceRefs: ul([128, 129])
    },
    {
      title: 'The Cubital Fossa: Boundaries, Floor, Roof and Contents',
      kind: 'structure',
      figure: 'upper-limb:cubital-fossa',
      paragraphs: [
        'The cubital fossa is a triangular space situated on the anterior aspect of the elbow (slides 131, 134). It is defined by three strict boundaries:',
        '• Superior border (base): An imaginary horizontal line between the medial and lateral epicondyles of the humerus (slide 134).',
        '• Medial border: The lateral margin of pronator teres (slide 134).',
        '• Lateral border: The medial margin of brachioradialis (slide 134).',
        '• Apex: Formed distally where brachioradialis crosses anterior to pronator teres (slide 134).',
        '• Floor: Formed proximally by brachialis and distally by supinator (slide 134).',
        '• Roof: Formed by skin, superficial fascia containing the median cubital vein, and deep fascia reinforced by the bicipital aponeurosis (which separates the superficial vein from the deeper brachial artery) (slides 134, 135).',
        'The four structures within the cubital fossa, ordered from medial to lateral (mnemonic MBBR: Median, Brachial, Biceps, Radial) (slides 134, 135):',
        '1. Median nerve | 2. Brachial artery and its bifurcation into radial and ulnar arteries | 3. Biceps brachii tendon | 4. Radial nerve (sheltered deep between brachialis and brachioradialis).'
      ],
      steps: [
        { label: '1. Median nerve (most medial)', detail: 'Runs medial to the brachial artery, leaving the fossa between the heads of pronator teres (slide 134).' },
        { label: '2. Brachial artery', detail: 'Bifurcates at the radial neck into radial and ulnar arteries; covered by bicipital aponeurosis (slides 134, 206).' },
        { label: '3. Biceps tendon', detail: 'Tendon passes deep to insert on the radial tuberosity (slides 124, 134).' },
        { label: '4. Radial nerve (most lateral)', detail: 'Lies deep beneath brachioradialis, splitting into superficial sensory and deep PIN branches (slide 135).' }
      ],
      terms: [
        { term: 'Cubital fossa', meaning: 'Triangular depression on anterior elbow containing vital neurovascular structures.' },
        { term: 'Median cubital vein', meaning: 'Superficial vein in fossa roof commonly used for venipuncture.' }
      ],
      keyPoints: [
        'Cubital fossa contents from medial to lateral: Median nerve, Brachial artery, Biceps tendon, Radial nerve (MBBR).',
        'The bicipital aponeurosis protects the brachial artery and median nerve during venipuncture of the median cubital vein.'
      ],
      sourceRefs: ul([131, 134, 135, 191])
    }
  ],
  summary: [
    'Anterior arm muscles (biceps brachii, coracobrachialis, brachialis) are innervated by the musculocutaneous nerve.',
    'Biceps supinates the flexed forearm; brachialis is the workhorse flexor in all forearm positions.',
    'Triceps brachii extends the elbow and is innervated by the radial nerve.',
    'The cubital fossa is bounded by epicondylar line, pronator teres, and brachioradialis.',
    'Contents of the cubital fossa from medial to lateral: Median nerve, Brachial artery, Biceps tendon, Radial nerve.'
  ]
};

// ─── Lesson 5: Forearm and Anatomical Snuffbox ─────────────────────────

const lesson5: Draft = {
  id: 'upper-limb-5',
  title: 'Forearm and Anatomical Snuffbox',
  description: 'Flexor-pronator and extensor compartments of the forearm, the six extensor tunnels, and the anatomical snuffbox.',
  xp: 25,
  sourceRefs: ul([137, 138, 140, 141, 146, 155, 157, 158, 159, 161, 162, 163, 167, 168, 169, 170, 172, 178, 179, 180, 182, 183, 196]),
  objectives: [
    'Describe the three layers of anterior forearm flexor muscles and their innervation patterns.',
    'Explain the role of the anterior interosseous nerve (AIN) and how to test it clinically.',
    'Detail the extensor musculature of the posterior forearm, including the mobile wad of three.',
    'List the six dorsal fibro-osseous extensor compartments of the wrist.',
    'Describe the boundaries, contents, and clinical significance of the anatomical snuffbox.'
  ],
  chunks: [
    {
      title: 'Anterior Forearm: Flexor-Pronator Compartment',
      kind: 'structure',
      paragraphs: [
        'The anterior compartment of the forearm contains eight muscles arranged in three layers: superficial (4), intermediate (1), and deep (3) (slides 137, 141).',
        '• Superficial layer (4): Pronator teres, Flexor carpi radialis (FCR), Palmaris longus, and Flexor carpi ulnaris (FCU). All four arise from a common flexor origin on the medial epicondyle of the humerus (slide 137). FCU is unique in inserting into the pisiform and being innervated by the ulnar nerve (all others by the median nerve) (slides 138, 141).',
        '• Intermediate layer (1): Flexor digitorum superficialis (FDS). Arises from humeroulnar and radial heads; its four tendons pass through the carpal tunnel, splitting into two slips on the middle phalanges of digits 2–5 to flex the proximal interphalangeal (PIP) joints (slide 140). Innervated by the median nerve.',
        '• Deep layer (3): Flexor digitorum profundus (FDP), Flexor pollicis longus (FPL), and Pronator quadratus (PQ) (slide 141). FDP tendons pass through the split in FDS tendons to insert on the distal phalanges, flexing the distal interphalangeal (DIP) joints. FDP has dual innervation: medial half (digits 4 & 5) by the ulnar nerve, and lateral half (digits 2 & 3) by the anterior interosseous nerve (AIN). FPL and PQ are supplied entirely by the AIN (slides 141, 196).'
      ],
      steps: [
        { label: 'Superficial flexors', detail: 'Pronator teres, FCR, Palmaris longus (median nerve) and FCU (ulnar nerve) (slides 137, 138).' },
        { label: 'Intermediate flexor', detail: 'FDS splits around FDP to insert on middle phalanges; flexes PIP joints; median nerve (slide 140).' },
        { label: 'Deep flexors', detail: 'FDP (flexes DIPs; dual innervation), FPL (flexes thumb IP), PQ (pronates) (slides 141, 196).' },
        { label: 'AIN testing', detail: 'Tested by asking the patient to make the "OK" sign (flexing thumb IP and index DIP joints); weakness indicates AIN neuropathy.' }
      ],
      terms: [
        { term: 'Common flexor origin', meaning: 'Medial epicondyle of the humerus where superficial flexors originate.' },
        { term: 'AIN', meaning: 'Anterior interosseous nerve; motor branch of median nerve supplying deep forearm flexors.' }
      ],
      keyPoints: [
        'All anterior forearm muscles are median-innervated except FCU and the medial half of FDP (ulnar nerve).',
        'FDS flexes PIP joints; FDP flexes DIP joints; AIN integrity is verified by the "OK" sign.'
      ],
      sourceRefs: ul([137, 138, 140, 141, 196])
    },
    {
      title: 'Posterior Forearm: Extensor-Supinator Compartment',
      kind: 'structure',
      paragraphs: [
        'The posterior compartment contains twelve muscles innervated by the radial nerve or its deep motor branch, the posterior interosseous nerve (PIN) (slides 146, 155). Most originate from the common extensor origin on the lateral humeral epicondyle.',
        'The muscles are grouped into three functional sets (slides 155, 157, 165):',
        '• Mobile wad of three: Brachioradialis (flexes elbow in mid-pronation; radial nerve), Extensor carpi radialis longus (ECRL; radial nerve), and Extensor carpi radialis brevis (ECRB; deep radial/PIN) (slides 157–160).',
        '• Superficial extensor layer (4): Extensor digitorum (ED; extends digits at MCP joints), Extensor digiti minimi (EDM; extends little finger), Extensor carpi ulnaris (ECU; extends and adducts wrist), and Anconeus (assists extension and stabilizes ulna) (slides 161–164, 189).',
        '• Deep extensor layer (5): Supinator (encircles radius; pierced by PIN), Abductor pollicis longus (APL), Extensor pollicis brevis (EPB), Extensor pollicis longus (EPL), and Extensor indicis (EI) (slides 165, 167–172).'
      ],
      steps: [
        { label: 'Mobile wad of three', detail: 'Brachioradialis, ECRL, ECRB; originate from lateral supracondylar ridge (slides 157–160).' },
        { label: 'Superficial extensors', detail: 'ED, EDM, ECU, Anconeus; originate from lateral epicondyle (slides 161–164).' },
        { label: 'Deep "outcropper" thumb muscles', detail: 'APL, EPB, EPL emerge obliquely to control the thumb (slides 165, 168–170).' },
        { label: 'Supinator and PIN', detail: 'Supinator is pierced by the deep branch of the radial nerve, which emerges as the PIN (slide 167).' }
      ],
      terms: [
        { term: 'PIN', meaning: 'Posterior interosseous nerve; deep motor branch of radial nerve traversing supinator.' },
        { term: 'Mobile wad', meaning: 'Brachioradialis, ECRL, and ECRB along the lateral forearm.' }
      ],
      keyPoints: [
        'All posterior forearm muscles are innervated by the radial nerve (directly or via PIN).',
        'The PIN pierces the supinator and supplies the deep extensor group.'
      ],
      sourceRefs: ul([155, 157, 161, 162, 165, 167, 168, 169, 170, 172])
    },
    {
      title: 'Extensor Tendon Compartments and the Anatomical Snuffbox',
      kind: 'structure',
      figure: 'upper-limb:extensor-compartments',
      paragraphs: [
        'At the dorsal aspect of the wrist, the extensor retinaculum forms six separate fibro-osseous compartments through which tendons pass lined by synovial sheaths (slide 178):',
        '• Compartment 1: Abductor pollicis longus (APL) and Extensor pollicis brevis (EPB) — site of De Quervain’s tenosynovitis.',
        '• Compartment 2: Extensor carpi radialis longus (ECRL) and Extensor carpi radialis brevis (ECRB).',
        '• Compartment 3: Extensor pollicis longus (EPL) — hooks medially around the dorsal tubercle of the radius (Lister’s tubercle).',
        '• Compartment 4: Extensor digitorum (ED) and Extensor indicis (EI).',
        '• Compartment 5: Extensor digiti minimi (EDM).',
        '• Compartment 6: Extensor carpi ulnaris (ECU).',
        'The anatomical snuffbox is a triangular hollow on the posterolateral wrist seen during active thumb extension (slides 179–183):',
        '• Lateral (anterior) border: Tendons of APL and EPB (Compartment 1).',
        '• Medial (posterior) border: Tendon of EPL (Compartment 3).',
        '• Floor: Formed by the scaphoid proximally, trapezium distally, and base of the 1st metacarpal (slide 180).',
        '• Contents: The radial artery traverses the floor before piercing the first dorsal interosseous muscle (slide 182). Superficial branch of radial nerve and cephalic vein cross the roof. Tenderness in the snuffbox floor strongly suggests a scaphoid fracture (slide 180).'
      ],
      steps: [
        { label: 'Compartment 1', detail: 'APL and EPB; forms lateral border of snuffbox; involved in De Quervain’s tenosynovitis (slides 178, 179).' },
        { label: 'Compartment 3', detail: 'EPL alone; wraps around Lister’s tubercle to form medial border of snuffbox (slides 178, 179).' },
        { label: 'Snuffbox floor', detail: 'Scaphoid and trapezium; radial artery crosses the floor (slides 180, 182).' },
        { label: 'Scaphoid fracture link', detail: 'Blood supply enters scaphoid distally; proximal pole fractures carry high risk of avascular necrosis (AVN).' }
      ],
      terms: [
        { term: 'Anatomical snuffbox', meaning: 'Triangular depression between APL/EPB and EPL tendons over scaphoid and radial artery.' },
        { term: 'Lister’s tubercle', meaning: 'Dorsal radial tubercle serving as a pulley for extensor pollicis longus.' },
        { term: 'De Quervain’s tenosynovitis', meaning: 'Stenosing tenosynovitis of the first extensor compartment (APL and EPB).' }
      ],
      keyPoints: [
        'Snuffbox lateral border = APL + EPB (compartment 1); medial border = EPL (compartment 3).',
        'The radial artery lies in the floor of the snuffbox against the scaphoid bone.'
      ],
      sourceRefs: ul([178, 179, 180, 182, 183])
    }
  ],
  summary: [
    'Superficial anterior forearm flexors arise from the medial epicondyle (common flexor origin).',
    'Deep anterior flexors (FPL, PQ, lateral FDP) are innervated by the anterior interosseous nerve (AIN).',
    'Posterior forearm extensors are supplied by the radial nerve/PIN; tendons run through 6 dorsal compartments.',
    'Compartment 1 (APL, EPB) forms the lateral snuffbox border; Compartment 3 (EPL) forms the medial border.',
    'The radial artery crosses the floor of the anatomical snuffbox over the scaphoid and trapezium.'
  ]
};

// ─── Lesson 6: Arteries and Nerves of the Upper Limb ──────────────────

const lesson6: Draft = {
  id: 'upper-limb-6',
  title: 'Arteries and Nerves of the Upper Limb',
  description: 'Subclavian, axillary, brachial, radial, and ulnar arterial supply, collateral anastomoses, and the courses of major peripheral nerves.',
  xp: 25,
  sourceRefs: ul([198, 199, 201, 202, 203, 204, 206, 207, 208, 210, 211, 215, 217, 220, 221, 225, 227, 229, 230, 232, 234, 238]),
  objectives: [
    'Detail the origin, course, parts, and branches of the axillary artery.',
    'Describe the collateral circulation around the scapula (scapular anastomosis).',
    'Outline the course and major branches of the brachial, radial, and ulnar arteries.',
    'Describe the course, relations, and motor/sensory distribution of the median, radial, and ulnar nerves.',
    'Correlate nerve injuries with characteristic clinical presentations (wrist drop, claw hand, benediction sign).'
  ],
  chunks: [
    {
      title: 'The Axillary Artery and Scapular Anastomosis',
      kind: 'pathway',
      paragraphs: [
        'The main arterial stem of the upper limb begins as the subclavian artery, which becomes the axillary artery at the lateral border of the 1st rib (slides 199, 201). The axillary artery terminates at the lower border of teres major, where it continues as the brachial artery (slides 201, 206).',
        'The axillary artery is divided into three parts by pectoralis minor (slides 202–204):',
        '• 1st part (medial/proximal to pectoralis minor): 1 branch — Superior thoracic artery (supplies upper thoracic wall) (slide 202).',
        '• 2nd part (deep to pectoralis minor): 2 branches — Thoracoacromial artery (gives pectoral, acromial, clavicular, and deltoid branches) and Lateral thoracic artery (runs with long thoracic nerve) (slide 203).',
        '• 3rd part (lateral/distal to pectoralis minor): 3 branches — Subscapular artery (largest branch, dividing into circumflex scapular and thoracodorsal arteries), Anterior circumflex humeral artery, and Posterior circumflex humeral artery (travels through quadrangular space with axillary nerve) (slide 204).',
        'The scapular anastomosis creates an extensive network linking branches of the subclavian artery (suprascapular and dorsal scapular arteries) with branches of the third part of the axillary artery (circumflex scapular and thoracodorsal) (slides 204, 210). This permits retrograde collateral perfusion to the arm if the axillary artery is ligated proximal to the subscapular artery.'
      ],
      steps: [
        { label: 'Part 1 (1 branch)', detail: 'Superior thoracic artery (slide 202).' },
        { label: 'Part 2 (2 branches)', detail: 'Thoracoacromial artery and Lateral thoracic artery (slide 203).' },
        { label: 'Part 3 (3 branches)', detail: 'Subscapular, anterior circumflex humeral, posterior circumflex humeral (slide 204).' },
        { label: 'Scapular anastomosis', detail: 'Suprascapular + dorsal scapular (from subclavian) anastomose with circumflex scapular (from axillary) (slides 204, 210).' }
      ],
      terms: [
        { term: 'Axillary artery', meaning: 'Continuation of subclavian artery from 1st rib to inferior border of teres major.' },
        { term: 'Thoracoacromial trunk', meaning: 'Branch of 2nd part of axillary artery giving pectoral, acromial, clavicular, and deltoid twigs.' }
      ],
      keyPoints: [
        'Pectoralis minor divides the axillary artery: Part 1 has 1 branch, Part 2 has 2 branches, Part 3 has 3 branches.',
        'The scapular anastomosis protects blood supply to the limb in cases of proximal axillary occlusion.'
      ],
      sourceRefs: ul([201, 202, 203, 204, 206, 210])
    },
    {
      title: 'Brachial, Radial and Ulnar Arteries',
      kind: 'pathway',
      paragraphs: [
        'The brachial artery begins at the lower border of teres major and descends in the medial arm accompanied by the median nerve (slides 206, 220).',
        'In the proximal arm, it gives off its largest branch, the profunda brachii (deep artery of arm), which travels with the radial nerve into the radial groove (slides 208, 221). It also gives the superior and inferior ulnar collateral arteries, which contribute to the peri-articular anastomosis around the elbow (slides 208, 210).',
        'In the cubital fossa, opposite the neck of the radius, the brachial artery bifurcates into its terminal branches (slides 211, 215, 225):',
        '• Radial artery: Passes deep to brachioradialis in the forearm; becomes palpable at the wrist lateral to FCR tendon; enters the anatomical snuffbox, passes between the heads of the 1st dorsal interosseous muscle, and forms the deep palmar arch (slides 215, 217).',
        '• Ulnar artery: Larger terminal branch; passes deep to pronator teres and joins the ulnar nerve; gives off the common interosseous artery (which splits into anterior and posterior interosseous arteries); enters the palm superficial to the flexor retinaculum to form the superficial palmar arch (slides 211, 225, 227).'
      ],
      steps: [
        { label: 'Profunda brachii', detail: 'Accompanies radial nerve in the spiral groove; supplies posterior compartment (slide 221).' },
        { label: 'Bifurcation', detail: 'Occurs in cubital fossa at radial neck into radial and ulnar arteries (slides 211, 215).' },
        { label: 'Radial artery course', detail: 'Runs under brachioradialis, palpated at wrist, enters snuffbox, forms deep palmar arch (slides 215, 217).' },
        { label: 'Ulnar artery course', detail: 'Gives common interosseous, runs with ulnar nerve, forms superficial palmar arch (slides 211, 225).' }
      ],
      terms: [
        { term: 'Profunda brachii', meaning: 'Deep brachial artery; accompanies radial nerve in the radial groove.' },
        { term: 'Superficial palmar arch', meaning: 'Arterial arcade formed predominantly by the ulnar artery across the mid-palm.' }
      ],
      keyPoints: [
        'The brachial artery bifurcates into radial and ulnar arteries in the cubital fossa.',
        'The radial artery forms the deep palmar arch; the ulnar artery forms the superficial palmar arch.'
      ],
      sourceRefs: ul([206, 208, 211, 215, 217, 220, 221, 225, 227])
    },
    {
      title: 'Peripheral Nerves: Course, Distribution and Lesions',
      kind: 'mechanism',
      paragraphs: [
        'The three major nerves supplying the forearm and hand are the median, radial, and ulnar nerves:',
        '• Median nerve (C5–T1): Descends anteromedially in the arm with the brachial artery without giving motor branches in the arm (slides 220, 230). It traverses the cubital fossa, passes between the heads of pronator teres, and supplies all anterior forearm flexors except FCU and medial FDP (slide 229). It enters the hand through the carpal tunnel, supplying the thenar LOAF muscles (Lumbricals 1 & 2, Opponens pollicis, Abductor pollicis brevis, Flexor pollicis brevis superficial head) and sensation to the lateral 3½ digits. Proximal lesion causes "hand of benediction" when attempting to make a fist; chronic compression causes carpal tunnel syndrome with thenar atrophy.',
        '• Ulnar nerve (C8–T1): Descends along the medial arm, pierces the medial intermuscular septum, and passes posterior to the medial epicondyle (cubital tunnel) (slide 238). It supplies FCU and the medial half of FDP. It enters the hand through Guyon’s canal, supplying hypothenar muscles, all interossei, adductor pollicis, medial two lumbricals, and sensation to the medial 1½ digits. Injury produces a "claw hand" (Klumpke-like deformity) due to loss of lumbrical flexion of MCP and extension of IP joints.',
        '• Radial nerve (C5–T1): Traverses the triangular interval and radial groove with profunda brachii (slides 221, 232). It supplies triceps, brachioradialis, and ECRL before dividing into superficial sensory (dorsum of hand) and deep motor (PIN) branches (slides 232, 234). Midshaft humeral fractures injure the radial nerve in the spiral groove, leading to wrist drop (inability to extend wrist and MCP joints).'
      ],
      steps: [
        { label: 'Median nerve', detail: 'Arm transit without branches; carpal tunnel; LOAF hand muscles; sensory to lateral 3½ digits (slides 229, 230).' },
        { label: 'Ulnar nerve', detail: 'Cubital tunnel behind medial epicondyle; Guyon canal; intrinsic hand muscles; claw hand deformity (slide 238).' },
        { label: 'Radial nerve', detail: 'Radial groove of humerus; triangular interval; wrist drop upon midshaft humeral fracture (slides 221, 232).' }
      ],
      table: {
        columns: ['Nerve', 'Vulnerable Anatomical Site', 'Motor Deficit', 'Classic Clinical Deformity'],
        rows: [
          ['Radial nerve', 'Midshaft humerus (radial groove)', 'Wrist and finger extensors paralyzed', 'Wrist drop'],
          ['Ulnar nerve', 'Medial epicondyle / Guyon canal', 'Interossei, medial lumbricals, adductor pollicis', 'Claw hand (hyperextended MCPs, flexed IPs)'],
          ['Median nerve', 'Supracondylar fracture / carpal tunnel', 'Pronators, lateral flexors, thenar muscles', 'Hand of benediction / Ape hand deformity']
        ]
      },
      terms: [
        { term: 'Wrist drop', meaning: 'Inability to extend the wrist due to radial nerve paralysis.' },
        { term: 'Claw hand', meaning: 'Hyperextension of MCP and flexion of IP joints due to ulnar nerve injury.' },
        { term: 'Carpal tunnel syndrome', meaning: 'Compression of the median nerve within the carpal tunnel beneath the flexor retinaculum.' }
      ],
      keyPoints: [
        'Radial nerve injury in the spiral groove produces wrist drop with preserved triceps function.',
        'The ulnar nerve is vulnerable behind the medial epicondyle; injury impairs intrinsic hand fine motor control.',
        'The median nerve supplies LOAF muscles in the hand and sensation to the lateral 3½ digits.'
      ],
      sourceRefs: ul([220, 221, 229, 230, 232, 234, 238])
    }
  ],
  summary: [
    'Pectoralis minor divides the axillary artery into 3 parts, giving 1, 2, and 3 branches respectively.',
    'Scapular anastomosis provides collateral circulation bypassing axillary artery obstruction.',
    'The brachial artery bifurcates in the cubital fossa into the radial and ulnar arteries.',
    'Median nerve supplies anterior forearm flexors and thenar LOAF muscles; compression causes carpal tunnel syndrome.',
    'Ulnar nerve passes behind the medial epicondyle to supply intrinsic hand muscles; injury results in claw hand.',
    'Radial nerve runs in the radial groove with profunda brachii; injury produces wrist drop.'
  ]
};

// ─── Export Combined Lessons ────────────────────────────────────────

export const lessons: Draft[] = [lesson1, lesson2, lesson3, lesson4, lesson5, lesson6].map((lesson) => ({
  ...lesson,
  ...readingExtras[lesson.id],
  interactive: interactive[lesson.id],
}));
