import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import {
    createReservationSchema,
    cancelReservationSchema,
    getMyReservationsQuerySchema,
    getReservationsByVehiclePlateParamsSchema,
    getReservationsByVehiclePlateQuerySchema,
    recommendSlotsSchema,
} from '../../validators/reservation.validator.js';

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
 *       - bearerAuth: []
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
 *                   expiryAt: "2026-05-27T10:15:00.000Z"
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

/**
 * @swagger
 * /api/v1/reservations/recommend-slots:
 *   post:
 *     summary: Get smart parking slot recommendations
 *     description: |
 *       Suggests the best available parking slots for a vehicle and expected arrival time.
 *       Uses rule-based scoring (proximity to entrance, floor availability, driver history, peak-hour traffic).
 *       Does not create a reservation — use POST /reservations to book a recommended slot.
 *       Only accessible by CUSTOMER.
 *     tags: [Reservation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - expectedArrival
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 description: The vehicle ObjectId
 *                 example: "665a1b2c3d4e5f6a7b8c9d0e"
 *               expectedArrival:
 *                 type: string
 *                 format: date-time
 *                 description: Expected arrival time (ISO 8601, must be in the future)
 *                 example: "2026-06-18T14:00:00.000Z"
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 default: 3
 *                 description: Number of slot recommendations to return
 *     responses:
 *       200:
 *         description: Slot recommendations fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 vehicle:
 *                   _id: "665b..."
 *                   licensePlate: "51A-123.45"
 *                 expectedArrival: "2026-06-18T14:00:00.000Z"
 *                 recommendations:
 *                   - parkingSlotId: "665d..."
 *                     slotNumber: "T105"
 *                     status: "AVAILABLE"
 *                     floorName: "Tầng 5 - SEDAN"
 *                     vehicleType: "SEDAN"
 *                     score: 87
 *                     reasons:
 *                       - "Gần lối vào tầng"
 *                       - "Tầng còn nhiều chỗ trống"
 *                 meta:
 *                   totalEligibleSlots: 12
 *                   floorOccupancyRate: 0.35
 *               message: "Slot recommendations fetched successfully"
 *       400:
 *         description: Vehicle does not belong to the authenticated user
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle not found or no available slots for this vehicle type
 */
