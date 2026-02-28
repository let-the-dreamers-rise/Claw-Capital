import fetch from 'node-fetch';
import { readJSON, appendToArray } from './memory.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MOLTBOOK_BASE_URL = 'https://www.moltbook.com/api/v1';
const MOLTBOOK_SUBMOLT = 'lablab';
const CREDENTIALS_FILE = join(__dirname, '..', '..', 'moltbook_credentials.json');

// ═══════════════════════════════════════
// CREDENTIALS MANAGEMENT
// ═══════════════════════════════════════

function getApiKey() {
    // 1. Check env
    if (process.env.MOLTBOOK_API_KEY) return process.env.MOLTBOOK_API_KEY;

    // 2. Check credentials file
    if (existsSync(CREDENTIALS_FILE)) {
        try {
            const creds = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf-8'));
            if (creds.api_key) {
                process.env.MOLTBOOK_API_KEY = creds.api_key;
                return creds.api_key;
            }
        } catch (e) { /* ignore */ }
    }

    return null;
}

function getMoltbookHeaders() {
    const key = getApiKey();
    if (!key) return null;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
    };
}

export function isMoltbookAvailable() {
    return !!getApiKey();
}

// ═══════════════════════════════════════
// AUTO-REGISTRATION (runs on server startup)
// ═══════════════════════════════════════

