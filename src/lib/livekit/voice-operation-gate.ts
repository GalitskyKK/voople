export function createVoiceOperationGate() {
  let generation = 0;

  return {
    begin() {
      generation += 1;
      return generation;
    },
    cancel() {
      generation += 1;
    },
    isCurrent(token: number) {
      return token === generation;
    },
  };
}
