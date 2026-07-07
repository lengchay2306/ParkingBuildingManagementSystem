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

        return updatedPayment.toObject()
    }
}

export default PaymentRepository