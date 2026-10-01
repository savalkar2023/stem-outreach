// Creates the admin account and 15 sample STEM activities.  Run:  npm run seed
// Safe to run many times (existing items are not duplicated).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Activity = require('./models/Activity');
const mcq = require('./utils/questionHelper');

// Helper: A(title, category, difficulty, minutes, description, objective, instructions, [questions])
const A = (title, category, difficulty, duration, description, objective, instructions, questions) =>
  ({ title, category, difficulty, duration, description, objective, instructions, questions });

const ACTIVITIES = [
  A('Breaking a Problem into Smaller Steps', 'Computational Thinking', 'Easy', 15,
    'Learn how big problems become easy when we split them into small steps.', 'Understand decomposition.',
    'Read each question carefully and choose the best answer.', [
      mcq('Breaking a big problem into small parts is called...', 'Decomposition', ['Repetition', 'Deletion', 'Copying']),
      mcq('You want to clean your room. What is the best way to start?', 'List small tasks: books, bed, floor', ['Clean everything at once', 'Ask someone else', 'Wait for tomorrow']),
      mcq('Why do we divide big problems into small steps?', 'They become easier to solve', ['To make them harder', 'To waste time', 'There is no reason'])]),
  A('Algorithm Ordering', 'Computational Thinking', 'Easy', 15,
    'An algorithm is a list of steps in the right order. Practise putting steps in order.', 'Understand what an algorithm is.',
    'Choose the answer that keeps the steps in the correct order.', [
      mcq('Which order is right for making tea? (1 Pour tea, 2 Boil water, 3 Add tea leaves, 4 Drink)', '2, 3, 1, 4', ['1, 2, 3, 4', '4, 3, 2, 1', '3, 1, 2, 4']),
      mcq('An algorithm is...', 'A step-by-step set of instructions', ['A type of computer', 'A video game', 'An error message']),
      mcq('Which step comes first when brushing your teeth?', 'Put paste on the brush', ['Rinse your mouth', 'Put the brush away', 'Switch off the light'])]),
  A('Pattern Recognition', 'Computational Thinking', 'Easy', 10,
    'Find the pattern and predict what comes next.', 'Spot repeating patterns.',
    'Look for what repeats, then choose the next item.', [
      mcq('What comes next? 3, 6, 9, 12, ?', '15', ['14', '18', '16']),
      mcq('What comes next? A, C, E, G, ?', 'I', ['H', 'J', 'K']),
      mcq('What comes next? Red, Blue, Red, Blue, Red, ?', 'Blue', ['Red', 'Green', 'Black'])]),
  A('Basic Programming Logic', 'Coding', 'Medium', 20,
    'Loops, conditions and variables are the building blocks of every program.', 'Know loops, if-conditions and variables.',
    'Think like a computer and choose the correct answer.', [
      mcq('What does a loop do?', 'Repeats instructions', ['Stops the computer', 'Deletes a file', 'Draws a picture']),
      mcq('If (age >= 18) print "Adult". Age is 20. What is printed?', 'Adult', ['Child', 'Nothing', 'Error']),
      mcq('A variable is used to...', 'Store a value', ['Turn off the computer', 'Make a sound', 'Cool the CPU'])]),
  A('Find the Output', 'Coding', 'Medium', 20,
    'Read small programs and work out what they will print.', 'Trace simple code step by step.',
    'Work through each program in your head before answering.', [
      mcq('x = 5, y = 3. What does print(x + y) show?', '8', ['53', '2', '15']),
      mcq('for i in range(3): print("Hi"). How many times is Hi printed?', '3', ['2', '4', '1']),
      mcq('What does print(2 * 4) show?', '8', ['6', '24', '2'])]),
  A('Simple Algorithm Challenge', 'Coding', 'Hard', 25,
    'Design tiny algorithms for finding the biggest number and adding numbers.', 'Create and test simple algorithms.',
    'Choose the best method for each task.', [
      mcq('How do you find the largest of 4, 9 and 2?', 'Compare the numbers one by one', ['Add them', 'Sort them alphabetically', 'Guess']),
      mcq('What is the sum of 1 + 2 + 3 + 4?', '10', ['8', '9', '12']),
      mcq('In coding, a bug is...', 'An error in a program', ['A real insect', 'A new feature', 'A keyboard key'])]),
  A('Number Pattern', 'Logic Building', 'Easy', 10,
    'Number patterns train your brain to see rules.', 'Find the rule in a number series.',
    'Find the rule, then give the next number.', [
      mcq('What comes next? 2, 4, 8, 16, ?', '32', ['24', '20', '18']),
      mcq('What comes next? 1, 4, 9, 16, ?', '25', ['20', '24', '36']),
      mcq('What comes next? 100, 90, 80, ?', '70', ['60', '75', '85'])]),
  A('Logical Puzzle', 'Logic Building', 'Medium', 15,
    'Use clear reasoning to solve small puzzles.', 'Practise deduction and reasoning.',
    'Think carefully. Only one answer is correct.', [
      mcq('All cats are animals. Tom is a cat. So Tom is...', 'An animal', ['A plant', 'A car', 'A bird']),
      mcq('Which one is the odd one out? Dog, Cat, Car, Horse', 'Car', ['Dog', 'Cat', 'Horse']),
      mcq('Today is Monday. What day will it be after 2 days?', 'Wednesday', ['Tuesday', 'Thursday', 'Friday'])]),
  A('Sequence Challenge', 'Logic Building', 'Easy', 10,
    'Complete days, months and number sequences.', 'Continue a sequence correctly.',
    'Choose what comes next in each sequence.', [
      mcq('Mon, Tue, Wed, ?', 'Thu', ['Fri', 'Sun', 'Sat']),
      mcq('Jan, Mar, May, ?', 'Jul', ['Jun', 'Aug', 'Apr']),
      mcq('5, 10, 15, 20, ?', '25', ['30', '22', '24'])]),
  A('Real-Life Problem Solving', 'Problem Solving', 'Medium', 15,
    'Use problem-solving steps on everyday situations.', 'Apply problem solving in real life.',
    'Read each situation and pick the best action.', [
      mcq('Your pen stops working in an exam. What should you do?', 'Politely ask the teacher for another pen', ['Shout loudly', 'Leave the exam', 'Cry and give up']),
      mcq('Which step comes first when solving any problem?', 'Understand the problem', ['Guess the answer', 'Give up', 'Ask everyone']),
      mcq('You have 100 rupees and a notebook costs 40. How many notebooks can you buy?', '2', ['3', '1', '4'])]),
  A('Decision Making', 'Problem Solving', 'Medium', 15,
    'Good decisions come from thinking about choices and results.', 'Make careful decisions.',
    'Choose the wisest decision in each case.', [
      mcq('Which method helps most when choosing between two options?', 'List the pros and cons', ['Always flip a coin', 'Pick randomly', 'Ask nobody']),
      mcq('You find a wallet on the road. What is the best decision?', 'Give it to a teacher or the police', ['Keep the money', 'Throw it away', 'Hide it']),
      mcq('Why is a Plan B useful?', 'It helps if Plan A fails', ['It wastes time', 'It is always wrong', 'It is never needed'])]),
  A('Critical Thinking', 'Problem Solving', 'Hard', 20,
    'Learn to question information before you believe it.', 'Separate facts from opinions and rumours.',
    'Think before you choose. Is it a fact, an opinion or a rumour?', [
      mcq('A message says "Cola cures all diseases". What should you do?', 'Check reliable sources', ['Believe and share it', 'Ignore all doctors', 'Forward it to everyone']),
      mcq('What is a fact?', 'A statement that can be proved', ['A personal opinion', 'A rumour', 'A wish']),
      mcq('Why should we ask questions?', 'To understand better', ['To annoy others', 'To avoid learning', 'There is no reason'])]),
  A('Simple Science Experiment', 'Science', 'Easy', 20,
    'Think about plants, water and electricity like a young scientist.', 'Understand basic science ideas.',
    'Recall what you learned in class and answer.', [
      mcq('What do plants need to make their food?', 'Sunlight, water and carbon dioxide', ['Only sugar', 'Plastic', 'Darkness']),
      mcq('At what temperature does water boil?', '100 degrees Celsius', ['50 degrees Celsius', '0 degrees Celsius', '200 degrees Celsius']),
      mcq('What is needed to light a bulb in a simple circuit?', 'Battery, wires and bulb', ['Only a bulb', 'Paper', 'Sand'])]),
  A('Science Quiz', 'Science', 'Medium', 15,
    'A quick quiz about space, the human body and forces.', 'Recall basic science facts.',
    'Choose the best answer for each question.', [
      mcq('Which planet is known as the Red Planet?', 'Mars', ['Venus', 'Jupiter', 'Earth']),
      mcq('Which gas do humans need to breathe?', 'Oxygen', ['Helium', 'Carbon dioxide', 'Hydrogen']),
      mcq('Which force pulls objects towards the Earth?', 'Gravity', ['Magnetism', 'Friction', 'Sound'])]),
  A('Technology Awareness Challenge', 'Technology', 'Easy', 15,
    'Learn about computers and staying safe online.', 'Know basic computer parts and online safety.',
    'Pick the correct answer for each question.', [
      mcq('What does CPU stand for?', 'Central Processing Unit', ['Central Program Unit', 'Computer Personal Unit', 'Core Power Unit']),
      mcq('Which of these is an input device?', 'Keyboard', ['Monitor', 'Speaker', 'Printer']),
      mcq('What should you do with your password?', 'Keep it secret', ['Share it with friends', 'Write it on the board', 'Use 1234 everywhere'])])
];

(async () => {
  await connectDB();

  // 1) Admin account
  const email = (process.env.ADMIN_EMAIL || 'admin@stem.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const admin = await User.findOne({ email });
  if (admin) {
    console.log('Admin already exists: ' + email);
  } else {
    await User.create({
      name: 'STEM Admin', email, mobile: '9999999999', school: 'STEM Outreach', class: 'Admin', city: 'Campus',
      password: await bcrypt.hash(password, 10), role: 'admin', isVerified: true
    });
    console.log('Admin created:  ' + email + '  /  ' + password);
  }

  // 2) Sample activities (skipped if the title already exists)
  const base = Date.now();
  let added = 0;
  for (let i = 0; i < ACTIVITIES.length; i++) {
    const a = ACTIVITIES[i];
    const { title, ...rest } = a;
    const r = await Activity.updateOne({ title }, { $setOnInsert: { ...rest, createdAt: new Date(base + i) } }, { upsert: true });
    if (r.upsertedCount) added++;
  }
  console.log('Activities added: ' + added + '  (total in database: ' + (await Activity.countDocuments()) + ')');

  await mongoose.disconnect();
  console.log('Seed finished.');
})().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
