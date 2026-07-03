import express from 'express';
import { authentication, authorizationByRole, validateData } from '../middleware/middleware.js';
import {
    parkingSessionSchema,
    checkParkingSessionSchema,
    queryParkingSessionsSchema,
    guestParkingSessionSchema,
} from '../../validators/parking.validator.js'

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Parking
 *   description: Parking lot management API endpoints
 */

/**
 * @swagger
 * /api/v1/parking/slots:
 *   get:
 *     summary: Get parking floors with slots
 *     description: |
 *       View parking lot organized by floors with their slots.
 *       Supports filtering by vehicle type, specific floor, and slot status.
 *       All filters are optional and can be combined.
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vehicleType
 *         schema:
 *           type: string
 *           enum: [SEDAN, SUV, MPV, PICKUP]
 *         description: Filter by vehicle type
 *       - in: query
 *         name: floorId
 *         schema:
 *           type: string
 *         description: Filter by specific floor ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, RESERVED, UNAVAILABLE, CURRENTLY-IN-USED]
 *         description: Filter slots by status
 *     responses:
 *       200:
 *         description: Parking floors with slots and statistics
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 floors:
 *                   - _id: "665a..."
 *                     floorName: "Tầng 1"
 *                     vehicleType:
 *                       _id: "665b..."
 *                       type: "SEDAN"
 *                     totalSlot: 50
 *                     slotStats:
 *                       available: 30
 *                       reserved: 3
 *                       unavailable: 5
 *                       inUsed: 15
 *                       total: 53
 *                     slots:
 *                       - _id: "665c..."
 *                         slotNumber: "A-01"
 *                         status: "AVAILABLE"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle type or floor not found
 */
router.get(
    "/slots",
    authentication,
    authorizationByRole(['CUSTOMER', 'MANAGER', 'ADMIN', 'STAFF']),
    //co 4 role de ca 4 thi de? lam` j
    async (req, res, next) => {
        const parkingController = req.container.resolve('parkingController');
        await parkingController.getParkingSlots(req, res, next);
    }
);

/**
 * @swagger
 * /api/v1/parking/parking-sessions:
 *   get:
 *     summary: Get parking sessions with pagination
 *     description: |
 *       Get parking sessions by optional filters.
 *       Supports pagination, session status, and date filter.
 *       Accessible by manager, admin, and staff.
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
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
 *           minimum: 1
 *         description: Number of records per page
 *         example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, COMPLETED]
 *         description: Filter parking sessions by status
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sessions by check-in date
 *         example: "2026-06-18"
 *     responses:
 *       200:
 *         description: Parking sessions fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 parkingSessions:
 *                   parkingSessions:
 *                     - _id: "6670..."
 *                       vehicleId:
 *                         _id: "666a..."
 *                         licensePlate: "29D-888.88"
 *                       parkingSlotId:
 *                         _id: "666b..."
 *                         slotNumber: "A-01"
 *                         status: "CURRENTLY-IN-USED"
 *                       sessionType: "DAILY"
 *                       checkInUserId:
 *                         _id: "666c..."
 *                         fullName: "Nguyen Van A"
 *                         phone: "0931467561"
 *                       checkInStaffId:
 *                         _id: "666d..."
 *                         fullName: "Staff 1"
 *                       checkInTime: "2026-06-18T08:00:00.000Z"
 *                       status: "ACTIVE"
 *                   pagination:
 *                     currentPage: 1
 *                     totalPage: 1
 *                     totalItems: 2
 *                     itemsPerPage: 10
 *       400:
 *         description: Validation failed or no parking session found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient role)
 */
router.get(
    '/parking-sessions',
    authentication,
    authorizationByRole(['MANAGER', 'ADMIN', 'STAFF']),
    validateData(queryParkingSessionsSchema, "query"),
    async (req, res, next) => {
        const parkingController = req.container.resolve('parkingController')

        await parkingController.getAllParkingSessions(req, res, next)
    }
)

