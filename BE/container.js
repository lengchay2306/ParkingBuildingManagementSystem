import { createContainer, asClass, asValue, Lifetime } from "awilix";

//import Controllers
import AuthController from "./src/api/controllers/auth.controller.js";
import ParkingController from "./src/api/controllers/parking.controller.js";
import ReservationController from "./src/api/controllers/reservation.controller.js";
import UserController from "./src/api/controllers/user.controller.js";
import VehicleController from "./src/api/controllers/vehicle.controller.js";
import PaymentController from "./src/api/controllers/payment.controller.js";
import ChatbotController from "./src/api/controllers/chatbot.controller.js";
import PricePolicyController from "./src/api/controllers/pricePolicy.controller.js";
import FloorController from "./src/api/controllers/floor.controller.js";
import ParkingSlotController from "./src/api/controllers/parkingSlot.controller.js";
import ParkingSessionController from "./src/api/controllers/parkingSession.controller.js";
import DashboardController from "./src/api/controllers/dashboard.controller.js";

//import Services
import AuthService from "./src/services/auth.service.js";
import HashService from "./src/services/hash.service.js";
import TokenService from "./src/services/token.service.js";
import ParkingService from "./src/services/parking.service.js";
import ReservationService from "./src/services/reservation.service.js";
import SlotRecommendationService from "./src/services/slotRecommendation.service.js";
import UserService from "./src/services/user.service.js";
import VehicleService from "./src/services/vehicle.service.js";
import PaymentService from "./src/services/payment.service.js";
import ChatbotService from "./src/services/chatbot.service.js";
import PricePolicyService from "./src/services/pricePolicy.service.js";
import FloorService from "./src/services/floor.service.js";
import ParkingSlotService from "./src/services/parkingSlot.service.js";
import ParkingSessionService from "./src/services/parkingSession.service.js";
import DashboardService from "./src/services/dashboard.service.js";

//import Repositories
import UserRepository from "./src/repositories/user.repository.js";
import RefreshTokenRepository from "./src/repositories/refreshToken.repository.js";
import RoleRepository from "./src/repositories/role.repository.js";
import ParkingRepository from "./src/repositories/parking.repository.js";
import ReservationRepository from "./src/repositories/reservation.repository.js";
import VehicleRepository from "./src/repositories/vehicle.repository.js";
import PricePolicyRepository from "./src/repositories/pricePolicy.repository.js";
import PaymentRepository from "./src/repositories/payment.repository.js";
import MonthlyCardRepository from "./src/repositories/monthlyCard.repository.js";
import ChatSessionRepository from "./src/repositories/chatSession.repository.js";
import FloorRepository from "./src/repositories/floor.repository.js";
import ParkingSlotRepository from "./src/repositories/parkingSlot.repository.js";
import ParkingSessionRepository from "./src/repositories/parkingSession.repository.js";
import DashboardRepository from "./src/repositories/dashboard.repository.js";
import PasswordResetTokenRepository from "./src/repositories/passwordResetToken.repository.js";

//3rd party
import redisClient from "./src/utils/redisClient.js";
import payosGateway from "./src/utils/payosGateway.js";
import sendgridClient from "./src/utils/sendgridClient.js";

const container = createContainer();

export function setupContainer({ io, notificationNamespace }) {
    container.register({
        io: asValue(io),
        notificationNamespace: asValue(notificationNamespace, {
            lifetime: Lifetime.SINGLETON,
        }),
        //3rd party
        redis: asValue(redisClient, {
            lifetime: Lifetime.SINGLETON,
        }),
        payosGateway: asValue(payosGateway, {
            lifetime: Lifetime.SINGLETON,
        }),
        sendgridClient: asValue(sendgridClient, {
            lifetime: Lifetime.SINGLETON,
        }),
        passwordResetTokenRepository: asClass(PasswordResetTokenRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        //controllers
        authController: asClass(AuthController, {
            lifetime: Lifetime.SCOPED,
        }),
        parkingController: asClass(ParkingController, {
            lifetime: Lifetime.SCOPED,
        }),
        reservationController: asClass(ReservationController, {
            lifetime: Lifetime.SCOPED,
        }),
        userController: asClass(UserController, {
            lifetime: Lifetime.SCOPED,
        }),
        vehicleController: asClass(VehicleController, {
            lifetime: Lifetime.SCOPED,
        }),
        paymentController: asClass(PaymentController, {
            lifetime: Lifetime.SCOPED,
        }),
        chatbotController: asClass(ChatbotController, {
            lifetime: Lifetime.SCOPED,
        }),
        pricePolicyController: asClass(PricePolicyController, {
            lifetime: Lifetime.SCOPED,
        }),
        floorController: asClass(FloorController, {
            lifetime: Lifetime.SCOPED,
        }),
        parkingSlotController: asClass(ParkingSlotController, {
            lifetime: Lifetime.SCOPED,
        }),
        parkingSessionController: asClass(ParkingSessionController, {
            lifetime: Lifetime.SCOPED,
        }),
        dashboardController: asClass(DashboardController, {
            lifetime: Lifetime.SCOPED,
        }),

        //services
        authService: asClass(AuthService, {
            lifetime: Lifetime.SCOPED,
        }),
        hashService: asClass(HashService, {
            lifetime: Lifetime.SCOPED,
        }),
        tokenService: asClass(TokenService, {
            lifetime: Lifetime.SCOPED,
        }),
        parkingService: asClass(ParkingService, {
            lifetime: Lifetime.SCOPED,
        }),
        reservationService: asClass(ReservationService, {
            lifetime: Lifetime.SCOPED,
        }),
        slotRecommendationService: asClass(SlotRecommendationService, {
            lifetime: Lifetime.SCOPED,
        }),
        userService: asClass(UserService, {
            lifetime: Lifetime.SCOPED,
        }),
        vehicleService: asClass(VehicleService, {
            lifetime: Lifetime.SCOPED,
        }),
        paymentService: asClass(PaymentService, {
            lifetime: Lifetime.SCOPED,
        }),
        chatbotService: asClass(ChatbotService, {
            lifetime: Lifetime.SCOPED,
        }),
        pricePolicyService: asClass(PricePolicyService, {
            lifetime: Lifetime.SCOPED,
        }),
        floorService: asClass(FloorService, {
            lifetime: Lifetime.SCOPED,
        }),
        parkingSlotService: asClass(ParkingSlotService, {
            lifetime: Lifetime.SCOPED,
        }),
        parkingSessionService: asClass(ParkingSessionService, {
            lifetime: Lifetime.SCOPED,
        }),
        dashboardService: asClass(DashboardService, {
            lifetime: Lifetime.SCOPED,
        }),

        //repositories
        userRepository: asClass(UserRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        refreshTokenRepository: asClass(RefreshTokenRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        roleRepository: asClass(RoleRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        parkingRepository: asClass(ParkingRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        reservationRepository: asClass(ReservationRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        vehicleRepository: asClass(VehicleRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        pricePolicyRepository: asClass(PricePolicyRepository, {
            lifetime: Lifetime.SCOPED
        }),
        paymentRepository: asClass(PaymentRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        monthlyCardRepository: asClass(MonthlyCardRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        chatSessionRepository: asClass(ChatSessionRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        floorRepository: asClass(FloorRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        parkingSlotRepository: asClass(ParkingSlotRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        parkingSessionRepository: asClass(ParkingSessionRepository, {
            lifetime: Lifetime.SCOPED,
        }),
        dashboardRepository: asClass(DashboardRepository, {
            lifetime: Lifetime.SCOPED,
        }),
    })
}

export default container