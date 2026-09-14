/**
 * BPS Fresh Mills — AI Assistant & Production Readiness Automated Verification
 */

const http = require('http');

const BASE_HOST = '127.0.0.1';
const BASE_PORT = 5000;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      'Origin': 'https://bpsfreshmills.in'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (dataString) headers['Content-Length'] = Buffer.byteLength(dataString);

    const req = http.request({
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: `/api${path}`,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('  RUNNING BPS FRESH MILLS: AI ASSISTANT & PRODUCTION TESTS');
  console.log('=============================================================\n');

  try {
    // ── 1. PRODUCTION HEALTH CHECK & HEADERS ──
    console.log('[TEST GROUP 1] Production Health Check & Security Headers');
    const health = await request('GET', '/health');
    assert(health.status === 200, 'Health endpoint responds with HTTP 200 OK');
    assert(health.data.status === 'ok', 'Health status is OK');
    assert(health.data.brand === 'BPS Fresh Mills', 'Brand name verified');
    assert(health.data.paymentGateway.includes('COD ONLY'), 'Strictly COD Only payment model verified');
    assert(health.data.database.status === 'CONNECTED', 'Database connection status is CONNECTED');
    assert(health.headers['x-content-type-options'] === 'nosniff', 'Security header X-Content-Type-Options: nosniff present');
    assert(health.headers['x-frame-options'] === 'SAMEORIGIN', 'Security header X-Frame-Options: SAMEORIGIN present');

    // ── 2. ADMIN AUTHENTICATION ──
    console.log('\n[TEST GROUP 2] Admin Authentication for AI Access');
    const loginRes = await request('POST', '/auth/login', {
      identifier: 'bpsfreshmills@gmail.com',
      password: 'bps@2005'
    });
    assert(loginRes.status === 200 && loginRes.data.success, 'Admin authenticated for AI Assistant access');
    const adminToken = loginRes.data.token;

    // Unauthorized access rejection
    const unauthAi = await request('POST', '/admin/ai-assistant/query', { query: 'Aaj kitni sale hui?' }, null);
    assert(unauthAi.status === 401, 'Unauthorized request to AI Assistant strictly rejected with 401');

    // ── 3. REAL DATA QUERY ENGINE (ZERO HALLUCINATION) ──
    console.log('\n[TEST GROUP 3] AI Assistant Real Data Queries');

    // 3.1 Aaj kitni sale hui?
    const q1 = await request('POST', '/admin/ai-assistant/query', { query: 'Aaj kitni sale hui?' }, adminToken);
    assert(q1.status === 200 && q1.data.success, 'Query processed: "Aaj kitni sale hui?"');
    assert(q1.data.source === 'DATABASE_GROUNDED', 'Grounding source verified as DATABASE_GROUNDED');
    assert(q1.data.facts.totalRevenue !== undefined, 'Contains verified revenue metrics from database');

    // 3.2 Kaunsa product sabse zyada bik raha hai?
    const q2 = await request('POST', '/admin/ai-assistant/query', { query: 'Kaunsa product sabse zyada bik raha hai?' }, adminToken);
    assert(q2.status === 200 && q2.data.success, 'Query processed: "Kaunsa product sabse zyada bik raha hai?"');
    assert(q2.data.answer.includes('BPS Fresh Mills') || q2.data.answer.includes('Selling'), 'Answers with top product analysis');

    // 3.3 Kaunsa stock jaldi khatam hoga?
    const q3 = await request('POST', '/admin/ai-assistant/query', { query: 'Kaunsa stock jaldi khatam hoga?' }, adminToken);
    assert(q3.status === 200 && q3.data.success, 'Query processed: "Kaunsa stock jaldi khatam hoga?"');
    assert(q3.data.answer.includes('Stock') || q3.data.facts.threshold === 10, 'Stock alerts calculated against real threshold');

    // 3.4 Is month profit kitna hai?
    const q4 = await request('POST', '/admin/ai-assistant/query', { query: 'Is month profit kitna hai?' }, adminToken);
    assert(q4.status === 200 && q4.data.success, 'Query processed: "Is month profit kitna hai?"');
    assert(q4.data.facts.estimatedGrossProfit !== undefined, 'Calculated estimated monthly milling gross margin');

    // 3.5 Kitna COD pending hai?
    const q5 = await request('POST', '/admin/ai-assistant/query', { query: 'Kitna COD pending hai?' }, adminToken);
    assert(q5.status === 200 && q5.data.success, 'Query processed: "Kitna COD pending hai?"');
    assert(q5.data.facts.totalPendingCod !== undefined, 'Calculated real pending COD across delivery riders');

    // 3.6 Aaj kitne orders aaye?
    const q6 = await request('POST', '/admin/ai-assistant/query', { query: 'Aaj kitne orders aaye?' }, adminToken);
    assert(q6.status === 200 && q6.data.success, 'Query processed: "Aaj kitne orders aaye?"');
    assert(q6.data.facts.totalOrders !== undefined, 'Returned real count of today orders');

    // 3.7 Top 5 products kaunse hain?
    const q7 = await request('POST', '/admin/ai-assistant/query', { query: 'Top 5 products kaunse hain?' }, adminToken);
    assert(q7.status === 200 && q7.data.success, 'Query processed: "Top 5 products kaunse hain?"');

    // 3.8 Unsupported/Unavailable data query (Zero Hallucination check)
    const q8 = await request('POST', '/admin/ai-assistant/query', { query: 'Weather in Mumbai tomorrow?' }, adminToken);
    assert(q8.status === 200 && q8.data.source === 'UNAVAILABLE', 'Non-store queries gracefully declined without hallucination');

    // ── 4. SENSITIVE ACTION PROPOSAL & ADMIN CONFIRMATION SAFEGUARD ──
    console.log('\n[TEST GROUP 4] AI Action Proposal & Confirmation Safeguard');

    // AI must NOT execute mutation silently
    const actionQuery = await request('POST', '/admin/ai-assistant/query', { query: 'Stock set karo Chakki Fresh Atta par 45' }, adminToken);
    assert(actionQuery.status === 200 && actionQuery.data.actionProposal !== null, 'Detected action and formulated Action Proposal');
    assert(actionQuery.data.actionProposal.requiresConfirmation === true, 'Explicitly requires admin confirmation');
    assert(actionQuery.data.actionProposal.newStock === 45, 'Parsed proposed stock value accurately');

    // Admin executes the proposal with explicit confirmation
    const execRes = await request('POST', '/admin/ai-assistant/execute-action', {
      actionPayload: actionQuery.data.actionProposal
    }, adminToken);
    assert(execRes.status === 200 && execRes.data.success, 'Admin confirmed and executed proposed action');

    // ── 5. AI QUICK STATS DASHBOARD ──
    console.log('\n[TEST GROUP 5] AI Quick Stats Snapshot');
    const statsRes = await request('GET', '/admin/ai-assistant/quick-stats', null, adminToken);
    assert(statsRes.status === 200 && statsRes.data.success, 'Fetched AI Quick Stats snapshot');
    assert(statsRes.data.stats.todaySales !== undefined, 'Stats include todaySales');
    assert(statsRes.data.stats.lowStockCount !== undefined, 'Stats include lowStockCount');
    assert(statsRes.data.stats.pendingCod !== undefined, 'Stats include pendingCod');

    // ── 6. DATABASE BACKUP STRATEGY & DISASTER RECOVERY ──
    console.log('\n[TEST GROUP 6] Database Backup & Disaster Recovery');
    const backupCreate = await request('POST', '/admin/system/backup', null, adminToken);
    assert(backupCreate.status === 201 && backupCreate.data.success, 'Admin triggered full database backup');
    assert(backupCreate.data.backup.fileName.startsWith('bps_backup_'), 'Backup file has timestamped naming convention');
    assert(backupCreate.data.backup.totalRecords > 0, 'Backup contains active collections records: ' + backupCreate.data.backup.totalRecords);

    const backupList = await request('GET', '/admin/system/backups', null, adminToken);
    assert(backupList.status === 200 && backupList.data.count > 0, 'Listed available backups');

    // ── SUMMARY ──
    console.log('\n=============================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('=============================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('All AI Business Assistant and Production-readiness tests passed!\n');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error running tests:', err);
    process.exit(1);
  }
}

runTests();
