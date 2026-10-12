import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LegacyCourseTile } from '@/components/learning/legacy-course-tile';
import { Icon } from '@/components/ui/icon';
import { PressableCard } from '@/components/ui/interactive';
import { ProgressBar } from '@/components/ui/progress-bar';
import { SectionHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Type, type ThemeColors } from '@/constants/theme';
import type { ClassSelection } from '@/data/class-curriculum';
import { type LegacyCourse, type LegacyLessonMeta, loadLegacyLessonList } from '@/data/legacy-study';
import { hb2Lessons } from '@/data/hb2-study';
import { useProgress } from '@/data/progress';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { routes } from '@/lib/routes';

/** A class's original courses on Study, in this app's card style. */
export function LegacyCourseList({ courses, selection }: { courses: readonly LegacyCourse[]; selection: ClassSelection }) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const progress = useProgress();
  const [lessons, setLessons] = useState<LegacyLessonMeta[] | null>(null);
  useEffect(() => {
    let live = true;
    loadLegacyLessonList().then((list) => { if (live) setLessons(list); }).catch(() => { if (live) setLessons([]); });
    return () => { live = false; };
  }, []);
  const completed = useMemo(() => new Set(progress.completedLessons), [progress.completedLessons]);

  return (
    <View style={styles.column}>
      <SectionHeader title="Courses" subtitle={`${selection.classId} · Semester ${selection.semester} · ${courses.length} courses`} style={styles.header} />
      <View style={styles.grid}>
        {courses.map((course) => {
          const own = course.subject ? hb2Lessons(course.id) : (lessons ?? []).filter((lesson) => lesson.course === course.id);
          const done = own.filter((lesson) => completed.has(lesson.id)).length;
          const questions = own.reduce((sum, lesson) => sum + (lesson.qids?.length ?? lesson.qcount ?? 0), 0);
          return (
            <PressableCard key={course.id} onPress={() => router.push(routes.legacyCourse(course.id))} accessibilityLabel={`${course.name}. ${done} of ${own.length} lessons completed`} style={styles.card}>
              <LegacyCourseTile course={course} size={52} />
              <View style={styles.info}>
                <Text style={styles.name}>{course.name}</Text>
                <Text style={styles.desc} numberOfLines={2}>{course.desc}</Text>
                <View style={styles.progressRow}>
                  <ProgressBar value={own.length ? done / own.length : 0} height={6} style={styles.flex} label={`${course.name} lessons completed`} />
                  <Text style={styles.meta}>{lessons || course.subject ? `${done}/${own.length} lessons${questions ? ` · ${questions.toLocaleString()} questions` : ''}` : 'Loading…'}</Text>
                </View>
              </View>
              <Icon name="chevronRight" size={20} color={colors.textTertiary} />
            </PressableCard>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    column: { gap: 12 },
    header: { marginTop: 6 },
    grid: { gap: 12 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    info: { flex: 1, minWidth: 0, gap: 4 },
    name: { ...Type.title3, color: colors.text },
    desc: { fontSize: 13.5, lineHeight: 19, color: colors.textSecondary },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    meta: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  });
}
