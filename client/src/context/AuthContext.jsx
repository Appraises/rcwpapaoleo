import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
