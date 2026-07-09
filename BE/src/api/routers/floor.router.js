import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import {
    createFloorSchema,
    updateFloorSchema,
    floorIdParamSchema,
    getFloorsQuerySchema,
} from '../../validators/floor.validator.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Floor
 *   description: Admin floor management API endpoints
 */

/**
 * @swagger
 * /api/v1/floors:
 *   get:
 *     summary: Get all floors (Admin)
 *     tags: [Floor]
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
 *         name: vehicleTypeId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Floors fetched successfully }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
    '/',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(getFloorsQuerySchema, 'query'),
    async (req, res, next) => {
        const floorController = req.container.resolve('floorController');
        await floorController.getAllFloors(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/floors:
 *   post:
 *     summary: Create floor (Admin)
 *     tags: [Floor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [floorName, vehicleTypeId, totalSlot]
 *             properties:
 *               floorName: { type: string, example: "Floor B1" }
 *               vehicleTypeId: { type: string }
 *               totalSlot: { type: number, example: 50 }
 *     responses:
 *       201: { description: Floor created successfully }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.post(
    '/',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(createFloorSchema),
    async (req, res, next) => {
        const floorController = req.container.resolve('floorController');
        await floorController.createFloor(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/floors/{floorId}:
 *   get:
 *     summary: Get floor by ID (Admin)
 *     tags: [Floor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Floor fetched successfully }
 *       404: { description: Floor not found }
 */
router.get(
    '/:floorId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(floorIdParamSchema, 'params'),
    async (req, res, next) => {
        const floorController = req.container.resolve('floorController');
        await floorController.getFloorById(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/floors/{floorId}:
 *   put:
 *     summary: Update floor (Admin)
 *     tags: [Floor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               floorName: { type: string }
 *               vehicleTypeId: { type: string }
 *               totalSlot: { type: number }
 *     responses:
 *       200: { description: Floor updated successfully }
 *       404: { description: Floor not found }
 */
router.put(
    '/:floorId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(floorIdParamSchema, 'params'),
    validateData(updateFloorSchema),
    async (req, res, next) => {
        const floorController = req.container.resolve('floorController');
        await floorController.updateFloor(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/floors/{floorId}:
 *   delete:
 *     summary: Delete floor (Admin)
 *     tags: [Floor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Floor deleted successfully }
 *       404: { description: Floor not found }
 */
router.delete(
    '/:floorId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(floorIdParamSchema, 'params'),
    async (req, res, next) => {
        const floorController = req.container.resolve('floorController');
        await floorController.deleteFloor(req, res, next);
    },
);

export default router;
