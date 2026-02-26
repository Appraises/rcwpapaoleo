import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BuyerFormModal = ({ show, handleClose, handleSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'Granja',
        document: '',
        phone: '',
        email: '',
        address: '',
        observations: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                name: '',
                type: 'Granja',
                document: '',
                phone: '',
                email: '',
                address: '',
                observations: ''
            });
        }
    }, [initialData, show]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const onSubmit = (e) => {
        e.preventDefault();
        handleSave(formData);
    };

    if (!show) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white', borderRadius: 'var(--border-radius)', width: '100%', maxWidth: '600px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                        {initialData ? 'Editar Comprador' : 'Novo Comprador'}
                    </h3>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                    <form id="buyerForm" onSubmit={onSubmit} style={{ display: 'grid', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Nome / Razão Social *</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleChange}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Tipo</label>
                                <select name="type" value={formData.type} onChange={handleChange}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: 'white' }}>
                                    <option value="Granja">Granja</option>
                                    <option value="Usina">Usina</option>
                                    <option value="Particular">Particular</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Documento (CNPJ/CPF)</label>
                                <input type="text" name="document" value={formData.document} onChange={handleChange}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Telefone</label>
                                <input type="text" name="phone" value={formData.phone} onChange={handleChange}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Endereço Completo</label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }} />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Observações</label>
                            <textarea name="observations" value={formData.observations} onChange={handleChange} rows="3"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }} />
                        </div>
                    </form>
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button type="button" onClick={handleClose}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: 'white', cursor: 'pointer' }}>
                        Cancelar
                    </button>
                    <button type="submit" form="buyerForm"
                        style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--border-radius)', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', cursor: 'pointer' }}>
                        Salvar Comprador
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BuyerFormModal;
