import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { MessageSquare, MapPin, Phone, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function RequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const response = await axios.get('/collection-requests/pending');
            setRequests(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching requests', err);
            setError('Falha ao carregar as solicitações.');
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await axios.put(`/collection-requests/${id}/status`, { status });
            // Remove from the pending list optimistically
            setRequests(requests.filter(req => req.id !== id));
        } catch (err) {
            console.error('Error updating status', err);
            alert('Erro ao atualizar o status da solicitação.');
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Carregando solicitações...</div>;
    if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                    Solicitações de Coleta (WhatsApp)
                </h1>
            </div>

            {requests.length === 0 ? (
                <div style={{
                    backgroundColor: 'white', padding: '3rem', borderRadius: 'var(--border-radius)',
                    textAlign: 'center', boxShadow: 'var(--shadow-sm)', color: '#666'
                }}>
                    <MessageSquare size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p style={{ fontSize: '1.25rem' }}>Nenhuma solicitação pendente no momento.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {requests.map((req) => (
                        <div key={req.id} style={{
                            backgroundColor: 'white',
                            borderRadius: 'var(--border-radius)',
                            padding: '1.5rem',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            borderLeft: '4px solid #f59e0b' // yellow indicating pending
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#333' }}>
                                    {req.Client.name}
                                </h2>
                                <p style={{ color: '#666', fontSize: '0.875rem' }}>
                                    Recebido em {format(new Date(req.requestedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </p>
                            </div>

                            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', fontStyle: 'italic', color: '#475569' }}>
                                "{req.message}"
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#555', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <MapPin size={16} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                                    <span>
                                        {req.Client.Address ?
                                            `${req.Client.Address.street}, ${req.Client.Address.number} - ${req.Client.Address.district}, ${req.Client.Address.city}`
                                            : `${req.Client.street}, ${req.Client.number} - ${req.Client.district}, ${req.Client.city}`
                                        }
                                        {req.Client.reference && ` (${req.Client.reference})`}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Phone size={16} />
                                    <span>{req.Client.phone}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                                <button
                                    onClick={() => handleStatusUpdate(req.id, 'COMPLETED')}
                                    style={{
                                        flex: 1, padding: '0.75rem', backgroundColor: '#22c55e', color: 'white',
                                        border: 'none', borderRadius: '0.375rem', fontWeight: '500', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                    }}
                                >
                                    <CheckCircle size={18} /> Coletado
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Tem certeza que deseja cancelar/ignorar esta solicitação?')) {
                                            handleStatusUpdate(req.id, 'CANCELLED');
                                        }
                                    }}
                                    style={{
                                        padding: '0.75rem 1rem', backgroundColor: '#fef2f2', color: '#ef4444',
                                        border: '1px solid #fee2e2', borderRadius: '0.375rem', fontWeight: '500', cursor: 'pointer',
                                    }}
                                    title="Cancelar ordem"
                                >
                                    <XCircle size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default RequestsPage;
