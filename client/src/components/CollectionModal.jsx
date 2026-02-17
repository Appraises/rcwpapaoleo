import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CollectionModal = ({ clientId, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        quantity: '',
        observation: ''
    });
    const [selectedClientId, setSelectedClientId] = useState(clientId || '');
    const [selectedUserId, setSelectedUserId] = useState(user?.id || '');

    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const usersResponse = await api.get('/auth/users');
                setUsers(usersResponse.data);

                // Should predefined selected user to current user if exists
                if (user && !selectedUserId) {
                    setSelectedUserId(user.id);
                }

                if (!clientId) {
                    const clientsResponse = await api.get('/clients?sort=name_asc');
                    setClients(clientsResponse.data);
                    if (clientsResponse.data.length > 0) {
                        setSelectedClientId(clientsResponse.data[0].id);
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, [clientId, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/collections', {
                ...formData,
                clientId: selectedClientId,
                userId: selectedUserId
            });
            onSuccess();
        } catch (error) {
            console.error('Error saving collection:', error);
            alert('Erro ao salvar coleta');
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
                    <h3>Nova Coleta</h3>
                    <button onClick={onClose} style={{ background: 'none' }}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    {!clientId && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Cliente *</label>
                            <select
                                value={selectedClientId}
                                onChange={e => setSelectedClientId(e.target.value)}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: 'white' }}
                            >
                                <option value="" disabled>Selecione um cliente</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Coletor *</label>
                        <select
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: 'white' }}
                        >
                            <option value="" disabled>Selecione o responsável</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name || u.email}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Data</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            required
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Quantidade (Litros) *</label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.quantity}
                            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                            required
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Observação</label>
                        <textarea
                            value={formData.observation}
                            onChange={e => setFormData({ ...formData, observation: e.target.value })}
                            rows={3}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                        />
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

export default CollectionModal;
