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
}

export default PaymentController