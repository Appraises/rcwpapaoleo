import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api/axios';
import CollectionModal from '../components/CollectionModal';

const CollectionsPage = () => {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchCollections = async () => {
        try {
            setLoading(true);
            const response = await api.get('/collections');
            setCollections(response.data);
        } catch (error) {
            console.error('Error fetching collections:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Excluir esta coleta?')) {
            try {
                await api.delete(`/collections/${id}`);
                fetchCollections();
            } catch (error) {
                console.error('Error deleting collection:', error);
            }
        }
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2>Todas as Coletas</h2>
                <button onClick={() => setIsModalOpen(true)} style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--border-radius)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Plus size={20} />
                    Nova Coleta
                </button>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : collections.length === 0 ? (
                <p>Nenhuma coleta registrada.</p>
            ) : (
                <div style={{ backgroundColor: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', backgroundColor: '#f9f9f9' }}>
                                <th style={{ padding: '1rem' }}>Data</th>
                                <th style={{ padding: '1rem' }}>Cliente</th>
                                <th style={{ padding: '1rem' }}>Coletor</th>
                                <th style={{ padding: '1rem' }}>Qtd (L)</th>
                                <th style={{ padding: '1rem' }}>Observação</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {collections.map(col => (
                                <tr key={col.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '1rem' }}>{new Date(col.date).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>{col.Client?.name || 'N/A'}</td>
                                    <td style={{ padding: '1rem', color: '#555' }}>
                                        {col.User?.name || col.User?.email || '-'}
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{col.quantity}</td>
                                    <td style={{ padding: '1rem', color: '#666' }}>{col.observation || '-'}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button onClick={() => handleDelete(col.id)} style={{ color: 'var(--color-error)', background: 'none' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <CollectionModal
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => { setIsModalOpen(false); fetchCollections(); }}
                />
            )}
        </div>
    );
};

export default CollectionsPage;