export async function initMoltbook() {
    // Already have a key? Check if it works.
    const existing = getApiKey();
    if (existing) {
        console.log('🦞 Moltbook: API key found, checking status...');
        try {
            const res = await fetch(`${MOLTBOOK_BASE_URL}/agents/me`, {
                headers: { 'Authorization': `Bearer ${existing}` }
            });
            if (res.ok) {
                const data = await res.json();
                console.log(`✅ Moltbook: Logged in as "${data.agent?.name || 'agent'}" (karma: ${data.agent?.karma || 0})`);
                return true;
            } else {
                console.log('⚠️ Moltbook: API key invalid, will try to register...');
            }
        } catch (e) {
            console.log(`⚠️ Moltbook: Connection error — ${e.message}`);
            return false;
        }
    }

    // No key — register
    console.log('🦞 Moltbook: No API key found, registering agent...');
    try {
        const res = await fetch(`${MOLTBOOK_BASE_URL}/agents/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'ClawCapitalSurge',
                description: 'Sovereign autonomous capital allocation engine. Evaluates AI agent ventures with Gemini AI, deploys capital via SURGE on Solana. Built for SURGE x OpenClaw hackathon.'
            })
        });

        const data = await res.json();

        if (res.status === 201 && data.agent?.api_key) {
            const apiKey = data.agent.api_key;
            process.env.MOLTBOOK_API_KEY = apiKey;

            // Save credentials
            writeFileSync(CREDENTIALS_FILE, JSON.stringify({
                api_key: apiKey,
                agent_name: data.agent.name || 'ClawCapitalSurge',
                claim_url: data.agent.claim_url,
                verification_code: data.agent.verification_code,
                registered_at: new Date().toISOString()
            }, null, 2));

            // Update .env
            try {
                const envPath = join(__dirname, '..', '..', '.env');
                let env = readFileSync(envPath, 'utf-8');
                env = env.replace(/MOLTBOOK_API_KEY=.*/, `MOLTBOOK_API_KEY=${apiKey}`);
                writeFileSync(envPath, env);
            } catch (e) { /* ignore */ }

            console.log(`✅ Moltbook: Registered as "${data.agent.name || 'ClawCapitalSurge'}"`);
            console.log(`🔗 Claim URL: ${data.agent.claim_url}`);
            console.log(`📋 Verification Code: ${data.agent.verification_code}`);
            console.log(`⚠️ Give the claim URL to your human to activate!`);
            return true;
        } else if (res.status === 409) {
            console.log('⚠️ Moltbook: Agent name already taken. Set MOLTBOOK_API_KEY in .env manually.');
            return false;
        } else if (res.status === 429) {
            console.log('⚠️ Moltbook: Rate limited. Try again later or set MOLTBOOK_API_KEY in .env.');
            return false;
        } else {
            console.log(`⚠️ Moltbook: Registration failed (${res.status}): ${data.message || 'unknown error'}`);
            return false;
        }
    } catch (e) {
        console.log(`⚠️ Moltbook: Registration error — ${e.message}`);
        return false;
    }
}

// ═══════════════════════════════════════
// VERIFICATION CHALLENGE SOLVER
// ═══════════════════════════════════════

function solveChallenge(challengeText) {
    // The challenge is an obfuscated math word problem
    // Example: "A] lO^bSt-Er S[wImS aT/ tW]eNn-Tyy mE^tE[rS aNd] SlO/wS bY^ fI[vE"
    // Step 1: Strip ALL non-alphabetic non-space chars, normalize
    console.log('🔐 Raw challenge:', challengeText);

    const cleaned = challengeText
        .replace(/[^a-zA-Z\s]/g, '')  // Remove everything except letters and spaces
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();

    console.log('🔐 Cleaned challenge:', cleaned);

    // Step 2: Fix common obfuscation - doubled letters at word boundaries
    // "twentyy" -> "twenty", "fivee" -> "five"
    const normalized = cleaned
        .replace(/yy\b/g, 'y')
        .replace(/ee\b/g, 'e')
        .replace(/tt\b/g, 't')
        .replace(/ss\b/g, 's')
        .replace(/nn\b/g, 'n');

    console.log('🔐 Normalized:', normalized);

    // Number word mappings (order matters — longer first to avoid partial matches)
    const numberWords = [
        ['one hundred', 100], ['two hundred', 200], ['three hundred', 300],
        ['four hundred', 400], ['five hundred', 500],
        ['one thousand', 1000], ['two thousand', 2000],
        ['ninety nine', 99], ['ninety eight', 98], ['ninety seven', 97],
        ['ninety six', 96], ['ninety five', 95], ['ninety four', 94],
        ['ninety three', 93], ['ninety two', 92], ['ninety one', 91],
        ['eighty nine', 89], ['eighty eight', 88], ['eighty seven', 87],
        ['eighty six', 86], ['eighty five', 85], ['eighty four', 84],
        ['eighty three', 83], ['eighty two', 82], ['eighty one', 81],
        ['seventy nine', 79], ['seventy eight', 78], ['seventy seven', 77],
        ['seventy six', 76], ['seventy five', 75], ['seventy four', 74],
        ['seventy three', 73], ['seventy two', 72], ['seventy one', 71],
        ['sixty nine', 69], ['sixty eight', 68], ['sixty seven', 67],
        ['sixty six', 66], ['sixty five', 65], ['sixty four', 64],
        ['sixty three', 63], ['sixty two', 62], ['sixty one', 61],
        ['fifty nine', 59], ['fifty eight', 58], ['fifty seven', 57],
        ['fifty six', 56], ['fifty five', 55], ['fifty four', 54],
        ['fifty three', 53], ['fifty two', 52], ['fifty one', 51],
        ['forty nine', 49], ['forty eight', 48], ['forty seven', 47],
        ['forty six', 46], ['forty five', 45], ['forty four', 44],
        ['forty three', 43], ['forty two', 42], ['forty one', 41],
        ['thirty nine', 39], ['thirty eight', 38], ['thirty seven', 37],
        ['thirty six', 36], ['thirty five', 35], ['thirty four', 34],
        ['thirty three', 33], ['thirty two', 32], ['thirty one', 31],
        ['twenty nine', 29], ['twenty eight', 28], ['twenty seven', 27],
        ['twenty six', 26], ['twenty five', 25], ['twenty four', 24],
        ['twenty three', 23], ['twenty two', 22], ['twenty one', 21],
        ['nineteen', 19], ['eighteen', 18], ['seventeen', 17],
        ['sixteen', 16], ['fifteen', 15], ['fourteen', 14],
        ['thirteen', 13], ['twelve', 12], ['eleven', 11],
        ['ninety', 90], ['eighty', 80], ['seventy', 70],
        ['sixty', 60], ['fifty', 50], ['forty', 40],
        ['thirty', 30], ['twenty', 20],
        ['ten', 10], ['nine', 9], ['eight', 8], ['seven', 7],
        ['six', 6], ['five', 5], ['four', 4], ['three', 3],
        ['two', 2], ['one', 1], ['zero', 0],
        ['hundred', 100], ['thousand', 1000]
    ];

    // Extract numbers in order of appearance
    const foundNumbers = [];
    let searchText = normalized;

    for (const [word, val] of numberWords) {
        const idx = searchText.indexOf(word);
        if (idx !== -1) {
            foundNumbers.push({ val, idx });
            // Don't replace — just record position for ordering
        }
    }

    // Also try to find digit numbers
    const digitMatches = normalized.match(/\d+(\.\d+)?/g);
    if (digitMatches) {
        digitMatches.forEach(n => {
            const idx = normalized.indexOf(n);
            foundNumbers.push({ val: parseFloat(n), idx });
        });
    }

    // Sort by position and take first two unique values
    foundNumbers.sort((a, b) => a.idx - b.idx);
    const uniqueNums = [];
    const seenVals = new Set();
    for (const fn of foundNumbers) {
        if (!seenVals.has(fn.val) && fn.val > 0) { // skip zero unless it's the only match
            seenVals.add(fn.val);
            uniqueNums.push(fn.val);
        }
        if (uniqueNums.length >= 2) break;
    }

    console.log('🔐 Found numbers:', uniqueNums);

    // Detect operation — expanded keyword list
    let op = null;
    const addWords = ['plus', 'adds', 'add', 'gains', 'gain', 'increases', 'increase', 'speeds up', 'accelerates', 'faster', 'more', 'joins', 'combined'];
    const subWords = ['minus', 'subtract', 'slows', 'slow', 'loses', 'lose', 'decreases', 'decrease', 'less', 'drops', 'drop', 'falls', 'reduces', 'reduce', 'behind', 'crawls', 'drifts', 'brakes'];
    const mulWords = ['times', 'multiplied', 'multiplies', 'multiply', 'doubled', 'tripled', 'product'];
    const divWords = ['divided', 'divides', 'divide', 'splits', 'split', 'halved', 'half', 'shared equally'];

    for (const w of addWords) { if (normalized.includes(w)) { op = '+'; break; } }
    if (!op) for (const w of subWords) { if (normalized.includes(w)) { op = '-'; break; } }
    if (!op) for (const w of mulWords) { if (normalized.includes(w)) { op = '*'; break; } }
    if (!op) for (const w of divWords) { if (normalized.includes(w)) { op = '/'; break; } }

    console.log('🔐 Operation:', op);

    if (uniqueNums.length >= 2 && op) {
        const a = uniqueNums[0];
        const b = uniqueNums[1];
        let result;

        switch (op) {
            case '+': result = a + b; break;
            case '-': result = a - b; break;
            case '*': result = a * b; break;
            case '/': result = b !== 0 ? a / b : 0; break;
        }

        console.log(`🔐 Solution: ${a} ${op} ${b} = ${result.toFixed(2)}`);
        return result.toFixed(2);
    }

    console.log('⚠️ Could not auto-solve challenge. Numbers:', uniqueNums, 'Op:', op);
    return null;
}

async function submitVerification(verificationCode, answer, headers) {
    try {
        console.log(`🔐 Submitting verification: code=${verificationCode.substring(0, 20)}..., answer=${answer}`);
        const res = await fetch(`${MOLTBOOK_BASE_URL}/verify`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                verification_code: verificationCode,
                answer: answer
            })
        });
        const data = await res.json();
        console.log('🔐 Verification response:', JSON.stringify(data));
        return data;
    } catch (e) {
        console.error('Moltbook verification error:', e.message);
        return null;
    }
}

// ═══════════════════════════════════════
// POSTING (real Moltbook + local JSON)
// ═══════════════════════════════════════

async function postToMoltbook(title, content) {
    const headers = getMoltbookHeaders();
    if (!headers) return { success: false, real: false, reason: 'no_api_key' };

    try {
        const res = await fetch(`${MOLTBOOK_BASE_URL}/posts`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                submolt_name: MOLTBOOK_SUBMOLT,
                title: title.substring(0, 300),
                content: content.substring(0, 5000),
                type: 'text'
            })
        });

        const data = await res.json();

        // Handle verification challenge
        if (data.post?.verification?.challenge_text) {
            console.log('🔐 Moltbook: Solving verification challenge...');
            const answer = solveChallenge(data.post.verification.challenge_text);
            if (answer) {
                const verifyResult = await submitVerification(
                    data.post.verification.verification_code,
                    answer,
                    headers
                );
                if (verifyResult?.success) {
                    console.log(`✅ Moltbook: Post verified and published!`);
                    return { success: true, real: true, verified: true };
                } else {
                    console.log(`⚠️ Moltbook: Verification failed: ${verifyResult?.error || 'unknown'}`);
                    return { success: false, real: true, verified: false, error: verifyResult?.error };
                }
            } else {
                console.log('⚠️ Moltbook: Could not auto-solve challenge');
                return { success: false, real: true, verified: false, error: 'challenge_unsolvable' };
            }
        }

        // No verification needed (trusted agent) or post published directly
        if (data.success || res.ok) {
            console.log(`✅ Moltbook: Posted to ${MOLTBOOK_SUBMOLT}: ${title}`);
            return { success: true, real: true, data };
        }

        console.log(`⚠️ Moltbook: Post failed (${res.status}): ${data.message || 'unknown'}`);
        return { success: false, real: true, error: data.message };
    } catch (e) {
        console.error('Moltbook post error:', e.message);
        return { success: false, real: true, error: e.message };
    }
}

// ═══════════════════════════════════════
// POST GENERATORS (local JSON + real Moltbook)
// ═══════════════════════════════════════

export async function postInvestmentAction(project, decision, score, amount, treasury) {
    let emoji, text;

    if (decision === 'invest') {
        emoji = '🦅';
        text = `${emoji} Claw Capital deployed ${amount} $SURGE into ${project} following a ${score} strategic score. Allocation: ${Math.round((amount / treasury) * 100)}%. Portfolio diversification maintained. Compounding.`;
    } else if (decision === 'conditional_invest') {
        emoji = '⚡';
        text = `${emoji} Claw Capital conditionally deployed ${amount} $SURGE into ${project} (score: ${score}). Reduced position. Monitoring closely. Treasury: ${treasury} $SURGE available.`;
    } else {
        emoji = '🛡️';
        text = `${emoji} Claw Capital rejected ${project} (score: ${score}). Capital preserved. Treasury: ${treasury} $SURGE available. Discipline over impulse.`;
    }

    const post = {
        id: `MOLT-${Date.now()}`,
        text,
        project,
        decision,
        score,
        amount: amount || 0,
        timestamp: new Date().toISOString()
    };

    // Save locally
    appendToArray('moltbook', 'posts', post);

    // Post to real Moltbook
    const title = `${decision === 'reject' ? '🛡️ REJECT' : decision === 'invest' ? '🦅 INVEST' : '⚡ CONDITIONAL'}: ${project} — Score ${score}`;
    const moltResult = await postToMoltbook(title, text);
    post.moltbook_real = moltResult.real || false;
    post.moltbook_published = moltResult.success || false;

    return post;
}

export async function postStrategyUpdate(cycle, project, decision) {
    const text = `📊 Claw Capital completed autonomous cycle #${cycle}. Scanned: ${project}. Decision: ${decision.toUpperCase()}. Treasury integrity maintained.`;

    const post = {
        id: `MOLT-${Date.now()}`,
        text,
        project: null,
        decision: 'strategy_update',
        score: null,
        amount: 0,
        timestamp: new Date().toISOString()
    };

    // Save locally
    appendToArray('moltbook', 'posts', post);

    // Post to real Moltbook
    await postToMoltbook(`🔄 Claw Capital — Cycle #${cycle} Complete`, text);

    return post;
}
