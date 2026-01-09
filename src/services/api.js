
const API_URL = 'http://localhost:3000/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

export const api = {
    auth: {
        login: async (email, password) => {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) throw new Error('Login failed');
            const data = await res.json();
            localStorage.setItem('token', data.token);
            return data;
        },
        register: async (userData) => {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            if (!res.ok) throw new Error('Registration failed');
            return res.json();
        }
    },
    inventory: {
        getAll: async () => {
            const res = await fetch(`${API_URL}/inventory`, { headers: getHeaders() });
            return res.json();
        },
        create: async (item) => {
            const res = await fetch(`${API_URL}/inventory`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(item)
            });
            return res.json();
        },
        update: async (id, data) => {
            const res = await fetch(`${API_URL}/inventory/${id}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        }
    },
    requests: {
        getAll: async () => {
            const res = await fetch(`${API_URL}/requests`, { headers: getHeaders() });
            return res.json();
        },
        create: async (data) => {
            const res = await fetch(`${API_URL}/requests`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        }
    },
    users: {
        getAll: async () => {
            const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
            return res.json();
        }
    },
    history: {
        getAll: async () => {
            const res = await fetch(`${API_URL}/history`, { headers: getHeaders() });
            return res.json();
        }
    },
    settings: {
        get: async () => {
            const res = await fetch(`${API_URL}/settings`, { headers: getHeaders() });
            return res.json();
        }
    },
    assets: {
        getMyAssets: async () => {
            const res = await fetch(`${API_URL}/assets`, { headers: getHeaders() });
            return res.json();
        }
    }
};
