import { createContainer, asClass, asValue, Lifetime } from "awilix";

//import Controllers


//import Services

//import Repositories

//3rd party

const container = createContainer();

export function setupContainer({ io, notificationNamespace }) {
    container.register({
        io: asValue(io),
        notificationNamespace: asValue(notificationNamespace, {
            lifetime: Lifetime.SINGLETON,
        })
        //3rd party

        //controllers

        //services

        //repositories
    })
}

export default container