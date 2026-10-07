const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

let memoryServerInstance = null;

const connectDB = async () => {
  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const configuredUri = process.env.MONGO_URI;
  const defaultLocalUri = 'mongodb://127.0.0.1:27017/blog_db';
  const targetUri = configuredUri || defaultLocalUri;

  // 1. Attempt connection to configured or default URI
  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: 2000, // fast failover if local daemon isn't running
    });
    const host = mongoose.connection.host || '127.0.0.1';
    const port = mongoose.connection.port || 27017;
    const dbName = mongoose.connection.name || 'blog_db';
    console.log(`✅ MongoDB connected successfully to: ${host}:${port}/${dbName}`);
    await autoSeedIfEmpty();
    return conn;
  } catch (error) {
    // If user provided a remote Atlas connection (e.g. mongodb+srv://), report Atlas error directly
    const isLocalhost = targetUri.includes('127.0.0.1') || targetUri.includes('localhost');
    if (!isLocalhost && configuredUri) {
      console.error(`❌ MongoDB Connection Error (${targetUri}): ${error.message}`);
      console.error(`\n💡 Tip: Please check your Atlas credentials, network IP whitelist, and MONGO_URI in .env.\n`);
      return null;
    }

    // 2. If localhost failed (e.g. ECONNREFUSED), start persistent embedded MongoDB
    console.warn(`\nℹ️  Local MongoDB service was not detected on port 27017 (${error.message}).`);
    console.log(`🚀 Starting embedded MongoDB server with local persistence...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const dbPath = path.join(__dirname, '..', '.mongo_data');

      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }

      memoryServerInstance = await MongoMemoryServer.create({
        instance: {
          dbPath: dbPath,
          storageEngine: 'wiredTiger',
        },
      });

      const embeddedUri = memoryServerInstance.getUri() + 'blog_db';
      const conn = await mongoose.connect(embeddedUri);

      console.log(`✅ Embedded MongoDB is running and connected successfully!`);
      console.log(`📁 Local Data Directory: ${dbPath}`);
      console.log(`💡 Tip: To switch to an external MongoDB service or Atlas, update MONGO_URI in .env.\n`);

      await autoSeedIfEmpty();
      return conn;
    } catch (memError) {
      console.error(`❌ Failed to start embedded MongoDB server: ${memError.message}`);
      return null;
    }
  }
};

// Auto-seed initial demo accounts and sample articles if DB is empty
async function autoSeedIfEmpty() {
  try {
    const User = require('../models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Empty database detected. Auto-seeding initial demo accounts & articles...');
      const seedDatabase = require('../seed');
      await seedDatabase({ disconnectOnComplete: false, exitOnComplete: false });
    }
  } catch (err) {
    console.warn('⚠️  Auto-seed check skipped or failed:', err.message);
  }
}

// Graceful cleanup handlers
const shutdown = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
    }
  } catch (e) {
    // ignore on exit
  }
};

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

module.exports = connectDB;
