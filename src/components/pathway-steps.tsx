import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';

import { ThemeColors } from '@/constants/theme';
import { LessonStep } from '@/data/lesson-types';
import { useThemedStyles } from '@/hooks/use-theme';

// A process or pathway shown as numbered, connected steps.
export function PathwaySteps({ steps }: { steps: LessonStep[] }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.steps}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <View key={index} style={styles.step}>
            <View style={styles.marker}>
              <View style={styles.number}>
                <Text style={styles.numberText}>{index + 1}</Text>
              </View>
              {!isLast && <View style={styles.line} />}
            </View>

            <View style={styles.body}>
              <Text style={styles.label}>{step.label}</Text>
              {step.detail && <Text style={styles.detail}>{step.detail}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    steps: {
      marginBottom: 10,
    },

    step: {
      flexDirection: 'row',
    },

    marker: {
      alignItems: 'center',
      width: 28,
      marginRight: 12,
    },

    number: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    numberText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: 'bold',
    },

    line: {
      flex: 1,
      width: 2,
      minHeight: 12,
      backgroundColor: colors.primaryBorder,
      marginVertical: 4,
    },

    body: {
      flex: 1,
      paddingTop: 4,
      paddingBottom: 16,
    },

    label: {
      fontSize: 15,
      fontWeight: 'bold',
      lineHeight: 21,
      color: colors.text,
    },

    detail: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
      marginTop: 3,
    },
  });
}
