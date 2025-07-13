# Prettier Auto-Formatter

This script automatically runs Prettier formatting on both frontend and backend folders every minute.

## Usage

### Start the auto-formatter:
```bash
npm run prettier:auto
```

### Manual formatting commands:
```bash
# Format frontend only
npm run prettier:frontend

# Format backend only  
npm run prettier:backend

# Format both frontend and backend
npm run prettier:all
```

## How it works

The `prettier-auto.js` script:
- Uses `node-cron` to schedule Prettier formatting every minute
- Runs `npm run prettier:fix` in both frontend and backend directories
- Provides real-time feedback with timestamps and status messages
- Handles errors gracefully and continues running
- Can be stopped with Ctrl+C

## Output example

```
🚀 Starting Prettier Auto-Formatter...
📝 Will run prettier:fix every minute on frontend and backend
⏰ Started at: 12/19/2024, 2:30:45 PM
Press Ctrl+C to stop

🔄 Running Prettier at 2:30:45 PM...
✅ frontend: No files formatted
✅ backend: No files formatted
✅ Prettier completed at 2:30:45 PM

🔄 Running Prettier at 2:31:45 PM...
✅ frontend: No files formatted
✅ backend: No files formatted
✅ Prettier completed at 2:31:45 PM
```

## Requirements

- Node.js installed
- `node-cron` package (installed via root package.json)
- Prettier configured in both frontend and backend packages 