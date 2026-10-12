export type TimeCategory =
  | 'lightning'
  | 'fast'
  | 'steady'
  | 'careful'
  | 'persistent';

export type ScoreCategory =
  | 'mastery'
  | 'excellent'
  | 'good'
  | 'developing'
  | 'needsPractice';

export type Compliment = {
  id: string;
  message: string;
};

function getTimeCategory(seconds: number): TimeCategory {
  if (seconds < 30) {
    return 'lightning';
  }

  if (seconds < 60) {
    return 'fast';
  }

  if (seconds < 120) {
    return 'steady';
  }

  if (seconds < 180) {
    return 'careful';
  }

  return 'persistent';
}

function getScoreCategory(percentage: number): ScoreCategory {
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

const compliments: Record<
  TimeCategory,
  Record<ScoreCategory, Compliment[]>
> = {
  lightning: {
    mastery: [
      {
        id: 'lightning-mastery-1',
        message:
          'Lightning fast! ⚡ You really showed mastery of {topic}.',
      },
      {
        id: 'lightning-mastery-2',
        message:
          'Outstanding speed! 🔥 Your mastery of {topic} is clearly strong.',
      },
      {
        id: 'lightning-mastery-3',
        message:
          'Incredible pace! 🧠 You moved through {topic} with impressive confidence.',
      },
    ],

    excellent: [
      {
        id: 'lightning-excellent-1',
        message:
          'Lightning fast! ⚡ You showed excellent understanding of {topic}.',
      },
      {
        id: 'lightning-excellent-2',
        message:
          'Amazing pace! 🔥 You handled {topic} with impressive accuracy.',
      },
      {
        id: 'lightning-excellent-3',
        message:
          'Super quick! 🧠 Your understanding of {topic} is developing beautifully.',
      },
    ],

    good: [
      {
        id: 'lightning-good-1',
        message:
          'Lightning fast! ⚡ You handled {topic} quickly—keep sharpening your accuracy.',
      },
      {
        id: 'lightning-good-2',
        message:
          'Great pace! 🔥 You are recalling {topic} quickly; keep building precision.',
      },
      {
        id: 'lightning-good-3',
        message:
          'That was quick! 🧠 Your recall is strong—now keep working on the tricky parts of {topic}.',
      },
    ],

    developing: [
      {
        id: 'lightning-developing-1',
        message:
          'Lightning fast! ⚡ You moved quickly through {topic}; a little more review can improve accuracy.',
      },
      {
        id: 'lightning-developing-2',
        message:
          'Excellent pace! 🔥 Your speed is impressive—keep strengthening your knowledge of {topic}.',
      },
      {
        id: 'lightning-developing-3',
        message:
          'Super quick! 🧠 Slow down just enough to catch the details that matter in {topic}.',
      },
    ],

    needsPractice: [
      {
        id: 'lightning-practice-1',
        message:
          'Lightning fast! ⚡ You answered quickly—now take another look at the parts of {topic} you missed.',
      },
      {
        id: 'lightning-practice-2',
        message:
          'Incredible pace! 🔥 Your speed is there; the next goal is improving your accuracy in {topic}.',
      },
      {
        id: 'lightning-practice-3',
        message:
          'Very quick! 🧠 Keep that confidence, and give the tougher parts of {topic} another review.',
      },
    ],
  },

  fast: {
    mastery: [
      {
        id: 'fast-mastery-1',
        message:
          'Excellent pace! 🔥 You showed real mastery of {topic}.',
      },
      {
        id: 'fast-mastery-2',
        message:
          'Fast and accurate! ⚡ You clearly know your way around {topic}.',
      },
      {
        id: 'fast-mastery-3',
        message:
          'Brilliant work! 🧠 You combined speed and mastery of {topic}.',
      },
    ],

    excellent: [
      {
        id: 'fast-excellent-1',
        message:
          'Excellent pace! 🔥 You showed strong command of {topic}.',
      },
      {
        id: 'fast-excellent-2',
        message:
          'Great speed! ⚡ Your understanding of {topic} is looking strong.',
      },
      {
        id: 'fast-excellent-3',
        message:
          'Fast and focused! 🧠 You handled {topic} with impressive accuracy.',
      },
    ],

    good: [
      {
        id: 'fast-good-1',
        message:
          'Great pace! ⚡ You moved through {topic} confidently—keep improving your accuracy.',
      },
      {
        id: 'fast-good-2',
        message:
          'Nice speed! 🔥 You are building a solid understanding of {topic}.',
      },
      {
        id: 'fast-good-3',
        message:
          'Good momentum! 🧠 Keep practicing {topic} and that speed will become even more reliable.',
      },
    ],

    developing: [
      {
        id: 'fast-developing-1',
        message:
          'Good pace! ⚡ You are getting through {topic} quickly; keep strengthening the details.',
      },
      {
        id: 'fast-developing-2',
        message:
          'Nice work! 🔥 Your speed is developing—now focus on accuracy in {topic}.',
      },
      {
        id: 'fast-developing-3',
        message:
          'You moved quickly! 🧠 A little more practice with {topic} will make that speed more accurate.',
      },
    ],

    needsPractice: [
      {
        id: 'fast-practice-1',
        message:
          'Good pace! ⚡ You moved quickly through {topic}; reviewing the missed questions will help.',
      },
      {
        id: 'fast-practice-2',
        message:
          'Nice speed! 🔥 Keep that momentum while strengthening your understanding of {topic}.',
      },
      {
        id: 'fast-practice-3',
        message:
          'You worked quickly! 🧠 Now use another attempt to strengthen the tougher parts of {topic}.',
      },
    ],
  },

  steady: {
    mastery: [
      {
        id: 'steady-mastery-1',
        message:
          'Excellent work! 🧠 You took a steady approach and mastered {topic}.',
      },
      {
        id: 'steady-mastery-2',
        message:
          'Strong performance! 🔥 Your careful reasoning showed real mastery of {topic}.',
      },
      {
        id: 'steady-mastery-3',
        message:
          'Perfectly done! 🎯 You took your time and demonstrated mastery of {topic}.',
      },
    ],

    excellent: [
      {
        id: 'steady-excellent-1',
        message:
          'Great work! 💪 Your steady approach produced an excellent result in {topic}.',
      },
      {
        id: 'steady-excellent-2',
        message:
          'Strong performance! 🔥 You showed a solid understanding of {topic}.',
      },
      {
        id: 'steady-excellent-3',
        message:
          'Well done! 🧠 Your focus and accuracy really paid off in {topic}.',
      },
    ],

    good: [
      {
        id: 'steady-good-1',
        message:
          'Good work! 💪 You maintained a steady pace while working through {topic}.',
      },
      {
        id: 'steady-good-2',
        message:
          'Nice effort! 📚 Your understanding of {topic} is moving in the right direction.',
      },
      {
        id: 'steady-good-3',
        message:
          'Keep it up! 🧠 A steady approach like this will strengthen your knowledge of {topic}.',
      },
    ],

    developing: [
      {
        id: 'steady-developing-1',
        message:
          'Good focus! 📚 You gave {topic} careful attention—keep working on the areas you missed.',
      },
      {
        id: 'steady-developing-2',
        message:
          'You stayed with it! 🧠 Keep practicing {topic} and your accuracy will grow.',
      },
      {
        id: 'steady-developing-3',
        message:
          'Solid effort! 💪 Your steady approach is helping—now strengthen the weaker parts of {topic}.',
      },
    ],

    needsPractice: [
      {
        id: 'steady-practice-1',
        message:
          'Good persistence! 🌱 You gave {topic} the time it needed; another review can strengthen your result.',
      },
      {
        id: 'steady-practice-2',
        message:
          'Keep going! 📚 Your steady effort matters—use the missed questions to improve {topic}.',
      },
      {
        id: 'steady-practice-3',
        message:
          'You stayed focused! 🧠 Keep practicing {topic} and the concepts will become clearer.',
      },
    ],
  },

  careful: {
    mastery: [
      {
        id: 'careful-mastery-1',
        message:
          'Excellent patience! 🧠 You worked carefully and mastered {topic}.',
      },
      {
        id: 'careful-mastery-2',
        message:
          'Thorough and accurate! 🔥 Your careful work showed mastery of {topic}.',
      },
      {
        id: 'careful-mastery-3',
        message:
          'Outstanding focus! 🎯 You took your time and got {topic} completely right.',
      },
    ],

    excellent: [
      {
        id: 'careful-excellent-1',
        message:
          'Great focus! 🧠 Your careful approach led to an excellent result in {topic}.',
      },
      {
        id: 'careful-excellent-2',
        message:
          'Thorough work! 🔥 You showed a strong understanding of {topic}.',
      },
      {
        id: 'careful-excellent-3',
        message:
          'Well done! 💪 Your patience and accuracy really helped with {topic}.',
      },
    ],

    good: [
      {
        id: 'careful-good-1',
        message:
          'Good focus! 🧠 You worked carefully through {topic} and made solid progress.',
      },
      {
        id: 'careful-good-2',
        message:
          'Nice effort! 📚 Your careful approach is helping you build {topic} step by step.',
      },
      {
        id: 'careful-good-3',
        message:
          'Keep going! 💪 Taking time to understand {topic} will strengthen your results.',
      },
    ],

    developing: [
      {
        id: 'careful-developing-1',
        message:
          'Good persistence! 🌱 You gave {topic} serious attention—keep reviewing the concepts you missed.',
      },
      {
        id: 'careful-developing-2',
        message:
          'Your patience matters! 🧠 Keep working through {topic} and your accuracy will improve.',
      },
      {
        id: 'careful-developing-3',
        message:
          'Good effort! 📚 You stayed focused on {topic}; another attempt can strengthen your understanding.',
      },
    ],

    needsPractice: [
      {
        id: 'careful-practice-1',
        message:
          'Great persistence! 🌱 You took the time to work through {topic}; keep practicing the difficult parts.',
      },
      {
        id: 'careful-practice-2',
        message:
          'You did not give up! 💪 Use this attempt to identify what to review in {topic}.',
      },
      {
        id: 'careful-practice-3',
        message:
          'Keep learning! 📚 Careful practice will help the concepts in {topic} become stronger.',
      },
    ],
  },

  persistent: {
    mastery: [
      {
        id: 'persistent-mastery-1',
        message:
          'Great persistence! 🌟 You took your time and still achieved mastery of {topic}.',
      },
      {
        id: 'persistent-mastery-2',
        message:
          'Thorough and successful! 🧠 Your persistence paid off with mastery of {topic}.',
      },
      {
        id: 'persistent-mastery-3',
        message:
          'Excellent determination! 🔥 You worked through {topic} carefully and mastered it.',
      },
    ],

    excellent: [
      {
        id: 'persistent-excellent-1',
        message:
          'Great persistence! 🌟 You stayed focused and achieved an excellent result in {topic}.',
      },
      {
        id: 'persistent-excellent-2',
        message:
          'Strong determination! 💪 You worked through {topic} carefully and produced a great result.',
      },
      {
        id: 'persistent-excellent-3',
        message:
          'Excellent effort! 🧠 Your persistence helped you build a strong understanding of {topic}.',
      },
    ],

    good: [
      {
        id: 'persistent-good-1',
        message:
          'Great persistence! 🌟 You worked through {topic} and made solid progress.',
      },
      {
        id: 'persistent-good-2',
        message:
          'You stayed with it! 💪 Keep practicing {topic} and your results will continue improving.',
      },
      {
        id: 'persistent-good-3',
        message:
          'Strong effort! 📚 Your persistence with {topic} is exactly how learning gets stronger.',
      },
    ],

    developing: [
      {
        id: 'persistent-developing-1',
        message:
          'Great persistence! 🌟 You stayed with {topic}; keep reviewing the areas that challenged you.',
      },
      {
        id: 'persistent-developing-2',
        message:
          'You kept going! 💪 Another round of practice can strengthen your understanding of {topic}.',
      },
      {
        id: 'persistent-developing-3',
        message:
          'Good determination! 🧠 Keep working on {topic} and turn these mistakes into progress.',
      },
    ],

    needsPractice: [
      {
        id: 'persistent-practice-1',
        message:
          'Great persistence! 🌟 You finished the challenge—now use your mistakes to improve {topic}.',
      },
      {
        id: 'persistent-practice-2',
        message:
          'You did not give up! 💪 Keep practicing {topic}; every attempt gives you another chance to improve.',
      },
      {
        id: 'persistent-practice-3',
        message:
          'Keep pushing forward! 🌱 Your persistence matters, and more practice will strengthen {topic}.',
      },
    ],
  },
};

export function getCompliment(
  topic: string,
  percentage: number,
  seconds: number,
  previouslySeen: Record<string, number> = {}
): Compliment {
  const timeCategory = getTimeCategory(seconds);
  const scoreCategory = getScoreCategory(percentage);

  const availableCompliments =
    compliments[timeCategory][scoreCategory];

  const lowestSeenCount = Math.min(
    ...availableCompliments.map(
      (compliment) => previouslySeen[compliment.id] || 0
    )
  );

  const leastSeen = availableCompliments.filter(
    (compliment) =>
      (previouslySeen[compliment.id] || 0) ===
      lowestSeenCount
  );

  const selected =
    leastSeen[
      Math.floor(Math.random() * leastSeen.length)
    ];

  return {
    ...selected,
    message: selected.message.replace(
      '{topic}',
      topic
    ),
  };
}