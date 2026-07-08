import { configDotenv } from "dotenv"
import { BadRequestError } from "../error/error.js"
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
        const verifiedData = this.#payosGateway.webhooks.verify(webhookBody);

        if (!verifiedData) {
            throw new BadRequestError(`Invalid webhook signature`)
        };

        const { orderCode } = verifiedData

        const existingPayment = await this.#paymentRepository.findPaymentByField({
                orderCode: orderCode
        })

        if (!existingPayment) {
            throw new BadRequestError(`Cannot find payment through this orderCode!`)
        }

        if (existingPayment.status === 'PAID') {
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

        const paymentLink = await this.#payosGateway.createPaymentLink(paymentBody)

        if (!checkoutUrl) {
            throw new BadRequestError(`Cannot request to PayOS`)
        }

        return paymentLink.checkoutUrl;
    }
}

export default PaymentService;  