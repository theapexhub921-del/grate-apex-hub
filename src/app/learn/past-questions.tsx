import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackLink } from '@/components/learning/nav-bits';
import { LegacyCourseTile } from '@/components/learning/legacy-course-tile';
import { Icon } from '@/components/ui/icon';
import { Card, Interactive } from '@/components/ui/interactive';
import { PageHeader, Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { LoadingState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import { readClassSelection } from '@/data/class-curriculum';
import { LEGACY_COURSES, type LegacyCourse, legacyCoursesForClass, loadCourseSets } from '@/data/legacy-study';
import { setKind } from '@/data/practice-modes';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';

type Paper = { id: string; name: string; count: number; kind: 'past' | 'predicted' };
type CoursePapers = { course: LegacyCourse; papers: Paper[] };

// /learn/past-questions — the past question bank: real past papers (and the
// predicted papers) from each course's question bank, sat as an exam with the
// answers at the end. Your own class comes first; other semesters are a tap away.
export default function PastQuestionsScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const { session } = useAuth();
  const own = readClassSelection(session?.user.user_metadata);
  const semesters = [1, 2] as const;
  const [semester, setSemester] = useState<1 | 2>(own?.classId === 'HB1' && own.semester === 2 ? 2 : 1);
  const [list, setList] = useState<CoursePapers[] | null>(null);

  useEffect(() => {
    let live = true;
    const ownCourses = own ? legacyCoursesForClass(own) : [];
    const courses = ownCourses.some((course) => course.classId === 'HB2') ? [...ownCourses, ...LEGACY_COURSES.filter((course) => course.semester === semester)] : LEGACY_COURSES.filter((course) => course.semester === semester);
    queueMicrotask(() => { if (live) setList(null); });
    Promise.all(
      courses.map((course) =>
        loadCourseSets(course.id)
          .then((sets) => ({ course, papers: sets.filter((set) => setKind(set.name) !== 'quiz' && setKind(set.name) !== 'test').map((set) => ({ ...set, kind: setKind(set.name) as 'past' | 'predicted' })) }))
          .catch(() => ({ course, papers: [] as Paper[] }))
      )
    ).then((result) => { if (live) setList(result); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester, own?.classId, own?.semester]);

  const total = (list ?? []).reduce((sum, item) => sum + item.papers.length, 0);
  const questions = (list ?? []).reduce((sum, item) => sum + item.papers.reduce((s, paper) => s + paper.count, 0), 0);

  return (
    <Screen width="content">
      <BackLink fallback={routes.learn()} />
      <PageHeader eyebrow="Study" title="Past question bank" subtitle="Real past papers and predicted papers from your courses. Sit one as an exam: the answers are shown at the end, like the real paper." />
      <View style={styles.switch}>
        <SegmentedControl label="Semester" options={semesters.map((value) => ({ value: String(value), label: `HB1 · Semester ${value}` }))} value={String(semester)} onChange={(value) => setSemester(Number(value) as 1 | 2)} />
      </View>
      {list === null ? <LoadingState label="Loading the papers…" /> : <Text style={styles.summary}>{total} papers · {questions.toLocaleString()} questions</Text>}
      <View style={styles.list}>
        {(list ?? []).filter((item) => item.papers.length > 0).map(({ course, papers }) => (
          <Card key={course.id} style={styles.course}>
            <View style={styles.courseHead}>
              <LegacyCourseTile course={course} size={44} />
              <View style={styles.flex}>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.meta}>{papers.length} paper{papers.length === 1 ? '' : 's'} · {papers.reduce((s, paper) => s + paper.count, 0)} questions</Text>
              </View>
            </View>
            {papers.map((paper) => (
              <Interactive key={paper.id} onPress={() => router.push(routes.legacyPractice({ course: course.id, set: paper.id, exam: true }))} accessibilityRole="button" accessibilityLabel={`${paper.name}, ${paper.count} questions`} style={({ hovered }) => [styles.paper, hovered && styles.paperHover]}>
                <Icon name={paper.kind === 'predicted' ? 'achievement' : 'book'} size={16} color={colors.accentText} />
                <Text style={styles.paperName}>{paper.name}</Text>
                <Text style={styles.meta}>{paper.count} questions</Text>
                <Icon name="chevronRight" size={16} color={colors.textTertiary} />
              </Interactive>
            ))}
          </Card>
        ))}
      </View>
      {list && total === 0 ? <Text style={styles.summary}>No past papers for these courses yet.</Text> : null}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    switch: { maxWidth: 420, marginBottom: 12 },
    summary: { fontSize: 13.5, color: colors.textSecondary, marginBottom: 10 },
    list: { gap: 14 },
    course: { gap: 8 },
    courseHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    courseName: { ...Type.title3, color: colors.text },
    meta: { fontSize: 12.5, color: colors.textTertiary },
    paper: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    paperHover: { borderColor: colors.primaryBorder },
    paperName: { flex: 1, fontSize: 14.5, fontWeight: '700', color: colors.text },
  });
}
