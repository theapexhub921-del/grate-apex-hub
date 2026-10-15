import { SkeletonAtlas } from '@/components/learning/skeleton-atlas';
import { SubjectScreen } from '@/components/learning/subject-screen';

// Anatomy: courses → topics, with real progress (see data/learning/),
// plus the 3D skeleton atlas on its own tab.
export default function AnatomyScreen() {
  return <SubjectScreen subject="anatomy" atlas={<SkeletonAtlas />} />;
}
