import { LegalPage } from '@/components/legal-page';

// GRATEAPEX terms of service (public: /terms).
export default function TermsScreen() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="5 October 2026"
      intro="By using GrAte Apex Hub, developed by OrigiNate, you agree to these terms."
      sections={[
        {
          title: 'Educational use',
          paragraphs: [
            'GrAte Apex Hub is a study aid built from lecture material. It is not medical advice and does not replace your lecturers, textbooks or official course requirements. Where the app notes that sources disagree, check with your lecturer.',
          ],
        },
        {
          title: 'Your account',
          points: [
            'Keep your password private; you are responsible for activity on your account.',
            'Use your real study identity and a respectful username.',
            'Do not try to access other learners’ data, interfere with the service, or manipulate XP or rankings.',
          ],
        },
        {
          title: 'Content',
          paragraphs: [
            'Course content in GrAte Apex Hub is provided for your personal study. Do not copy or redistribute it outside the app.',
          ],
        },
        {
          title: 'Ending your account',
          paragraphs: [
            'You can delete your account at any time in Settings. We may suspend accounts that break these terms.',
          ],
        },
        {
          title: 'The service',
          paragraphs: [
            'GrAte Apex Hub is provided as it is, and features may change as the app develops. We work to keep it available and your data safe, but cannot guarantee uninterrupted service.',
          ],
        },
        {
          title: 'Privacy and contact',
          paragraphs: ['How we handle your data is explained in our Privacy Policy at /privacy. Questions: theapexhub921@gmail.com.'],
        },
      ]}
    />
  );
}
