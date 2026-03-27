const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Prettier Auto-Formatter...');
console.log('📝 Will run prettier:fix every minute on frontend and backend');
console.log('⏰ Started at:', new Date().toLocaleString());
console.log('Press Ctrl+C to stop\n');

// Function to run prettier on a specific directory
function runPrettier(directory) {
  return new Promise((resolve, reject) => {
    const command = `cd ${directory} && npm run prettier:fix`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error running prettier in ${directory}:`, error.message);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn(`⚠️  Warnings in ${directory}:`, stderr);
      }
      
      if (stdout.trim()) {
        console.log(`✅ ${directory}: ${stdout.trim()}`);
      } else {
        console.log(`✅ ${directory}: No files formatted`);
      }
      
      resolve();
    });
  });
}

// Function to run prettier on both directories
async function runPrettierOnBoth() {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n🔄 Running Prettier at ${timestamp}...`);
  
  try {
    await Promise.all([
      runPrettier('frontend'),
      runPrettier('backend'),
      runPrettier('mcp-server')
    ]);
    console.log(`✅ Prettier completed at ${timestamp}\n`);
  } catch (error) {
    console.error(`❌ Prettier failed at ${timestamp}:`, error.message, '\n');
  }
}

// Schedule the task to run every minute
cron.schedule('* * * * *', runPrettierOnBoth, {
  scheduled: true,
  timezone: "America/New_York"
});

// Run once immediately on startup
runPrettierOnBoth();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Prettier Auto-Formatter...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping Prettier Auto-Formatter...');
  process.exit(0);
}); 