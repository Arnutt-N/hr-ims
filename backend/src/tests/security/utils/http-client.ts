/**
 * Security Testing HTTP Client
 * Enterprise-level HTTP client for penetration testing
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import securityConfig, { TestUser, Severity } from '../config';

// ============================================
// Types
// ============================================

export interface SecurityTestResult {
    testName: string;
    category: string;
    severity: Severity;
    passed: boolean;
    message: string;
    details?: {
        request?: {
            method: string;
            url: string;
            headers?: Record<string, string>;
            body?: any;
        };
        response?: {
            status: number;
            headers?: Record<string, string>;
            body?: any;
            time?: number;
        };
        payload?: string;
        evidence?: string;
    };
    timestamp: string;
}

export interface VulnerabilityFinding {
    id: string;
    title: string;
    category: string;
    severity: Severity;
    endpoint: string;
    method: string;
    description: string;
    evidence: string;
    remediation: string;
    cvss?: number;
    cwe?: string;
    owasp?: string;
}

// ============================================
// Security HTTP Client
// ============================================

export class SecurityHttpClient {
    private client: AxiosInstance;
    private results: SecurityTestResult[] = [];
    private findings: VulnerabilityFinding[] = [];

    constructor(baseURL?: string) {
        this.client = axios.create({
            baseURL: baseURL || securityConfig.targets.backend,
            timeout: securityConfig.timing.requestTimeout,
            validateStatus: () => true, // Accept all status codes for testing
        });

        // Request timing interceptor
        this.client.interceptors.request.use((config) => {
            (config as any).metadata = { startTime: Date.now() };
            return config;
        });

        this.client.interceptors.response.use((response) => {
            const startTime = (response.config as any).metadata?.startTime;
            if (startTime) {
                (response as any).responseTime = Date.now() - startTime;
            }
            return response;
        });
    }

    // ============================================
    // Authentication Helpers
    // ============================================

    /**
     * Create authenticated request headers
     */
    getAuthHeaders(user: TestUser): Record<string, string> {
        return {
            'x-user-id': user.id.toString(),
            'x-user-role': user.role,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Create JWT token header (mocked for testing)
     */
    getJwtHeader(token: string): Record<string, string> {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    // ============================================
    // Request Methods
    // ============================================

    async get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.client.get(url, config);
    }

    async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.client.post(url, data, config);
    }

    async put(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.client.put(url, data, config);
    }

    async patch(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.client.patch(url, data, config);
    }

    async delete(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
        return this.client.delete(url, config);
    }

    // ============================================
    // Attack Methods
    // ============================================

    /**
     * Test endpoint with multiple payloads
     */
    async testPayloads(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        payloads: string[],
        paramName: string,
        headers?: Record<string, string>
    ): Promise<AxiosResponse[]> {
        const responses: AxiosResponse[] = [];

        for (const payload of payloads) {
            let response: AxiosResponse;
            const config = { headers };

            try {
                switch (method) {
                    case 'GET':
                        response = await this.get(`${endpoint}?${paramName}=${encodeURIComponent(payload)}`, config);
                        break;
                    case 'POST':
                        response = await this.post(endpoint, { [paramName]: payload }, config);
                        break;
                    case 'PUT':
                        response = await this.put(endpoint, { [paramName]: payload }, config);
                        break;
                    case 'DELETE':
                        response = await this.delete(`${endpoint}?${paramName}=${encodeURIComponent(payload)}`, config);
                        break;
                }
                responses.push(response);
            } catch (error) {
                // Log error but continue testing
                console.error(`Payload test failed for: ${payload}`, error);
            }
        }

        return responses;
    }

    /**
     * Perform rapid requests for rate limiting test
     */
    async rapidRequests(
        endpoint: string,
        count: number,
        headers?: Record<string, string>
    ): Promise<{ responses: AxiosResponse[]; blocked: boolean; blockedAt?: number }> {
        const responses: AxiosResponse[] = [];
        let blocked = false;
        let blockedAt: number | undefined;

        for (let i = 0; i < count; i++) {
            try {
                const response = await this.get(endpoint, { headers });
                responses.push(response);

                if (response.status === 429) {
                    blocked = true;
                    blockedAt = i + 1;
                    break;
                }
            } catch (error) {
                // Connection refused may indicate rate limiting
                blocked = true;
                blockedAt = i + 1;
                break;
            }
        }

        return { responses, blocked, blockedAt };
    }

    /**
     * Test IDOR vulnerability
     */
    async testIdor(
        endpoint: string,
        ownId: number,
        targetId: number,
        userHeaders: Record<string, string>
    ): Promise<{ vulnerable: boolean; response: AxiosResponse }> {
        // Replace :id placeholder with target ID
        const url = endpoint.replace(':id', targetId.toString());
        const response = await this.get(url, { headers: userHeaders });

        // Vulnerable if we can access another user's resource
        const vulnerable = response.status === 200 && targetId !== ownId;

        return { vulnerable, response };
    }

    // ============================================
    // Result Recording
    // ============================================

    /**
     * Record a test result
     */
    recordResult(result: SecurityTestResult): void {
        this.results.push(result);
    }

    /**
     * Record a vulnerability finding
     */
    recordFinding(finding: VulnerabilityFinding): void {
        this.findings.push(finding);
    }

    /**
     * Create a test result object
     */
    createResult(
        testName: string,
        category: string,
        severity: Severity,
        passed: boolean,
        message: string,
        details?: SecurityTestResult['details']
    ): SecurityTestResult {
        return {
            testName,
            category,
            severity,
            passed,
            message,
            details,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get all recorded results
     */
    getResults(): SecurityTestResult[] {
        return this.results;
    }

    /**
     * Get all findings
     */
    getFindings(): VulnerabilityFinding[] {
        return this.findings;
    }

    /**
     * Get summary statistics
     */
    getSummary(): {
        total: number;
        passed: number;
        failed: number;
        bySeverity: Record<Severity, number>;
    } {
        const summary = {
            total: this.results.length,
            passed: this.results.filter(r => r.passed).length,
            failed: this.results.filter(r => !r.passed).length,
            bySeverity: {
                CRITICAL: 0,
                HIGH: 0,
                MEDIUM: 0,
                LOW: 0,
                INFO: 0,
            } as Record<Severity, number>,
        };

        for (const result of this.results) {
            if (!result.passed) {
                summary.bySeverity[result.severity]++;
            }
        }

        return summary;
    }

    /**
     * Clear recorded results
     */
    clearResults(): void {
        this.results = [];
        this.findings = [];
    }
}

// ============================================
// Response Analysis Utilities
// ============================================

export const responseAnalysis = {
    /**
     * Check if response contains SQL error indicators
     */
    hasSqlError(response: AxiosResponse): boolean {
        const errorIndicators = [
            'sql syntax',
            'mysql_fetch',
            'ORA-',
            'PostgreSQL',
            'SQLite',
            'SQLITE_ERROR',
            'sqlite3_',
            'ODBC Driver',
            'syntax error',
            'unclosed quotation',
            'quoted string not properly terminated',
        ];

        const body = typeof response.data === 'string'
            ? response.data.toLowerCase()
            : JSON.stringify(response.data).toLowerCase();

        return errorIndicators.some(indicator => body.includes(indicator.toLowerCase()));
    },

    /**
     * Check if response contains XSS payload (reflected)
     */
    hasReflectedXss(response: AxiosResponse, payload: string): boolean {
        const body = typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data);

        return body.includes(payload);
    },

    /**
     * Check if response contains sensitive data
     */
    hasSensitiveData(response: AxiosResponse): { found: boolean; types: string[] } {
        const body = typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data);

        const types: string[] = [];

        // Check for password-like fields
        if (/password["']?\s*[:=]\s*["']?[^"'\s]+/i.test(body)) {
            types.push('password');
        }

        // Check for API keys
        if (/api[_-]?key["']?\s*[:=]\s*["'][a-zA-Z0-9]{20,}/i.test(body)) {
            types.push('api_key');
        }

        // Check for JWT tokens
        if (/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(body)) {
            types.push('jwt_token');
        }

        // Check for internal IPs
        if (/\b(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)\d{1,3}\.\d{1,3}\b/.test(body)) {
            types.push('internal_ip');
        }

        // Check for stack traces
        if (/at\s+[\w.]+\s*\([^)]+:\d+:\d+\)/.test(body)) {
            types.push('stack_trace');
        }

        return { found: types.length > 0, types };
    },

    /**
     * Check security headers
     */
    checkSecurityHeaders(response: AxiosResponse): {
        missing: string[];
        insecure: string[];
    } {
        const headers = response.headers;
        const missing: string[] = [];
        const insecure: string[] = [];

        // Required security headers
        const requiredHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection',
            'strict-transport-security',
            'content-security-policy',
        ];

        for (const header of requiredHeaders) {
            if (!headers[header]) {
                missing.push(header);
            }
        }

        // Check for insecure values
        if (headers['access-control-allow-origin'] === '*') {
            insecure.push('access-control-allow-origin: * (overly permissive)');
        }

        return { missing, insecure };
    },

    /**
     * Measure response time
     */
    getResponseTime(response: AxiosResponse): number {
        return (response as any).responseTime || 0;
    },
};

// Default export
export default SecurityHttpClient;
