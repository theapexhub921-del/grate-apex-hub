// Biochemistry → Hormones (Endocrine Biochemistry): Assertion–Reason questions.
//
// Two real statements about the material (never "the lesson says…"); the
// learner decides whether each is true and whether the Reason explains the
// Assertion. Every statement comes from what the lessons teach (see the
// matching facts in ./questions.ts).
import { assertionReason as ar, type QuestionDraft } from '@/data/topics/build';
import type { ConceptId } from '@/data/topics/hormones-endocrine-biochemistry/sources';

type Q = QuestionDraft<ConceptId>;

export const assertionReasonQuestions: Q[] = [
  // ─── Lesson 1 — The endocrine system and hormones
  ar('ar1-01', 'target-specificity',
    'Nearly all body cells respond to thyroxine.',
    'Nearly all body cells have thyroxine receptors.',
    'explains',
    'Both are true. A cell responds to a hormone only if it has receptors for it.'),
  ar('ar1-02', 'target-specificity',
    'Most major hormones reach virtually all tissues, yet only some cells respond.',
    'A cell is a target only if it has specific protein receptors for that hormone.',
    'explains',
    'Both are true. Hormone–receptor binding is the crucial first step in a hormonal reaction.'),
  ar('ar1-03', 'hormone-definition',
    'Endocrine glands release their hormones through ducts.',
    'The endocrine system has a rich vascular and lymphatic drainage.',
    'a-false-r-true',
    'Hormones are secreted by ductless glands into the extracellular fluid. The Reason is true.'),
  ar('ar1-04', 'target-specificity',
    'A cell that doubles its number of receptors for a hormone, at the same blood level, responds more strongly.',
    'The blood level of the hormone is the only factor that decides how strongly a target cell responds.',
    'a-true-r-false',
    'The Assertion is true, but three factors decide the response: the blood level, the relative number of receptors and the affinity of the hormone–receptor complex.'),
  ar('ar1-05', 'hormone-definition',
    'Adipose tissue is considered an endocrine organ.',
    'The pancreas and the gonads make both hormones and exocrine products.',
    'true-unrelated',
    'Both are true, but the pancreas and gonads having two kinds of product does not explain why adipose tissue counts as endocrine.'),

  // ─── Lesson 2 — Hormone classes and second messengers
  ar('ar2-01', 'hormone-effects',
    'Peptide hormones act through receptors on the cell surface and second messengers.',
    'Peptide hormones cannot easily cross the cell membrane.',
    'explains',
    'Both are true. Since they cannot get in, they signal from outside through G proteins and second messengers.'),
  ar('ar2-02', 'camp-pathway',
    'cAMP is a second messenger.',
    'In the cAMP system, the hormone is the first messenger, and cAMP carries its signal inside the cell.',
    'explains',
    'Both are true. cAMP, made from ATP by adenylate cyclase, then activates protein kinases.'),
  ar('ar2-03', 'ip3-dag-calcium',
    'IP₃ releases Ca²⁺ from the endoplasmic reticulum.',
    'In the PIP₂–calcium system, DAG is the third messenger.',
    'a-true-r-false',
    'The Assertion is true, but calcium ions are the third messenger. DAG is a second messenger that activates specific protein kinases.'),
  ar('ar2-04', 'structural-categories',
    'Insulin is a glycoprotein hormone.',
    'FSH, LH and TSH are glycoprotein hormones.',
    'a-false-r-true',
    'Insulin is a protein hormone. The Reason is true.'),
  ar('ar2-05', 'camp-pathway',
    'Steroid hormones act through cAMP.',
    'Adenylate cyclase makes cAMP from GTP.',
    'both-false',
    'Steroids act directly on genes, and adenylate cyclase makes cAMP from ATP (the G protein hydrolyses GTP).'),

  // ─── Lesson 3 — Steroid hormones
  ar('ar3-01', 'adrenal-synthesis',
    'The zona glomerulosa cannot make cortisol.',
    'The zona glomerulosa lacks 17-hydroxylase activity.',
    'explains',
    'Both are true. Cortisol needs hydroxylation at 17, 21 and 11; the glomerulosa hydroxylates at 21, 11 and 18 instead, making aldosterone.'),
  ar('ar3-02', 'steroid-mechanism',
    'Steroid hormones cross the cell membrane by simple diffusion.',
    'Steroid hormones are small and hydrophobic.',
    'explains',
    'Both are true. Being small and lipid-soluble lets them pass through the membrane.'),
  ar('ar3-03', 'steroid-classes',
    'Mineralocorticoid deficiency causes hyperkalaemia and hyponatraemia.',
    'Mineralocorticoids regulate the balance of sodium and potassium in the ECF.',
    'explains',
    'Both are true. Without them the kidney excretes less K⁺ and reabsorbs less Na⁺.'),
  ar('ar3-04', 'hpa-axis',
    'Rising cortisol stimulates the release of CRF and ACTH.',
    'CRF from the hypothalamus starts the glucocorticoid axis.',
    'a-false-r-true',
    'Rising cortisol INHIBITS CRF and ACTH release (negative feedback). The Reason is true.'),
  ar('ar3-05', 'steroid-classes',
    'Steroid hormones are mainly inactivated in the liver.',
    'Inactivated steroids are excreted in urine as conjugates.',
    'true-unrelated',
    'Both are true (methyl, sulphate and glucuronide conjugates), but how they are excreted does not explain where they are inactivated.'),
];
