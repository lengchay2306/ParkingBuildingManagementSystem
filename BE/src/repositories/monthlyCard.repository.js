import MonthlyCard from "../models/MonthlyCard.js";

class MonthlyCardRepository {
    createNewMonthlyCard = async ({
        monthlyCardData
    }) => {
        const newMonthlyCard = await MonthlyCard.create(monthlyCardData)

        return newMonthlyCard.toObject();
    }
}

export default MonthlyCardRepository;