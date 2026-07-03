import mongoose from "mongoose";
import dotenv from "dotenv";
import configDB from "../config/configDB.js";
import {
    Role,
    User,
    VehicleType,
    Vehicle,
    Floor,
    ParkingSlot,
    PricePolicy,
    MonthlyCard,
    ParkingSession,
    Payment,
    Ticket,
    Reservation,
} from "../models/Model.js";
import HashService from "../services/hash.service.js";

dotenv.config();

const seedData = async () => {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(configDB.uri);
        console.log("Connected to MongoDB successfully!");

        console.log("Clearing existing data...");
        await Promise.all([
            Role.deleteMany(),
            User.deleteMany(),
            VehicleType.deleteMany(),
            Vehicle.deleteMany(),
            Floor.deleteMany(),
            ParkingSlot.deleteMany(),
            PricePolicy.deleteMany(),
            MonthlyCard.deleteMany(),
            ParkingSession.deleteMany(),
            Payment.deleteMany(),
            Ticket.deleteMany(),
            Reservation.deleteMany(),
        ]);
        console.log("All collections cleared!");

        // ===== 1. ROLES =====
        console.log("Seeding Roles...");
        const rolesData = [
            { roleName: "ADMIN" },
            { roleName: "MANAGER" },
            { roleName: "STAFF" },
            { roleName: "CUSTOMER" },
        ];
        const createdRoles = await Role.insertMany(rolesData);
        console.log(`  Created ${createdRoles.length} roles.`);

        // ===== 2. VEHICLE TYPES =====
        console.log("Seeding VehicleTypes...");
        const vehicleTypesData = [
            { type: "SEDAN" },
            { type: "SUV" },
            { type: "EBIKE" },
            { type: "ECAR" },
            { type: "MOTORBIKE" },
            { type: "BIKE" },
            { type: "HATCHBACK" },
            { type: "CUV" },
            { type: "MPV" },
            { type: "PICKUP" },
        ];
        const createdVehicleTypes = await VehicleType.insertMany(vehicleTypesData);
        console.log(`  Created ${createdVehicleTypes.length} vehicle types.`);

        const vehicleTypeMap = createdVehicleTypes.reduce((acc, item) => {
            acc[item.type] = item;
            return acc;
        }, {});

        // ===== 3. USERS =====
        console.log("Seeding Users...");
        const hashService = new HashService();
        const hashedPassword = await hashService.hash({ string: "12345678" });

        const adminRole = createdRoles.find(r => r.roleName === "ADMIN");
        const managerRole = createdRoles.find(r => r.roleName === "MANAGER");
        const staffRole = createdRoles.find(r => r.roleName === "STAFF");
        const customerRole = createdRoles.find(r => r.roleName === "CUSTOMER");

        const usersData = [
            {
                email: "admin@example.com",
                password: hashedPassword,
                fullName: "Admin User",
                phone: "0123456780",
                roleId: adminRole._id,
                status: "ACTIVE",
            },
            {
                email: "manager@example.com",
                password: hashedPassword,
                fullName: "Manager User",
                phone: "0123456781",
                roleId: managerRole._id,
                status: "ACTIVE",
            },
            {
                email: "staff1@example.com",
                password: hashedPassword,
                fullName: "Staff Nguyen Van A",
                phone: "0123456782",
                roleId: staffRole._id,
                status: "ACTIVE",
            },
            {
                email: "staff2@example.com",
                password: hashedPassword,
                fullName: "Staff Tran Van B",
                phone: "0123456783",
                roleId: staffRole._id,
                status: "ACTIVE",
            },
            {
                email: "customer1@example.com",
                password: hashedPassword,
                fullName: "Nguyen Minh Tuan",
                phone: "0901234561",
                roleId: customerRole._id,
                status: "ACTIVE",
            },
            {
                email: "customer2@example.com",
                password: hashedPassword,
                fullName: "Le Thi Hoa",
                phone: "0901234562",
                roleId: customerRole._id,
                status: "ACTIVE",
            },
            {
                email: "customer3@example.com",
                password: hashedPassword,
                fullName: "Pham Duc Manh",
                phone: "0901234563",
                roleId: customerRole._id,
                status: "ACTIVE",
            },
            {
                email: "customer4@example.com",
                password: hashedPassword,
                fullName: "Vo Thi Mai",
                phone: "0901234564",
                roleId: customerRole._id,
                status: "LOCKED",
            },
        ];
        const createdUsers = await User.insertMany(usersData);
        console.log(`  Created ${createdUsers.length} users.`);

        const staff1 = createdUsers.find(u => u.email === "staff1@example.com");
        const staff2 = createdUsers.find(u => u.email === "staff2@example.com");
        const customer1 = createdUsers.find(u => u.email === "customer1@example.com");
        const customer2 = createdUsers.find(u => u.email === "customer2@example.com");
        const customer3 = createdUsers.find(u => u.email === "customer3@example.com");

        // ===== 4. PRICE POLICIES =====
        // Business rule:
        // - each vehicle type has 2 policies: first 4 hours (0-4) and next 4 hours (4-8)
        // - bigger vehicle size => higher parking price
        console.log("Seeding PricePolicies...");
        const typePricingConfig = [
            { type: "BIKE", baseRate: 4000, monthlyRate: 250000 },
            { type: "MOTORBIKE", baseRate: 6000, monthlyRate: 320000 },
            { type: "EBIKE", baseRate: 7000, monthlyRate: 380000 },
            { type: "HATCHBACK", baseRate: 12000, monthlyRate: 900000 },
            { type: "SEDAN", baseRate: 14000, monthlyRate: 1100000 },
            { type: "CUV", baseRate: 16000, monthlyRate: 1300000 },
            { type: "ECAR", baseRate: 17000, monthlyRate: 1400000 },
            { type: "SUV", baseRate: 19000, monthlyRate: 1550000 },
            { type: "MPV", baseRate: 21000, monthlyRate: 1700000 },
            { type: "PICKUP", baseRate: 23000, monthlyRate: 1850000 },
        ];

        const pricePoliciesData = typePricingConfig.flatMap((item) => {
            const vehicleType = vehicleTypeMap[item.type];
            const next4HourRate = Math.round(item.baseRate * 1.25);

            return [
                {
                    vehicleTypeId: vehicleType._id,
                    policyName: `${item.type} - First 4 Hours`,
                    fromHour: 0,
                    toHour: 4,
                    ratePerHour: item.baseRate,
                    monthlyRate: item.monthlyRate,
                },
                {
                    vehicleTypeId: vehicleType._id,
                    policyName: `${item.type} - Next 4 Hours`,
                    fromHour: 4,
                    toHour: 9999,
                    ratePerHour: next4HourRate,
                    monthlyRate: null,
                },
            ];
        });
        const createdPricePolicies = await PricePolicy.insertMany(pricePoliciesData);
        console.log(`  Created ${createdPricePolicies.length} price policies.`);

        // ===== 5. MONTHLY CARDS =====
        console.log("Seeding MonthlyCards...");
        const sedanMonthlyPolicy = createdPricePolicies.find(
            p => p.policyName === "SEDAN - First 4 Hours"
        );
        const suvMonthlyPolicy = createdPricePolicies.find(
            p => p.policyName === "SUV - First 4 Hours"
        );

        const now = new Date();
        const monthlyCardsData = [
            {
                cardCode: "MC-2026-001",
                startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
                status: "ACTIVE",
                pricePolicyId: sedanMonthlyPolicy._id,
            },
            {
                cardCode: "MC-2026-002",
                startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
                status: "ACTIVE",
                pricePolicyId: suvMonthlyPolicy._id,
            },
            {
                cardCode: "MC-2026-003",
                startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
                endDate: new Date(now.getFullYear(), now.getMonth() - 1, 0),
                status: "EXPIRED",
                pricePolicyId: sedanMonthlyPolicy._id,
            },
        ];
        const createdMonthlyCards = await MonthlyCard.insertMany(monthlyCardsData);
        console.log(`  Created ${createdMonthlyCards.length} monthly cards.`);

        // ===== 6. VEHICLES =====
        console.log("Seeding Vehicles...");
        const vehiclesData = [
            {
                userId: customer1._id,
                licensePlate: "51A-123.45",
                vehicleTypeId: vehicleTypeMap.SEDAN._id,
                monthlyCardId: createdMonthlyCards[0]._id,
            },
            {
                userId: customer1._id,
                licensePlate: "51A-678.90",
                vehicleTypeId: vehicleTypeMap.SUV._id,
                monthlyCardId: createdMonthlyCards[1]._id,
            },
            {
                userId: customer2._id,
                licensePlate: "30H-111.22",
                vehicleTypeId: vehicleTypeMap.HATCHBACK._id,
                monthlyCardId: null,
            },
            {
                userId: customer2._id,
                licensePlate: "30H-333.44",
                vehicleTypeId: vehicleTypeMap.MPV._id,
                monthlyCardId: null,
            },
            {
                userId: customer3._id,
                licensePlate: "43A-555.66",
                vehicleTypeId: vehicleTypeMap.PICKUP._id,
                monthlyCardId: null,
            },
            {
                userId: customer3._id,
                licensePlate: "43A-777.88",
                vehicleTypeId: vehicleTypeMap.ECAR._id,
                monthlyCardId: createdMonthlyCards[2]._id,
            },
        ];
        const createdVehicles = await Vehicle.insertMany(vehiclesData);
        console.log(`  Created ${createdVehicles.length} vehicles.`);

        // ===== 7. FLOORS =====
        console.log("Seeding Floors...");
        const floorsData = [
            { floorName: "Tầng 1 - BIKE", vehicleTypeId: vehicleTypeMap.BIKE._id, totalSlot: 30 },
            { floorName: "Tầng 2 - MOTORBIKE", vehicleTypeId: vehicleTypeMap.MOTORBIKE._id, totalSlot: 28 },
            { floorName: "Tầng 3 - EBIKE", vehicleTypeId: vehicleTypeMap.EBIKE._id, totalSlot: 25 },
            { floorName: "Tầng 4 - HATCHBACK", vehicleTypeId: vehicleTypeMap.HATCHBACK._id, totalSlot: 22 },
            { floorName: "Tầng 5 - SEDAN", vehicleTypeId: vehicleTypeMap.SEDAN._id, totalSlot: 20 },
            { floorName: "Tầng 6 - CUV", vehicleTypeId: vehicleTypeMap.CUV._id, totalSlot: 18 },
            { floorName: "Tầng 7 - ECAR", vehicleTypeId: vehicleTypeMap.ECAR._id, totalSlot: 18 },
            { floorName: "Tầng 8 - SUV", vehicleTypeId: vehicleTypeMap.SUV._id, totalSlot: 16 },
            { floorName: "Tầng 9 - MPV", vehicleTypeId: vehicleTypeMap.MPV._id, totalSlot: 14 },
            { floorName: "Tầng 10 - PICKUP", vehicleTypeId: vehicleTypeMap.PICKUP._id, totalSlot: 12 },
        ];
        const createdFloors = await Floor.insertMany(floorsData);
        console.log(`  Created ${createdFloors.length} floors.`);

        // ===== 8. PARKING SLOTS =====
        console.log("Seeding ParkingSlots...");
        const parkingSlotsData = [];
        for (const floor of createdFloors) {
            for (let i = 1; i <= floor.totalSlot; i++) {
                const slotNum = String(i).padStart(2, "0");
                parkingSlotsData.push({
                    floorId: floor._id,
                    slotNumber: `${floor.floorName.split(" ")[0].replace("Tầng", "T")}${slotNum}`,
                    status: "AVAILABLE",
                });
            }
        }
        const createdParkingSlots = await ParkingSlot.insertMany(parkingSlotsData);
        console.log(`  Created ${createdParkingSlots.length} parking slots.`);

        const usedSlots = createdParkingSlots.filter(s => s.status === "CURRENTLY-IN-USED");
        const availableSlots = createdParkingSlots.filter(s => s.status === "AVAILABLE");

        // ===== 9. PARKING SESSIONS =====
        // console.log("Seeding ParkingSessions...");
        // const parkingSessionsData = [
        //     {
        //         vehicleId: createdVehicles[0]._id,
        //         parkingSlotId: usedSlots[0]._id,
        //         sessionType: "MONTH",
        //         checkInStaffId: staff1._id,
        //         checkOutStaffId: null,
        //         checkInTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        //         checkOutTime: null,
        //         status: "ACTIVE",
        //     },
        //     {
        //         vehicleId: createdVehicles[1]._id,
        //         parkingSlotId: usedSlots[1]._id,
        //         sessionType: "DAILY",
        //         checkInStaffId: staff1._id,
        //         checkOutStaffId: null,
        //         checkInTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        //         checkOutTime: null,
        //         status: "ACTIVE",
        //     },
        //     {
        //         vehicleId: createdVehicles[2]._id,
        //         parkingSlotId: usedSlots[2]._id,
        //         sessionType: "DAILY",
        //         checkInStaffId: staff2._id,
        //         checkOutStaffId: null,
        //         checkInTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        //         checkOutTime: null,
        //         status: "ACTIVE",
        //     },
        //     {
        //         vehicleId: createdVehicles[4]._id,
        //         parkingSlotId: usedSlots[3]._id,
        //         sessionType: "DAILY",
        //         checkInStaffId: staff2._id,
        //         checkOutStaffId: null,
        //         checkInTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        //         checkOutTime: null,
        //         status: "ACTIVE",
        //     },
        //     // Completed sessions
        //     {
        //         vehicleId: createdVehicles[3]._id,
        //         parkingSlotId: availableSlots[0]._id,
        //         sessionType: "DAILY",
        //         checkInStaffId: staff1._id,
        //         checkOutStaffId: staff2._id,
        //         checkInTime: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        //         checkOutTime: new Date(now.getTime() - 20 * 60 * 60 * 1000),
        //         status: "COMPLETED",
        //     },
        //     {
        //         vehicleId: createdVehicles[5]._id,
        //         parkingSlotId: availableSlots[1]._id,
        //         sessionType: "DAILY",
        //         checkInStaffId: staff2._id,
        //         checkOutStaffId: staff1._id,
        //         checkInTime: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        //         checkOutTime: new Date(now.getTime() - 44 * 60 * 60 * 1000),
        //         status: "COMPLETED",
        //     },
        // ];
        // const createdSessions = await ParkingSession.insertMany(parkingSessionsData);
        // console.log(`  Created ${createdSessions.length} parking sessions.`);

        // const completedSessions = createdSessions.filter(s => s.status === "COMPLETED");

        // ===== 10. PAYMENTS =====
        // console.log("Seeding Payments...");
        // const paymentsData = [
        //     {
        //         sessionId: completedSessions[0]._id,
        //         monthlyCardId: null,
        //         calculatedFee: 80000,
        //         additionalFee: 0,
        //         total: 80000,
        //         paymentMethod: "CASH",
        //         status: "PAID",
        //         paymentTime: completedSessions[0].checkOutTime,
        //     },
        //     {
        //         sessionId: completedSessions[1]._id,
        //         monthlyCardId: null,
        //         calculatedFee: 60000,
        //         additionalFee: 10000,
        //         total: 70000,
        //         paymentMethod: "TRANSFER",
        //         status: "PAID",
        //         paymentTime: completedSessions[1].checkOutTime,
        //     },
        //     {
        //         sessionId: createdSessions[0]._id,
        //         monthlyCardId: createdMonthlyCards[0]._id,
        //         calculatedFee: 0,
        //         additionalFee: 0,
        //         total: 0,
        //         paymentMethod: "CARD",
        //         status: "UNPAID",
        //         paymentTime: now,
        //     },
        // ];
        // const createdPayments = await Payment.insertMany(paymentsData);
        // console.log(`  Created ${createdPayments.length} payments.`);

        // ===== 11. TICKETS =====
        // console.log("Seeding Tickets...");
        // const ticketsData = [
        //     {
        //         sessionId: completedSessions[0]._id,
        //         reporterId: customer2._id,
        //         type: "FEEDBACK",
        //         description: "Bãi đỗ xe sạch sẽ, nhân viên thân thiện. Rất hài lòng!",
        //         resolvedBy: staff1._id,
        //         status: "RESOLVED",
        //     },
        //     {
        //         sessionId: completedSessions[1]._id,
        //         reporterId: customer3._id,
        //         type: "INCIDENT",
        //         description: "Xe bị trầy xước ở cửa bên phải khi đỗ tại slot T103.",
        //         resolvedBy: null,
        //         status: "PENDING",
        //     },
        //     {
        //         sessionId: createdSessions[1]._id,
        //         reporterId: customer1._id,
        //         type: "FEEDBACK",
        //         description: "Đèn tầng 3 bị hỏng, khó quan sát khi đỗ xe.",
        //         resolvedBy: null,
        //         status: "PENDING",
        //     },
        // ];
        // const createdTickets = await Ticket.insertMany(ticketsData);
        // console.log(`  Created ${createdTickets.length} tickets.`);

        // // ===== 12. RESERVATIONS =====
        // console.log("Seeding Reservations...");
        // const reservationsData = [
        //     {
        //         driverId: customer1._id,
        //         vehicleId: createdVehicles[0]._id,
        //         parkingSlotId: availableSlots[2]._id,
        //         reservedAt: new Date(now.getTime() + 1 * 60 * 60 * 1000),
        //         expectedArrival: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        //         expiryAt: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        //         status: "PENDING",
        //     },
        //     {
        //         driverId: customer2._id,
        //         vehicleId: createdVehicles[2]._id,
        //         parkingSlotId: availableSlots[3]._id,
        //         reservedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        //         expectedArrival: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        //         expiryAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        //         status: "CLAIMED",
        //     },
        //     {
        //         driverId: customer3._id,
        //         vehicleId: createdVehicles[4]._id,
        //         parkingSlotId: availableSlots[4]._id,
        //         reservedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        //         expectedArrival: new Date(now.getTime() - 47 * 60 * 60 * 1000),
        //         expiryAt: new Date(now.getTime() - 46 * 60 * 60 * 1000),
        //         status: "EXPIRED",
        //     },
        //     {
        //         driverId: customer1._id,
        //         vehicleId: createdVehicles[1]._id,
        //         parkingSlotId: availableSlots[5]._id,
        //         reservedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
        //         expectedArrival: new Date(now.getTime() - 9 * 60 * 60 * 1000),
        //         expiryAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        //         status: "CANCELLED",
        //     },
        // ];
        // const createdReservations = await Reservation.insertMany(reservationsData);
        // console.log(`  Created ${createdReservations.length} reservations.`);

        // ===== SUMMARY =====
        console.log("\n========== SEED SUMMARY ==========");
        console.log(`  Roles:           ${createdRoles.length}`);
        console.log(`  VehicleTypes:    ${createdVehicleTypes.length}`);
        console.log(`  Users:           ${createdUsers.length}`);
        console.log(`  PricePolicies:   ${createdPricePolicies.length}`);
        console.log(`  MonthlyCards:    ${createdMonthlyCards.length}`);
        console.log(`  Vehicles:        ${createdVehicles.length}`);
        console.log(`  Floors:          ${createdFloors.length}`);
        console.log(`  ParkingSlots:    ${createdParkingSlots.length}`);
        // console.log(`  ParkingSessions: ${createdSessions.length}`);
        // console.log(`  Payments:        ${createdPayments.length}`);
        // console.log(`  Tickets:         ${createdTickets.length}`);
        // console.log(`  Reservations:    ${createdReservations.length}`);
        console.log("===================================");
        console.log("\nAll accounts password: 12345678");
        console.log("\nSeed complete! Exiting...");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    }
};

seedData();
