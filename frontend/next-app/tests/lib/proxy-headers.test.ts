import { describe, expect, it } from 'vitest';
import { buildBackendHeaders } from '../../lib/proxy-headers';

const spoofedClientHeaders = () => {
    const h = new Headers();
    h.set('x-user-id', '999');
    h.set('x-user-role', 'superadmin');
    h.set('x-internal-key', 'attacker-key');
    return h;
};

describe('buildBackendHeaders (proxy header spoofing fix)', () => {
    it('always strips client-sent x-user-id / x-user-role / x-internal-key', () => {
        const out = buildBackendHeaders(spoofedClientHeaders(), null, 'real-key');
        expect(out.get('x-user-id')).toBeNull();
        expect(out.get('x-user-role')).toBeNull();
        expect(out.get('x-internal-key')).toBe('real-key');
    });

    it('never forwards a client-supplied internal key when no key is configured', () => {
        const out = buildBackendHeaders(spoofedClientHeaders(), null, undefined);
        expect(out.get('x-user-id')).toBeNull();
        expect(out.get('x-user-role')).toBeNull();
        expect(out.get('x-internal-key')).toBeNull();
    });

    it('sets identity headers from session only', () => {
        const out = buildBackendHeaders(
            new Headers(),
            { id: '42', roles: ['admin', 'approver'] },
            'real-key',
        );
        expect(out.get('x-user-id')).toBe('42');
        expect(out.get('x-user-role')).toBe('admin,approver');
        expect(out.get('x-internal-key')).toBe('real-key');
    });

    it('omits identity headers when session has no id/roles', () => {
        const out = buildBackendHeaders(new Headers(), null, 'real-key');
        expect(out.get('x-user-id')).toBeNull();
        expect(out.get('x-user-role')).toBeNull();
    });

    it('preserves unrelated client headers', () => {
        const h = spoofedClientHeaders();
        h.set('accept', 'application/json');
        const out = buildBackendHeaders(h, null, 'real-key');
        expect(out.get('accept')).toBe('application/json');
    });
});
