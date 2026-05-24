import express from 'express';
import { authentication, authorizationByRole } from '../middleware/middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Parking
 *   description: Parking lot management API endpoints
 */

/**
 * @swagger
 * /api/v1/parking/slots:
 *   get:
 *     summary: Get parking floors with slots
 *     description: |
 *       View parking lot organized by floors with their slots.
 *       Supports filtering by vehicle type, specific floor, and slot status.
 *       All filters are optional and can be combined.
 *     tags: [Parking]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [SEDAN, SUV, MPV, PICKUP]
 *         description: Filter by vehicle type
 *       - in: query
 *         name: floorId
 *         schema:
 *           type: string
 *         description: Filter by specific floor ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, UNAVAILABLE, CURRENTLY-IN-USED]
 *         description: Filter slots by status
 *     responses:
 *       200:
 *         description: Parking floors with slots and statistics
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 floors:
 *                   - _id: "665a..."
 *                     floorName: "Tầng 1"
 *                     vehicleType:
 *                       _id: "665b..."
 *                       type: "SEDAN"
 *                     totalSlot: 50
 *                     slotStats:
 *                       available: 30
 *                       unavailable: 5
 *                       inUsed: 15
 *                       total: 50
 *                     slots:
 *                       - _id: "665c..."
 *                         slotNumber: "A-01"
 *                         status: "AVAILABLE"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle type or floor not found
 */
router.get(
    "/slots",
    authentication,
    authorizationByRole(['CUSTOMER', 'MANAGER', 'ADMIN', 'STAFF']),
    async (req, res, next) => {
        const parkingController = req.container.resolve('parkingController');
        await parkingController.getParkingSlots(req, res, next);
    }
);

export default router;
