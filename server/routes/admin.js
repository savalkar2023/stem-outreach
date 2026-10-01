// Every admin route is protected twice: logged in (protect) and role = admin (adminOnly).
const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const c = require('../controllers/adminController');

router.use(protect, adminOnly);

router.get('/stats', c.getStats);
router.get('/students', c.listStudents);
router.get('/students/:id', c.getStudent);
router.delete('/students/:id', c.deleteStudent);
router.get('/results', c.listResults);

router.get('/activities', c.listActivities);
router.get('/activities/:id', c.getActivity);
router.post('/activities', c.createActivity);
router.put('/activities/:id', c.updateActivity);
router.delete('/activities/:id', c.deleteActivity);

router.get('/reports', c.getReports);
router.get('/reports/csv', c.exportCsv);

module.exports = router;
