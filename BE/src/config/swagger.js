import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Parking Building Management System API',
            version: '1.0.0',
            description: 'API documentation for the backend system',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 3000}`,
                description: 'Local development',
            },
            ...(process.env.BACKEND_URL ? [{
                url: process.env.BACKEND_URL,
                description: 'Production server',
            }] : []),
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your access token (obtained from /api/v1/auth/login)',
                },
            },
        },
        security: [
            { bearerAuth: [] },
        ],
    },
    apis: ['./src/api/routers/*.js'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export function setupSwagger(app) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
