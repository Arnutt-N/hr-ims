import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'HR-IMS API Documentation',
            version: '1.0.0',
            description: 'API Documentation for HR-IMS (Human Resource & Inventory Management System)',
            contact: {
                name: 'Support',
                email: 'support@hr-ims.local',
            },
        },
        servers: [
            {
                url: 'http://localhost:3001/api',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        role: { type: 'string' },
                        department: { type: 'string' },
                        status: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                InventoryItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        category: { type: 'string' },
                        type: { type: 'string', enum: ['durable', 'consumable'] },
                        serial: { type: 'string' },
                        status: { type: 'string' },
                        stock: { type: 'integer' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Request: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        userId: { type: 'integer' },
                        status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
                        type: { type: 'string', enum: ['withdraw', 'borrow', 'return'] },
                        date: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Settings: {
                    type: 'object',
                    properties: {
                        orgName: { type: 'string' },
                        borrowLimit: { type: 'integer' },
                        checkInterval: { type: 'integer' },
                        maintenanceAlert: { type: 'boolean' },
                        allowRegistration: { type: 'boolean' },
                        rateLimitEnabled: { type: 'boolean' },
                        loggingEnabled: { type: 'boolean' },
                        backupEnabled: { type: 'boolean' },
                        passwordPolicyEnabled: { type: 'boolean' },
                        cachingEnabled: { type: 'boolean' },
                        emailVerificationEnabled: { type: 'boolean' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Users', description: 'User management' },
            { name: 'Inventory', description: 'Inventory items management' },
            { name: 'Requests', description: 'Borrow/withdrawal requests' },
            { name: 'Settings', description: 'System settings' },
            { name: 'Email', description: 'Email verification and notifications' },
            { name: 'Health', description: 'System health checks' },
        ],
    },
    apis: ['./src/routes/*.ts'], // Path to the API routes
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
    // Swagger UI
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'HR-IMS API Documentation',
    }));

    // Swagger JSON
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });

    console.log('📚 API Documentation available at: http://localhost:3001/api-docs');
}

export default setupSwagger;
