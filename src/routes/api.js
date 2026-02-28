import { Router } from 'express';
import { evaluateProject } from '../engine/evaluator.js';
import { getTreasury, getTreasuryStats, allocateCapital } from '../engine/treasury.js';
import { getPortfolio, addInvestment, checkDiversification, getPortfolioStats } from '../engine/portfolio.js';
import { postInvestmentAction, postStrategyUpdate, isMoltbookAvailable } from '../engine/moltbook.js';
import { executeTransfer, logInvestment, isSurgeAvailable, createWallet, fundWallet, checkBalance, getLaunchInfo, getTradeHistory } from '../engine/surge.js';
import { readJSON, writeJSON } from '../engine/memory.js';

const router = Router();

// ============================================================
// GET /api/treasury — Current treasury state
// ============================================================
router.get('/treasury', (req, res) => {
    try {
        const stats = getTreasuryStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// GET /api/portfolio — Portfolio with stats
// ============================================================
router.get('/portfolio', (req, res) => {
    try {
        const stats = getPortfolioStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// GET /api/transactions — Transaction log
// ============================================================
router.get('/transactions', (req, res) => {
    try {
        const txs = readJSON('transactions');
        res.json({ success: true, data: txs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// GET /api/moltbook — All Moltbook posts
// ============================================================
router.get('/moltbook', (req, res) => {
    try {
        const posts = readJSON('moltbook');
        res.json({ success: true, data: posts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// GET /api/strategy — Current strategy parameters
// ============================================================
router.get('/strategy', (req, res) => {
    try {
        const strategy = readJSON('strategy');
        res.json({ success: true, data: strategy });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// GET /api/status — Integration status (SURGE, Moltbook, Gemini)
// ============================================================
router.get('/status', (req, res) => {
    try {
        const strategy = readJSON('strategy');
        res.json({
            success: true,
            data: {
                gemini: !!process.env.GEMINI_API_KEY,
                surge: isSurgeAvailable(),
                moltbook: isMoltbookAvailable(),
                surge_wallet: strategy.surge_wallet || null,
                cycle_count: strategy.cycle_count || 0,
                version: 'v1.0.0'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// POST /api/surge/wallet — Create SURGE wallet
// ============================================================
router.post('/surge/wallet', async (req, res) => {
    try {
        const { chain } = req.body || {};
        const wallet = await createWallet(chain || 'solana');
        res.json({ success: true, data: wallet });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// POST /api/surge/fund — Fund SURGE wallet (one-time free)
// ============================================================
router.post('/surge/fund', async (req, res) => {
    try {
        const strategy = readJSON('strategy');
        const walletId = strategy.surge_wallet?.walletId;
        if (!walletId) {
            return res.status(400).json({ success: false, error: 'No wallet created yet. Create one first.' });
        }
        const result = await fundWallet(walletId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// GET /api/surge/balance — Check wallet balance
// ============================================================
router.get('/surge/balance', async (req, res) => {
    try {
        const strategy = readJSON('strategy');
        const walletId = strategy.surge_wallet?.walletId;
        if (!walletId) {
            return res.json({ success: true, data: { balance: '0', sufficient: false, message: 'No wallet created' } });
        }
        const result = await checkBalance(walletId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// GET /api/surge/info — SURGE launch info (fees, chains, categories)
// ============================================================
router.get('/surge/info', async (req, res) => {
    try {
        const info = await getLaunchInfo();
        res.json({ success: true, data: info });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// POST /api/evaluate — Submit project for AI evaluation
// ============================================================
router.post('/evaluate', async (req, res) => {
    try {
        const { project_name, description, category } = req.body;

        if (!project_name || !description) {
            return res.status(400).json({
                success: false,
                error: 'project_name and description are required'
            });
        }

        // 1. AI Evaluation (Gemini or fallback)
        const evaluation = await evaluateProject(project_name, description, category);

        // 2. Check diversification
        const diversification = checkDiversification(category, evaluation.allocation_percentage);

        // 3. Adjust allocation if overexposed
        let finalAllocation = evaluation.allocation_percentage;
        if (diversification.overexposed) {
            finalAllocation = Math.max(0, Math.floor(finalAllocation * 0.5));
            evaluation.risk_summary += ` Portfolio concentration warning: ${diversification.warning}`;
        }

        // 4. Execute capital action
        const treasury = getTreasury();
        const amount = parseFloat(((finalAllocation / 100) * treasury.available).toFixed(2));
        let updatedTreasury = treasury;
        let investment = null;
        let tx = null;

        if (evaluation.investment_decision !== 'reject' && amount > 0) {
            // Allocate capital from treasury
            updatedTreasury = allocateCapital(amount);

            // Record investment in portfolio
            investment = addInvestment({
                project_name,
                category: category || 'General AI Agent',
                description: description.substring(0, 200),
                overall_score: evaluation.overall_score,
                allocation_percentage: finalAllocation,
                amount,
                scores: {
                    autonomy: evaluation.autonomy_score,
                    revenue: evaluation.revenue_potential,
                    token_utility: evaluation.token_utility_strength,
                    moat: evaluation.competitive_moat,
                    ecosystem: evaluation.ecosystem_alignment,
                    execution: evaluation.execution_feasibility,
                    risk: evaluation.risk_score
                },
                investment_decision: evaluation.investment_decision
            });

            // SURGE transfer (real or simulated)
            tx = await executeTransfer(project_name, amount, `Investment: ${evaluation.investment_decision}`);
        } else {
            // Log rejected investment
            tx = await logInvestment(project_name, 'reject', evaluation.overall_score, 0);
        }

        // 5. Moltbook post (real or local-only)
        const post = await postInvestmentAction(
            project_name,
            evaluation.investment_decision,
            evaluation.overall_score,
            amount,
            getTreasury().available
        );

        // 6. Update strategy cycle count
        const strategy = readJSON('strategy');
        strategy.cycle_count = (strategy.cycle_count || 0) + 1;
        strategy.last_adjusted = new Date().toISOString();
        writeJSON('strategy', strategy);

        // 7. Return full result
        res.json({
            success: true,
            data: {
                evaluation,
                investment,
                transaction: tx,
                moltbook_post: post,
                treasury: getTreasuryStats(),
                diversification
            }
        });

    } catch (error) {
        console.error('Evaluation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// POST /api/cycle — Run autonomous capital cycle
// ============================================================
router.post('/cycle', async (req, res) => {
    try {
        // Sample projects for autonomous scanning
        const sampleProjects = [
            {
                name: 'AgentSwarm',
                description: 'A self-orchestrating multi-agent system that autonomously discovers, deploys, and manages AI agent clusters. Features automatic task delegation, self-healing agent networks, and revenue generation through agent-as-a-service marketplace. Token gated access with SURGE staking.',
                category: 'Infrastructure'
            },
            {
                name: 'DefiSentinel',
                description: 'Autonomous DeFi monitoring agent that scans protocols for anomalies, rug-pull indicators, and yield opportunities. Operates 24/7 without human intervention. Generates revenue through premium alert subscriptions. Built on OpenClaw with SURGE-powered premium tiers.',
                category: 'DeFi Security'
            },
            {
                name: 'DataForge AI',
                description: 'An autonomous data labeling and curation agent for ML pipelines. Self-improves labeling accuracy through active learning loops. Revenue through per-task API pricing. Token utility for priority queue access and staking for quality guarantees.',
                category: 'Data Infrastructure'
            },
            {
                name: 'NarrativeEngine',
                description: 'AI agent that autonomously generates, publishes, and monetizes long-form content across platforms. Uses multi-model orchestration for research, writing, and distribution. Revenue from ad revenue sharing and premium content. SURGE token required for enterprise API access.',
                category: 'Content Generation'
            },
            {
                name: 'ChainOracle',
                description: 'Autonomous cross-chain data oracle agent that provides real-time verified data feeds to smart contracts. Self-validates data accuracy through consensus among multiple AI verifiers. Token utility for data feed subscriptions. Deep OpenClaw and SURGE ecosystem integration.',
                category: 'Oracle Infrastructure'
            }
        ];

        // Pick a random project
        const project = sampleProjects[Math.floor(Math.random() * sampleProjects.length)];

        // Evaluate through the full pipeline
        const evaluation = await evaluateProject(project.name, project.description, project.category);
        const diversification = checkDiversification(project.category, evaluation.allocation_percentage);

        let finalAllocation = evaluation.allocation_percentage;
        if (diversification.overexposed) {
            finalAllocation = Math.max(0, Math.floor(finalAllocation * 0.5));
        }

        const treasury = getTreasury();
        const amount = parseFloat(((finalAllocation / 100) * treasury.available).toFixed(2));
        let investment = null;
        let tx = null;

        if (evaluation.investment_decision !== 'reject' && amount > 0) {
            allocateCapital(amount);
            investment = addInvestment({
                project_name: project.name,
                category: project.category,
                description: project.description.substring(0, 200),
                overall_score: evaluation.overall_score,
                allocation_percentage: finalAllocation,
                amount,
                scores: {
                    autonomy: evaluation.autonomy_score,
                    revenue: evaluation.revenue_potential,
                    token_utility: evaluation.token_utility_strength,
                    moat: evaluation.competitive_moat,
                    ecosystem: evaluation.ecosystem_alignment,
                    execution: evaluation.execution_feasibility,
                    risk: evaluation.risk_score
                },
                investment_decision: evaluation.investment_decision
            });
            tx = await executeTransfer(project.name, amount, 'Autonomous cycle investment');
        } else {
            tx = await logInvestment(project.name, 'reject', evaluation.overall_score, 0);
        }

        // Moltbook posts (real or local-only)
        await postInvestmentAction(
            project.name,
            evaluation.investment_decision,
            evaluation.overall_score,
            amount,
            getTreasury().available
        );

        const strategy = readJSON('strategy');
        strategy.cycle_count = (strategy.cycle_count || 0) + 1;
        strategy.last_adjusted = new Date().toISOString();
        writeJSON('strategy', strategy);

        await postStrategyUpdate(strategy.cycle_count, project.name, evaluation.investment_decision);

        res.json({
            success: true,
            data: {
                cycle: strategy.cycle_count,
                scanned_project: project.name,
                evaluation,
                investment,
                transaction: tx,
                treasury: getTreasuryStats()
            }
        });

    } catch (error) {
        console.error('Cycle error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