router.post(
    "/recommend-slots",
    authentication,
    authorizationByRole(['CUSTOMER']),
    validateData(recommendSlotsSchema),
    async (req, res, next) => {
        const reservationController = req.container.resolve('reservationController');
        await reservationController.recommendSlots(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/reservations/my:
 *   get:
 *     summary: Get my reservations
 *     description: Get paginated reservations for the authenticated customer. Supports filtering by status.
 *     tags: [Reservation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reservations per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CLAIMED, EXPIRED, CANCELLED]
 *         description: Filter reservations by status
 *     responses:
 *       200:
 *         description: List of reservations
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 reservations:
 *                   - _id: "665f..."
 *                     driverId: "665a..."
 *                     vehicleId:
 *                       _id: "665b..."
 *                       licensePlate: "51A-12345"
 *                       vehicleTypeId:
 *                         _id: "665c..."
 *                         type: "SEDAN"
 *                     parkingSlotId:
 *                       _id: "665d..."
 *                       slotNumber: "A-01"
 *                       status: "AVAILABLE"
 *                       floorId:
 *                         _id: "665e..."
 *                         floorName: "Tầng 1"
 *                         vehicleTypeId:
 *                           _id: "665c..."
 *                           type: "SEDAN"
 *                     reservedAt: "2026-05-26T10:00:00.000Z"
 *                     expectedArrival: "2026-05-27T10:00:00.000Z"
 *                     expiryAt: "2026-05-27T10:15:00.000Z"
 *                     status: "PENDING"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   totalCount: 25
 *                   totalPages: 3
 *               message: "Reservations fetched successfully"
 *       401:
 *         description: Unauthorized
 */
router.get(
    "/my",
    authentication,
    authorizationByRole(['CUSTOMER']),
    validateData(getMyReservationsQuerySchema, 'query'),
    async (req, res, next) => {
        const reservationController = req.container.resolve('reservationController');
        await reservationController.getMyReservations(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/reservations:
 *   get:
 *     summary: Get all reservations (Admin/Manager)
 *     description: |
 *       Get a paginated list of all reservations.
 *       Supports filtering by status.
 *       Only accessible by ADMIN and MANAGER.
 *     tags: [Reservation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reservations per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CLAIMED, EXPIRED, CANCELLED]
 *         description: Filter by reservation status
 *     responses:
 *       200:
 *         description: Reservations fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 reservations:
 *                   - _id: "665f..."
 *                     driverId:
 *                       _id: "665a..."
 *                       fullName: "Nguyen Van A"
 *                       email: "customer@example.com"
 *                     vehicleId:
 *                       _id: "665b..."
 *                       licensePlate: "51A-123.45"
 *                       vehicleTypeId:
 *                         _id: "665c..."
 *                         type: "SEDAN"
 *                     parkingSlotId:
 *                       _id: "665d..."
 *                       slotNumber: "T101"
 *                       floorId:
 *                         _id: "665e..."
 *                         floorName: "Tầng 1 - Sedan"
 *                     reservedAt: "2026-06-15T10:00:00.000Z"
 *                     expectedArrival: "2026-06-15T12:00:00.000Z"
 *                     expiryAt: "2026-06-15T12:15:00.000Z"
 *                     status: "PENDING"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   totalCount: 25
 *                   totalPages: 3
 *               message: "Reservations fetched successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get(
    "/",
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER', 'STAFF']),
    async (req, res, next) => {
        const reservationController = req.container.resolve('reservationController');
        await reservationController.getAllReservations(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/reservations/by-plate/{licensePlate}:
 *   get:
 *     summary: Get all reservations by vehicle license plate
 *     description: |
 *       Look up a vehicle by license plate and return its reservations (paginated),
 *       sorted by newest first (`reservedAt` descending).
 *       Supports optional filtering by status.
 *       Only accessible by ADMIN, MANAGER, and STAFF.
 *     tags: [Reservation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: licensePlate
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle license plate (format 51A-123.45)
 *         example: "51A-123.45"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of reservations per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CLAIMED, EXPIRED, CANCELLED]
 *         description: Filter reservations by status
 *     responses:
 *       200:
 *         description: Reservations fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 vehicle:
 *                   _id: "665b..."
 *                   licensePlate: "51A-123.45"
 *                   vehicleTypeId:
 *                     _id: "665c..."
 *                     type: "SEDAN"
 *                 reservations:
 *                   - _id: "665f..."
 *                     driverId:
 *                       _id: "665a..."
 *                       fullName: "Nguyen Van A"
 *                       phone: "0901234567"
 *                     vehicleId:
 *                       _id: "665b..."
 *                       licensePlate: "51A-123.45"
 *                     parkingSlotId:
 *                       _id: "665d..."
 *                       slotNumber: "T101"
 *                       floorId:
 *                         _id: "665e..."
 *                         floorName: "Tầng 1 - Sedan"
 *                     reservedAt: "2026-06-15T10:00:00.000Z"
 *                     expectedArrival: "2026-06-15T12:00:00.000Z"
 *                     expiryAt: "2026-06-15T12:15:00.000Z"
 *                     status: "PENDING"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   totalCount: 25
 *                   totalPages: 3
 *               message: "Reservations fetched successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Vehicle not found
 */
router.get(
    "/by-plate/:licensePlate",
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER', 'STAFF']),
    validateData(getReservationsByVehiclePlateParamsSchema, 'params'),
    validateData(getReservationsByVehiclePlateQuerySchema, 'query'),
    async (req, res, next) => {
        const reservationController = req.container.resolve('reservationController');
        await reservationController.getAllReservationsByVehiclePlate(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/reservations/{reservationId}:
 *   delete:
 *     summary: Cancel a reservation (Customer)
 *     description: |
 *       Customer cancels their own PENDING reservation (soft cancel — status set to CANCELLED).
 *       Cannot cancel if expected arrival is within 15 minutes or has already passed.
 *       Only accessible by CUSTOMER.
 *     tags: [Reservation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: The reservation ObjectId
 *         example: "665f1b2c3d4e5f6a7b8c9d0e"
 *     responses:
 *       200:
 *         description: Reservation cancelled successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 cancelledReservation:
 *                   _id: "665f1b2c3d4e5f6a7b8c9d0e"
 *                   driverId: "665a1b2c3d4e5f6a7b8c9d0f"
 *                   vehicleId: "665b1b2c3d4e5f6a7b8c9d10"
 *                   parkingSlotId: "665c1b2c3d4e5f6a7b8c9d11"
 *                   reservedAt: "2026-06-15T10:00:00.000Z"
 *                   expectedArrival: "2026-06-15T12:00:00.000Z"
 *                   expiryAt: "2026-06-15T12:15:00.000Z"
 *                   status: "CANCELLED"
 *                 message: "Reservation cancelled successfully"
 *       400:
 *         description: Not your reservation, not PENDING, within 15 minutes of expected arrival, or past expected arrival
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only CUSTOMER can cancel their own reservation
 *       404:
 *         description: Reservation not found
 */
router.delete(
    "/:reservationId",
    authentication,
    authorizationByRole(['CUSTOMER']),
    async (req, res, next) => {
        const reservationController = req.container.resolve('reservationController');
        await reservationController.cancelReservation(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/reservations/manage/{reservationId}:
 *   delete:
 *     summary: Delete a reservation (Admin/Manager/Staff)
 *     description: |
 *       Permanently delete a PENDING reservation from the database (hard delete).
 *       Only PENDING reservations can be deleted.
 *       Accessible by ADMIN, MANAGER, and STAFF.
 *     tags: [Reservation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: The reservation ObjectId
 *         example: "665f1b2c3d4e5f6a7b8c9d0e"
 *     responses:
 *       200:
 *         description: Reservation deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 deletedReservation:
 *                   _id: "665f1b2c3d4e5f6a7b8c9d0e"
 *                   driverId: "665a1b2c3d4e5f6a7b8c9d0f"
 *                   vehicleId: "665b1b2c3d4e5f6a7b8c9d10"
 *                   parkingSlotId: "665c1b2c3d4e5f6a7b8c9d11"
 *                   reservedAt: "2026-06-15T10:00:00.000Z"
 *                   expectedArrival: "2026-06-15T12:00:00.000Z"
 *                   expiryAt: "2026-06-15T12:15:00.000Z"
 *                   status: "PENDING"
 *               message: "Reservation deleted successfully"
 *       400:
 *         description: Only PENDING reservations can be deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Reservation not found
 */
router.delete(
    "/manage/:reservationId",
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER', 'STAFF']),
    async (req, res, next) => {
        const reservationController = req.container.resolve('reservationController');
        await reservationController.deleteReservation(req, res, next);
    }
);

export default router;
