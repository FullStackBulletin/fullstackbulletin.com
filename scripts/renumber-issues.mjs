import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const RAW_ARCHIVES = new URL('../raw_archives/', import.meta.url).pathname;
const MAX_PRE2022_INDEX = 243;

async function main() {
  const entries = (await readdir(RAW_ARCHIVES))
    .filter((d) => /^\d{4}-\d{2}-\d{2}-\d{3}-/.test(d))
    .sort();

  let updatedCount = 0;
  let titleChangeCount = 0;

  for (const dirName of entries) {
    const match = dirName.match(/^\d{4}-\d{2}-\d{2}-(\d{3})-/);
    if (!match) continue;

    const dirIndex = parseInt(match[1], 10);
    if (dirIndex > MAX_PRE2022_INDEX) continue;

    const metadataPath = join(RAW_ARCHIVES, dirName, 'metadata.json');
    const raw = await readFile(metadataPath, 'utf-8');
    const data = JSON.parse(raw);

    const oldIssueNumber = data.issueNumber;
    const newNumber = dirIndex;
    const oldTitle = data.title;

    // Update issueNumber
    data.issueNumber = newNumber;

    // Update title if it contains an issue number prefix
    let titleChanged = false;

    if (dirIndex === 77) {
      // Special case: F#34 → #77: F# — For-loops are complicated
      data.title = '#77: F# \u2014 For-loops are complicated';
      titleChanged = data.title !== oldTitle;
    } else if (/#\s*\d+\s*:\s*/.test(data.title)) {
      // Match "#NN: " or "# NN: " anywhere in title
      const newTitle = data.title.replace(/#\s*\d+\s*:\s*/, `#${newNumber}: `);
      titleChanged = newTitle !== data.title;
      data.title = newTitle;
    } else if (/^\d+\s*:\s*/.test(data.title)) {
      // Match bare "NN: " at start of title (corrupted 2020-2021 issues)
      const newTitle = data.title.replace(/^\d+\s*:\s*/, `#${newNumber}: `);
      titleChanged = newTitle !== data.title;
      data.title = newTitle;
    }

    if (titleChanged) titleChangeCount++;

    const numberChanged = oldIssueNumber !== newNumber;
    const changed = numberChanged || titleChanged;

    if (changed) {
      await writeFile(metadataPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      updatedCount++;
    }

    const titleNote = titleChanged
      ? `, title: "${oldTitle}" → "${data.title}"`
      : ', title unchanged';
    const numberNote = numberChanged
      ? `issueNumber: ${oldIssueNumber} → ${newNumber}`
      : `issueNumber: ${newNumber} (unchanged)`;

    console.log(`[${String(dirIndex).padStart(3, '0')}] ${numberNote}${titleNote}`);
  }

  console.log(
    `\nUpdated ${updatedCount} issues. Title changes: ${titleChangeCount}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
