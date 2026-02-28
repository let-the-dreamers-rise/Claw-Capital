import { readJSON, writeJSON } from './memory.js';

/**
 * Get current treasury state.
 */
export function getTreasury() {
    return readJSON('treasury.json');
}

/**
 * Allocate capital from treasury for an investment.
 * @param {number} amount - Amount of SURGE to allocate
 * @returns {object} Updated treasury state
 */
export function allocateCapital(amount) {
    const treasury = readJSON('treasury.json');

    if (amount > treasury.available) {
        throw new Error(`Insufficient funds. Available: ${treasury.available}, Requested: ${amount}`);
    }

    treasury.available = parseFloat((treasury.available - amount).toFixed(2));
    treasury.invested = parseFloat((treasury.invested + amount).toFixed(2));
    treasury.last_updated = new Date().toISOString();

    writeJSON('treasury.json', treasury);
    return treasury;
}

/**
 * Compound returns back into treasury.
 * @param {number} amount - Amount to add back
 * @returns {object} Updated treasury state
 */
export function compoundReturns(amount) {
    const treasury = readJSON('treasury.json');

    treasury.total = parseFloat((treasury.total + amount).toFixed(2));
    treasury.available = parseFloat((treasury.available + amount).toFixed(2));
    treasury.last_updated = new Date().toISOString();

    writeJSON('treasury.json', treasury);
    return treasury;
}

/**
 * Get treasury stats for dashboard display.
 */
export function getTreasuryStats() {
    const treasury = getTreasury();
    return {
        ...treasury,
        utilization_pct: treasury.total > 0
            ? parseFloat(((treasury.invested / treasury.total) * 100).toFixed(1))
            : 0
    };
}
