class PaymentController {
    #paymentService
    constructor({
        paymentService,
    }) {
        this.#paymentService = paymentService
    }

    getAllPricePolicies = async (req, res, next) => {
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