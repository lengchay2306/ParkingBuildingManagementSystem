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
            next(error)
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

    cancelPayment = async (req, res, next) => {
        try {
            const { paymentId } = req.params

            const updatedPayment = await this.#paymentService.cancelPayment({
                paymentId,
            })

            res.status(200).json({
                status: 'success',
                data: { updatedPayment },
                message: 'Payment cancelled successfully',
            })
        } catch (error) {
            next(error);
        }
    }

    getAllPayments = async (req, res, next) => {
        try {
            const {
                page,
                limit,
                status,
                paymentMethod,
                orderCode,
                vehicleId,
                parkingSessionId,
                licensePlate,
                sortBy,
                sortOrder,
            } = req.query;

            const result = await this.#paymentService.getAllPayments({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                status,
                paymentMethod,
                orderCode,
                vehicleId,
                parkingSessionId,
                licensePlate,
                sortBy: sortBy || 'createdAt',
                sortOrder: sortOrder === 'asc' || Number(sortOrder) === 1 ? 1 : -1,
            });

            res.status(200).json({
                status: 'success',
                data: {
                    payments: result.payments,
                    pagination: result.pagination,
                },
                message: 'Payments fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    getPaymentsByLicensePlate = async (req, res, next) => {
        try {
            const { licensePlate } = req.params;
            const {
                page,
                limit,
                status,
                paymentMethod,
                sortBy,
                sortOrder,
            } = req.query;

            const result = await this.#paymentService.getPaymentsByLicensePlate({
                licensePlate,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                status,
                paymentMethod,
                sortBy: sortBy || 'createdAt',
                sortOrder: sortOrder === 'asc' || Number(sortOrder) === 1 ? 1 : -1,
            });

            res.status(200).json({
                status: 'success',
                data: {
                    licensePlate: result.licensePlate,
                    vehicle: result.vehicle,
                    payments: result.payments,
                    pagination: result.pagination,
                },
                message: 'Payments fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    getPaymentById = async (req, res, next) => {
        try {
            const { paymentId } = req.params;

            const payment = await this.#paymentService.getPaymentById({
                paymentId,
            });

            res.status(200).json({
                status: 'success',
                data: { payment },
                message: 'Payment fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    deletePayment = async (req, res, next) => {
        try {
            const { paymentId } = req.params

            const deletedPayment = await this.#paymentService.deletePayment({
                paymentId,
            })

            res.status(200).json({
                status: 'success',
                data: { deletedPayment },
                message: 'Payment deleted successfully',
            })
        } catch (error) {
            next(error);
        }
    }
}

export default PaymentController;
