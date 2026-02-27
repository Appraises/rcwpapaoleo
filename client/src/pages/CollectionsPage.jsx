import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api/axios';
import CollectionModal from '../components/CollectionModal';
import toast from 'react-hot-toast';
import { confirmToast } from '../utils/confirmToast';

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
        confirmToast('Excluir esta coleta?', async () => {
            try {
                await api.delete(`/collections/${id}`);
                toast.success('Coleta excluída com sucesso.');
                fetchCollections();
            } catch (error) {
                console.error('Error deleting collection:', error);
                toast.error('Erro ao excluir coleta.');
            }
        });
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
                <div style={{ backgroundColor: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                            <thead style={{ backgroundColor: 'var(--color-background)', borderBottom: '2px solid #eee' }}>
                                <tr>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Data</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Cliente</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Coletor</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Qtd (L)</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Observação</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)', textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collections.map(col => (
                                    <tr key={col.id} style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f8f9fa' } }}>
                                        <td style={{ padding: '1rem', fontWeight: '500' }}>{new Date(col.date).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{col.Client?.name || 'N/A'}</td>
                                        <td style={{ padding: '1rem', color: '#555' }}>
                                            {col.User?.name || col.User?.email || '-'}
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{col.quantity}</td>
                                        <td style={{ padding: '1rem', color: '#666' }}>{col.observation || '-'}</td>
                                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button onClick={() => handleDelete(col.id)} style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', outline: 'none' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
