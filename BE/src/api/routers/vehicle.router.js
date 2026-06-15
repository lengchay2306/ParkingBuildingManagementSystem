import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import { createVehicleSchema, updateVehicleSchema } from '../../validators/vehicle.validator.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Vehicle
 *   description: Vehicle management API endpoints
 */

/**
 * @swagger
 * /api/v1/vehicles:
 *   post:
 *     summary: Create a new vehicle
 *     description: Customer registers a new vehicle with license plate and vehicle type.
 *     tags: [Vehicle]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - licensePlate
 *               - vehicleTypeId
 *             properties:
 *               licensePlate:
 *                 type: string
 *                 description: The vehicle license plate
 *                 example: "51A-12345"
 *               vehicleTypeId:
 *                 type: string
 *                 description: The vehicle type ObjectId
 *                 example: "665a1b2c3d4e5f6a7b8c9d0e"
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 vehicle:
 *                   _id: "665f1b2c3d4e5f6a7b8c9d0e"
 *                   userId: "665a1b2c3d4e5f6a7b8c9d0f"
 *                   licensePlate: "51A-12345"
 *                   vehicleTypeId: "665a1b2c3d4e5f6a7b8c9d0e"
 *                   monthlyCardId: null
 *                   createdAt: "2026-06-02T10:00:00.000Z"
 *                   updatedAt: "2026-06-02T10:00:00.000Z"
 *               message: "Vehicle created successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle type not found
 *       409:
 *         description: Vehicle with this license plate already exists
 */
