/**
 * Avatar Routes
 * 
 * Routes for avatar management and serving.
 * Provides endpoints to list available avatars and serve avatar images.
 */

import { Router } from 'express';
import * as avatarController from './controller.js';

const router = Router();

// Get list of available avatars
router.get('/', avatarController.getAvatars);

// Serve avatar image file
router.get('/:filename', avatarController.getAvatarImage);

export default router;
