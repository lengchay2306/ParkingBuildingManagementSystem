import { configDotenv } from "dotenv"
import { BadRequestError, NotFoundError } from "../error/error.js"
import { calculatedParkingFee } from "../utils/calculateFunction.js";
configDotenv();

const RETURN_URL = process.env.FE_RETURN_URL;
const CANCEL_URL = process.env.FE_CANCEL_URL

class PaymentService {
    #pricePolicyRepository
    #userRepository
    #vehicleRepository
    #paymentRepository
    #payosGateway
    #parkingRepository
    #monthlyCardRepository
    constructor({
        pricePolicyRepository,
        userRepository,
        vehicleRepository,
        paymentRepository,
        payosGateway,
        parkingRepository,
        monthlyCardRepository,
    }) {
        this.#pricePolicyRepository = pricePolicyRepository;
        this.#userRepository = userRepository;
        this.#vehicleRepository = vehicleRepository;
        this.#paymentRepository = paymentRepository;
        this.#payosGateway = payosGateway;
        this.#parkingRepository = parkingRepository;
        this.#monthlyCardRepository = monthlyCardRepository
    }

    checkPayment = async ({
        orderCode,
        staffId,
    }) => {
        const paymentInfo = await this.#payosGateway.paymentRequests.get(orderCode);

        if (!paymentInfo) {
            throw new BadRequestError(`This payment doesn't exist! Please provide another existed orderCode`)
        }

        if (paymentInfo.status !== "PAID") {
            throw new BadRequestError(`Custom bill hasn't been paid yet!`)
        }

        const existingPayment = await this.#paymentRepository.findPaymentByField({
            orderCode: orderCode,
        })

        if (!existingPayment) {
            throw new BadRequestError(`Cannot find this payment through this orderCode in db`)
        }

        if (!existingPayment.parkingSessionId) {
            throw new BadRequestError(`This orderCode is not a parking checkout payment`)
        }

        if (existingPayment.status === 'PAID') {
            return;
        }

        const updatePayment = await this.#paymentRepository.updatePayment({
            field: { _id: existingPayment._id },
            updateData: {
                status: 'PAID'
            }
        })

        if (!updatePayment) {
            throw new BadRequestError(`Cannot update this payment status to PAID`)
        }

        const existingParkingSession = await this.#parkingRepository.findParkingSession({
            _id: existingPayment.parkingSessionId,
        })

        if (!existingParkingSession) {
            throw new BadRequestError(`Cannot find parking session of this payment!`)
        }

        if (existingParkingSession.status === 'COMPLETED') {
            return;
        }

        const updatedParkingSession = await this.#parkingRepository.updateParkingSession({
            field: { _id: existingParkingSession._id },
            updateData: {
                checkOutStaffId: staffId,
                checkOutTime: Date.now(),
                status: 'COMPLETED',
            }
        })

        if (!updatedParkingSession) {
            throw new BadRequestError(`Cannot set as complete this parking session`)
        }

        const slotId = existingParkingSession.parkingSlotId?._id
            ?? existingParkingSession.parkingSlotId

        const existingParkingSlot = await this.#parkingRepository.findParkingSlot({
            _id: slotId,
        })

        if (!existingParkingSlot) {
            throw new BadRequestError(`Cannot find parking slot of this parking session!`)
        }

        if (existingParkingSlot.status === "AVAILABLE") {
            return;
        }

        const updatedParkingSlot = await this.#parkingRepository.updateParkingSlot({
            field: { _id: existingParkingSlot._id },
            updateData: {
                status: 'AVAILABLE'
            }
        })

        if (!updatedParkingSlot) {
            throw new BadRequestError(`Cannot set as available for this parking slot`)
        }
    }

    getAllPricePolicies = async ({
        page,
        limit,
        vehicleTypeId,
    }) => {
        const { 
            pricePolicies, 
            pagination 
        } = await this.#pricePolicyRepository.findAllPricePolicies({
            page,
            limit,
            vehicleTypeId,
        })

        if (!pricePolicies || pricePolicies.length === 0) {
            throw new BadRequestError(`There are not containing any price policies`)
        }

        return {
            pricePolicies,
            pagination
        }
    }

    handlePayOSWebhook = async (webhookBody) => {
        const verifiedData = await this.#payosGateway.webhooks.verify(webhookBody);

        if (!verifiedData) {
            // throw new BadRequestError(`Invalid webhook signature`)
            console.log(`invalid webhook signature! Griefers detected!`);
            return;
        };

        const { orderCode } = verifiedData

        const existingPayment = await this.#paymentRepository.findPaymentByField({
                orderCode: orderCode
        })

        if (!existingPayment) {
            // throw new BadRequestError(`Cannot find payment through this orderCode!`)
            console.log(`Cannot find existing payment from this orderCode!`);
            return;
        }

        if (existingPayment.status === 'PAID' || existingPayment.parkingSessionId) {
            return true
        }

        await this.#paymentRepository.updatePayment({
            field: { _id: existingPayment._id },
            updateData: {
                status: 'PAID'
            }
        })

        try {
            const startDate = new Date()
            const endDate = new Date()

            endDate.setMonth(startDate.getMonth() + 1)

            const existingVehicle = await this.#vehicleRepository.getVehicleById({
                vehicleId: existingPayment.vehicleId
            })

            if (!existingVehicle) {
                console.error(`Fulfillment failed: vehicle not found, existingPaymentId: ${existingPayment._id}`);
                return;
            }

            const vehicleTypeId = existingVehicle.vehicleTypeId?._id 
                                ?? existingVehicle.vehicleTypeId

            const pricePolicy = await this.#pricePolicyRepository.findMonthlyPriceByVehicleType({
                vehicleTypeId: vehicleTypeId,
            })
            
            if (!pricePolicy) {
                console.error(`Fulfillment failed: pricePolicy not found, existingPaymentId: ${existingPayment._id}`);
                return;
            }

            const newMonthlyCard = await this.#monthlyCardRepository.createNewMonthlyCard({
                monthlyCardData: {
                    startDate: startDate,
                    endDate: endDate,
                    status: "ACTIVE",
                    pricePolicyId: pricePolicy._id,
                }
            })

            if (!newMonthlyCard) {
                console.error(`Fulfillment failed: cannot create monthlyCard, existingPaymentId: ${existingPayment._id}`);
                return;
            }
            
            const updatedVehicle = await this.#vehicleRepository.updateVehicle({
                vehicleId: existingVehicle._id,
                updateData: {
                    monthlyCardId: newMonthlyCard._id
                }
            })  
            
            if (!updatedVehicle) {
                console.error(`Fulfillment failed: cannot attach monthlyCard to vehicle, existingPaymentId: ${existingPayment._id}`);
                return;
            }
        } catch (error) {
            console.error(`Fulfillment error: ${error}, ${existingPayment._id}`);
        }
    }

    qrPayment = async ({
        parkingSessionId,
    }) => {
        const existingParkingSession = await this.#parkingRepository.findParkingSession({
            _id: parkingSessionId,
        })

        if (!existingParkingSession) {
            throw new BadRequestError(`This parking session doesn't exist!`)
        }

        if (existingParkingSession.sessionType === 'MONTH') {
            throw new BadRequestError(`This vehicle has a monthly card!`)
        }

        const existingPending = await this.#paymentRepository.findPaymentByField({
            parkingSessionId: parkingSessionId,
            status: 'PENDING'
        })

        if (existingPending) {
            throw new BadRequestError(`This payment has been created already!`)
        }

        const vehicleTypeId = existingParkingSession.vehicleId?.vehicleTypeId

        const pricePolicies = await this.#pricePolicyRepository.findHourlyPricePoliciesByVehicleType({
            vehicleTypeId,
        })

        if (pricePolicies?.length === 0) {
            throw new BadRequestError(`No price policy for this vehicle type`)
        }

        const checkOutTime = new Date();

        const { totalHours, calculatedFee } = calculatedParkingFee({
            checkInTime: existingParkingSession.checkInTime,
            checkOutTime,
            pricePolicies,
        })

        if (calculatedFee < 2000) {
            throw new BadRequestError(`totalFee must be above 2000`)
        }

        const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(100 + Math.random() * 900))

        await this.#paymentRepository.savePayment({
            paymentData: {
                parkingSessionId: parkingSessionId,
                amount: calculatedFee,
                paymentMethod: 'TRANSFER',
                status: 'PENDING',
                orderCode,
            }
        })


        const paymentLink = await this.#payosGateway.paymentRequests.create({
            orderCode,
            amount: calculatedFee,
            description: `CHECK_OUT_${orderCode}`,
            returnUrl: RETURN_URL,
            cancelUrl : CANCEL_URL,
        });

        return {
            orderCode,
            amount: calculatedFee,
            totalHours,
            qrCode: paymentLink.qrCode
        }
    }

    subscriptionPayment = async ({
        userId,
        vehicleId,
    }) => {
        const existingUser = await this.#userRepository.findByUserId({
            userId,
        })

        if (!existingUser) {
            throw new BadRequestError(`This user doesn't exist!`)
        }

        const existingVehicle = await this.#vehicleRepository.getVehicleById({
            vehicleId,
        })

        if (!existingVehicle) {
            throw new BadRequestError(`This car doesn't exist in system!`)
        }

        if (String(existingUser._id) !== String(existingVehicle.userId)) {
            throw new BadRequestError(`This vehicle doesn't belong to this user!`)
        }

        const thisVehiclePricePolicy = await this.#pricePolicyRepository.findMonthlyPriceByVehicleType({
            vehicleTypeId: existingVehicle.vehicleTypeId
        })

        if (!thisVehiclePricePolicy) {
            throw new BadRequestError(`This vehicle type doesnt't have price policy yet`)
        }

        const amount = thisVehiclePricePolicy.monthlyRate
        const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(100 + Math.random() * 900))

        const paymentBody = {
            orderCode,
            amount,
            description: `SUBSCRIPTION_${orderCode}`,
            returnUrl: RETURN_URL,
            cancelUrl: CANCEL_URL,
        }

        const newPayment = await this.#paymentRepository.savePayment({
            paymentData: {
                vehicleId: vehicleId,
                amount: amount,
                paymentMethod: 'CARD',
                status: 'PENDING',
                orderCode: orderCode,
            }
        })

        if (!newPayment) {
            throw new BadRequestError(`Cannot save payment information`)
        }

        const paymentLink = await this.#payosGateway.paymentRequests.create(paymentBody)

        if (!paymentLink) {
            throw new BadRequestError(`Cannot request to PayOS`)
        }

        return paymentLink.checkoutUrl;
    }

    cancelPayment = async ({
        paymentId
    }) => {
        const existingPayment = await this.#paymentRepository.findPaymentById({
            paymentId,
        })

        if (!existingPayment) {
            throw new NotFoundError(`This payment doesn't exist!`)
        }

        if (existingPayment.status === 'CANCELLED' || existingPayment.status === 'PAID') {
            throw new BadRequestError(`This payment has been cancelled or paid!`)
        }

        const updatedPayment = await this.#paymentRepository.cancelPayment({
            paymentId,
        })

        if (!updatedPayment) {
            throw new BadRequestError(`Cannot cancel this payment`)
        }
        return updatedPayment;
    }

    getAllPayments = async ({
        page = 1,
        limit = 10,
        status,
        paymentMethod,
        orderCode,
        vehicleId,
        parkingSessionId,
        licensePlate,
        sortBy = 'createdAt',
        sortOrder = -1,
    }) => {
        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (paymentMethod) {
            filter.paymentMethod = paymentMethod;
        }

        if (orderCode !== undefined && orderCode !== null && orderCode !== '') {
            filter.orderCode = Number(orderCode);
        }

        if (vehicleId) {
            filter.vehicleId = vehicleId;
        }

        if (parkingSessionId) {
            filter.parkingSessionId = parkingSessionId;
        }

        if (licensePlate) {
            const normalizedLicensePlate = licensePlate.trim().replace(/\s+/g, ' ').toUpperCase();

            const [vehicle, sessions] = await Promise.all([
                this.#vehicleRepository.getVehicleByLicensePlate({
                    licensePlate: normalizedLicensePlate,
                }),
                this.#parkingRepository.findAllParkingSessionByField({
                    licensePlate: normalizedLicensePlate,
                }),
            ]);

            const orConditions = [];

            if (vehicle?._id) {
                orConditions.push({ vehicleId: vehicle._id });
            }

            if (sessions.length > 0) {
                orConditions.push({
                    parkingSessionId: { $in: sessions.map((session) => session._id) },
                });
            }

            if (orConditions.length === 0) {
                return {
                    payments: [],
                    pagination: {
                        page,
                        limit,
                        totalCount: 0,
                        totalPages: 0,
                    },
                };
            }

            filter.$or = orConditions;
        }

        return this.#paymentRepository.getAllPayments({
            filter,
            page,
            limit,
            sortBy,
            sortOrder,
        });
    }

    getPaymentsByLicensePlate = async ({
        licensePlate,
        page = 1,
        limit = 10,
        status,
        paymentMethod,
        sortBy = 'createdAt',
        sortOrder = -1,
    }) => {
        const normalizedLicensePlate = licensePlate.trim().replace(/\s+/g, ' ').toUpperCase();

        const vehicle = await this.#vehicleRepository.getVehicleByLicensePlate({
            licensePlate: normalizedLicensePlate,
        });

        const sessionQueries = [
            this.#parkingRepository.findAllParkingSessionByField({
                licensePlate: normalizedLicensePlate,
            }),
        ];

        if (vehicle?._id) {
            sessionQueries.push(
                this.#parkingRepository.findAllParkingSessionByField({
                    vehicleId: vehicle._id,
                }),
            );
        }

        const sessionResults = await Promise.all(sessionQueries);
        const sessionIdSet = new Set();
        for (const sessions of sessionResults) {
            for (const session of sessions) {
                sessionIdSet.add(String(session._id));
            }
        }
        const sessionIds = [...sessionIdSet];

        if (!vehicle && sessionIds.length === 0) {
            throw new NotFoundError('Vehicle or parking sessions not found for this license plate');
        }

        const orConditions = [];

        if (vehicle?._id) {
            orConditions.push({ vehicleId: vehicle._id });
        }

        if (sessionIds.length > 0) {
            orConditions.push({
                parkingSessionId: { $in: sessionIds },
            });
        }

        const filter = { $or: orConditions };

        if (status) {
            filter.status = status;
        }

        if (paymentMethod) {
            filter.paymentMethod = paymentMethod;
        }

        const result = await this.#paymentRepository.getAllPayments({
            filter,
            page,
            limit,
            sortBy,
            sortOrder,
        });

        return {
            licensePlate: normalizedLicensePlate,
            vehicle: vehicle ?? null,
            payments: result.payments,
            pagination: result.pagination,
        };
    }

    getPaymentById = async ({
        paymentId,
    }) => {
        const payment = await this.#paymentRepository.findPaymentDetailById({
            paymentId,
        });

        if (!payment) {
            throw new NotFoundError(`This payment doesn't exist!`);
        }

        return payment;
    }

    deletePayment = async ({
        paymentId
    }) => {
        const existingPayment = await this.#paymentRepository.findPaymentById({ paymentId });
        if (!existingPayment) {
            throw new NotFoundError(`This payment doesn't exist!`)
        }
        // Only PAID or CANCELLED payments can be hard-deleted
        if (existingPayment.status !== 'PAID' && existingPayment.status !== 'CANCELLED') {
            throw new BadRequestError(`Only PAID or CANCELLED payments can be deleted!`)
        }
        const deletedPayment = await this.#paymentRepository.deletePayment({ paymentId });
        if (!deletedPayment) {
            throw new BadRequestError(`Cannot delete this payment`)
        }
        return deletedPayment;
    }
};

export default PaymentService;