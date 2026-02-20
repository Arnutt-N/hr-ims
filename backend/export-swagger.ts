import fs from 'fs';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'HR-IMS API Documentation',
            version: '1.0.0',
            description: 'API Documentation for HR-IMS',
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
                // Common types omitted for brevity, openapi-typescript might need these fully defined
                // But we will pull exactly what's currently in swagger.ts
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
    },
    apis: [path.join(__dirname, 'src/routes/*.ts')],
};

const specs = swaggerJsdoc(options);

const outPath = path.join(__dirname, 'openapi.json');
fs.writeFileSync(outPath, JSON.stringify(specs, null, 2));

console.log('OpenAPI spec generated at', outPath);
