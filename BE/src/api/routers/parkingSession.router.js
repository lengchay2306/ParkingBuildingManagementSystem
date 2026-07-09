import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import {
    createParkingSessionSchema,
    updateParkingSessionSchema,
    parkingSessionIdParamSchema,
    getParkingSessionsQuerySchema,
} from '../../validators/parkingSession.validator.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: ParkingSession
 *   description: Admin parking session management API endpoints
 */

/**
 * @swagger
 * /api/v1/parking-sessions:
 *   get:
 *     summary: Get all parking sessions (Admin)
 *     tags: [ParkingSession]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, COMPLETED] }
 *       - in: query
 *         name: vehicleId
 *         schema: { type: string }
 *       - in: query
 *         name: parkingSlotId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Parking sessions fetched successfully }
 */
router.get(
    '/',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(getParkingSessionsQuerySchema, 'query'),
    async (req, res, next) => {
        const parkingSessionController = req.container.resolve('parkingSessionController');
        await parkingSessionController.getAllParkingSessions(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/parking-sessions:
 *   post:
 *     summary: Create parking session (Admin)
 *     tags: [ParkingSession]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [parkingSlotId, sessionType, checkInStaffId, status]
 *             properties:
 *               vehicleId: { type: string, nullable: true }
 *               phone: { type: string, nullable: true }
 *               licensePlate: { type: string, nullable: true }
 *               parkingSlotId: { type: string }
 *               sessionType: { type: string, enum: [DAILY, MONTH] }
 *               checkInUserId: { type: string, nullable: true }
 *               checkOutUserId: { type: string, nullable: true }
 *               checkInStaffId: { type: string }
 *               checkOutStaffId: { type: string, nullable: true }
 *               deleteStaffId: { type: string, nullable: true }
 *               checkInTime: { type: string, format: date-time }
 *               checkOutTime: { type: string, format: date-time, nullable: true }
 *               status: { type: string, enum: [ACTIVE, COMPLETED] }
 *               isGuest: { type: boolean }
 *     responses:
 *       201: { description: Parking session created successfully }
 */
router.post(
    '/',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(createParkingSessionSchema),
    async (req, res, next) => {
        const parkingSessionController = req.container.resolve('parkingSessionController');
        await parkingSessionController.createParkingSession(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/parking-sessions/{parkingSessionId}:
 *   get:
 *     summary: Get parking session by ID (Admin)
 *     tags: [ParkingSession]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parkingSessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Parking session fetched successfully }
 *       404: { description: Parking session not found }
 */
router.get(
    '/:parkingSessionId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(parkingSessionIdParamSchema, 'params'),
    async (req, res, next) => {
        const parkingSessionController = req.container.resolve('parkingSessionController');
        await parkingSessionController.getParkingSessionById(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/parking-sessions/{parkingSessionId}:
 *   put:
 *     summary: Update parking session (Admin)
 *     tags: [ParkingSession]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parkingSessionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicleId: { type: string, nullable: true }
 *               phone: { type: string, nullable: true }
 *               licensePlate: { type: string, nullable: true }
 *               parkingSlotId: { type: string }
 *               sessionType: { type: string, enum: [DAILY, MONTH] }
 *               checkInUserId: { type: string, nullable: true }
 *               checkOutUserId: { type: string, nullable: true }
 *               checkInStaffId: { type: string }
 *               checkOutStaffId: { type: string, nullable: true }
 *               deleteStaffId: { type: string, nullable: true }
 *               checkInTime: { type: string, format: date-time }
 *               checkOutTime: { type: string, format: date-time, nullable: true }
 *               status: { type: string, enum: [ACTIVE, COMPLETED] }
 *               isGuest: { type: boolean }
 *     responses:
 *       200: { description: Parking session updated successfully }
 *       404: { description: Parking session not found }
 */
router.put(
    '/:parkingSessionId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(parkingSessionIdParamSchema, 'params'),
    validateData(updateParkingSessionSchema),
    async (req, res, next) => {
        const parkingSessionController = req.container.resolve('parkingSessionController');
        await parkingSessionController.updateParkingSession(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/parking-sessions/{parkingSessionId}:
 *   delete:
 *     summary: Delete parking session (Admin)
 *     tags: [ParkingSession]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parkingSessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Parking session deleted successfully }
 *       404: { description: Parking session not found }
 */
router.delete(
    '/:parkingSessionId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(parkingSessionIdParamSchema, 'params'),
    async (req, res, next) => {
        const parkingSessionController = req.container.resolve('parkingSessionController');
        await parkingSessionController.deleteParkingSession(req, res, next);
    },
);

export default router;
