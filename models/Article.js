const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [300, 'Summary cannot exceed 300 characters'],
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Article content is required'],
    },
    coverImage: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Virtual for reading time calculation
articleSchema.virtual('readTime').get(function () {
  if (!this.content) return '1 min read';
  const wordCount = this.content.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
});

// Fallback cover image virtual
articleSchema.virtual('displayImage').get(function () {
  if (this.coverImage && this.coverImage.trim() !== '') {
    return this.coverImage;
  }
  // Curated modern unsplash backgrounds based on category hash
  const defaultImages = [
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  ];
  const charCodeSum = (this.title || 'A').charCodeAt(0);
  return defaultImages[charCodeSum % defaultImages.length];
});

articleSchema.set('toObject', { virtuals: true });
articleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Article', articleSchema);
