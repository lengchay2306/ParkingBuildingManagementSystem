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
 *
 *       **Guest walk-in sessions** (`isGuest: true`) have no linked driver account or registered vehicle.
 *       Use `licensePlate` on the session document and derive vehicle type from the slot's floor
 *       (`parkingSlotId.floorId.vehicleTypeId` when populated).
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
 *                     - _id: "6671..."
 *                       licensePlate: "51A-123.45"
 *                       isGuest: true
 *                       vehicleId: null
 *                       checkInUserId: null
 *                       parkingSlotId:
 *                         _id: "666e..."
 *                         slotNumber: "T03"
 *                         status: "CURRENTLY-IN-USED"
 *                         floorId:
 *                           _id: "665a..."
 *                           floorName: "Tầng 1"
 *                           vehicleTypeId:
 *                             _id: "665b..."
 *                             type: "BIKE"
 *                       sessionType: "DAILY"
 *                       checkInStaffId:
 *                         _id: "666d..."
 *                         fullName: "Staff 1"
 *                       checkInTime: "2026-06-18T09:15:00.000Z"
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
 *     summary: Create a new parking session (reservation check-in)
 *     description: |
 *       Staff, manager, or admin checks in a registered customer who has an active PENDING reservation.
 *       The parking slot is resolved automatically from the reservation — staff does not pass parkingSlotId.
 *       Validates customer phone, vehicle ownership, reservation expiry, slot RESERVED status, and vehicle type match.
 *       On success the linked reservation is marked CLAIMED.
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
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Customer phone number (Vietnam format)
 *                 example: "0901234567"
 *               licensePlate:
 *                 type: string
 *                 description: Vehicle license plate
 *                 example: "51A-12345"
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
 *         description: |
 *           Invalid input, vehicle/user not found, no active pending reservation,
 *           reserved slot invalid, or vehicle type mismatch
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

/**
 * @swagger
 * /api/v1/parking/create-parking-session/guest:
 *   post:
 *     summary: Create a guest walk-in parking session
 *     description: |
 *       Staff, manager, or admin checks in a **walk-in guest** (khách vãng lai) without a driver account.
 *
 *       **Typical staff flow**
 *       1. Call `GET /api/v1/parking/slots` and pick an **AVAILABLE** slot on the correct floor/vehicle type.
 *       2. Scan or enter the license plate at the front desk.
 *       3. POST to this endpoint with `licensePlate`, `parkingSlotId`, and `vehicleTypeId` (from the slot's floor).
 *       4. Slot status becomes `CURRENTLY-IN-USED`; session is created with `isGuest: true`.
 *
 *       **Rules**
 *       - Slot must be `AVAILABLE` (not reserved, in-use, or unavailable).
 *       - `vehicleTypeId` must match the vehicle type of the slot's floor.
 *       - The same `licensePlate` cannot already have an **ACTIVE** session in the building.
 *       - No registered `vehicleId` or `checkInUserId` is required; `phone` is optional.
 *
 *       **Difference from** `POST /api/v1/parking/create-parking-session`
 *       - Regular check-in requires customer `phone` + a registered vehicle.
 *       - Guest check-in only needs the plate and a compatible available slot.
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
 *               - licensePlate
 *               - parkingSlotId
 *               - vehicleTypeId
 *             properties:
 *               licensePlate:
 *                 type: string
 *                 description: Guest vehicle license plate (normalized to uppercase on save)
 *                 example: "51A-123.45"
 *               parkingSlotId:
 *                 type: string
 *                 description: Target parking slot ObjectId (must be AVAILABLE)
 *                 example: "665a1b2c3d4e5f6a7b8c9d0f"
 *               vehicleTypeId:
 *                 type: string
 *                 description: Vehicle type ObjectId of the slot's floor (e.g. BIKE, SEDAN)
 *                 example: "665b1b2c3d4e5f6a7b8c9d0e"
 *               phone:
 *                 type: string
 *                 description: Optional guest phone (Vietnam format). Not required for walk-in.
 *                 example: "0901234567"
 *           examples:
 *             walkInBike:
 *               summary: Walk-in guest on bike floor
 *               value:
 *                 licensePlate: "51A-123.45"
 *                 parkingSlotId: "665a1b2c3d4e5f6a7b8c9d0f"
 *                 vehicleTypeId: "665b1b2c3d4e5f6a7b8c9d0e"
 *             walkInWithPhone:
 *               summary: Walk-in guest with optional phone
 *               value:
 *                 licensePlate: "30H-999.88"
 *                 parkingSlotId: "665a1b2c3d4e5f6a7b8c9d0f"
 *                 vehicleTypeId: "665b1b2c3d4e5f6a7b8c9d0e"
 *                 phone: "0912345678"
 *     responses:
 *       201:
 *         description: Guest parking session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     parkingSession:
 *                       type: object
 *             example:
 *               status: success
 *               data:
 *                 parkingSession:
 *                   _id: "6671..."
 *                   licensePlate: "51A-123.45"
 *                   isGuest: true
 *                   vehicleId: null
 *                   checkInUserId: null
 *                   phone: null
 *                   parkingSlotId:
 *                     _id: "665a..."
 *                     slotNumber: "T03"
 *                     status: "CURRENTLY-IN-USED"
 *                   sessionType: "DAILY"
 *                   checkInStaffId:
 *                     _id: "666d..."
 *                     fullName: "Staff 1"
 *                   checkInTime: "2026-06-18T09:15:00.000Z"
 *                   status: "ACTIVE"
 *       400:
 *         description: |
 *           Validation or business rule failure. Common messages:
 *           - `This vehicle already in parking building!` — active session exists for this plate
 *           - `This parking slot is not available!` — slot is not AVAILABLE
 *           - `This slot is not fit with this type of vehicle` — vehicleTypeId mismatch
 *           - `Wrong phone format` — optional phone failed validation
 *           - `Wrong format ID of mongoDB objectId` — invalid parkingSlotId or vehicleTypeId
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient role — STAFF, MANAGER, or ADMIN required)
 */
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
 *     description: |
 *       Staff, manager, or admin checks out an active parking session for a customer.
 *       Vehicles with an active monthly card can checkout without prior payment.
 *       Daily/guest sessions require a PAID payment linked to the session before checkout.
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
 *         description: |
 *           Invalid request data, parking session/user not found, payment required,
 *           or checkout failed
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
