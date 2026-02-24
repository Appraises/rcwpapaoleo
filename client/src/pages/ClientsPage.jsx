import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, MapPin, AlertTriangle } from 'lucide-react';
import api from '../api/axios';

const formatDocument = (value) => {
    if (!value) return '';
    let v = value.replace(/\D/g, '');
    if (v.length <= 11) {
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
        if (v.length > 18) v = v.substring(0, 18);
    }
    return v;
};

const formatPhone = (value) => {
    if (!value) return '';
    let v = value.replace(/\D/g, '');
    if (v.length <= 10) {
        v = v.replace(/(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        v = v.replace(/(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{5})(\d)/, '$1-$2');
        if (v.length > 15) v = v.substring(0, 15);
    }
    return v;
};

const ClientsPage = () => {
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState('');

    const fetchCities = async () => {
        try {
            const res = await api.get('/clients/cities');
            setCities(res.data);
        } catch (error) {
            console.error('Error fetching cities:', error);
        }
    };

    const fetchClients = async () => {
        try {
            let url = `/clients?search=${search}`;
            if (selectedCity) url += `&city=${encodeURIComponent(selectedCity)}`;
            const response = await api.get(url);
            setClients(response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCities();
    }, []);

    useEffect(() => {
        setLoading(true);
        const delayDebounceFn = setTimeout(() => {
            fetchClients();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search, selectedCity]);

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                await api.delete(`/clients/${id}`);
                fetchClients();
                fetchCities(); // refresh cities after deletion
            } catch (error) {
                console.error('Error deleting client:', error);
            }
        }
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
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

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
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
                <div style={{ position: 'relative', minWidth: '200px' }}>
                    <MapPin style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)', pointerEvents: 'none' }} size={18} />
                    <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1rem 1rem 1rem 2.5rem',
                            borderRadius: 'var(--border-radius)',
                            border: '1px solid #ddd',
                            fontSize: '1rem',
                            boxShadow: 'var(--shadow-sm)',
                            backgroundColor: 'white',
                            appearance: 'auto',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="">Todas as cidades</option>
                        {cities.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : clients.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '3rem', color: 'var(--color-text-light)',
                    backgroundColor: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)'
                }}>
                    <p style={{ fontSize: '1.1rem' }}>
                        {search || selectedCity ? 'Nenhum cliente encontrado com esses filtros.' : 'Nenhum cliente cadastrado ainda.'}
                    </p>
                </div>
            ) : (
                <>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                        {clients.length} cliente{clients.length !== 1 ? 's' : ''} {selectedCity ? `em ${selectedCity}` : ''}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {clients.map(client => (
                            <div key={client.id} style={{
                                backgroundColor: 'white',
                                padding: '1.5rem',
                                borderRadius: 'var(--border-radius)',
                                boxShadow: 'var(--shadow-sm)',
                                borderLeft: (!client.Address?.latitude || !client.Address?.longitude) ? '4px solid #f59e0b' : '4px solid var(--color-primary)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{client.name}</h3>
                                    {(!client.Address?.latitude || !client.Address?.longitude) && (
                                        <span title="Sem coordenadas — este cliente não aparecerá nas rotas" style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                            backgroundColor: '#fef3c7', color: '#92400e',
                                            padding: '0.1rem 0.5rem', borderRadius: '999px',
                                            fontSize: '0.7rem', fontWeight: '600', whiteSpace: 'nowrap'
                                        }}>
                                            <AlertTriangle size={12} /> Sem GPS
                                        </span>
                                    )}
                                </div>
                                <p style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>{formatDocument(client.document)}</p>
                                <p style={{ marginBottom: '0.5rem' }}><strong>Tel:</strong> {formatPhone(client.phone)}</p>
                                <p style={{ marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.address}</p>
                                {client.Address?.city && (
                                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <MapPin size={13} /> {client.Address.city}
                                    </p>
                                )}

                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem', flexWrap: 'wrap' }}>
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
                </>
            )}
        </div>
    );
};

export default ClientsPage;
