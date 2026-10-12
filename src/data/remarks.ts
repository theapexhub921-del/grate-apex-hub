export type RemarkScoreCategory =
  | 'mastery'
  | 'excellent'
  | 'good'
  | 'developing'
  | 'needsPractice';

export type RemarkWeaknessCategory =
  | 'none'
  | 'one'
  | 'few'
  | 'many';

export type LearningRemark = {
  id: string;
  message: string;
};

const remarks: Record<
  RemarkScoreCategory,
  Record<RemarkWeaknessCategory, LearningRemark[]>
> = {
  mastery: {
    none: [
      {
        id: 'mastery-none-1',
        message:
          'Excellent mastery. You demonstrated a strong understanding of the concepts tested.',
      },
      {
        id: 'mastery-none-2',
        message:
          'Outstanding work. Your answers show that the key ideas are well established.',
      },
      {
        id: 'mastery-none-3',
        message:
          'You have a very strong grasp of this material. Keep building on it.',
      },
    ],
    one: [
      {
        id: 'mastery-one-1',
        message:
          'Excellent performance. You are very close to complete mastery; revisit the one concept you missed.',
      },
      {
        id: 'mastery-one-2',
        message:
          'Strong understanding overall. A quick review of your missed concept should strengthen your mastery.',
      },
      {
        id: 'mastery-one-3',
        message:
          'You handled almost everything confidently. Focus briefly on the concept you missed.',
      },
    ],
    few: [
      {
        id: 'mastery-few-1',
        message:
          'You have a strong foundation. Review the few concepts you missed before moving forward.',
      },
      {
        id: 'mastery-few-2',
        message:
          'Very good performance. A targeted review of your missed concepts will make your understanding even stronger.',
      },
      {
        id: 'mastery-few-3',
        message:
          'You understand most of the material. Strengthen the remaining concepts and test yourself again.',
      },
    ],
    many: [
      {
        id: 'mastery-many-1',
        message:
          'Your overall score is strong, but several concepts still need reinforcement.',
      },
      {
        id: 'mastery-many-2',
        message:
          'Good performance overall. Spend some time strengthening the concepts you missed.',
      },
      {
        id: 'mastery-many-3',
        message:
          'You are performing well, but reviewing your weaker concepts will help make your knowledge more consistent.',
      },
    ],
  },

  excellent: {
    none: [
      {
        id: 'excellent-none-1',
        message:
          'Excellent understanding. You answered every question correctly.',
      },
      {
        id: 'excellent-none-2',
        message:
          'Great work. Your performance shows a clear understanding of the material.',
      },
      {
        id: 'excellent-none-3',
        message:
          'You are building a strong foundation. Keep this level of consistency.',
      },
    ],
    one: [
      {
        id: 'excellent-one-1',
        message:
          'Excellent work. You only need a quick review of one concept to strengthen your understanding.',
      },
      {
        id: 'excellent-one-2',
        message:
          'Very strong result. Revisit the concept you missed, then keep moving forward.',
      },
      {
        id: 'excellent-one-3',
        message:
          'You understand most of the material very well. One focused review should close the gap.',
      },
    ],
    few: [
      {
        id: 'excellent-few-1',
        message:
          'Excellent progress. Your main opportunity is to reinforce the few concepts you missed.',
      },
      {
        id: 'excellent-few-2',
        message:
          'Strong result. Review your missed concepts and you will have an even more complete understanding.',
      },
      {
        id: 'excellent-few-3',
        message:
          'You are doing well. Use your missed concepts as a short review list before continuing.',
      },
    ],
    many: [
      {
        id: 'excellent-many-1',
        message:
          'Your score is strong, but several concepts deserve another look.',
      },
      {
        id: 'excellent-many-2',
        message:
          'Good overall understanding. Strengthen the concepts behind your incorrect answers before moving on.',
      },
      {
        id: 'excellent-many-3',
        message:
          'You have a solid foundation. A focused review of your weaker areas will make it stronger.',
      },
    ],
  },

  good: {
    none: [
      {
        id: 'good-none-1',
        message:
          'Good work. You demonstrated a solid understanding of the material tested.',
      },
      {
        id: 'good-none-2',
        message:
          'Nice progress. Your answers show that the main ideas are becoming familiar.',
      },
      {
        id: 'good-none-3',
        message:
          'You are developing a good foundation. Keep practicing consistently.',
      },
    ],
    one: [
      {
        id: 'good-one-1',
        message:
          'Good progress. Focus on the one concept you missed to strengthen your understanding.',
      },
      {
        id: 'good-one-2',
        message:
          'You are on the right track. Review your missed concept before continuing.',
      },
      {
        id: 'good-one-3',
        message:
          'A solid attempt. One focused review could make this topic much clearer.',
      },
    ],
    few: [
      {
        id: 'good-few-1',
        message:
          'You are making good progress. Review the concepts you missed and try them again.',
      },
      {
        id: 'good-few-2',
        message:
          'Your foundation is developing. Concentrate on the missed concepts before moving ahead.',
      },
      {
        id: 'good-few-3',
        message:
          'Good effort. A short targeted review will help strengthen the areas you found difficult.',
      },
    ],
    many: [
      {
        id: 'good-many-1',
        message:
          'You have some of the foundation, but several concepts need more practice.',
      },
      {
        id: 'good-many-2',
        message:
          'Keep going. Your next review should focus on the concepts behind your incorrect answers.',
      },
      {
        id: 'good-many-3',
        message:
          'There is progress here. Strengthen the weaker concepts before moving to more difficult material.',
      },
    ],
  },

  developing: {
    none: [
      {
        id: 'developing-none-1',
        message:
          'You are developing a good foundation. Keep practicing to make your understanding more consistent.',
      },
      {
        id: 'developing-none-2',
        message:
          'You are making progress. Continue reviewing the material and testing yourself.',
      },
      {
        id: 'developing-none-3',
        message:
          'Your understanding is developing. Consistent practice will help strengthen these concepts.',
      },
    ],
    one: [
      {
        id: 'developing-one-1',
        message:
          'You are close. Focus on the concept you missed and try the question again.',
      },
      {
        id: 'developing-one-2',
        message:
          'Keep building your understanding. One concept needs a little more attention.',
      },
      {
        id: 'developing-one-3',
        message:
          'You are making progress. Review the missed concept carefully before retaking the quiz.',
      },
    ],
    few: [
      {
        id: 'developing-few-1',
        message:
          'Some important concepts still need reinforcement. Review them before moving forward.',
      },
      {
        id: 'developing-few-2',
        message:
          'You are building the foundation. Spend some time strengthening the concepts you missed.',
      },
      {
        id: 'developing-few-3',
        message:
          'Keep practicing. A focused review of your weaker concepts should help the material become clearer.',
      },
    ],
    many: [
      {
        id: 'developing-many-1',
        message:
          'Several concepts need more attention. Review the material before attempting harder lessons.',
      },
      {
        id: 'developing-many-2',
        message:
          'This topic needs more reinforcement. Work through your weaker concepts one at a time.',
      },
      {
        id: 'developing-many-3',
        message:
          'Take this as a signal to slow down and strengthen the fundamentals before moving ahead.',
      },
    ],
  },

  needsPractice: {
    none: [
      {
        id: 'needsPractice-none-1',
        message:
          'Keep practicing. Repeated exposure will help these concepts become more familiar.',
      },
      {
        id: 'needsPractice-none-2',
        message:
          'This is a learning opportunity. Review the material and test yourself again.',
      },
      {
        id: 'needsPractice-none-3',
        message:
          'Do not worry about the score. Use this attempt to identify what you need to review.',
      },
    ],
    one: [
      {
        id: 'needsPractice-one-1',
        message:
          'Focus on the concept you missed, then give the quiz another attempt.',
      },
      {
        id: 'needsPractice-one-2',
        message:
          'One area needs more practice. Review it carefully and test yourself again.',
      },
      {
        id: 'needsPractice-one-3',
        message:
          'You have a clear place to start: strengthen the concept you missed.',
      },
    ],
    few: [
      {
        id: 'needsPractice-few-1',
        message:
          'Several concepts need reinforcement. Work through them one at a time.',
      },
      {
        id: 'needsPractice-few-2',
        message:
          'Use your incorrect answers as a study guide and revisit those concepts carefully.',
      },
      {
        id: 'needsPractice-few-3',
        message:
          'Focus your next study session on the concepts you found difficult.',
      },
    ],
    many: [
      {
        id: 'needsPractice-many-1',
        message:
          'This topic needs more practice. Start with the fundamentals and build up gradually.',
      },
      {
        id: 'needsPractice-many-2',
        message:
          'Take another pass through the lesson before attempting the quiz again.',
      },
      {
        id: 'needsPractice-many-3',
        message:
          'Several concepts need strengthening. Review the lesson carefully, then use the quiz to check your progress.',
      },
    ],
  },
};

