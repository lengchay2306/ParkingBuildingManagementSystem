import {
    Floor,
    MonthlyCard,
    ParkingSession,
    ParkingSlot,
    Payment,
    PricePolicy,
    Reservation,
    Role,
    Ticket,
    User,
    Vehicle,
    VehicleType,
    ChatSession,
    ChatMessage,
} from "../models/Model.js";

class DashboardRepository {
    #countDocuments = async (Model, filter = {}) => {
        return Model.countDocuments(filter);
    };

    #groupCount = async (Model, field, filter = {}) => {
        const rows = await Model.aggregate([
            { $match: filter },
            { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        ]);

        return rows.reduce((acc, row) => {
            const key = row._id ?? "null";
            acc[key] = row.count;
            return acc;
        }, {});
    };

    #sumField = async (Model, sumField, filter = {}) => {
        const [result] = await Model.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: `$${sumField}` } } },
        ]);

        return result?.total ?? 0;
    };

    getDashboardStats = async () => {
        const [
            usersTotal,
            usersByStatus,
            usersByRole,
            rolesTotal,
            vehiclesTotal,
            vehiclesByStatus,
            vehicleTypesTotal,
            vehicleTypesByType,
            floorsTotal,
            floorsTotalSlotCapacity,
            parkingSlotsTotal,
            parkingSlotsByStatus,
            parkingSessionsTotal,
            parkingSessionsByStatus,
            parkingSessionsByType,
            reservationsTotal,
            reservationsByStatus,
            paymentsTotal,
            paymentsByStatus,
            paymentsTotalRevenue,
            monthlyCardsTotal,
            monthlyCardsByStatus,
            pricePoliciesTotal,
            ticketsTotal,
            ticketsByStatus,
            ticketsByType,
            chatSessionsTotal,
            chatMessagesTotal,
            chatMessagesByRole,
        ] = await Promise.all([
            this.#countDocuments(User),
            this.#groupCount(User, "status"),
            User.aggregate([
                { $group: { _id: "$roleId", count: { $sum: 1 } } },
                {
                    $lookup: {
                        from: "roles",
                        localField: "_id",
                        foreignField: "_id",
                        as: "role",
                    },
                },
                { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        roleId: "$_id",
                        roleName: "$role.roleName",
                        count: 1,
                    },
                },
            ]),
            this.#countDocuments(Role),
            this.#countDocuments(Vehicle),
            this.#groupCount(Vehicle, "status"),
            this.#countDocuments(VehicleType),
            this.#groupCount(VehicleType, "type"),
            this.#countDocuments(Floor),
            this.#sumField(Floor, "totalSlot"),
            this.#countDocuments(ParkingSlot),
            this.#groupCount(ParkingSlot, "status"),
            this.#countDocuments(ParkingSession),
            this.#groupCount(ParkingSession, "status"),
            this.#groupCount(ParkingSession, "sessionType"),
            this.#countDocuments(Reservation),
            this.#groupCount(Reservation, "status"),
            this.#countDocuments(Payment),
            this.#groupCount(Payment, "status"),
            this.#sumField(Payment, "amount", { status: "PAID" }),
            this.#countDocuments(MonthlyCard),
            this.#groupCount(MonthlyCard, "status"),
            this.#countDocuments(PricePolicy),
            this.#countDocuments(Ticket),
            this.#groupCount(Ticket, "status"),
            this.#groupCount(Ticket, "type"),
            this.#countDocuments(ChatSession),
            this.#countDocuments(ChatMessage),
            this.#groupCount(ChatMessage, "role"),
        ]);

        const modelStats = {
            users: {
                total: usersTotal,
                byStatus: usersByStatus,
                byRole: usersByRole,
            },
            roles: { total: rolesTotal },
            vehicles: {
                total: vehiclesTotal,
                byStatus: vehiclesByStatus,
            },
            vehicleTypes: {
                total: vehicleTypesTotal,
                byType: vehicleTypesByType,
            },
            floors: {
                total: floorsTotal,
                totalSlotCapacity: floorsTotalSlotCapacity,
            },
            parkingSlots: {
                total: parkingSlotsTotal,
                byStatus: parkingSlotsByStatus,
            },
            parkingSessions: {
                total: parkingSessionsTotal,
                byStatus: parkingSessionsByStatus,
                bySessionType: parkingSessionsByType,
            },
            reservations: {
                total: reservationsTotal,
                byStatus: reservationsByStatus,
            },
            payments: {
                total: paymentsTotal,
                byStatus: paymentsByStatus,
                totalRevenue: paymentsTotalRevenue,
            },
            monthlyCards: {
                total: monthlyCardsTotal,
                byStatus: monthlyCardsByStatus,
            },
            pricePolicies: { total: pricePoliciesTotal },
            tickets: {
                total: ticketsTotal,
                byStatus: ticketsByStatus,
                byType: ticketsByType,
            },
            chatSessions: { total: chatSessionsTotal },
            chatMessages: {
                total: chatMessagesTotal,
                byRole: chatMessagesByRole,
            },
        };

        const summary = {
            totalRecords: Object.values(modelStats).reduce(
                (sum, item) => sum + (item.total ?? 0),
                0,
            ),
            totalRevenue: paymentsTotalRevenue,
            activeParkingSessions: parkingSessionsByStatus.ACTIVE ?? 0,
            availableParkingSlots: parkingSlotsByStatus.AVAILABLE ?? 0,
            activeMonthlyCards: monthlyCardsByStatus.ACTIVE ?? 0,
            pendingTickets: ticketsByStatus.PENDING ?? 0,
        };

        return { summary, models: modelStats };
    };
}

export default DashboardRepository;
