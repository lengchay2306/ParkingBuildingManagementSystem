import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import {
    createPricePolicySchema,
    updatePricePolicySchema,
    pricePolicyIdParamSchema,
    getPricePoliciesQuerySchema,
} from '../../validators/pricePolicy.validator.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: PricePolicy
 *   description: Admin price policy management API endpoints
 */

/**
 * @swagger
 * /api/v1/price-policies:
 *   get:
 *     summary: Get all price policies (Admin)
 *     description: Retrieve paginated parking price policies. Only accessible by ADMIN.
 *     tags: [PricePolicy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: vehicleTypeId
 *         schema:
 *           type: string
 *         description: Filter by vehicle type ObjectId
 *     responses:
 *       200:
 *         description: Price policies fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
    '/',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(getPricePoliciesQuerySchema, 'query'),
    async (req, res, next) => {
        const pricePolicyController = req.container.resolve('pricePolicyController');
        await pricePolicyController.getAllPricePolicies(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/price-policies:
 *   post:
 *     summary: Create price policy (Admin)
 *     description: Create a new price policy. Only accessible by ADMIN.
 *     tags: [PricePolicy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleTypeId
 *               - policyName
 *               - fromHour
 *               - toHour
 *               - ratePerHour
 *             properties:
 *               vehicleTypeId:
 *                 type: string
 *                 example: "665a1b2c3d4e5f6a7b8c9d01"
 *               policyName:
 *                 type: string
 *                 example: "SEDAN - First 4 Hours"
 *               fromHour:
 *                 type: number
 *                 example: 0
 *               toHour:
 *                 type: number
 *                 example: 4
 *               ratePerHour:
 *                 type: number
 *                 example: 14000
 *               monthlyRate:
 *                 type: number
 *                 nullable: true
 *                 example: 1100000
 *     responses:
 *       201:
 *         description: Price policy created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
    '/',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(createPricePolicySchema),
    async (req, res, next) => {
        const pricePolicyController = req.container.resolve('pricePolicyController');
        await pricePolicyController.createPricePolicy(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/price-policies/{pricePolicyId}:
 *   get:
 *     summary: Get price policy by ID (Admin)
 *     tags: [PricePolicy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pricePolicyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Price policy fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Price policy not found
 */
router.get(
    '/:pricePolicyId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(pricePolicyIdParamSchema, 'params'),
    async (req, res, next) => {
        const pricePolicyController = req.container.resolve('pricePolicyController');
        await pricePolicyController.getPricePolicyById(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/price-policies/{pricePolicyId}:
 *   put:
 *     summary: Update price policy (Admin)
 *     description: Update a price policy. Only accessible by ADMIN.
 *     tags: [PricePolicy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pricePolicyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicleTypeId:
 *                 type: string
 *               policyName:
 *                 type: string
 *               fromHour:
 *                 type: number
 *               toHour:
 *                 type: number
 *               ratePerHour:
 *                 type: number
 *               monthlyRate:
 *                 type: number
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Price policy updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Price policy not found
 */
router.put(
    '/:pricePolicyId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(pricePolicyIdParamSchema, 'params'),
    validateData(updatePricePolicySchema),
    async (req, res, next) => {
        const pricePolicyController = req.container.resolve('pricePolicyController');
        await pricePolicyController.updatePricePolicy(req, res, next);
    },
);

/**
 * @swagger
 * /api/v1/price-policies/{pricePolicyId}:
 *   delete:
 *     summary: Delete price policy (Admin)
 *     description: Delete a price policy. Only accessible by ADMIN.
 *     tags: [PricePolicy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pricePolicyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Price policy deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Price policy not found
 */
router.delete(
    '/:pricePolicyId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(pricePolicyIdParamSchema, 'params'),
    async (req, res, next) => {
        const pricePolicyController = req.container.resolve('pricePolicyController');
        await pricePolicyController.deletePricePolicy(req, res, next);
    },
);

export default router;
