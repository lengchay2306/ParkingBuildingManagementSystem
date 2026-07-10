import Payment from "../models/Payment.js"

class PaymentRepository {
    savePayment = async ({
        paymentData,
    }) => {
        const newPayment = await Payment.create(
            paymentData,
        )

        return newPayment.toObject();
    }

    findPaymentByField = async (filter) => {
        const existingPayment = await Payment.findOne(filter)
                                            .lean();
        
        return existingPayment
    }

    updatePayment = async ({
        field,
        updateData,
    }) => {
        const updatedPayment = await Payment.findOneAndUpdate(
            field,
            {
                $set: updateData,
            },
            { returnDocument: 'after' } 
        )

        return updatedPayment ? updatedPayment.toObject() : null
    }

    cancelPayment = async ({
        paymentId,
    }) => {
        const updatedPayment = await Payment.findOneAndUpdate(
            { _id: paymentId },
            {
                $set: {
                    status: "CANCELLED",
                },
            },
            { returnDocument: 'after' }
        )
        return updatedPayment ? updatedPayment.toObject() : null
    }

    findPaymentById = async ({
        paymentId,
    }) => {
        return Payment.findById(paymentId).lean()
    }

    findPaymentDetailById = async ({
        paymentId,
    }) => {
        return Payment.findById(paymentId)
            .populate({
                path: 'vehicleId',
                populate: { path: 'vehicleTypeId' },
            })
            .populate({
                path: 'parkingSessionId',
                populate: [
                    {
                        path: 'vehicleId',
                        populate: { path: 'vehicleTypeId' },
                    },
                    { path: 'parkingSlotId', populate: { path: 'floorId' } },
                    { path: 'checkInUserId', select: '-password' },
                    { path: 'checkOutUserId', select: '-password' },
                    { path: 'checkInStaffId', select: '-password' },
                    { path: 'checkOutStaffId', select: '-password' },
                ],
            })
            .lean()
    }

    getAllPayments = async ({
        filter = {},
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = -1,
    }) => {
        const skip = (page - 1) * limit;

        const [payments, totalCount] = await Promise.all([
            Payment.find(filter)
                .populate({
                    path: 'vehicleId',
                    populate: { path: 'vehicleTypeId' },
                })
                .populate({
                    path: 'parkingSessionId',
                    populate: [
                        {
                            path: 'vehicleId',
                            populate: { path: 'vehicleTypeId' },
                        },
                        { path: 'checkInUserId', select: '-password' },
                        { path: 'checkOutUserId', select: '-password' },
                    ],
                })
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean(),
            Payment.countDocuments(filter),
        ]);

        return {
            payments,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    }

    deletePayment = async ({
        paymentId,
    }) => {
        const deletedPayment = await Payment.findByIdAndDelete(paymentId)
        return deletedPayment ? deletedPayment.toObject() : null
    }
}

export default PaymentRepository
