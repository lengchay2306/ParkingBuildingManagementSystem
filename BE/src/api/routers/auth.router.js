import express from 'express'
import { authentication, getUserDeviceName, validateData } from '../middleware/middleware.js';
import { loginSchema, registerSchema } from '../../validators/auth.validator.js';

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication API endpoints
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: Login successful. Tokens are set in httpOnly cookies, user info is returned in body.
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 user:
 *                   _id: "665a1b2c3d4e5f6a7b8c9d0e"
 *                   email: "admin@example.com"
 *                   fullName: "Admin User"
 *                   phone: "0123456780"
 *                   roleName: "ADMIN"
 *                   status: "ACTIVE"
 *                 message: "login successfully"
 *       400:
 *         description: Invalid credentials or account banned
 */
router.post(
    "/login",
    validateData(loginSchema),
    getUserDeviceName,
    async (req, res, next) => {
        const authController = req.container.resolve('authController')

        await authController.login(req, res, next);
    }
)

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       201:
 *         description: Token refreshed successfully
 *       400:
 *         description: Missing token from cookie
 *       401:
 *         description: Refresh Token expired or invalid
 */
router.post(
    "/refresh-token",
    getUserDeviceName,
    async (req, res, next) => {
        const authController = req.container.resolve('authController')

        await authController.refreshToken(req, res, next);
    }
)

/**
 * @swagger
 * /api/v1/auth/logout:
 *   delete:
 *     summary: User logout
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successfully
 *       400:
 *         description: Logout failed
 *       401:
 *         description: Unauthorized
 */
router.delete(
    "/logout",
    authentication,
    async (req, res, next) => {
        const authController = req.container.resolve('authController')

        await authController.logout(req, res, next);
    }
)

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
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
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 example: "0123456789"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request or user already exists
 */
router.post(
    "/register",
    validateData(registerSchema),
    async (req, res, next) => {
        const authController = req.container.resolve('authController')

        await authController.register(req, res, next);
    }
)

export default router;