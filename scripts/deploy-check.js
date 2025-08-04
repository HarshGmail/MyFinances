const { execSync } = require('child_process');

const steps = [
  { label: '🧹 Prettier Check Frontend', cmd: 'cd frontend && npm run prettier:check' },
  { label: '🧹 Prettier Check Backend', cmd: 'cd backend && npm run prettier:check' },
  { label: '🔍 Linting Frontend', cmd: 'cd frontend && npm run lint' },
  { label: '🔍 Linting Backend', cmd: 'cd backend && npm run lint' },
  { label: '📦 Building Frontend', cmd: 'cd frontend && npm run build' },
  { label: '📦 Building Backend', cmd: 'cd backend && npm run build' },
];

(async () => {
  console.log('\n🚀 Starting Deploy Check...\n');

  for (const step of steps) {
    console.log(`${step.label}...`);
    try {
      const output = execSync(step.cmd, { stdio: 'pipe' });
      console.log(`✅ Success: ${step.label}\n${output.toString()}`);
    } catch (err) {
      console.error(`❌ Failed: ${step.label}`);
      console.error(err.stdout?.toString() || err.message);
      process.exit(1);
    }
  }

  console.log('\n✅ All checks passed. Ready to deploy!\n');
})();
