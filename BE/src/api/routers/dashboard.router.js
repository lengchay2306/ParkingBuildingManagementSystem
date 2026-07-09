import express from 'express';
import { authentication, authorizationByRole } from '../middleware/middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics API endpoints
 */

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
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 summary:
 *                   totalRecords: 1250
 *                   totalRevenue: 5500000
 *                   activeParkingSessions: 12
 *                   availableParkingSlots: 85
 *                   activeMonthlyCards: 30
 *                   pendingTickets: 2
 *                 models:
 *                   users:
 *                     total: 120
 *                     byStatus:
 *                       ACTIVE: 115
 *                       LOCKED: 5
 *                     byRole:
 *                       - roleName: CUSTOMER
 *                         count: 100
 *                       - roleName: STAFF
 *                         count: 15
 *                   roles:
 *                     total: 4
 *                   vehicles:
 *                     total: 95
 *                     byStatus:
 *                       ACTIVE: 90
 *                       INACTIVE: 5
 *                   vehicleTypes:
 *                     total: 10
 *                     byType:
 *                       SEDAN: 1
 *                       SUV: 1
 *                   floors:
 *                     total: 5
 *                     totalSlotCapacity: 200
 *                   parkingSlots:
 *                     total: 200
 *                     byStatus:
 *                       AVAILABLE: 85
 *                       RESERVED: 10
 *                       UNAVAILABLE: 5
 *                       CURRENTLY-IN-USED: 100
 *                   parkingSessions:
 *                     total: 500
 *                     byStatus:
 *                       ACTIVE: 12
 *                       COMPLETED: 488
 *                     bySessionType:
 *                       DAILY: 400
 *                       MONTH: 100
 *                   reservations:
 *                     total: 50
 *                     byStatus:
 *                       PENDING: 5
 *                       CLAIMED: 40
 *                       EXPIRED: 3
 *                       CANCELLED: 2
 *                   payments:
 *                     total: 80
 *                     byStatus:
 *                       PENDING: 5
 *                       PAID: 70
 *                       CANCELLED: 5
 *                     totalRevenue: 5500000
 *                   monthlyCards:
 *                     total: 35
 *                     byStatus:
 *                       ACTIVE: 30
 *                       EXPIRED: 5
 *                   pricePolicies:
 *                     total: 20
 *                   tickets:
 *                     total: 10
 *                     byStatus:
 *                       PENDING: 2
 *                       RESOLVED: 8
 *                     byType:
 *                       FEEDBACK: 6
 *                       INCIDENT: 4
 *                   chatSessions:
 *                     total: 25
 *                   chatMessages:
 *                     total: 150
 *                     byRole:
 *                       user: 75
 *                       assistant: 75
 *               message: Dashboard fetched successfully
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
