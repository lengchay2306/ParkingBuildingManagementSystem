import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import {
    createParkingSlotSchema,
    updateParkingSlotSchema,
    parkingSlotIdParamSchema,
    getParkingSlotsQuerySchema,
} from '../../validators/parkingSlot.validator.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: ParkingSlot
 *   description: Admin parking slot management API endpoints
 */

/**
 * @swagger
 * /api/v1/parking-slots:
 *   get:
 *     summary: Get all parking slots (Admin)
 *     tags: [ParkingSlot]
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
 *         name: floorId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, RESERVED, UNAVAILABLE, CURRENTLY-IN-USED]
 *     responses:
 *       200: { description: Parking slots fetched successfully }
 */
router.get(
    '/',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(getParkingSlotsQuerySchema, 'query'),
    async (req, res, next) => {
        const parkingSlotController = req.container.resolve('parkingSlotController');
        await parkingSlotController.getAllParkingSlots(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/parking-slots:
 *   post:
 *     summary: Create parking slot (Admin)
 *     tags: [ParkingSlot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [floorId, slotNumber, status]
 *             properties:
 *               floorId: { type: string }
 *               slotNumber: { type: string, example: "B1-01" }
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, RESERVED, UNAVAILABLE, CURRENTLY-IN-USED]
 *     responses:
 *       201: { description: Parking slot created successfully }
 */
router.post(
    '/',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(createParkingSlotSchema),
    async (req, res, next) => {
        const parkingSlotController = req.container.resolve('parkingSlotController');
        await parkingSlotController.createParkingSlot(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/parking-slots/{parkingSlotId}:
 *   get:
 *     summary: Get parking slot by ID (Admin)
 *     tags: [ParkingSlot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parkingSlotId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Parking slot fetched successfully }
 *       404: { description: Parking slot not found }
 */
router.get(
    '/:parkingSlotId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(parkingSlotIdParamSchema, 'params'),
    async (req, res, next) => {
        const parkingSlotController = req.container.resolve('parkingSlotController');
        await parkingSlotController.getParkingSlotById(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/parking-slots/{parkingSlotId}:
 *   put:
 *     summary: Update parking slot (Admin)
 *     tags: [ParkingSlot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parkingSlotId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               floorId: { type: string }
 *               slotNumber: { type: string }
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, RESERVED, UNAVAILABLE, CURRENTLY-IN-USED]
 *     responses:
 *       200: { description: Parking slot updated successfully }
 *       404: { description: Parking slot not found }
 */
router.put(
    '/:parkingSlotId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(parkingSlotIdParamSchema, 'params'),
    validateData(updateParkingSlotSchema),
    async (req, res, next) => {
        const parkingSlotController = req.container.resolve('parkingSlotController');
        await parkingSlotController.updateParkingSlot(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/parking-slots/{parkingSlotId}:
 *   delete:
 *     summary: Delete parking slot (Admin)
 *     tags: [ParkingSlot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parkingSlotId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Parking slot deleted successfully }
 *       404: { description: Parking slot not found }
 */
router.delete(
    '/:parkingSlotId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(parkingSlotIdParamSchema, 'params'),
    async (req, res, next) => {
        const parkingSlotController = req.container.resolve('parkingSlotController');
        await parkingSlotController.deleteParkingSlot(req, res, next);
    },
);

export default router;
