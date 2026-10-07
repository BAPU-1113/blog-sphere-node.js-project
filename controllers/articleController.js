const Article = require('../models/Article');
const User = require('../models/User');
const Comment = require('../models/Comment');

// Helper to sanitize search string for regular expression
const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

// List all articles with optional filtering and search
exports.getAllArticles = async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [{ title: searchRegex }, { summary: searchRegex }, { content: searchRegex }];
    }

    // Fetch articles and populate author details
    const articles = await Article.find(query)
      .populate('author', 'username email role avatar bio')
      .sort({ createdAt: -1 });

    // Distinct categories for filter buttons
    const categories = await Article.distinct('category');

    res.render('articleList', {
      title: 'Explore Articles - BlogSphere',
      articles,
      categories: ['All', ...categories.filter(Boolean)],
      selectedCategory: category || 'All',
      searchQuery: search || '',
      welcome: req.query.welcome === '1',
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).render('error', {
      title: '500 - Server Error',
      statusCode: 500,
      message: 'Failed to fetch articles. Please try again later.',
      details: error.message,
    });
  }
};

// Fetch user-specific articles (Multiuser support & Population demonstration)
exports.getMyArticles = async (req, res) => {
  try {
    const userId = req.user.id;

    // Retrieve user and populate their associated articles array
    const userWithArticles = await User.findById(userId).populate({
      path: 'articles',
      options: { sort: { createdAt: -1 } },
      populate: { path: 'author', select: 'username role' },
    });

    if (!userWithArticles) {
      return res.status(404).render('error', {
        title: 'User Not Found',
        statusCode: 404,
        message: 'Unable to locate user account.',
      });
    }

    // Fallback sync: if user.articles array is empty or desynced, also check Article.find
    let articles = userWithArticles.articles || [];
    if (articles.length === 0) {
      articles = await Article.find({ author: userId }).sort({ createdAt: -1 });
    }

    res.render('myArticles', {
      title: 'My Published Articles - BlogSphere',
      user: userWithArticles,
      articles,
    });
  } catch (error) {
    console.error('Error fetching user articles:', error);
    res.status(500).render('error', {
      title: '500 - Server Error',
      statusCode: 500,
      message: 'Failed to retrieve your articles.',
      details: error.message,
    });
  }
};

// Render Create Article form
exports.getNewArticleForm = (req, res) => {
  res.render('articleForm', {
    title: 'Write New Article - BlogSphere',
    article: {},
    isEdit: false,
    formAction: '/articles',
    error: null,
  });
};

// Handle article creation
exports.postCreateArticle = async (req, res) => {
  const { title, summary, content, category, tags, coverImage } = req.body;

  try {
    if (!title || !content) {
      return res.status(400).render('articleForm', {
        title: 'Write New Article - BlogSphere',
        article: { title, summary, content, category, coverImage, tags },
        isEdit: false,
        formAction: '/articles',
        error: 'Title and content are required fields.',
      });
    }

    // Parse comma-separated tags
    const tagArray = tags
      ? tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const newArticle = new Article({
      title: title.trim(),
      summary: summary ? summary.trim() : title.trim().substring(0, 150) + '...',
      content: content.trim(),
      category: category && category.trim() ? category.trim() : 'General',
      tags: tagArray,
      coverImage: coverImage ? coverImage.trim() : '',
      author: req.user.id,
    });

    await newArticle.save();

    // Multiuser Support: Link article to User model articles array
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { articles: newArticle._id },
    });

    return res.redirect(`/articles/${newArticle._id}`);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).render('articleForm', {
      title: 'Write New Article - BlogSphere',
      article: { title, summary, content, category, coverImage, tags },
      isEdit: false,
      formAction: '/articles',
      error: 'Failed to publish article. ' + error.message,
    });
  }
};

