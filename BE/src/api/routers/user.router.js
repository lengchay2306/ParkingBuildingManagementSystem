import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import {
    updateMyProfileSchema,
    createUserSchema,
    updateUserByIdSchema,
    userIdParamSchema,
} from '../../validators/user.validator.js';

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
 *       Only accessible by ADMIN.
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
    authorizationByRole(['ADMIN','MANAGER','STAFF']),
    async (req, res, next) => {
        const userController = req.container.resolve('userController');
        await userController.getAllUser(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create user (Admin)
 *     description: Create a new user. Only accessible by ADMIN.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *               - phone
 *               - roleId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 30
 *               phone:
 *                 type: string
 *                 pattern: "^[0-9]{10}$"
 *               roleId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, LOCKED]
 *                 default: ACTIVE
 *               vehicles:
 *                 type: array
 *                 description: Optional vehicles to create together with the user
 *                 items:
 *                   type: object
 *                   required:
 *                     - licensePlate
 *                     - vehicleTypeId
 *                   properties:
 *                     licensePlate:
 *                       type: string
 *                       example: "51A-123.45"
 *                     vehicleTypeId:
 *                       type: string
 *                     monthlyCardId:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: string
 *                       enum: [ACTIVE, INACTIVE]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Email or phone already in use
 */
router.post(
    "/",
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(createUserSchema),
    async (req, res, next) => {
        const userController = req.container.resolve('userController');
        await userController.createUser(req, res, next);
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
 *       409:
 *         description: Phone number already in use
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

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   put:
 *     summary: Update user by ID (Admin/Manager)
 *     description: |
 *       Update any user's information by their ID.
 *       Only accessible by ADMIN.
 *       Can update: email, password, fullName, phone, status, roleId, vehicles.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ObjectId
 *         example: "665a1b2c3d4e5f6a7b8c9d0e"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "newemail@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 30
 *                 example: "Nguyen Van C"
 *               phone:
 *                 type: string
 *                 pattern: "^[0-9]{10}$"
 *                 example: "0901234599"
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, LOCKED]
 *                 example: "LOCKED"
 *               roleId:
 *                 type: string
 *                 description: Role ObjectId
 *                 example: "665a1b2c3d4e5f6a7b8c9d0f"
 *               vehicles:
 *                 type: array
 *                 description: |
 *                   CRUD vehicles for this user. Each item requires an action:
 *                   - create: licensePlate + vehicleTypeId required
 *                   - update: vehicleId + at least one field to change
 *                   - delete: vehicleId required
 *                 items:
 *                   type: object
 *                   required:
 *                     - action
 *                   properties:
 *                     action:
 *                       type: string
 *                       enum: [create, update, delete]
 *                     vehicleId:
 *                       type: string
 *                     licensePlate:
 *                       type: string
 *                       example: "51A-123.45"
 *                     vehicleTypeId:
 *                       type: string
 *                     monthlyCardId:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: string
 *                       enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 user:
 *                   _id: "665a1b2c3d4e5f6a7b8c9d0e"
 *                   email: "user@example.com"
 *                   fullName: "Nguyen Van C"
 *                   phone: "0901234599"
 *                   roleId:
 *                     _id: "665a1b2c3d4e5f6a7b8c9d0f"
 *                     roleName: "CUSTOMER"
 *                   status: "LOCKED"
 *                   createdAt: "2026-05-20T10:00:00.000Z"
 *                   updatedAt: "2026-06-15T19:00:00.000Z"
 *               message: "User updated successfully"
 *       400:
 *         description: Validation error or no fields provided
 *       409:
 *         description: Email or phone already in use
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: User or Role not found
 */
router.put(
    "/:userId",
    authentication,
    authorizationByRole(['ADMIN','MANAGER']),
    validateData(userIdParamSchema, 'params'),
    validateData(updateUserByIdSchema),
    async (req, res, next) => {
        const userController = req.container.resolve('userController');
        await userController.updateUserById(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get user by ID (Admin/Manager/Staff)
 *     description: Get a user by their ID. Only accessible by ADMIN.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get(
    "/:userId",
    authentication,
    authorizationByRole(['ADMIN','MANAGER','STAFF']),
    validateData(userIdParamSchema, 'params'),
    async (req, res, next) => {
        const userController = req.container.resolve('userController');
        await userController.getUserById(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   delete:
 *     summary: Delete user by ID (Admin)
 *     description: Delete a user and all their vehicles. Only accessible by ADMIN.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.delete(
    "/:userId",
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(userIdParamSchema, 'params'),
    async (req, res, next) => {
        const userController = req.container.resolve('userController');
        await userController.deleteUserById(req, res, next);
    }
);

export default router;
