import { readJSON, writeJSON, appendToArray } from './memory.js';

/**
 * Get the full portfolio.
 */
export function getPortfolio() {
    return readJSON('portfolio.json');
}

/**
 * Add an investment to the portfolio.
 * @param {object} investment - Investment record
 */
export function addInvestment(investment) {
    const record = {
        id: `INV-${Date.now()}`,
        ...investment,
        timestamp: new Date().toISOString(),
        status: 'active'
    };

    appendToArray('portfolio.json', 'investments', record);
    return record;
}

/**
 * Check portfolio diversification for a given category.
 * Returns warning if the category would be overexposed.
 * @param {string} category - Project category
 * @param {number} newAllocationPct - Proposed allocation percentage
 */
export function checkDiversification(category, newAllocationPct) {
    const strategy = readJSON('strategy.json');
    const portfolio = readJSON('portfolio.json');
    const treasury = readJSON('treasury.json');

    const categoryInvestments = portfolio.investments.filter(
        inv => inv.category?.toLowerCase() === category?.toLowerCase()
    );

    const categoryTotal = categoryInvestments.reduce(
        (sum, inv) => sum + (inv.amount || 0), 0
    );

    const proposedAmount = (newAllocationPct / 100) * treasury.total;
    const newCategoryTotal = categoryTotal + proposedAmount;
    const categoryExposurePct = (newCategoryTotal / treasury.total) * 100;

    return {
        category,
        current_exposure_pct: parseFloat(((categoryTotal / treasury.total) * 100).toFixed(1)),
        proposed_exposure_pct: parseFloat(categoryExposurePct.toFixed(1)),
        max_allowed_pct: strategy.category_max_exposure_pct,
        overexposed: categoryExposurePct > strategy.category_max_exposure_pct,
        warning: categoryExposurePct > strategy.category_max_exposure_pct
            ? `Category "${category}" would exceed max exposure (${categoryExposurePct.toFixed(1)}% > ${strategy.category_max_exposure_pct}%)`
            : null
    };
}

/**
 * Get portfolio summary stats.
 */
export function getPortfolioStats() {
    const portfolio = readJSON('portfolio.json');
    const investments = portfolio.investments;

    const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const avgScore = investments.length > 0
        ? investments.reduce((sum, inv) => sum + (inv.overall_score || 0), 0) / investments.length
        : 0;

    // Category breakdown
    const categories = {};
    investments.forEach(inv => {
        const cat = inv.category || 'uncategorized';
        if (!categories[cat]) categories[cat] = { count: 0, total: 0 };
        categories[cat].count++;
        categories[cat].total += inv.amount || 0;
    });

    return {
        total_investments: investments.length,
        total_deployed: parseFloat(totalInvested.toFixed(2)),
        average_score: parseFloat(avgScore.toFixed(2)),
        categories,
        investments
    };
}
