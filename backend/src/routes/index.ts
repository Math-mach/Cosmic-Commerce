import { Router } from 'express';

const router = Router();

const UserRoutes = require('./UserRoutes');
router.use('/user', UserRoutes);

module.exports = router;
