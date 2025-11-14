# Transcript Update Guide

Easy backend methods to add transcripts to interview records.

## Method 1: Command Line Script (Easiest!)

### Update Single Interview

```bash
cd hub
npm run update-transcript -- --name "Mitch Robinson" --transcript "path/to/transcript.txt" --status "Interview complete"
```

Or with inline text:

```bash
npm run update-transcript -- --name "Mitch Robinson" --transcript "The full interview text goes here..." --status "Interview complete"
```

### Bulk Update Multiple Interviews

1. Create a JSON file with your transcripts (see `example-transcripts.json`):

```json
[
  {
    "name": "Vic Manning",
    "transcript": "Full transcript text...",
    "status": "Interview complete"
  },
  {
    "name": "Nicole Dickenson",
    "transcript": "Full transcript text...",
    "status": "Interview complete"
  }
]
```

2. Run the bulk update:

```bash
npm run update-transcript -- --bulk my-transcripts.json
```

### Features

- ✅ Automatically finds the interview file by name (fuzzy matching)
- ✅ Updates or adds transcript section
- ✅ Optionally updates status to "Interview complete" or "Interview locked"
- ✅ Works with text files or inline text
- ✅ Bulk processing from JSON
- ✅ Clear success/failure reporting

---

## Method 2: API Endpoint (For Automation)

### Update Single Interview via API

**Endpoint:** `POST /api/interviews/update-transcript`

**Request:**

```json
{
  "name": "Mitch Robinson",
  "transcript": "Full transcript text here...",
  "status": "Interview complete"
}
```

**Response:**

```json
{
  "success": true,
  "filename": "Mitch Robinson 281ebcf981cf816c8041eda359f28653.md",
  "message": "Transcript updated successfully for Mitch Robinson",
  "status": "Interview complete"
}
```

### Example using curl:

```bash
curl -X POST http://localhost:3080/api/interviews/update-transcript \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mitch Robinson",
    "transcript": "The full interview transcript...",
    "status": "Interview complete"
  }'
```

### Example using JavaScript:

```javascript
const response = await fetch('/api/interviews/update-transcript', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Mitch Robinson',
    transcript: 'Full transcript...',
    status: 'Interview complete'
  })
})

const result = await response.json()
console.log(result.message)
```

---

## Status Options

When updating transcripts, you can set the status to:

- `"Interview complete"` - Full transcript ready for analysis
- `"Interview locked"` - Completed and locked for final review
- Leave blank to keep existing status

---

## Tips

1. **Name Matching:** The script uses fuzzy matching, so you can use:
   - "Mitch Robinson"
   - "mitch"
   - "robinson"

2. **Transcript Files:** You can keep transcripts in a separate folder like:
   ```
   hub/transcripts/
     ├── mitch-robinson.txt
     ├── vic-manning.txt
     └── nicole-dickenson.txt
   ```

   Then reference them:
   ```bash
   npm run update-transcript -- --name "Mitch" --transcript "transcripts/mitch-robinson.txt"
   ```

3. **Bulk Updates:** For many interviews, create a JSON file with all updates and run once:
   ```bash
   npm run update-transcript -- --bulk all-transcripts.json
   ```

---

## What Happens

1. Script finds the interview markdown file
2. Updates the Status field (if provided)
3. Adds or replaces the "## Full Transcript" section
4. Saves the file
5. Reports success/failure

The frontend automatically picks up these changes!
