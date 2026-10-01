// Builds a multiple-choice question. The correct option is placed at a rotating
// position (A, B, C or D) so the right answer is not always the first option.
let counter = 0;
module.exports = function mcq(text, correct, wrong, marks = 1) {
  const pos = (counter++ * 3 + 1) % 4;
  const options = [...wrong];
  options.splice(pos, 0, correct);
  return { text, options, answerIndex: pos, marks };
};
