import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Search, MapPin } from 'lucide-react';
import api from '../api/axios';

const ClientFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        tradeName: '',
        document: '',
        phone: '',
        address: '', // legacy
        street: '',
        number: '',
        district: '',
        city: '',
        state: '',
        zip: '',
        reference: '',
        observations: '',
        pricePerLiter: '',
        latitude: '',
        longitude: ''
    });
    const [error, setError] = useState('');
    const [geocoding, setGeocoding] = useState(false);

    const handleGeocode = async () => {
        // Silent check: Only trigger if we have all necessary info
        if (!formData.street || !formData.number || !formData.city || !formData.state) {
            return;
        }

        const query = `${formData.street}, ${formData.number}, ${formData.city} - ${formData.state}`;

        setGeocoding(true);
        try {
            // Using Nominatim OpenStreetMap API (Free, rate limited)
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setFormData(prev => ({ ...prev, latitude: lat, longitude: lon }));
            }
        } catch (error) {
            console.error('Geocoding error:', error);
        } finally {
            setGeocoding(false);
        }
    };

    useEffect(() => {
        if (id) {
            const fetchClient = async () => {
                try {
                    const response = await api.get(`/clients/${id}`);
                    const client = response.data;
                    // Flatten Address object if exists
                    const addressData = client.Address || {};

                    setFormData({
                        name: client.name,
                        tradeName: client.tradeName || '',
                        document: client.document,
                        phone: client.phone,
                        street: addressData.street || '',
                        number: addressData.number || '',
                        district: addressData.district || '',
                        city: addressData.city || '',
                        state: addressData.state || '',
                        zip: addressData.zip || '',
                        reference: addressData.reference || '',
                        latitude: addressData.latitude || '',
                        longitude: addressData.longitude || '',
                        pricePerLiter: client.pricePerLiter,
                        observations: client.observations,
                        address: client.address // legacy
                    });
                } catch (err) {
                    setError('Erro ao carregar dados do cliente.');
                }
            };
            fetchClient();
        }
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (id) {
                await api.put(`/clients/${id}`, formData);
            } else {
                await api.post('/clients', formData);
            }
            navigate('/clients');
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao salvar cliente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <button onClick={() => navigate('/clients')} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem',
                background: 'none', color: 'var(--color-text-light)', fontSize: '0.9rem'
            }}>
                <ArrowLeft size={16} /> Voltar para lista
            </button>

            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', maxWidth: '800px', margin: '0 auto' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>{id ? 'Editar Cliente' : 'Novo Cliente'}</h2>

                {error && <div style={{ backgroundColor: '#fee2e2', color: 'var(--color-error)', padding: '1rem', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Razão Social *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nome Fantasia</label>
                            <input
                                type="text"
                                name="tradeName"
                                value={formData.tradeName || ''}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>CPF ou CNPJ *</label>
                            <input
                                type="text"
                                name="document"
                                value={formData.document}
                                onChange={handleChange}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Telefone *</label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Logradouro (Rua/Av) *</label>
                            <input
                                type="text"
                                name="street"
                                value={formData.street || ''}
                                onChange={handleChange}
                                onBlur={handleGeocode}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Número *</label>
                            <input
                                type="text"
                                name="number"
                                value={formData.number || ''}
                                onChange={handleChange}
                                onBlur={handleGeocode}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Bairro *</label>
                            <input
                                type="text"
                                name="district"
                                value={formData.district || ''}
                                onChange={handleChange}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>CEP</label>
                            <input
                                type="text"
                                name="zip"
                                value={formData.zip || ''}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Cidade *</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city || ''}
                                onChange={handleChange}
                                onBlur={handleGeocode}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado (UF) *</label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state || ''}
                                onChange={handleChange}
                                onBlur={handleGeocode}
                                required
                                maxLength={2}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Ponto de Referência</label>
                        <input
                            type="text"
                            name="reference"
                            value={formData.reference || ''}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Preço de Compra (R$/L)</label>
                        <input
                            type="number"
                            step="0.01"
                            name="pricePerLiter"
                            value={formData.pricePerLiter || ''}
                            onChange={handleChange}
                            placeholder="0.00"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                        />
                        <small style={{ color: '#666' }}>Valor pago a este cliente por litro de óleo.</small>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Observações</label>
                        <textarea
                            name="observations"
                            value={formData.observations}
                            onChange={handleChange}
                            rows={3}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="submit" disabled={loading} style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            padding: '0.75rem 2rem',
                            borderRadius: 'var(--border-radius)',
                            fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}>
                            <Save size={20} />
                            {loading ? 'Salvando...' : 'Salvar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientFormPage;
