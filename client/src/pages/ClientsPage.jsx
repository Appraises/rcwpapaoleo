import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import api from '../api/axios';

const ClientsPage = () => {
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchClients = async () => {
        try {
            const response = await api.get(`/clients?search=${search}`);
            setClients(response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchClients();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                await api.delete(`/clients/${id}`);
                fetchClients();
            } catch (error) {
                console.error('Error deleting client:', error);
            }
        }
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Clientes</h2>
                <Link to="/clients/new" style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--border-radius)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Plus size={20} />
                    Novo Cliente
                </Link>
            </div>

            <div style={{ position: 'relative', marginBottom: '2rem' }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nome ou documento..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '1rem 1rem 1rem 3rem',
                        borderRadius: 'var(--border-radius)',
                        border: '1px solid #ddd',
                        fontSize: '1rem',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                />
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {clients.map(client => (
                        <div key={client.id} style={{
                            backgroundColor: 'white',
                            padding: '1.5rem',
                            borderRadius: 'var(--border-radius)',
                            boxShadow: 'var(--shadow-sm)',
                            borderLeft: '4px solid var(--color-primary)'
                        }}>
                            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>{client.name}</h3>
                            <p style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>{client.document}</p>
                            <p style={{ marginBottom: '0.5rem' }}><strong>Tel:</strong> {client.phone}</p>
                            <p style={{ marginBottom: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.address}</p>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                <Link to={`/clients/${client.id}`} style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    padding: '0.5rem',
                                    borderRadius: 'var(--border-radius)',
                                    border: '1px solid var(--color-primary)',
                                    color: 'var(--color-primary)'
                                }}>
                                    Detalhes
                                </Link>
                                <Link to={`/clients/${client.id}/edit`} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.5rem',
                                    borderRadius: 'var(--border-radius)',
                                    backgroundColor: '#f0f0f0',
                                    color: 'var(--color-text)'
                                }}>
                                    <Edit size={18} />
                                </Link>
                                <button onClick={() => handleDelete(client.id)} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.5rem',
                                    borderRadius: 'var(--border-radius)',
                                    backgroundColor: '#fee2e2',
                                    color: 'var(--color-error)'
                                }}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClientsPage;
