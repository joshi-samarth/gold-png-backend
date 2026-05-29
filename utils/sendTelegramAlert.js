/**
 * Telegram Alert Utility
 * Purpose: Send price change notifications to Telegram
 * 
 * Only sends when:
 * - Prices actually changed
 * - Environment variables are configured
 * 
 * Format: Professional, clean alert with price changes
 */

const axios = require('axios');

/**
 * Format price with Indian rupee symbol and commas
 */
function formatPrice(price) {
    return `₹${price.toFixed(2)}`;
}

/**
 * Format date/time in IST
 */
function formatDateTime() {
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const day = String(istTime.getDate()).padStart(2, '0');
    const month = String(istTime.getMonth() + 1).padStart(2, '0');
    const year = istTime.getFullYear();
    const hours = String(istTime.getHours()).padStart(2, '0');
    const minutes = String(istTime.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year}, ${hours}:${minutes} IST`;
}

/**
 * Send Telegram notification on price change
 * 
 * @param {Object} oldPrices - Previous prices
 * @param {Object} newPrices - Current prices
 */
async function sendTelegramAlert(oldPrices, newPrices) {
    try {
        // Check if Telegram is configured
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            console.warn('[TELEGRAM] Not configured (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing)');
            return;
        }

        // Build message
        const message = buildAlertMessage(oldPrices, newPrices);

        // Send to Telegram
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const payload = {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        };

        console.log('[TELEGRAM] Sending alert...');
        const response = await axios.post(url, payload, {
            timeout: 10000
        });

        if (response.data.ok) {
            console.log('[TELEGRAM] Alert sent successfully (Message ID:', response.data.result.message_id, ')');
            return response.data.result;
        } else {
            throw new Error(`Telegram API error: ${response.data.description}`);
        }

    } catch (error) {
        console.error('[TELEGRAM] Failed to send alert:', error.message);
        throw error;
    }
}

/**
 * Build formatted alert message
 */
function buildAlertMessage(oldPrices, newPrices) {
    // Calculate changes
    const changes = {
        gold24ct: {
            old: oldPrices.gold24ct999 || oldPrices.gold24ct995,
            new: newPrices.gold24ct999 || newPrices.gold24ct995
        },
        gold22ct: {
            old: oldPrices.gold22ct,
            new: newPrices.gold22ct
        },
        gold18ct: {
            old: oldPrices.gold18ct,
            new: newPrices.gold18ct
        },
        silver: {
            old: oldPrices.silver,
            new: newPrices.silver
        }
    };

    // Build message with HTML formatting
    let message = '🚨 <b>GOLD PRICE ALERT</b>\n\n';

    // 24K Gold
    const change24k = changes.gold24ct.new - changes.gold24ct.old;
    const sign24k = change24k > 0 ? '📈' : change24k < 0 ? '📉' : '➡️';
    message += `🥇 <b>24K Gold</b>: ${sign24k}\n`;
    message += `   ${formatPrice(changes.gold24ct.old)} → ${formatPrice(changes.gold24ct.new)}\n`;
    if (change24k !== 0) {
        message += `   <i>${change24k > 0 ? '+' : ''}${formatPrice(change24k)}</i>\n\n`;
    } else {
        message += '\n';
    }

    // 22K Gold
    const change22k = changes.gold22ct.new - changes.gold22ct.old;
    const sign22k = change22k > 0 ? '📈' : change22k < 0 ? '📉' : '➡️';
    message += `🥇 <b>22K Gold</b>: ${sign22k}\n`;
    message += `   ${formatPrice(changes.gold22ct.old)} → ${formatPrice(changes.gold22ct.new)}\n`;
    if (change22k !== 0) {
        message += `   <i>${change22k > 0 ? '+' : ''}${formatPrice(change22k)}</i>\n\n`;
    } else {
        message += '\n';
    }

    // 18K Gold
    const change18k = changes.gold18ct.new - changes.gold18ct.old;
    const sign18k = change18k > 0 ? '📈' : change18k < 0 ? '📉' : '➡️';
    message += `🥇 <b>18K Gold</b>: ${sign18k}\n`;
    message += `   ${formatPrice(changes.gold18ct.old)} → ${formatPrice(changes.gold18ct.new)}\n`;
    if (change18k !== 0) {
        message += `   <i>${change18k > 0 ? '+' : ''}${formatPrice(change18k)}</i>\n\n`;
    } else {
        message += '\n';
    }

    // Timestamp
    message += `⏰ <i>${formatDateTime()}</i>\n`;

    return message;
}

module.exports = { sendTelegramAlert };
