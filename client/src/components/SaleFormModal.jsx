import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const SaleFormModal = ({ show, handleClose, handleSave, initialData }) => {
    // Generate YYYY-MM-DD avoiding UTC shift issues locally
    const getLocalYYYYMMDD = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const todayStr = getLocalYYYYMMDD();

    const [formData, setFormData] = useState({
        date: todayStr,
        quantityLiters: '',
        pricePerLiter: '',
        totalValue: '',
        observations: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                date: initialData.date ? initialData.date.split('T')[0] : todayStr,
                quantityLiters: initialData.quantityLiters || '',
                pricePerLiter: initialData.pricePerLiter || '',
                totalValue: initialData.totalValue || '',
                observations: initialData.observations || ''
            });
        } else {
            setFormData({
                date: todayStr,
                quantityLiters: '',
                pricePerLiter: '',
                totalValue: '',
                observations: ''
            });
        }
    }, [initialData, show, todayStr]);

    useEffect(() => {
        const qty = parseFloat(formData.quantityLiters);
        const price = parseFloat(formData.pricePerLiter);
        if (!isNaN(qty) && !isNaN(price)) {
            setFormData(prev => ({
                ...prev,
                totalValue: (qty * price).toFixed(2)
            }));
        } else if (!formData.totalValue && (isNaN(qty) || isNaN(price))) {
            setFormData(prev => ({
                ...prev,
                totalValue: ''
            }));
        }
    }, [formData.quantityLiters, formData.pricePerLiter]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const onSubmit = (e) => {
        e.preventDefault();

        const payload = {
            ...formData,
            quantityLiters: parseFloat(formData.quantityLiters),
            pricePerLiter: formData.pricePerLiter ? parseFloat(formData.pricePerLiter) : null,
            totalValue: formData.totalValue ? parseFloat(formData.totalValue) : null
        };

        handleSave(payload);
    };

    if (!show) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: 'var(--border-radius)', width: '100%', maxWidth: '500px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                        {initialData ? 'Editar Venda' : 'Registrar Venda'}
                    </h3>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                    <form id="saleForm" onSubmit={onSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Data da Venda *</label>
                            <input required type="date" name="date" value={formData.date} onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Quantidade (Litros) *</label>
                            <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
                                <input required type="number" step="0.01" name="quantityLiters" value={formData.quantityLiters} onChange={handleChange}
                                    style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none' }} />
                                <span style={{ padding: '0.75rem 1rem', backgroundColor: '#f8f9fa', borderLeft: '1px solid #ddd', color: 'var(--color-text-light)' }}>L</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Preço por Litro</label>
                                <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
                                    <span style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', borderRight: '1px solid #ddd', color: 'var(--color-text-light)' }}>R$</span>
                                    <input type="number" step="0.01" name="pricePerLiter" value={formData.pricePerLiter} onChange={handleChange}
                                        style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none', width: '100%' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Valor Total</label>
                                <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
                                    <span style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', borderRight: '1px solid #ddd', color: 'var(--color-text-light)' }}>R$</span>
                                    <input type="number" step="0.01" name="totalValue" value={formData.totalValue} onChange={handleChange}
                                        style={{ flex: 1, padding: '0.75rem', border: 'none', outline: 'none', width: '100%' }} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Observações</label>
                            <textarea name="observations" value={formData.observations} onChange={handleChange} rows="2"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }} />
                        </div>
                    </form>
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button type="button" onClick={handleClose}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: 'white', cursor: 'pointer' }}>
                        Cancelar
                    </button>
                    <button type="submit" form="saleForm"
                        style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--border-radius)', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', cursor: 'pointer' }}>
                        Confirmar Venda
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaleFormModal;
