
import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { dynamicAuthRateLimit } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', dynamicAuthRateLimit(), register);
router.post('/login', dynamicAuthRateLimit(), login);

export default router;
