import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';
import SaleFormModal from '../components/SaleFormModal';
import toast from 'react-hot-toast';
import { confirmToast } from '../utils/confirmToast';

const SalesHistoryPage = () => {
    const navigate = useNavigate();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [currentSale, setCurrentSale] = useState(null);

    const fetchAllSales = async () => {
        setLoading(true);
        try {
            const response = await api.get('/sales');
            setSales(response.data);
        } catch (error) {
            console.error('Error fetching all sales:', error);
            toast.error('Falha ao carregar o histórico de vendas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllSales();
    }, []);

    const handleShowSaleModal = (sale) => {
        setCurrentSale(sale);
        setShowSaleModal(true);
    };

    const handleCloseSaleModal = () => {
        setShowSaleModal(false);
        setCurrentSale(null);
    };

    const handleSaveSale = async (saleData) => {
        try {
            await api.put(`/sales/${currentSale.id}`, saleData);
            fetchAllSales();
            handleCloseSaleModal();
            toast.success('Venda atualizada com sucesso!');
        } catch (error) {
            console.error('Error saving sale:', error);
            toast.error('Falha ao atualizar venda.');
        }
    };

    const handleDeleteSale = async (saleId) => {
        confirmToast('Tem certeza que deseja apagar este registro de venda?', async () => {
            try {
                await api.delete(`/sales/${saleId}`);
                toast.success('Venda apagada com sucesso.');
                fetchAllSales();
            } catch (error) {
                console.error('Error deleting sale:', error);
                toast.error('Erro ao apagar venda.');
            }
        });
    };

    const getTypeColor = (type) => {
        if (type === 'Usina') return '#0dcaf0';
        if (type === 'Granja') return '#ffc107';
        return '#6c757d';
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate('/vendas')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                    <ArrowLeft size={20} /> Voltar
                </button>
                <h2 style={{ margin: 0 }}>Histórico Geral de Vendas</h2>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : (
                <div style={{ backgroundColor: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: 'var(--color-background)', borderBottom: '2px solid #eee' }}>
                                <tr>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Data</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Comprador</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Tipo</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Quantidade</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Preço/Litro</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Valor Total</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Observação</th>
                                    <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)', textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>Nenhuma venda registrada ainda no sistema.</td>
                                    </tr>
                                ) : (
                                    sales.map((sale) => (
                                        <tr key={sale.id} style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f8f9fa' } }}>
                                            <td style={{ padding: '1rem', fontWeight: '500' }}>{new Date(sale.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                                                <Link to={`/vendas/${sale.buyerId}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                                                    {sale.Buyer ? sale.Buyer.name : 'Desconhecido'}
                                                </Link>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {sale.Buyer && sale.Buyer.type ? (
                                                    <span style={{ backgroundColor: getTypeColor(sale.Buyer.type), color: 'white', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                        {sale.Buyer.type}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{sale.quantityLiters} L</td>
                                            <td style={{ padding: '1rem' }}>{sale.pricePerLiter ? sale.pricePerLiter.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
                                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{sale.totalValue ? sale.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</td>
                                            <td style={{ padding: '1rem', color: 'var(--color-text-light)', fontSize: '0.9rem' }}>{sale.observations || '-'}</td>
                                            <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button onClick={() => handleShowSaleModal(sale)} style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteSale(sale.id)} style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showSaleModal && (
                <SaleFormModal
                    show={showSaleModal}
                    handleClose={handleCloseSaleModal}
                    handleSave={handleSaveSale}
                    initialData={currentSale}
                />
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default SalesHistoryPage;
