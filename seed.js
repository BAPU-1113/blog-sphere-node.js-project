require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Article = require('./models/Article');
const Comment = require('./models/Comment');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blog_db';

const seedDatabase = async (options = {}) => {
  const { disconnectOnComplete = false, exitOnComplete = false } = options;
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('🔄 Connecting to MongoDB for seeding...');
      const connectDB = require('./config/db');
      await connectDB();
    }

    // Clear existing collections
    console.log('🧹 Cleaning old data...');
    await User.deleteMany({});
    await Article.deleteMany({});
    await Comment.deleteMany({});

    // 1. Create Users
    console.log('👤 Creating users (Admin & Standard Users)...');

    const adminUser = new User({
      username: 'admin',
      email: 'admin@blogsphere.dev',
      password: 'admin123',
      role: 'admin',
      bio: 'Platform Administrator & Senior Solutions Architect. Overseeing community quality and core platform engineering.',
    });
    await adminUser.save();

    const aliceUser = new User({
      username: 'alice',
      email: 'alice@blogsphere.dev',
      password: 'user123',
      role: 'user',
      bio: 'Full-Stack JavaScript Developer specializing in Node.js, microservices, and reactive user interfaces.',
    });
    await aliceUser.save();

    const bobUser = new User({
      username: 'bob',
      email: 'bob@blogsphere.dev',
      password: 'user123',
      role: 'user',
      bio: 'UI/UX Designer & Frontend Craftsman obsessed with design systems, typography, and human-computer interaction.',
    });
    await bobUser.save();

    // 2. Create Sample Articles
    console.log('📝 Creating sample articles...');

    const article1 = new Article({
      title: 'Mastering JWT & HttpOnly Cookies in Modern Express Architectures',
      summary: 'A deep dive into secure token issuance, stateless authorization, role-based guards, and avoiding XSS vulnerabilities.',
      content: `JSON Web Tokens (JWT) have become the de facto standard for stateless authentication in modern distributed applications. However, storing JWTs improperly—such as in localStorage—exposes client applications to Cross-Site Scripting (XSS) extraction attacks.

By issuing JWTs via secure, httpOnly cookies with strict SameSite policies, we eliminate client-side script access entirely while retaining the stateless verification power of cryptographic digital signatures.

### Why Role-Based Access Control Matters
In enterprise platforms, users require different authorization levels:
1. **Readers & Regular Users:** Can read public posts, create comments, and author/manage their own articles.
2. **Administrators:** Hold elevated permissions to moderate content, audit inappropriate comments, and maintain the integrity of the platform.

Express middleware provides an elegant pattern to decode the token payload once, hydrate 'req.user', and enforce role constraints across protected routes.`,
      category: 'Web Development',
      tags: ['nodejs', 'express', 'jwt', 'security'],
      coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
      author: adminUser._id,
    });
    await article1.save();

    const article2 = new Article({
      title: 'Designing Clean Mongoose Schemas: Population vs Denormalization',
      summary: 'Learn how to model relational data in MongoDB using Mongoose references, bidirectional relationships, and virtual getters.',
      content: `MongoDB is a document database, but real-world domain models frequently have relational dependencies. For instance, in our blogging platform:
- Each Article belongs to an Author (User)
- Each User maintains a list of authored Articles
- Each Article has multiple Comments
- Each Comment is attributed to a specific User

### Using Mongoose Population
Rather than manually querying each related collection, Mongoose's '.populate()' method seamlessly resolves ObjectId references into full hydrated sub-documents.

Pairing population with index optimization ensures quick response times without sacrificing schema cleanliness.`,
      category: 'Technology',
      tags: ['mongodb', 'mongoose', 'database', 'backend'],
      coverImage: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80',
      author: aliceUser._id,
    });
    await article2.save();

    const article3 = new Article({
      title: 'The Art of Glassmorphism and Micro-Interactions in Modern UI',
      summary: 'Exploring how subtle blurs, balanced color contrasts, and responsive CSS tokens transform plain web pages into delightful experiences.',
      content: `Great interfaces feel alive. When designing BlogSphere, our design system centered on three core principles:
1. **Visual Hierarchy:** Distinct visual weights for headers, article excerpts, and badges.
2. **Subtle Elevation:** Multi-layered box shadows that respond to hover states.
3. **Role-Aware Feedback:** Highlighting admin privileges with ruby tints and member badges with sapphire tones.

Small micro-interactions, such as smooth hover transforms on article cards and clear action modals, create emotional resonance and trust with users.`,
      category: 'Design & UX',
      tags: ['css', 'ui-ux', 'design', 'frontend'],
      coverImage: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
      author: bobUser._id,
    });
    await article3.save();

    // 3. Link Articles to Authors
    console.log('🔗 Linking articles to user profiles (Multiuser Support)...');
    adminUser.articles.push(article1._id);
    await adminUser.save();

    aliceUser.articles.push(article2._id);
    await aliceUser.save();

    bobUser.articles.push(article3._id);
    await bobUser.save();

    // 4. Create Sample Comments
    console.log('💬 Adding sample comments with populated relationships...');

    const comment1 = new Comment({
      content: 'Outstanding explanation of HttpOnly cookies! This solves a huge vulnerability we had in our prior architecture.',
      author: aliceUser._id,
      article: article1._id,
    });
    await comment1.save();
    article1.comments.push(comment1._id);
    await article1.save();

    const comment2 = new Comment({
      content: 'The role-based middleware approach is super clean and easy to test.',
      author: bobUser._id,
      article: article1._id,
    });
    await comment2.save();
    article1.comments.push(comment2._id);
    await article1.save();

    const comment3 = new Comment({
      content: 'Mongoose population with nested author details makes building the single article view so straightforward!',
      author: adminUser._id,
      article: article2._id,
    });
    await comment3.save();
    article2.comments.push(comment3._id);
    await article2.save();

    console.log('\n==========================================');
    console.log('🎉 Database seeding completed successfully!');
    console.log('==========================================');
    console.log('Test Accounts Available:');
    console.log('  👑 Admin User:');
    console.log('     Username: admin');
    console.log('     Password: admin123');
    console.log('     Role:     admin (Has permissions to delete/edit any article or comment)');
    console.log('  👤 Regular User 1:');
    console.log('     Username: alice');
    console.log('     Password: user123');
    console.log('     Role:     user');
    console.log('  👤 Regular User 2:');
    console.log('     Username: bob');
    console.log('     Password: user123');
    console.log('     Role:     user');
    console.log('==========================================\n');

    if (disconnectOnComplete) {
      await mongoose.disconnect();
    }
    if (exitOnComplete) {
      process.exit(0);
    }
    return true;
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    if (exitOnComplete) {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = seedDatabase;

if (require.main === module) {
  seedDatabase({ disconnectOnComplete: true, exitOnComplete: true });
}
