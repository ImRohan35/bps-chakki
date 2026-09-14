const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');
const aiAssistantService = require('../services/aiAssistantService');

// All AI Assistant routes require Admin authentication
router.use(authenticate, adminOnly);

/**
 * POST /api/admin/ai-assistant/query
 * Process natural language query in Hindi, Hinglish, or English
 */
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a question or instruction for the AI Assistant.'
      });
    }

    const result = aiAssistantService.answerWithRealData(query.trim());

    res.json({
      success: true,
      query: query.trim(),
      answer: result.answer,
      facts: result.facts,
      actionProposal: result.actionProposal || null,
      source: result.source,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('AI Assistant Query Error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process AI assistant query.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * POST /api/admin/ai-assistant/execute-action
 * Executes an action proposal after explicit admin confirmation
 */
router.post('/execute-action', async (req, res) => {
  try {
    const { actionPayload } = req.body;
    if (!actionPayload) {
      return res.status(400).json({
        success: false,
        message: 'Missing action payload for confirmation.'
      });
    }

    const result = aiAssistantService.executeConfirmedAction(actionPayload, req.user);
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    console.error('AI Action Execution Error:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to execute proposed action.'
    });
  }
});

/**
 * GET /api/admin/ai-assistant/quick-stats
 * Returns snapshot of top business metrics for the AI dashboard
 */
router.get('/quick-stats', (req, res) => {
  try {
    const todaySales = aiAssistantService.getTodaySalesMetrics();
    const lowStock = aiAssistantService.getLowStockProductsMetrics(10);
    const pendingCod = aiAssistantService.getPendingCodMetrics();
    const monthPerf = aiAssistantService.getMonthlyProfitAndRevenueMetrics();
    const topProducts = aiAssistantService.getTopSellingProductsMetrics(3);

    res.json({
      success: true,
      stats: {
        todaySales: todaySales.totalRevenue,
        todayOrders: todaySales.totalOrdersToday,
        lowStockCount: lowStock.count,
        pendingCod: pendingCod.totalPendingCod,
        monthRevenue: monthPerf.totalRevenue,
        estimatedProfit: monthPerf.estimatedGrossProfit,
        topProducts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch AI quick stats' });
  }
});

module.exports = router;
