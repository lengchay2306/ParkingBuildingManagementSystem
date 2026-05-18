import mongoose from "mongoose";

const roleSchema = mongoose.Schema({
    roleName: {
        type: String,
        required: true,
        enum: ["CUSTOMER", "MANAGER", "ADMIN", "STAFF"]
    }
})

const Role = mongoose.model('Role', roleSchema)
export default Role