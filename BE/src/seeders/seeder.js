import mongoose from "mongoose";
import dotenv from "dotenv";
import configDB from "../config/configDB.js";
import Role from "../models/Role.js";
import User from "../models/User.js";
import HashService from "../services/hash.service.js";

dotenv.config();

const seedData = async () => {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(configDB.uri);
        console.log("Connected to MongoDB successfully!");

        console.log("Clearing existing data...");
        await Role.deleteMany();
        await User.deleteMany();

        console.log("Seeding Roles...");
        const rolesData = [
            { roleName: "ADMIN" },
            { roleName: "MANAGER" },
            { roleName: "STAFF" },
            { roleName: "CUSTOMER" }
        ];

        const createdRoles = await Role.insertMany(rolesData);
        console.log(`Created ${createdRoles.length} roles.`);

        console.log("Seeding Users...");
        const hashService = new HashService();
        const hashedPassword = await hashService.hash({ string: "12345678" });

        const usersData = [
            {
                email: "admin@example.com",
                password: hashedPassword,
                fullName: "Admin User",
                phone: "0123456780",
                roleId: createdRoles.find(r => r.roleName === "ADMIN")._id,
                status: "ACTIVE",
            },
            {
                email: "manager@example.com",
                password: hashedPassword,
                fullName: "Manager User",
                phone: "0123456781",
                roleId: createdRoles.find(r => r.roleName === "MANAGER")._id,
                status: "ACTIVE",
            },
            {
                email: "staff@example.com",
                password: hashedPassword,
                fullName: "Staff User",
                phone: "0123456782",
                roleId: createdRoles.find(r => r.roleName === "STAFF")._id,
                status: "ACTIVE",
            },
            {
                email: "customer@example.com",
                password: hashedPassword,
                fullName: "Customer User",
                phone: "0123456783",
                roleId: createdRoles.find(r => r.roleName === "CUSTOMER")._id,
                status: "ACTIVE",
            },
            {
                email: "customer2@example.com",
                password: hashedPassword,
                fullName: "Customer User",
                phone: "0123456782",
                roleId: createdRoles.find(r => r.roleName === "CUSTOMER")._id,
                status: "LOCKED",
            }
        ];

        const createdUsers = await User.insertMany(usersData);
        console.log(`Created ${createdUsers.length} users.`);

        console.log("Seed complete! Exiting...");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    }
};

seedData();