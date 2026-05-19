import Role from "../models/Role.js"

class RoleRepository {
    findRoleByName = async ({
        roleName,
    }) => {
        const existingRole = await Role.findOne({ roleName })
                                        .lean();
        if (!existingRole) {
            return null
        }

        return existingRole;
    }
}

export default RoleRepository