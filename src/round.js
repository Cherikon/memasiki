export const newRound = { index: 0, score: 0, missed: [], solved: false };

export function roundReducer(round, action) {
  switch (action.type) {
    case 'start':
      return newRound;
    case 'answer':
      if (round.solved || round.missed.includes(action.index)) return round;
      if (action.correct) return { ...round, score: round.score + 1, solved: true };
      return {
        ...round,
        score: Math.max(0, round.score - 1),
        missed: [...round.missed, action.index],
      };
    case 'advance':
      if (!round.solved) return round;
      return { ...round, index: round.index + 1, missed: [], solved: false };
    default:
      return round;
  }
}
