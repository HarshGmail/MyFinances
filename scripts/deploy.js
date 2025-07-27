const { execSync } = require('child_process');

const args = process.argv.slice(2);
const isAmend = args.includes('--amend') && args.includes('--no-edit');
const commitMessage = args.filter(arg => !arg.startsWith('--')).join(' ').trim();

(async () => {
  try {
    console.log('\n🚀 Running Deploy Check...');
    execSync('npm run deploy:check', { stdio: 'inherit' });

    console.log('\n📂 Staging changes...');
    execSync('git add .', { stdio: 'inherit' });

    if (isAmend) {
      console.log('\n✏️ Amending last commit...');
      execSync('git commit --amend --no-edit', { stdio: 'inherit' });
      console.log('\n🚀 Pushing with force...');
      execSync('git push --force', { stdio: 'inherit' });
    } else if (commitMessage) {
      console.log(`\n📝 Committing: "${commitMessage}"`);
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      console.log('\n🚀 Pushing...');
      execSync('git push', { stdio: 'inherit' });
    } else {
      console.error('\n❌ Error: No commit message provided and not using --amend --no-edit');
      process.exit(1);
    }

    console.log('\n✅ Deploy complete.');
  } catch (err) {
    console.error('\n❌ Deploy failed:', err.message);
    process.exit(1);
  }
})();
