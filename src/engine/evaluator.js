import fetch from 'node-fetch';
import { readJSON } from './memory.js';

const GEMINI_SCORING_PROMPT = `You are CLAW CAPITAL — an autonomous AI capital allocation intelligence.

You evaluate AI agent ventures with institutional rigor.

SCORING FRAMEWORK (score each 0-10):

1. Autonomy Level — Can the agent operate independently? Does it take actions, not just respond?
2. Revenue Potential — Is there a monetization mechanism? Recurring demand?
3. Token Utility Strength — Does the token have real function? Is value capture logical?
4. Competitive Moat — Is there defensibility? Network effects? Technical depth?
5. Ecosystem Alignment — Does it strengthen OpenClaw? Does it drive SURGE usage?
6. Execution Feasibility — Is this realistically buildable? Is complexity manageable?
7. Risk Score — Technical risk, Economic risk, Adoption risk (higher = MORE risky)

WEIGHTING:
- Autonomy: 20%
- Revenue Potential: 20%
- Token Utility: 15%
- Competitive Moat: 15%
- Ecosystem Alignment: 10%
- Execution Feasibility: 10%
- Risk: -10% penalty

DECISION RULES:
- overall_score >= 7.5 → "invest"
- 6.0–7.4 → "conditional_invest"
- < 6.0 → "reject"

ALLOCATION RULES (% of available treasury):
- Score 8.5+ → 25–30%
- Score 7.5–8.4 → 15–25%
- Score 6.5–7.4 → 5–15%
- Below 6.5 → 0%

You MUST respond with ONLY valid JSON in this exact format:
{
  "autonomy_score": 0,
  "revenue_potential": 0,
  "token_utility_strength": 0,
  "competitive_moat": 0,
  "ecosystem_alignment": 0,
  "execution_feasibility": 0,
  "risk_score": 0,
  "overall_score": 0,
  "investment_decision": "invest|conditional_invest|reject",
  "allocation_percentage": 0,
  "investment_thesis": "2-3 sentence thesis",
  "risk_summary": "1-2 sentence risk assessment",
  "strategic_reasoning": "2-3 sentence strategic reasoning"
}

NO markdown. NO explanations outside JSON. ONLY the JSON object.`;

/**
 * Evaluate a project using Gemini AI.
 * Falls back to structured heuristic scoring if no API key.
 */
export async function evaluateProject(projectName, description, category) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
        return await evaluateWithGemini(apiKey, projectName, description, category);
    } else {
        return evaluateWithFallback(projectName, description, category);
    }
}

/**
 * Evaluate using Gemini API.
 */
