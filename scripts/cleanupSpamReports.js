const axios = require('axios');
const readline = require('readline');
try { require('dotenv').config(); } catch (e) {}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

/**
 * ONE-TIME SAFE CLEANUP SCRIPT FOR EXISTING SPAM REPORTS
 * 
 * Usage:
 *   node scripts/cleanupSpamReports.js           (Interactive confirmation prompt)
 *   node scripts/cleanupSpamReports.js --confirm  (Non-interactive explicit confirmation)
 */
async function cleanupSpamReports() {
  console.log('===========================================================');
  console.log('=== CIVICRESOLVE: SPAM REPORT CLEANUP INSPECTION SCRIPT ===');
  console.log('===========================================================\n');

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-supabase-project')) {
    console.log('[CLEANUP] Supabase credentials not configured. Zero remote database operations performed.');
    return;
  }

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/civic_reports`;
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Fetch existing reports from civic_reports
    console.log('[CLEANUP] Fetching existing reports from civic_reports table...');
    const response = await axios.get(url, {
      params: { select: '*' },
      headers: headers
    });

    const allReports = response.data || [];
    console.log(`[CLEANUP] Total reports fetched from database: ${allReports.length}`);

    if (allReports.length === 0) {
      console.log('[CLEANUP] No reports found in civic_reports table. Nothing to clean.');
      return;
    }

    // 2. Apply spam rules
    const spamReports = [];
    for (const report of allReports) {
      const reasons = [];

      // RULE 1 — NO PHOTO
      const imageUrl = report.image_url || report.imageUrl;
      if (imageUrl === null || imageUrl === undefined || (typeof imageUrl === 'string' && imageUrl.trim() === '')) {
        reasons.push('NO_PHOTO');
      }

      // RULE 2 — EMPTY DESCRIPTION
      const description = report.description;
      if (description === null || description === undefined || (typeof description === 'string' && description.trim() === '')) {
        reasons.push('EMPTY_DESCRIPTION');
      }

      // RULE 3 — STATUS MARKED AS SPAM PREVIOUSLY
      if (report.status === 'Spam' || report.status === 'SPAM') {
        reasons.push('LEGACY_SPAM_STATUS');
      }

      if (reasons.length > 0) {
        spamReports.push({ id: report.id, reasons: reasons });
      }
    }

    console.log(`\nFOUND SPAM REPORTS (${spamReports.length}):`);
    if (spamReports.length === 0) {
      console.log('None! All database reports are clean and valid.');
      return;
    }

    spamReports.forEach(item => {
      console.log(`${item.id} (Reasons: ${item.reasons.join(', ')})`);
    });

    // Check for non-interactive flag --confirm
    const isAutoConfirmed = process.argv.includes('--confirm');

    if (isAutoConfirmed) {
      console.log('\n[CLEANUP] --confirm flag detected. Proceeding with deletion...');
      await deleteIdentifiedReports(spamReports, url, headers);
      return;
    }

    // Interactive confirmation prompt
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\nDelete these reports? YES/NO: ', async (answer) => {
      rl.close();
      const cleanAnswer = (answer || '').trim().toUpperCase();
      if (cleanAnswer === 'YES') {
        await deleteIdentifiedReports(spamReports, url, headers);
      } else {
        console.log('[CLEANUP] Deletion cancelled by user. No database records were modified.');
      }
    });

  } catch (err) {
    console.error(`[CLEANUP] Error inspecting civic_reports: ${err.message}`);
  }
}

async function deleteIdentifiedReports(spamReports, url, headers) {
  let deletedCount = 0;
  for (const item of spamReports) {
    try {
      console.log(`[CLEANUP] Deleting exact report ID: ${item.id}...`);
      await axios.delete(url, {
        params: { id: `eq.${item.id}` },
        headers: headers
      });
      deletedCount++;
    } catch (err) {
      console.error(`[CLEANUP] Failed to delete report ${item.id}: ${err.message}`);
    }
  }
  console.log(`\n===========================================================`);
  console.log(`[CLEANUP COMPLETE] Successfully deleted ${deletedCount} of ${spamReports.length} identified spam reports.`);
  console.log(`===========================================================`);
}

if (require.main === module) {
  cleanupSpamReports();
}

module.exports = { cleanupSpamReports };
