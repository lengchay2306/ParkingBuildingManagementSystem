import express from 'express'
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js'
import { 
    createSubcriptionPaymentLinkSchema,
    getPricePoliciesSchema 
} from '../../validators/payment.validator.js'

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Payment and price policy API endpoints
 */

/**
 * @swagger
 * /api/v1/payment/price-policies:
 *   get:
 *     summary: Get all price policies
 *     description: |
 *       Retrieve paginated parking price policies.
 *       Supports optional filtering by vehicle type.
 *       Each vehicle type may have tiered hourly rates (e.g. first 4 hours, from hour 4 onwards).
 *     tags: [Payment]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number (starts from 1)
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 10
 *         description: Number of records per page (max 10)
 *         example: 10
 *       - in: query
 *         name: vehicleTypeId
 *         schema:
 *           type: string
 *         description: Filter by vehicle type ObjectId
 *         example: "665a1b2c3d4e5f6a7b8c9d0e"
 *     responses:
 *       200:
 *         description: Price policies fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 pricePolicies:
 *                   - _id: "6670..."
 *                     vehicleTypeId:
 *                       type: "SEDAN"
 *                     policyName: "SEDAN - First 4 Hours"
 *                     fromHour: 0
 *                     toHour: 4
 *                     ratePerHour: 14000
 *                     monthlyRate: 1100000
 *                   - _id: "6671..."
 *                     vehicleTypeId:
 *                       type: "SEDAN"
 *                     policyName: "SEDAN - From Hour 4 Onwards"
 *                     fromHour: 4
 *                     toHour: null
 *                     ratePerHour: 17500
 *                     monthlyRate: null
 *                 pagination:
 *                   currentPage: 1
 *                   totalPage: 2
 *                   totalItems: 20
 *                   itemsPerPage: 10
 *       400:
 *         description: Validation error or no price policies found
 */
router.get(
    '/price-policies',
    validateData(getPricePoliciesSchema, "query"),
    async (req, res, next) => {
        const paymentController = req.container.resolve('paymentController')

        await paymentController.getAllPricePolicies(req, res, next)
    }
)

/**
 * @swagger
 * /api/v1/payment/subscription/create-link:
 *   post:
 *     summary: Create PayOS payment link for monthly subscription
 *     description: |
 *       Customer creates a PayOS checkout link to pay for a monthly parking membership.
 *       The monthly fee is taken from the price policy tier with fromHour 0 (monthlyRate).
 *       A PENDING payment record is saved before calling PayOS.
 *       After the customer pays, PayOS sends a webhook to activate the monthly card on the vehicle.
 *     tags: [Payment]
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
 *             properties:
 *               vehicleId:
 *                 type: string
 *                 description: ObjectId of the customer's vehicle to subscribe
 *                 example: "665a1b2c3d4e5f6a7b8c9d0e"
 *     responses:
 *       201:
 *         description: PayOS checkout link created successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 checkoutUrl: "https://pay.payos.vn/web/..."
 *       400:
 *         description: |
 *           Validation error, vehicle not found, vehicle does not belong to user,
 *           no monthly price policy for vehicle type, or PayOS request failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (CUSTOMER role required)
 */
router.post(
    '/subscription/create-link',
    authentication,
    authorizationByRole(['CUSTOMER']),
    validateData(createSubcriptionPaymentLinkSchema),
    async (req, res, next) => {
        const paymentController = req.container.resolve('paymentController')

        await paymentController.subscriptionPayment(req, res, next)
    }
)

router.post(
    '/webhook',
    async (req, res, next) => {
        const paymentController = req.container.resolve('paymentController')

        await paymentController.handlePayOSWebhook(req, res, next)
    }
)

export default router