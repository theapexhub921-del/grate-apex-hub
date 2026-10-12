import { Redirect } from 'expo-router';

import { routes } from '@/lib/routes';

// Kept so older links to /learn/fatty-acid-biosynthesis still work.
export default function FattyAcidBiosynthesisRedirect() {
  return <Redirect href={routes.topic('fatty-acid-biosynthesis')} />;
}
