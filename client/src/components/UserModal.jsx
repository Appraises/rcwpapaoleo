import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../api/axios';

const UserModal = ({ user, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'collector',
        isCollector: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                role: user.role || 'collector',
                isCollector: user.isCollector !== undefined ? user.isCollector : true,
                password: '' // Don't fill password on edit
            });
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (user) {
                const data = { ...formData };
                if (!data.password) delete data.password;
                await api.put(`/auth/users/${user.id}`, data);
            } else {
                await api.post('/auth/users', formData);
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving user:', error);
            const errorMsg = error.response?.data?.error || 'Erro desconhecido';
            alert(`Erro ao salvar usuário: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: 'var(--border-radius)',
                width: '100%', maxWidth: '500px', padding: '1.5rem',
                boxShadow: 'var(--shadow-md)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3>{user ? 'Editar Usuário' : 'Novo Coletador'}</h3>
                    <button onClick={onClose} style={{ background: 'none' }}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nome</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Senha {user && '(Deixe em branco para manter)'}</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required={!user}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Telefone (WhatsApp)</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(79) 99999-9999"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Função</label>
                        <select
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: 'white' }}
                        >
                            <option value="collector">Ocupação: Coletador</option>
                            <option value="admin">Ocupação: Administrador</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            id="isCollector"
                            checked={formData.isCollector}
                            onChange={e => setFormData({ ...formData, isCollector: e.target.checked })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="isCollector" style={{ cursor: 'pointer', fontWeight: '500' }}>
                            Atua na rua como Coletador (Habilita rotas do WhatsApp)
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" onClick={onClose} style={{
                            padding: '0.75rem 1.5rem', borderRadius: 'var(--border-radius)',
                            background: '#f5f5f5', color: 'var(--color-text)'
                        }}>Cancelar</button>
                        <button type="submit" disabled={loading} style={{
                            padding: '0.75rem 1.5rem', borderRadius: 'var(--border-radius)',
                            background: 'var(--color-primary)', color: 'white', fontWeight: '600'
                        }}>
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;
