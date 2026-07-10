import express from 'express'
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js'
import { 
    checkPaymentSchema,
    createSubcriptionPaymentLinkSchema,
    getPricePoliciesSchema, 
    getAllPaymentsQuerySchema,
    getPaymentsByLicensePlateParamsSchema,
    getPaymentsByLicensePlateQuerySchema,
    paymentIdParamSchema,
    qrPaymentLinkSchema
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
 * /api/v1/payment:
 *   get:
 *     summary: Get all payments (Admin/Manager/Staff)
 *     description: |
 *       Get a paginated list of payments.
 *       Supports filtering by status, payment method, orderCode, vehicleId,
 *       parkingSessionId, and license plate (covers both registered vehicles and guest sessions).
 *     tags: [Payment]
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
 *         description: Number of payments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, CANCELLED]
 *         description: Filter by payment status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [CASH, CARD, TRANSFER]
 *         description: Filter by payment method
 *       - in: query
 *         name: orderCode
 *         schema:
 *           type: integer
 *         description: Filter by PayOS order code
 *       - in: query
 *         name: vehicleId
 *         schema:
 *           type: string
 *         description: Filter by vehicle ObjectId (subscription payments)
 *       - in: query
 *         name: parkingSessionId
 *         schema:
 *           type: string
 *         description: Filter by parking session ObjectId (checkout payments)
 *       - in: query
 *         name: licensePlate
 *         schema:
 *           type: string
 *         description: Filter by license plate (format 51A-123.45)
 *         example: "51A-123.45"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, amount, orderCode, status]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           oneOf:
 *             - type: string
 *               enum: [asc, desc]
 *             - type: integer
 *               enum: [1, -1]
 *           default: desc
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: Payments fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 payments:
 *                   - _id: "665f..."
 *                     parkingSessionId:
 *                       _id: "665a..."
 *                       licensePlate: "51A-123.45"
 *                       isGuest: true
 *                       status: "COMPLETED"
 *                     vehicleId: null
 *                     amount: 56000
 *                     paymentMethod: "TRANSFER"
 *                     status: "PAID"
 *                     orderCode: 123456789
 *                     createdAt: "2026-07-10T10:00:00.000Z"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   totalCount: 25
 *                   totalPages: 3
 *               message: "Payments fetched successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.get(
    '/',
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER', 'STAFF']),
    validateData(getAllPaymentsQuerySchema, 'query'),
    async (req, res, next) => {
        const paymentController = req.container.resolve('paymentController')
        await paymentController.getAllPayments(req, res, next)
    }
)

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

/**
 * @swagger
 * /api/v1/payment/staff/bill-qr:
 *   post:
 *     summary: Create PayOS QR code for staff parking checkout
 *     description: |
 *       Staff generates a VietQR payment code for an active daily/guest parking session.
 *       The parking fee is calculated from hourly price policies based on check-in time.
 *       A PENDING payment record is saved and a PayOS QR code is returned for the customer to scan.
 *       After the customer pays, staff must call `/check-payment` to verify and complete checkout.
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
 *               - parkingSessionId
 *             properties:
 *               parkingSessionId:
 *                 type: string
 *                 description: ObjectId of the active parking session to bill
 *                 example: "665f1b2c3d4e5f6a7b8c9d0e"
 *     responses:
 *       200:
 *         description: QR payment created successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 orderCode: 123456789
 *                 amount: 56000
 *                 totalHours: 3
 *                 qrCode: "00020101021238570010A000000727..."
 *       400:
 *         description: |
 *           Validation error, parking session not found, session is monthly type,
 *           pending payment already exists, no price policy, fee below minimum, or PayOS request failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (ADMIN, MANAGER, or STAFF role required)
 */
router.post(
    "/staff/bill-qr",
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER', 'STAFF']),
    validateData(qrPaymentLinkSchema),
    async (req, res, next) => {
        const paymentController = req.container.resolve('paymentController')

        await paymentController.qrPayment(req, res, next)
    }
)

/**
 * @swagger
 * /api/v1/payment/check-payment:
 *   post:
 *     summary: Verify customer payment and complete parking checkout
 *     description: |
 *       Staff verifies via PayOS that the customer has paid for a QR checkout bill.
 *       On success, the payment status is updated to PAID, the parking session is completed,
 *       and the parking slot is set back to AVAILABLE.
 *       This endpoint is used for staff QR checkout flow (not monthly subscription).
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
 *               - orderCode
 *             properties:
 *               orderCode:
 *                 type: number
 *                 description: PayOS order code returned from `/staff/bill-qr`
 *                 example: 123456789
 *     responses:
 *       200:
 *         description: Payment verified and checkout completed successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 message: "PAYMENT SUCCESSFULLY"
 *       400:
 *         description: |
 *           Validation error, payment not found, payment not yet paid on PayOS,
 *           orderCode is not a parking checkout payment, or checkout failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (ADMIN, MANAGER, or STAFF role required)
 */
router.post(
    '/check-payment',
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER', 'STAFF']),
    validateData(checkPaymentSchema),
    async (req, res, next) => {
        const paymentController = req.container.resolve('paymentController')

        await paymentController.checkPayment(req, res, next)
    }
)

