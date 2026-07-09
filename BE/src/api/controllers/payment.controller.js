class PaymentController {
    #paymentService
    constructor({
        paymentService,
    }) {
        this.#paymentService = paymentService
    }

    checkPayment = async (req, res, next) => {
        try {
            const { orderCode } = req.body

            const { userId } = req.user

            await this.#paymentService.checkPayment({
                orderCode,
                staffId: userId
            })

            return res.status(200).json({
                status: 'success',
                data: {
                    message: "PAYMENT SUCCESSFULLY"
                }
            })
        } catch (error) {
            next(error)
        }
    }

    getAllPricePolicies = async (req, res, next) => {
        try {
            const { page, limit, vehicleTypeId } = req.query
    
            const { pricePolicies, pagination } = await this.#paymentService.getAllPricePolicies({
                page,
                limit,
                vehicleTypeId,
            })
    
            res.status(200).json({
                status: 'success',
                data: {
                    pricePolicies,
                    pagination
                }
            })
        } catch (error) {
            
        }
    }

    handlePayOSWebhook = async (req, res, next) => {
        try {
            await this.#paymentService.handlePayOSWebhook(req.body)

            res.status(200).json({
                status: 'success'
            })
        } catch (error) {
            next(error)
        }
    }

    qrPayment = async (req, res, next) => {
        try {
            const { parkingSessionId } = req.body

            const {
                orderCode,
                amount,
                totalHours,
                qrCode,
            } = await this.#paymentService.qrPayment({
                parkingSessionId,
            })

            res.status(200).json({
                status: 'success',
                data: {
                    orderCode,
                    amount,
                    totalHours,
                    qrCode,
                }
            })
        } catch (error) {
            next(error)
        }
    }

    subscriptionPayment = async (req, res, next) => {
        try {
            const { userId } = req.user

            const { vehicleId } = req.body

            const checkoutUrl = await this.#paymentService.subscriptionPayment({
                userId,
                vehicleId
            })

            res.status(201).json({
                status: 'success',
                data: {
                    checkoutUrl,
                }
            })
        } catch (error) {
            next(error)
        }
    }
}

export default PaymentController