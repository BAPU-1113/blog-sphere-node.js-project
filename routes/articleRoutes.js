const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { requireAuth } = require('../middleware/authMiddleware');

// Public route to view all articles
router.get('/articles', articleController.getAllArticles);

// User-specific articles route (Multiuser Support)
router.get('/my-articles', requireAuth, articleController.getMyArticles);

// Create new article (Auth required)
router.get('/articles/new', requireAuth, articleController.getNewArticleForm);
router.post('/articles', requireAuth, articleController.postCreateArticle);

// Single article view (Public)
router.get('/articles/:id', articleController.getArticleById);

// Edit article form (Auth + RBAC/Author check in controller)
router.get('/articles/:id/edit', requireAuth, articleController.getEditArticleForm);

// Update article (Supports both PUT and POST)
router.put('/articles/:id', requireAuth, articleController.postUpdateArticle);
router.post('/articles/:id', requireAuth, articleController.postUpdateArticle);

// Delete article (Supports both DELETE and POST)
router.delete('/articles/:id', requireAuth, articleController.postDeleteArticle);
router.post('/articles/:id/delete', requireAuth, articleController.postDeleteArticle);

module.exports = router;
