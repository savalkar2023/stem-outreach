// All routes here need a logged-in user. Student-only routes also check the role.
const router = require('express').Router();
const { protect, studentOnly } = require('../middleware/auth');
const s = require('../controllers/studentController');
const a = require('../controllers/assessmentController');

router.use(protect);

router.get('/profile', s.getProfile);
router.put('/profile', s.updateProfile);
router.put('/profile/password', s.changePassword);

router.get('/activities', studentOnly, s.listActivities);
router.get('/activities/:id', studentOnly, s.getActivity);
router.post('/results', studentOnly, s.submitResult);
router.get('/results', studentOnly, s.getResults);

router.get('/assessment/status', studentOnly, a.getStatus);
router.get('/assessment/questions', studentOnly, a.getQuestions);
router.post('/assessment', studentOnly, a.submit);

router.get('/progress', studentOnly, s.getProgress);
router.get('/certificate', studentOnly, s.getCertificate);

module.exports = router;
