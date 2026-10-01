// Question banks for the Pre-Assessment and Post-Assessment (10 questions each).
// The answers stay on the server; students only receive the question text and options.
const mcq = require('./questionHelper');

const PRE = [
  mcq('Which step should come first when solving a problem?', 'Understand the problem', ['Write the final answer', 'Ask someone to solve it', 'Give up']),
  mcq('Breaking a big problem into small parts is called...', 'Decomposition', ['Deletion', 'Duplication', 'Decoration']),
  mcq('What comes next? 2, 4, 6, 8, ?', '10', ['9', '12', '11']),
  mcq('An algorithm is...', 'A step-by-step set of instructions', ['A type of computer', 'A computer virus', 'A kind of keyboard']),
  mcq('Which of these is a programming language?', 'Python', ['Chrome', 'Windows', 'Google']),
  mcq('What does a loop do in a program?', 'Repeats instructions', ['Deletes files', 'Turns off the computer', 'Prints paper']),
  mcq('What is needed to light a bulb in a simple circuit?', 'Battery, wires and bulb', ['Only a bulb', 'Only a wire', 'Water']),
  mcq('Which gas do plants take in to make food?', 'Carbon dioxide', ['Oxygen', 'Nitrogen', 'Helium']),
  mcq('Which of these is an input device?', 'Keyboard', ['Monitor', 'Speaker', 'Projector']),
  mcq('All roses are flowers. So a rose is a...', 'Flower', ['Fruit', 'Tree', 'Stone'])
];

const POST = [
  mcq('Before writing a solution, what should you do?', 'Understand what the problem is asking', ['Start guessing', 'Copy a friend', 'Skip it']),
  mcq('Which of these shows decomposition?', 'Dividing a project into small tasks', ['Doing everything at once', 'Deleting the project', 'Hiding the problem']),
  mcq('What comes next? 5, 10, 15, 20, ?', '25', ['30', '22', '35']),
  mcq('Which list is a correct algorithm for making tea?', 'Boil water, add tea, pour, drink', ['Drink, pour, add tea, boil water', 'Pour, drink, boil water, add tea', 'Add tea, drink, boil, pour']),
  mcq('In coding, a bug is...', 'An error in a program', ['A real insect', 'A new feature', 'A computer part']),
  mcq('What does "repeat 3 times { clap }" do?', 'Claps three times', ['Claps once', 'Claps four times', 'Does nothing']),
  mcq('Which material is a good conductor of electricity?', 'Copper', ['Rubber', 'Wood', 'Plastic']),
  mcq('Which planet is known as the Red Planet?', 'Mars', ['Venus', 'Jupiter', 'Saturn']),
  mcq('What does CPU stand for?', 'Central Processing Unit', ['Central Paper Unit', 'Computer Power Use', 'Control Panel Unit']),
  mcq('A strong password should be...', 'Long, with letters, numbers and symbols', ['Your own name', '1234', 'Shared with friends'])
];

module.exports = { pre: PRE, post: POST };
