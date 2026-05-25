import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import { createReservationSchema, cancelReservationSchema } from '../../validators/reservation.validator.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reservation
 *   description: Parking reservation API endpoints
 */

/**
 * @swagger
 * /api/v1/reservations:
 *   post:
 *     summary: Create a parking reservation
 *     description: Customer reserves a parking slot. driverId is taken from the authenticated user.
 *     tags: [Reservation]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - parkingSlotId
 *               - expectedArrival
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 description: The vehicle ObjectId
 *                 example: "665a1b2c3d4e5f6a7b8c9d0e"
 *               parkingSlotId:
 *                 type: string
 *                 description: The parking slot ObjectId
 *                 example: "665a1b2c3d4e5f6a7b8c9d0f"
 *               expectedArrival:
 *                 type: string
 *                 format: date-time
 *                 description: Expected arrival time (ISO 8601, must be in the future)
 *                 example: "2026-05-27T10:00:00.000Z"
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 reservation:
 *                   _id: "665f..."
 *                   driverId: "665a..."
 *                   vehicleId: "665b..."
 *                   parkingSlotId: "665c..."
 *                   reservedAt: "2026-05-26T10:00:00.000Z"
 *                   expectedArrival: "2026-05-27T10:00:00.000Z"
 *                   expiryAt: "2026-05-27T10:30:00.000Z"
 *                   status: PENDING
 *       400:
 *         description: Slot not available, vehicle type mismatch, or vehicle not yours
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle or parking slot not found
 */
router.post(
    "/",
    authentication,
    authorizationByRole(['CUSTOMER']),
    validateData(createReservationSchema),
    async (req, res, next) => {
        const reservationController = req.container.resolve('reservationController');
        await reservationController.createReservation(req, res, next);
    }
);

export default router;