function getScoreCategory(
  percentage: number
): RemarkScoreCategory {
  if (percentage === 100) {
    return 'mastery';
  }

  if (percentage >= 80) {
    return 'excellent';
  }

  if (percentage >= 60) {
    return 'good';
  }

  if (percentage >= 50) {
    return 'developing';
  }

  return 'needsPractice';
}

function getWeaknessCategory(
  wrongConceptCount: number
): RemarkWeaknessCategory {
  if (wrongConceptCount === 0) {
    return 'none';
  }

  if (wrongConceptCount === 1) {
    return 'one';
  }

  if (wrongConceptCount <= 3) {
    return 'few';
  }

  return 'many';
}

export function getLearningRemark(
  percentage: number,
  wrongConceptCount: number,
  previouslySeen: Record<string, number> = {}
): LearningRemark {
  const scoreCategory = getScoreCategory(percentage);

  const weaknessCategory =
    getWeaknessCategory(wrongConceptCount);

  const availableRemarks =
    remarks[scoreCategory][weaknessCategory];

  const lowestUsage = Math.min(
    ...availableRemarks.map(
      (remark) => previouslySeen[remark.id] || 0
    )
  );

  const leastUsedRemarks = availableRemarks.filter(
    (remark) =>
      (previouslySeen[remark.id] || 0) === lowestUsage
  );

  const selectedRemark =
    leastUsedRemarks[
      Math.floor(Math.random() * leastUsedRemarks.length)
    ];

  return selectedRemark;
}

export function getRemarkCategories(
  percentage: number,
  wrongConceptCount: number
) {
  return {
    scoreCategory: getScoreCategory(percentage),
    weaknessCategory:
      getWeaknessCategory(wrongConceptCount),
  };
}