import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import { updateMyProfileSchema } from '../../validators/user.validator.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User management API endpoints
 */

/**
 * @swagger
 * /api/v1/users/my-profile:
 *   get:
 *     summary: Get my profile
 *     description: Get the profile of the currently authenticated user.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 user:
 *                   _id: "665a1b2c3d4e5f6a7b8c9d0e"
 *                   email: "user@example.com"
 *                   fullName: "Nguyen Van A"
 *                   phone: "0901234567"
 *                   roleId:
 *                     _id: "665a1b2c3d4e5f6a7b8c9d0f"
 *                     roleName: "CUSTOMER"
 *                   status: "ACTIVE"
 *                   vehicles:
 *                     - _id: "665f1b2c3d4e5f6a7b8c9d0e"
 *                       licensePlate: "51A-123.45"
 *                       vehicleTypeId:
 *                         _id: "665a1b2c3d4e5f6a7b8c9d01"
 *                         type: "SEDAN"
 *                       monthlyCardId: null
 *                   createdAt: "2026-05-20T10:00:00.000Z"
 *                   updatedAt: "2026-05-20T10:00:00.000Z"
 *                 message: "Profile fetched successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
    "/my-profile",
    authentication,
    async (req, res, next) => {
        const userController = req.container.resolve('userController');
        await userController.getMyProfile(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     description: |
 *       Get a paginated list of all users.
 *       Supports search by fullName, email, phone.
 *       Supports filtering by status and roleId.
 *       Only accessible by ADMIN and MANAGER.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by fullName, email, or phone (case-insensitive)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, LOCKED]
 *         description: Filter by user status
 *       - in: query
 *         name: roleId
 *         schema:
 *           type: string
 *         description: Filter by role ObjectId
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *           enum: [createdAt, fullName, email]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           default: desc
 *           enum: [asc, desc]
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 users:
 *                   - _id: "665a1b2c3d4e5f6a7b8c9d0e"
 *                     email: "user@example.com"
 *                     fullName: "Nguyen Van A"
 *                     phone: "0901234567"
 *                     roleId:
 *                       _id: "665a1b2c3d4e5f6a7b8c9d0f"
 *                       roleName: "CUSTOMER"
 *                     status: "ACTIVE"
 *                     vehicles:
 *                       - _id: "665f1b2c3d4e5f6a7b8c9d0e"
 *                         licensePlate: "51A-123.45"
 *                         vehicleTypeId:
 *                           _id: "665a1b2c3d4e5f6a7b8c9d01"
 *                           type: "SEDAN"
 *                         monthlyCardId: null
 *                     createdAt: "2026-05-20T10:00:00.000Z"
 *                     updatedAt: "2026-05-20T10:00:00.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   totalCount: 50
 *                   totalPages: 5
 *               message: "Users fetched successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get(
    "/",
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER']),
    async (req, res, next) => {
        const userController = req.container.resolve('userController');
        await userController.getAllUser(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/users/my-profile:
 *   put:
 *     summary: Update my profile
 *     description: Update the profile of the currently authenticated user. At least one field must be provided.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 30
 *                 example: "Nguyen Van B"
 *               phone:
 *                 type: string
 *                 pattern: "^[0-9]{10}$"
 *                 example: "0901234568"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 user:
 *                   _id: "665a1b2c3d4e5f6a7b8c9d0e"
 *                   email: "user@example.com"
 *                   fullName: "Nguyen Van B"
 *                   phone: "0901234568"
 *                   roleId:
 *                     _id: "665a1b2c3d4e5f6a7b8c9d0f"
 *                     roleName: "CUSTOMER"
 *                   status: "ACTIVE"
 *                   createdAt: "2026-05-20T10:00:00.000Z"
 *                   updatedAt: "2026-06-15T10:00:00.000Z"
 *               message: "Profile updated successfully"
 *       400:
 *         description: Validation error - invalid data or no fields provided
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put(
    "/my-profile",
    authentication,
    validateData(updateMyProfileSchema),
    async (req, res, next) => {
        const userController = req.container.resolve('userController');
        await userController.updateMyProfile(req, res, next);
    }
)

export default router;