/**
 * @swagger
 * /api/v1/parking/active-user-parking-session/{vehicleId}:
 *   get:
 *     summary: Get parking session by vehicle
 *     description: Get an active parking session of a specific vehicle.
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ObjectId
 *         example: "666a1b2c3d4e5f6a7b8c9d0e"
 *     responses:
 *       200:
 *         description: Parking session fetched successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 parkingSession:
 *                   _id: "6670..."
 *                   vehicleId:
 *                     _id: "666a..."
 *                     licensePlate: "29D-888.88"
 *                   parkingSlotId:
 *                     _id: "666b..."
 *                     slotNumber: "A-01"
 *                     status: "CURRENTLY-IN-USED"
 *                   sessionType: "DAILY"
 *                   checkInUserId:
 *                     _id: "666c..."
 *                     fullName: "Nguyen Van A"
 *                     phone: "0931467561"
 *                   checkInStaffId:
 *                     _id: "666d..."
 *                     fullName: "Staff 1"
 *                   checkInTime: "2026-06-18T08:00:00.000Z"
 *                   status: "ACTIVE"
 *       400:
 *         description: Parking session does not exist
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient role)
 */
router.get(
    '/active-user-parking-session/:vehicleId',
    authentication,
    authorizationByRole(['CUSTOMER', 'MANAGER', 'ADMIN', 'STAFF']),
    async (req, res, next) => {
        const parkingController = req.container.resolve('parkingController')

        await parkingController.getUserParkingSessions(req, res, next)
    }
)

/**
 * @swagger
 * /api/v1/parking/create-parking-session:
 *   post:
 *     summary: Create a new parking session
 *     description: Staff, manager, or admin creates a check-in parking session for a customer's vehicle.
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - licensePlate
 *               - parkingSlotId
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Customer phone number (Vietnam format)
 *                 example: "0901234567"
 *               licensePlate:
 *                 type: string
 *                 description: Vehicle license plate
 *                 example: "51A-12345"
 *               parkingSlotId:
 *                 type: string
 *                 description: Parking slot ObjectId
 *                 example: "665a1b2c3d4e5f6a7b8c9d0f"
 *     responses:
 *       201:
 *         description: Parking session created successfully
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 parkingSession:
 *                   _id: "665f..."
 *                   vehicleId: "665b..."
 *                   parkingSlotId: "665c..."
 *                   sessionType: "DAILY"
 *                   checkInUserId: "665a..."
 *                   checkInStaffId: "665d..."
 *                   checkInTime: "2026-06-16T08:00:00.000Z"
 *                   status: "ACTIVE"
 *       400:
 *         description: Invalid input data, vehicle/user not found, or parking slot not available
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient role)
 */
router.post(
    "/create-parking-session",
    authentication,
    authorizationByRole(['MANAGER', 'ADMIN', 'STAFF']),
    validateData(parkingSessionSchema),
    async (req, res, next) => {
        const parkingController = req.container.resolve('parkingController');

        await parkingController.createNewParkingSession(req, res, next);
    }
)

router.post(
    "/create-parking-session/guest",
    authentication,
    authorizationByRole(['MANAGER', 'ADMIN', 'STAFF']),
    validateData(guestParkingSessionSchema),
    async (req, res, next) => {
        const parkingController = req.container.resolve('parkingController');

        await parkingController.createNewParkingSessionForGuest(req, res, next);
    }
)

/**
 * @swagger
 * /api/v1/parking/checkout-parking-session/{parkingSessionId}:
 *   patch:
 *     summary: Checkout a parking session
 *     description: Staff, manager, or admin checks out an active parking session for a customer.
 *     tags: [Parking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parkingSessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Parking session ObjectId
 *         example: "665f1b2c3d4e5f6a7b8c9d0e"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Customer phone number used to verify checkout owner
 *                 example: "0901234567"
 *     responses:
 *       204:
 *         description: Parking session checked out successfully
 *       400:
 *         description: Invalid request data, parking session/user not found, or checkout failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient role)
 */
router.patch(
    "/checkout-parking-session/:parkingSessionId",
    authentication,
    authorizationByRole(['MANAGER', 'ADMIN', 'STAFF']),
    validateData(checkParkingSessionSchema),
    async (req, res, next) => {
        const parkingController = req.container.resolve('parkingController');

        await parkingController.checkoutParkingSession(req, res, next);
    }
)

router.delete(
    'delete-error-parking-session/:parkingSessionId',
    authentication,
    authorizationByRole(['ADMIN', 'MANAGER']),
    async (req, res, next) => {
        const parkingController = req.container.resolve('parkingController');

        await parkingController.deleteErrorParkingSession(req, res, next);
    }
)

export default router;