/**
 * @swagger
 * /api/v1/payment/by-plate/{licensePlate}:
 *   get:
 *     summary: Get payments by vehicle license plate
 *     description: |
 *       Look up payments linked to a license plate.
 *       Includes subscription payments (via registered vehicle) and checkout payments
 *       (via parking sessions, including guest walk-in sessions).
 *       Supports pagination and optional filters by status / payment method.
 *       Only accessible by ADMIN, MANAGER, and STAFF.
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: licensePlate
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle license plate (format 51A-123.45)
 *         example: "51A-123.45"
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
 *         description: Number of payments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, CANCELLED]
 *         description: Filter by payment status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [CASH, CARD, TRANSFER]
 *         description: Filter by payment method
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, amount, orderCode, status]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           oneOf:
 *             - type: string
 *               enum: [asc, desc]
 *             - type: integer
 *               enum: [1, -1]
 *           default: desc
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: Payments fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 licensePlate: "51A-123.45"
 *                 vehicle:
 *                   _id: "665b..."
 *                   licensePlate: "51A-123.45"
 *                 payments:
 *                   - _id: "665f..."
 *                     amount: 56000
 *                     paymentMethod: "TRANSFER"
 *                     status: "PAID"
 *                     orderCode: 123456789
 *                     parkingSessionId:
 *                       _id: "665a..."
 *                       licensePlate: "51A-123.45"
 *                       isGuest: false
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   totalCount: 5
 *                   totalPages: 1
 *               message: "Payments fetched successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: No vehicle or parking sessions found for this license plate
 */
router.get(
    '/by-plate/:licensePlate',
    authentication,
    validateData(getPaymentsByLicensePlateParamsSchema, 'params'),
    validateData(getPaymentsByLicensePlateQuerySchema, 'query'),
    async (req, res, next) => {
        const paymentController = req.container.resolve('paymentController')
        await paymentController.getPaymentsByLicensePlate(req, res, next)
    }
)

/**
 * @swagger
 * /api/v1/payment/webhook:
 *   post:
 *     summary: PayOS webhook callback
 *     description: |
 *       Receives payment status updates from PayOS.
 *       Used to mark subscription payments as PAID and activate monthly cards.
 *       This endpoint is called by PayOS (no bearer auth).
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Raw PayOS webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed
 *         content:
 *           application/json:
 *             example:
 *               status: success
 */
router.post(
    '/webhook',
    async (req, res, next) => {
        const paymentController = req.container.resolve('paymentController')

        await paymentController.handlePayOSWebhook(req, res, next)
    }
)

/**
 * @swagger
 * /api/v1/payment/cancel/{paymentId}:
 *   put:
 *     summary: Cancel a pending payment
 *     description: |
 *       Soft-cancels a payment by setting status to CANCELLED.
 *       Only PENDING payments can be cancelled.
 *       Only accessible by ADMIN, MANAGER, and STAFF.
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ObjectId
 *         example: "665f1b2c3d4e5f6a7b8c9d0e"
 *     responses:
 *       200:
 *         description: Payment cancelled successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 updatedPayment:
 *                   _id: "665f..."
 *                   status: "CANCELLED"
 *                   amount: 56000
 *                   orderCode: 123456789
 *               message: "Payment cancelled successfully"
 *       400:
 *         description: Payment already PAID or CANCELLED
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Payment not found
 */
router.put(
    '/cancel/:paymentId',
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER', 'STAFF']),
    validateData(paymentIdParamSchema, 'params'),
    async (req, res, next) => {
        const paymentController = req.container.resolve('paymentController')
        await paymentController.cancelPayment(req, res, next)
    }
)

/**
 * @swagger
 * /api/v1/payment/{paymentId}:
 *   get:
 *     summary: Get payment detail by ID
 *     description: |
 *       Get a single payment with populated vehicle and parking session details.
 *       Only accessible by ADMIN, MANAGER, and STAFF.
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ObjectId
 *         example: "665f1b2c3d4e5f6a7b8c9d0e"
 *     responses:
 *       200:
 *         description: Payment fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 payment:
 *                   _id: "665f..."
 *                   amount: 56000
 *                   paymentMethod: "TRANSFER"
 *                   status: "PAID"
 *                   orderCode: 123456789
 *                   vehicleId:
 *                     _id: "665b..."
 *                     licensePlate: "51A-123.45"
 *                     vehicleTypeId:
 *                       type: "SEDAN"
 *                   parkingSessionId:
 *                     _id: "665a..."
 *                     licensePlate: "51A-123.45"
 *                     status: "COMPLETED"
 *                     isGuest: false
 *                   createdAt: "2026-07-10T10:00:00.000Z"
 *               message: "Payment fetched successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Payment not found
 *   delete:
 *     summary: Delete a payment (Admin only)
 *     description: |
 *       Hard-deletes a payment record.
 *       Only PAID or CANCELLED payments can be deleted (PENDING must be cancelled first).
 *       Only accessible by ADMIN.
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ObjectId
 *         example: "665f1b2c3d4e5f6a7b8c9d0e"
 *     responses:
 *       200:
 *         description: Payment deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 deletedPayment:
 *                   _id: "665f..."
 *                   status: "PAID"
 *                   amount: 56000
 *                   orderCode: 123456789
 *               message: "Payment deleted successfully"
 *       400:
 *         description: Payment is still PENDING and cannot be deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - ADMIN role required
 *       404:
 *         description: Payment not found
 */
router.get(
    '/:paymentId',
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER', 'STAFF']),
    validateData(paymentIdParamSchema, 'params'),
    async (req, res, next) => {
        const paymentController = req.container.resolve('paymentController')
        await paymentController.getPaymentById(req, res, next)
    }
)

router.delete(
    '/:paymentId',
    authentication,
    authorizationByRole(['ADMIN']),
    validateData(paymentIdParamSchema, 'params'),
    async (req, res, next) => {
        const paymentController = req.container.resolve('paymentController')
        await paymentController.deletePayment(req, res, next)
    }
)

export default router