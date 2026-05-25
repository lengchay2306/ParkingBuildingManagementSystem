import { createContainer, asClass, asValue, Lifetime } from "awilix";

//import Controllers
import AuthController from "./src/api/controllers/auth.controller.js";
import ParkingController from "./src/api/controllers/parking.controller.js";
import ReservationController from "./src/api/controllers/reservation.controller.js";

//import Services
import AuthService from "./src/services/auth.service.js";
import HashService from "./src/services/hash.service.js";
import TokenService from "./src/services/token.service.js";
import ParkingService from "./src/services/parking.service.js";
import ReservationService from "./src/services/reservation.service.js";

//import Repositories
import UserRepository from "./src/repositories/user.repository.js";
import RefreshTokenRepository from "./src/repositories/refreshToken.repository.js";
import RoleRepository from "./src/repositories/role.repository.js";
import ParkingRepository from "./src/repositories/parking.repository.js";
import ReservationRepository from "./src/repositories/reservation.repository.js";

//3rd party
import redisClient from "./src/utils/redisClient.js";

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
    })
}

export default container