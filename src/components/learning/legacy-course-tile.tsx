import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import type { LegacyCourse } from '@/data/legacy-study';

/** An original course's icon: its emoji on its own gradient (as the original Study screen drew it). */
export function LegacyCourseTile({ course, size = 52 }: { course: LegacyCourse; size?: number }) {
  const id = `course-${course.id}`;
  const radius = Math.round(size * 0.28);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} aria-hidden>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={course.gradient[0]} />
            <Stop offset="1" stopColor={course.gradient[1]} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={size} height={size} rx={radius} fill={`url(#${id})`} />
      </Svg>
      <Text style={{ fontSize: Math.round(size * 0.5), zIndex: 1 }}>{course.icon}</Text>
    </View>
  );
}