router.post(
    "/",
    authentication,
    authorizationByRole(['CUSTOMER']),
    validateData(createVehicleSchema),
    async (req, res, next) => {
        const vehicleController = req.container.resolve('vehicleController');
        await vehicleController.createVehicle(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/vehicles/types:
 *   get:
 *     summary: Get all vehicle types
 *     description: Get the list of all available vehicle types (SEDAN, SUV, MPV, PICKUP).
 *     tags: [Vehicle]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicle types fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 vehicleTypes:
 *                   - _id: "665a1b2c3d4e5f6a7b8c9d01"
 *                     type: "SEDAN"
 *                   - _id: "665a1b2c3d4e5f6a7b8c9d02"
 *                     type: "SUV"
 *                   - _id: "665a1b2c3d4e5f6a7b8c9d03"
 *                     type: "MPV"
 *                   - _id: "665a1b2c3d4e5f6a7b8c9d04"
 *                     type: "PICKUP"
 *               message: "Vehicle types fetched successfully"
 *       401:
 *         description: Unauthorized
 */
router.get(
    "/types",
    authentication,
    async (req, res, next) => {
        const vehicleController = req.container.resolve('vehicleController');
        await vehicleController.getAllVehicleType(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/vehicles/user-vehicles:
 *   get:
 *     summary: Get my vehicles
 *     description: Get all vehicles belonging to the currently authenticated user.
 *     tags: [Vehicle]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vehicles fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 vehicles:
 *                   - _id: "665f1b2c3d4e5f6a7b8c9d0e"
 *                     userId: "665a1b2c3d4e5f6a7b8c9d0f"
 *                     licensePlate: "51A-12345"
 *                     vehicleTypeId:
 *                       _id: "665a1b2c3d4e5f6a7b8c9d01"
 *                       type: "SEDAN"
 *                     monthlyCardId: null
 *                     createdAt: "2026-06-02T10:00:00.000Z"
 *                     updatedAt: "2026-06-02T10:00:00.000Z"
 *                   - _id: "665f1b2c3d4e5f6a7b8c9d10"
 *                     userId: "665a1b2c3d4e5f6a7b8c9d0f"
 *                     licensePlate: "30A-67890"
 *                     vehicleTypeId:
 *                       _id: "665a1b2c3d4e5f6a7b8c9d02"
 *                       type: "SUV"
 *                     monthlyCardId: null
 *                     createdAt: "2026-06-02T11:00:00.000Z"
 *                     updatedAt: "2026-06-02T11:00:00.000Z"
 *               message: "Vehicles fetched successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No vehicles found for this user
 */
router.get(
    "/user-vehicles",
    authentication,
    async (req, res, next) => {
        const vehicleController = req.container.resolve('vehicleController');
        await vehicleController.getVehicleByUserId(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/vehicles/{licensePlate}:
 *   get:
 *     summary: Get vehicle by license plate
 *     description: Look up a vehicle by its license plate number.
 *     tags: [Vehicle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: licensePlate
 *         required: true
 *         schema:
 *           type: string
 *         description: The vehicle license plate
 *         example: "51A-12345"
 *     responses:
 *       200:
 *         description: Vehicle fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 vehicle:
 *                   _id: "665f1b2c3d4e5f6a7b8c9d0e"
 *                   userId: "665a1b2c3d4e5f6a7b8c9d0f"
 *                   licensePlate: "51A-12345"
 *                   vehicleTypeId: "665a1b2c3d4e5f6a7b8c9d0e"
 *                   monthlyCardId: null
 *                   createdAt: "2026-06-02T10:00:00.000Z"
 *                   updatedAt: "2026-06-02T10:00:00.000Z"
 *               message: "Vehicle fetched successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle not found
 */
router.get(
    "/:licensePlate",
    authentication,
    async (req, res, next) => {
        const vehicleController = req.container.resolve('vehicleController');
        await vehicleController.getVehicleByLicensePlate(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/vehicles/{vehicleId}:
 *   put:
 *     summary: Update a vehicle
 *     description: |
 *       Update vehicle information. Only the vehicle owner (CUSTOMER) can update.
 *       At least one field must be provided.
 *     tags: [Vehicle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The vehicle ObjectId
 *         example: "665f1b2c3d4e5f6a7b8c9d0e"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               licensePlate:
 *                 type: string
 *                 description: New license plate (format 51A-123.45)
 *                 example: "51A-999.88"
 *               vehicleTypeId:
 *                 type: string
 *                 description: New vehicle type ObjectId
 *                 example: "665a1b2c3d4e5f6a7b8c9d02"
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 vehicle:
 *                   _id: "665f1b2c3d4e5f6a7b8c9d0e"
 *                   userId: "665a1b2c3d4e5f6a7b8c9d0f"
 *                   licensePlate: "51A-999.88"
 *                   vehicleTypeId:
 *                     _id: "665a1b2c3d4e5f6a7b8c9d02"
 *                     type: "SUV"
 *                   monthlyCardId: null
 *                   createdAt: "2026-06-02T10:00:00.000Z"
 *                   updatedAt: "2026-06-15T19:00:00.000Z"
 *               message: "Vehicle updated successfully"
 *       400:
 *         description: Validation error or not your vehicle
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle or vehicle type not found
 *       409:
 *         description: License plate already exists
 */
router.put(
    "/:vehicleId",
    authentication,
    authorizationByRole(['CUSTOMER']),
    validateData(updateVehicleSchema),
    async (req, res, next) => {
        const vehicleController = req.container.resolve('vehicleController');
        await vehicleController.updateVehicle(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/vehicles/{vehicleId}/soft-delete:
 *   delete:
 *     summary: Soft delete a vehicle
 *     description: |
 *       Soft delete a vehicle by setting its status to INACTIVE.
 *       Only the vehicle owner (CUSTOMER) can perform this action.
 *       Cannot delete a vehicle that is already inactive.
 *     tags: [Vehicle]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The vehicle ObjectId
 *         example: "665f1b2c3d4e5f6a7b8c9d0e"
 *     responses:
 *       200:
 *         description: Vehicle soft deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 vehicle:
 *                   _id: "665f1b2c3d4e5f6a7b8c9d0e"
 *                   userId: "665a1b2c3d4e5f6a7b8c9d0f"
 *                   licensePlate: "51A-123.45"
 *                   vehicleTypeId:
 *                     _id: "665a1b2c3d4e5f6a7b8c9d01"
 *                     type: "SEDAN"
 *                   monthlyCardId: null
 *                   status: "INACTIVE"
 *                   createdAt: "2026-06-02T10:00:00.000Z"
 *                   updatedAt: "2026-06-15T19:00:00.000Z"
 *               message: "Vehicle soft deleted successfully"
 *       400:
 *         description: Not your vehicle or vehicle already deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle not found
 */
router.delete(
    "/:vehicleId/soft-delete",
    authentication,
    authorizationByRole(['CUSTOMER']),
    async (req, res, next) => {
        const vehicleController = req.container.resolve('vehicleController');
        await vehicleController.softDeleteVehicle(req, res, next);
    }
);

export default router;