// View single article with populated author and populated comments
exports.getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('author', 'username email role avatar bio')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username role avatar',
        },
        options: { sort: { createdAt: -1 } },
      });

    if (!article) {
      return res.status(404).render('error', {
        title: 'Article Not Found',
        statusCode: 404,
        message: 'The requested article does not exist or has been removed.',
      });
    }

    // Check if current user is author or admin
    const isAuthor = req.user && article.author && article.author._id.toString() === req.user.id;
    const isAdmin = req.user && req.user.role === 'admin';
    const canManage = isAuthor || isAdmin;

    res.render('articleItem', {
      title: `${article.title} - BlogSphere`,
      article,
      canManage,
      isAuthor,
      isAdmin,
      error: req.query.commentError || null,
    });
  } catch (error) {
    console.error('Error fetching single article:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      statusCode: 500,
      message: 'Failed to display article details.',
      details: error.message,
    });
  }
};

// Render Edit Article form (Role/Ownership checked)
exports.getEditArticleForm = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).render('error', {
        title: 'Article Not Found',
        statusCode: 404,
        message: 'Article not found.',
      });
    }

    // RBAC + Ownership check: only author or admin can edit
    const isAuthor = article.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).render('error', {
        title: '403 - Forbidden',
        statusCode: 403,
        message: 'Access Denied: You do not have permission to edit this article.',
      });
    }

    res.render('articleForm', {
      title: `Edit: ${article.title} - BlogSphere`,
      article,
      isEdit: true,
      formAction: `/articles/${article._id}?_method=PUT`,
      error: null,
    });
  } catch (error) {
    console.error('Error opening edit form:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      statusCode: 500,
      message: 'Could not load article editor.',
    });
  }
};

// Handle article update (Role/Ownership checked)
exports.postUpdateArticle = async (req, res) => {
  const { title, summary, content, category, tags, coverImage } = req.body;

  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).render('error', {
        title: 'Article Not Found',
        statusCode: 404,
        message: 'Article not found.',
      });
    }

    // RBAC & Ownership permission check
    const isAuthor = article.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).render('error', {
        title: '403 - Forbidden',
        statusCode: 403,
        message: 'You are not authorized to update this article.',
      });
    }

    if (!title || !content) {
      return res.status(400).render('articleForm', {
        title: `Edit: ${article.title} - BlogSphere`,
        article: { ...article.toObject(), title, summary, content, category, coverImage, tags },
        isEdit: true,
        formAction: `/articles/${article._id}?_method=PUT`,
        error: 'Title and content cannot be empty.',
      });
    }

    const tagArray = tags
      ? (Array.isArray(tags) ? tags : tags.split(',')).map((t) => t.trim()).filter(Boolean)
      : [];

    article.title = title.trim();
    article.summary = summary ? summary.trim() : '';
    article.content = content.trim();
    article.category = category && category.trim() ? category.trim() : 'General';
    article.tags = tagArray;
    article.coverImage = coverImage ? coverImage.trim() : '';

    await article.save();

    res.redirect(`/articles/${article._id}`);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).render('error', {
      title: 'Update Failed',
      statusCode: 500,
      message: 'Could not update the article.',
      details: error.message,
    });
  }
};

// Handle article deletion (Role/Ownership checked)
exports.postDeleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).render('error', {
        title: 'Article Not Found',
        statusCode: 404,
        message: 'Article not found.',
      });
    }

    // RBAC & Ownership check: author or admin can delete
    const isAuthor = article.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).render('error', {
        title: '403 - Forbidden',
        statusCode: 403,
        message: 'Access Denied: You do not have permission to delete this article.',
      });
    }

    // Remove article reference from User's articles array
    await User.findByIdAndUpdate(article.author, {
      $pull: { articles: article._id },
    });

    // Delete associated comments
    await Comment.deleteMany({ article: article._id });

    // Delete article itself
    await Article.findByIdAndDelete(article._id);

    // Redirect to my articles if author, or all articles if admin moderator
    return res.redirect(isAuthor ? '/my-articles' : '/articles');
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).render('error', {
      title: 'Deletion Failed',
      statusCode: 500,
      message: 'Could not delete the article.',
      details: error.message,
    });
  }
};
