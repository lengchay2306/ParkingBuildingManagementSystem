import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import { createVehicleSchema, updateVehicleSchema, adminUpdateVehicleSchema, getMyVehiclesQuerySchema } from '../../validators/vehicle.validator.js';

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
 *     description: Get paginated vehicles belonging to the currently authenticated user.
 *     tags: [Vehicle]
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
 *         description: Number of vehicles per page
 *     responses:
 *       200:
 *         description: Vehicles fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 user:
 *                   _id: "665a1b2c3d4e5f6a7b8c9d0f"
 *                   email: "customer@example.com"
 *                   fullName: "Nguyen Van A"
 *                   phone: "0901234567"
 *                   roleId:
 *                     _id: "665a1b2c3d4e5f6a7b8c9d01"
 *                     roleName: "CUSTOMER"
 *                   status: "ACTIVE"
 *                   vehicles:
 *                     - _id: "665f1b2c3d4e5f6a7b8c9d0e"
 *                       licensePlate: "51A-12345"
 *                       vehicleTypeId:
 *                         _id: "665a1b2c3d4e5f6a7b8c9d02"
 *                         type: "SEDAN"
 *                       monthlyCardId: null
 *                       status: "ACTIVE"
 *                       createdAt: "2026-06-02T10:00:00.000Z"
 *                       updatedAt: "2026-06-02T10:00:00.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   totalCount: 3
 *                   totalPages: 1
 *               message: "Vehicles fetched successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
    "/user-vehicles",
    authentication,
    validateData(getMyVehiclesQuerySchema, 'query'),
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
 * /api/v1/vehicles/user-vehicles/{vehicleId}:
 *   put:
 *     summary: Update my vehicle (Customer)
 *     description: |
 *       Customer updates their own vehicle information.
 *       Only the vehicle owner can update. At least one field must be provided.
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
 *                   status: "ACTIVE"
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
    "/user-vehicles/:vehicleId",
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
 * /api/v1/vehicles/manage/{vehicleId}:
 *   put:
 *     summary: Update vehicle by ID (Admin/Manager)
 *     description: |
 *       Admin or Manager updates any vehicle's information.
 *       Can update: licensePlate, vehicleTypeId, monthlyCardId, status.
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
 *               monthlyCardId:
 *                 type: string
 *                 nullable: true
 *                 description: Monthly card ObjectId (null to remove)
 *                 example: "665a1b2c3d4e5f6a7b8c9d03"
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 description: Vehicle status
 *                 example: "ACTIVE"
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
 *                   monthlyCardId:
 *                     _id: "665a1b2c3d4e5f6a7b8c9d03"
 *                     cardCode: "MC-2026-001"
 *                   status: "ACTIVE"
 *                   createdAt: "2026-06-02T10:00:00.000Z"
 *                   updatedAt: "2026-06-15T19:00:00.000Z"
 *               message: "Vehicle updated successfully"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Vehicle or vehicle type not found
 *       409:
 *         description: License plate already exists
 */
router.put(
    "/manage/:vehicleId",
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER']),
    validateData(adminUpdateVehicleSchema),
    async (req, res, next) => {
        const vehicleController = req.container.resolve('vehicleController');
        await vehicleController.adminUpdateVehicle(req, res, next);
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
