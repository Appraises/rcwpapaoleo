import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit } from 'lucide-react';
import SaleFormModal from '../components/SaleFormModal';

const BuyerDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [buyer, setBuyer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [currentSale, setCurrentSale] = useState(null);

    const fetchBuyerDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/buyers/${id}`);
            setBuyer(response.data);
        } catch (error) {
            console.error('Error fetching buyer details:', error);
            alert('Failed to load buyer details.');
            navigate('/vendas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuyerDetails();
    }, [id]);

    const handleShowSaleModal = (sale = null) => {
        setCurrentSale(sale);
        setShowSaleModal(true);
    };

    const handleCloseSaleModal = () => {
        setShowSaleModal(false);
        setCurrentSale(null);
    };

    const handleSaveSale = async (saleData) => {
        try {
            if (currentSale) {
                await api.put(`/sales/${currentSale.id}`, saleData);
            } else {
                await api.post(`/sales`, { ...saleData, buyerId: buyer.id });
            }
            fetchBuyerDetails();
            handleCloseSaleModal();
        } catch (error) {
            console.error('Error saving sale:', error);
            alert('Failed to save sale.');
        }
    };

    const handleDeleteSale = async (saleId) => {
        if (window.confirm('Tem certeza que deseja apagar este registro de venda?')) {
            try {
                await api.delete(`/sales/${saleId}`);
                fetchBuyerDetails();
            } catch (error) {
                console.error('Error deleting sale:', error);
                alert('Erro ao apagar venda.');
            }
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!buyer) return null;

    const totalLitersSold = buyer.Sales ? buyer.Sales.reduce((acc, sale) => acc + (sale.quantityLiters || 0), 0) : 0;
    const totalValueEarned = buyer.Sales ? buyer.Sales.reduce((acc, sale) => acc + (sale.totalValue || 0), 0) : 0;

    const getTypeColor = (type) => {
        if (type === 'Usina') return '#0dcaf0';
        if (type === 'Granja') return '#ffc107';
        return '#6c757d';
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <button onClick={() => navigate('/vendas')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', cursor: 'pointer', fontWeight: 500 }}>
                <ArrowLeft size={20} /> Voltar para Compradores
            </button>

            {/* Buyer Info Card */}
            <div style={{ backgroundColor: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary)' }}>{buyer.name}</h2>
                        <span style={{ backgroundColor: getTypeColor(buyer.type), color: 'white', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 'bold' }}>
                            {buyer.type || 'Outro'}
                        </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Vendido</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)', lineHeight: '1.2' }}>{totalLitersSold.toLocaleString()} L</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--color-text)' }}>{totalValueEarned.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <div style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Documento</div>
                        <div style={{ fontWeight: 500 }}>{buyer.document || '-'}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Telefone</div>
                        <div style={{ fontWeight: 500 }}>{buyer.phone || '-'}</div>
                    </div>
                    <div>
                        <div style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Email</div>
                        <div style={{ fontWeight: 500 }}>{buyer.email || '-'}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Endereço</div>
                        <div style={{ fontWeight: 500 }}>{buyer.address || '-'}</div>
                    </div>
                    {buyer.observations && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Observações</div>
                            <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: 'var(--border-radius)', fontSize: '0.95rem' }}>{buyer.observations}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sales History */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Histórico de Vendas</h3>
                <button
                    onClick={() => handleShowSaleModal()}
                    style={{
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--border-radius)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={20} />
                    Registrar Venda
                </button>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'var(--color-background)', borderBottom: '2px solid #eee' }}>
                            <tr>
                                <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Data</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Quantidade</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Preço/Litro</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Valor Total</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)' }}>Observação</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--color-text-light)', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!buyer.Sales || buyer.Sales.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)' }}>Ainda não há vendas registradas para este comprador.</td>
                                </tr>
                            ) : (
                                buyer.Sales.map((sale) => (
                                    <tr key={sale.id} style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s', ':hover': { backgroundColor: '#f8f9fa' } }}>
                                        <td style={{ padding: '1rem', fontWeight: '500' }}>{new Date(sale.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
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

            {showSaleModal && (
                <SaleFormModal
                    show={showSaleModal}
                    handleClose={handleCloseSaleModal}
                    handleSave={handleSaveSale}
                    initialData={currentSale}
                />
            )}
        </div>
    );
};

export default BuyerDetailPage;
