import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import { getRevenueQuerySchema } from '../../validators/dashboard.validator.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics API endpoints
 */

/**
 * @swagger
 * /api/v1/dashboard/revenue:
 *   get:
 *     summary: Get revenue statistics
 *     description: |
 *       Calculate total revenue from Payment.amount with filters by year, month, and day.
 *       Uses createdAt for date filtering. Default status is PAID.
 *       Accessible by ADMIN and MANAGER.
 *
 *       Examples:
 *       - Specific day: ?year=2026&month=7&day=9
 *       - Specific month: ?year=2026&month=7
 *       - Specific year: ?year=2026
 *       - Daily breakdown in month: ?year=2026&month=7&groupBy=day
 *       - Monthly breakdown in year: ?year=2026&groupBy=month
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer, example: 2026 }
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12, example: 7 }
 *       - in: query
 *         name: day
 *         schema: { type: integer, minimum: 1, maximum: 31, example: 9 }
 *       - in: query
 *         name: groupBy
 *         schema: { type: string, enum: [day, month] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, PAID, CANCELLED], default: PAID }
 *     responses:
 *       200:
 *         description: Revenue fetched successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
    '/revenue',
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER']),
    validateData(getRevenueQuerySchema, 'query'),
    async (req, res, next) => {
        const dashboardController = req.container.resolve('dashboardController');
        await dashboardController.getRevenue(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     description: |
 *       Returns aggregated statistics for all models in the system.
 *       Accessible by ADMIN and MANAGER.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
    '/',
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER']),
    async (req, res, next) => {
        const dashboardController = req.container.resolve('dashboardController');
        await dashboardController.getDashboard(req, res, next);
    },
);

export default router;
