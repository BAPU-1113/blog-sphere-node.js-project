const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { requireAuth } = require('../middleware/authMiddleware');

// Add comment to article
router.post('/articles/:id/comments', requireAuth, commentController.postAddComment);

// Delete comment (Supports both DELETE and POST)
router.post('/articles/:articleId/comments/:commentId/delete', requireAuth, commentController.postDeleteComment);
router.delete('/articles/:articleId/comments/:commentId', requireAuth, commentController.postDeleteComment);

module.exports = router;
