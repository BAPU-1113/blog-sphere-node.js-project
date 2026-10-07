const Comment = require('../models/Comment');
const Article = require('../models/Article');

// Add comment to an article
exports.postAddComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  try {
    if (!content || !content.trim()) {
      return res.redirect(`/articles/${id}?commentError=Comment cannot be empty`);
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).render('error', {
        title: 'Article Not Found',
        statusCode: 404,
        message: 'Cannot comment on a non-existent article.',
      });
    }

    const newComment = new Comment({
      content: content.trim(),
      author: req.user.id,
      article: article._id,
    });

    await newComment.save();

    // Push comment reference to article's comments array
    article.comments.push(newComment._id);
    await article.save();

    res.redirect(`/articles/${id}#comments`);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.redirect(`/articles/${id}?commentError=Failed to submit comment`);
  }
};

// Delete a comment (Comment author or Admin only)
exports.postDeleteComment = async (req, res) => {
  const { articleId, commentId } = req.params;

  try {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.redirect(`/articles/${articleId}#comments`);
    }

    // Role-based authorization & ownership check
    const isCommentAuthor = comment.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isCommentAuthor && !isAdmin) {
      return res.status(403).render('error', {
        title: '403 - Forbidden',
        statusCode: 403,
        message: 'You are not authorized to delete this comment.',
      });
    }

    // Pull from article comments array
    await Article.findByIdAndUpdate(articleId, {
      $pull: { comments: comment._id },
    });

    // Delete comment
    await Comment.findByIdAndDelete(comment._id);

    res.redirect(`/articles/${articleId}#comments`);
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.redirect(`/articles/${articleId}#comments`);
  }
};
