import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import api from '../api/axios';
import CollectionModal from '../components/CollectionModal';

const ClientDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [clientRes, collectionsRes] = await Promise.all([
                api.get(`/clients/${id}`),
                api.get(`/clients/${id}/collections`) // functionality to be implemented in backend
            ]);
            setClient(clientRes.data);
            setCollections(collectionsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleDeleteCollection = async (collectionId) => {
        if (window.confirm('Excluir esta coleta?')) {
            try {
                await api.delete(`/collections/${collectionId}`);
                fetchData(); // Refresh list
            } catch (error) {
                console.error('Error deleting collection:', error);
            }
        }
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Carregando...</div>;
    if (!client) return <div className="container" style={{ padding: '2rem' }}>Cliente não encontrado.</div>;

    const totalCollected = collections.reduce((acc, curr) => acc + curr.quantity, 0);

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <button onClick={() => navigate('/clients')} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem',
                background: 'none', color: 'var(--color-text-light)', fontSize: '0.9rem'
            }}>
                <ArrowLeft size={16} /> Voltar para lista
            </button>

            <div style={{ display: 'grid', gap: '1.5rem', md: { gridTemplateColumns: '1fr 2fr' } }}>

                {/* Client Info Card */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', height: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{client.name}</h2>
                            {client.tradeName && <p style={{ color: '#888', fontSize: '0.95rem', margin: '0.25rem 0 0' }}>{client.tradeName}</p>}
                        </div>
                        <Link to={`/clients/${client.id}/edit`} style={{ padding: '0.5rem', color: 'var(--color-text-light)' }}><Edit size={18} /></Link>
                    </div>

                    <div style={{ display: 'grid', gap: '0.75rem', color: '#555' }}>
                        <p><strong>CNPJ/CPF:</strong> {client.document}</p>
                        <p><strong>Telefone:</strong> {client.phone}</p>
                        <p><strong>Endereço:</strong> {client.address}</p>
                        {client.observations && <p><strong>Obs:</strong> {client.observations}</p>}

                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--color-background)', borderRadius: 'var(--border-radius)' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)' }}>Total Coletado</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{totalCollected} Litros</p>
                        </div>
                    </div>
                </div>

                {/* Collections History */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3>Histórico de Coletas</h3>
                        <button onClick={() => setIsModalOpen(true)} style={{
                            backgroundColor: 'var(--color-secondary)',
                            color: 'var(--color-text)',
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--border-radius)',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            fontWeight: '600'
                        }}>
                            <Plus size={18} /> Nova Coleta
                        </button>
                    </div>

                    {collections.length === 0 ? (
                        <p style={{ color: 'var(--color-text-light)', textAlign: 'center', padding: '2rem' }}>Nenhuma coleta registrada.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                        <th style={{ padding: '0.75rem' }}>Data</th>
                                        <th style={{ padding: '0.75rem' }}>Qtd (L)</th>
                                        <th style={{ padding: '0.75rem' }}>Observação</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {collections.map(col => (
                                        <tr key={col.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '0.75rem' }}>{new Date(col.date).toLocaleDateString()}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: '500' }}>{col.quantity}</td>
                                            <td style={{ padding: '0.75rem', color: '#666' }}>{col.observation || '-'}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                <button onClick={() => handleDeleteCollection(col.id)} style={{ color: 'var(--color-error)', background: 'none' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <CollectionModal
                    clientId={id}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => { setIsModalOpen(false); fetchData(); }}
                />
            )}
        </div>
    );
};

export default ClientDetailPage;
