// Apex Challenge rules — a distinct, high-stakes assessment product.
//
//   whole-course scope · timed · 10 seconds per question · system-selected
//   · no repeats within a run · no going back · direct entry allowed
//
// It reuses the question bank and selection engine underneath, but only
// short single-answer questions qualify (isApexEligible), so every question
// can be read and answered within the time — 10 seconds: enough to read
// properly, still fast enough to test real recall (owner's choice).
export const APEX = {
  secondsPerQuestion: 10,
  questionsPerRun: 30,
  minimumQuestions: 8, // below this a course cannot host a fair run
  countdownSeconds: 3,
  revealMs: 450, // flash right/wrong before the next question
} as const;