async function evaluateWithGemini(apiKey, projectName, description, category) {
    const userPrompt = `Evaluate the following AI agent project for investment:

PROJECT NAME: ${projectName}
CATEGORY: ${category || 'General AI Agent'}
DESCRIPTION:
${description}

Provide your structured JSON evaluation now.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: GEMINI_SCORING_PROMPT + '\n\n' + userPrompt }] }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            console.error('Gemini API error:', data.error);
            return evaluateWithFallback(projectName, description, category);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            console.error('No text in Gemini response');
            return evaluateWithFallback(projectName, description, category);
        }

        // Parse JSON from response
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const evaluation = JSON.parse(cleanText);

        return {
            project_name: projectName,
            category: category || 'General AI Agent',
            source: 'gemini',
            ...evaluation,
            overall_score: calculateWeightedScore(evaluation),
            investment_decision: getDecision(calculateWeightedScore(evaluation)),
            allocation_percentage: getAllocation(calculateWeightedScore(evaluation))
        };
    } catch (error) {
        console.error('Gemini evaluation failed:', error.message);
        return evaluateWithFallback(projectName, description, category);
    }
}

/**
 * Structured fallback evaluator when no API key is available.
 * Uses keyword analysis to produce realistic scores.
 */
function evaluateWithFallback(projectName, description, category) {
    const desc = (description || '').toLowerCase();

    // Keyword-based scoring heuristics
    const autonomySignals = ['autonomous', 'self-', 'automatic', 'independent', 'agent', 'bot', 'self-learning', 'adaptive'];
    const revenueSignals = ['revenue', 'monetiz', 'subscription', 'fee', 'payment', 'earn', 'profit', 'income', 'saas'];
    const tokenSignals = ['token', 'stake', 'governance', 'utility', 'burn', 'reward', 'incentive', 'deflationary'];
    const moatSignals = ['network effect', 'proprietary', 'patent', 'first-mover', 'ecosystem', 'lock-in', 'switching cost', 'data moat'];
    const ecosystemSignals = ['openclaw', 'surge', 'moltbook', 'ecosystem', 'integration', 'protocol'];
    const executionSignals = ['mvp', 'prototype', 'working', 'deployed', 'live', 'beta', 'tested', 'production'];
    const riskSignals = ['experimental', 'unproven', 'complex', 'regulatory', 'centralized', 'single point'];

    const scoreFromSignals = (signals, base = 5) => {
        const hits = signals.filter(s => desc.includes(s)).length;
        return Math.min(10, base + hits * 1.5 + (Math.random() * 1.0));
    };

    const scores = {
        autonomy_score: parseFloat(scoreFromSignals(autonomySignals, 6.2).toFixed(1)),
        revenue_potential: parseFloat(scoreFromSignals(revenueSignals, 6.0).toFixed(1)),
        token_utility_strength: parseFloat(scoreFromSignals(tokenSignals, 5.8).toFixed(1)),
        competitive_moat: parseFloat(scoreFromSignals(moatSignals, 5.5).toFixed(1)),
        ecosystem_alignment: parseFloat(scoreFromSignals(ecosystemSignals, 5.8).toFixed(1)),
        execution_feasibility: parseFloat(scoreFromSignals(executionSignals, 6.5).toFixed(1)),
        risk_score: parseFloat(scoreFromSignals(riskSignals, 3.0).toFixed(1))
    };

    const overall = calculateWeightedScore(scores);

    return {
        project_name: projectName,
        category: category || 'General AI Agent',
        source: 'fallback_heuristic',
        ...scores,
        overall_score: overall,
        investment_decision: getDecision(overall),
        allocation_percentage: getAllocation(overall),
        investment_thesis: generateThesis(projectName, scores, overall),
        risk_summary: `Risk assessment: ${scores.risk_score >= 7 ? 'HIGH' : scores.risk_score >= 4 ? 'MODERATE' : 'LOW'} risk profile. ${scores.risk_score >= 7 ? 'Significant execution and adoption uncertainties.' : 'Manageable risk with standard mitigation strategies.'}`,
        strategic_reasoning: `${projectName} presents ${overall >= 7.5 ? 'a compelling' : overall >= 6.0 ? 'a moderate' : 'an insufficient'} opportunity for capital deployment. ${scores.autonomy_score >= 7 ? 'Strong autonomy signals detected.' : 'Autonomy capabilities require development.'} ${scores.ecosystem_alignment >= 7 ? 'Excellent ecosystem alignment with OpenClaw/SURGE.' : 'Ecosystem integration potential exists.'}`
    };
}

/**
 * Calculate weighted overall score.
 */
function calculateWeightedScore(scores) {
    const weighted = (
        (scores.autonomy_score * 0.20) +
        (scores.revenue_potential * 0.20) +
        (scores.token_utility_strength * 0.15) +
        (scores.competitive_moat * 0.15) +
        (scores.ecosystem_alignment * 0.10) +
        (scores.execution_feasibility * 0.10) -
        (scores.risk_score * 0.10)
    );
    return parseFloat(Math.max(0, Math.min(10, weighted)).toFixed(2));
}

/**
 * Get investment decision from overall score.
 */
function getDecision(score) {
    if (score >= 7.5) return 'invest';
    if (score >= 6.0) return 'conditional_invest';
    return 'reject';
}

/**
 * Get allocation percentage from overall score.
 */
function getAllocation(score) {
    if (score >= 8.5) return Math.floor(25 + Math.random() * 6); // 25-30%
    if (score >= 7.5) return Math.floor(15 + Math.random() * 11); // 15-25%
    if (score >= 6.5) return Math.floor(5 + Math.random() * 11); // 5-15%
    return 0;
}

/**
 * Generate investment thesis text.
 */
function generateThesis(name, scores, overall) {
    const strengths = [];
    if (scores.autonomy_score >= 7) strengths.push('autonomous operation capability');
    if (scores.revenue_potential >= 7) strengths.push('strong revenue mechanics');
    if (scores.token_utility_strength >= 7) strengths.push('solid token utility');
    if (scores.competitive_moat >= 7) strengths.push('defensible competitive position');

    const strengthText = strengths.length > 0
        ? `Key strengths: ${strengths.join(', ')}.`
        : 'Moderate capability across evaluated dimensions.';

    return `${name} scores ${overall.toFixed(2)} overall. ${strengthText} ${overall >= 7.5 ? 'Capital deployment recommended with standard position sizing.' : overall >= 6.0 ? 'Conditional deployment with reduced allocation advised.' : 'Does not meet minimum threshold for capital deployment.'}`;
}
