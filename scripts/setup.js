const bcrypt = require('bcryptjs');

async function generatePasswordHash() {
  const password = process.argv[2] || 'admin';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('\n================================');
  console.log('AI Visibility Tool - Setup');
  console.log('================================\n');
  
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}\n`);
  
  console.log('Add this to your .env.local file:');
  console.log(`SHARED_PASSWORD_HASH=${hash}\n`);
  
  console.log('To start the database:');
  console.log('docker-compose up -d\n');
  
  console.log('To run the app:');
  console.log('npm run dev\n');
}

generatePasswordHash();