import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Package, Plus, X } from 'lucide-react';
import api from '../api/axios';

const CONTAINER_SIZES = [200, 100, 60, 50, 30];

const calculateContainers = (liters) => {
    if (!liters || liters <= 0) return null;

    const containers = [];
    let remaining = liters;

    for (const size of CONTAINER_SIZES) {
        const count = Math.floor(remaining / size);
        if (count > 0) {
            containers.push({ size, count });
            remaining -= count * size;
        }
    }

    // If there's leftover, add the smallest container that fits
    if (remaining > 0) {
        // Find smallest container that can hold the remaining
        const smallest = [...CONTAINER_SIZES].reverse().find(s => s >= remaining) || CONTAINER_SIZES[CONTAINER_SIZES.length - 1];
        const existing = containers.find(c => c.size === smallest);
        if (existing) {
            existing.count += 1;
        } else {
            containers.push({ size: smallest, count: 1 });
        }
    }

    const totalCapacity = containers.reduce((sum, c) => sum + c.size * c.count, 0);
    const totalContainers = containers.reduce((sum, c) => sum + c.count, 0);

    return { containers, totalCapacity, totalContainers };
};

// CPF / CNPJ formatting and validation helpers
const formatDocument = (value) => {
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

const isValidCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let add = 0, rev;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;
    return true;
};

const isValidCNPJ = (cnpj) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result != digits.charAt(0)) return false;
    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result != digits.charAt(1)) return false;
    return true;
};

const formatPhone = (value) => {
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

const formatCep = (value) => {
    let v = value.replace(/\D/g, '');
    v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    if (v.length > 9) v = v.substring(0, 9);
    return v;
};

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const ClientFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        tradeName: '',
        document: '',
        phone: '',
        additionalPhones: [],
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
        averageOilLiters: '',
        latitude: '',
        longitude: ''
    });
    const [error, setError] = useState('');
    const [docError, setDocError] = useState('');
    const [geocoding, setGeocoding] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    const [cities, setCities] = useState([]);
    const [citiesLoading, setCitiesLoading] = useState(false);

    const handleGeocode = async () => {
        // Silent check: Only trigger if we have all necessary info
        if (!formData.street || !formData.number || !formData.city || !formData.state) {
            return;
        }

        const query = `${formData.street}, ${formData.number}, ${formData.city} - ${formData.state}`;

        setGeocoding(true);
        try {
            // Using backend proxy to Google Maps Geocoding API (API key stays server-side)
            const response = await api.get('/settings/geocode', { params: { address: query } });
            const { lat, lng } = response.data;

            if (lat && lng) {
                setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
            }
        } catch (error) {
            console.error('Geocoding error:', error);
        } finally {
            setGeocoding(false);
        }
    };

    const handleZipBlur = async (e) => {
        const zip = e.target.value.replace(/\D/g, '');
        if (zip.length !== 8) return;

        setCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setFormData(prev => ({
                    ...prev,
                    street: data.logradouro || prev.street,
                    district: data.bairro || prev.district,
                    city: data.localidade || prev.city,
                    state: data.uf || prev.state
                }));
            }
        } catch (error) {
            console.error('ViaCEP Error:', error);
        } finally {
            setCepLoading(false);
        }
    };

    // Fetch cities from IBGE when state changes
    useEffect(() => {
        if (!formData.state) {
            setCities([]);
            return;
        }
        const fetchCities = async () => {
            setCitiesLoading(true);
            try {
                const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.state}/municipios?orderBy=nome`);
                const data = await res.json();
                setCities(data.map(m => m.nome));
            } catch (err) {
                console.error('Erro ao buscar cidades:', err);
                setCities([]);
            } finally {
                setCitiesLoading(false);
            }
        };
        fetchCities();
    }, [formData.state]);

    useEffect(() => {
        if (id) {
            const fetchClient = async () => {
                try {
                    const response = await api.get(`/clients/${id}`);
                    const client = response.data;
                    // Flatten Address object if exists
                    const addressData = client.Address || {};

                    setFormData({
                        name: client.name || '',
                        tradeName: client.tradeName || '',
                        document: client.document ? formatDocument(client.document) : '',
                        phone: client.phone ? formatPhone(client.phone) : '',
                        additionalPhones: (client.additionalPhones || []).map(p => formatPhone(p.phone)),
                        address: client.address || '', // legacy
                        street: addressData.street || '',
                        number: addressData.number || '',
                        district: addressData.district || '',
                        city: addressData.city || '',
                        state: addressData.state || '',
                        zip: addressData.zip ? formatCep(addressData.zip) : '',
                        reference: addressData.reference || '',
                        latitude: addressData.latitude || '',
                        longitude: addressData.longitude || '',
                        pricePerLiter: client.pricePerLiter || '',
                        averageOilLiters: client.averageOilLiters || '',
                        observations: client.observations || '',
                    });
                } catch (err) {
                    setError('Erro ao carregar dados do cliente.');
                }
            };
            fetchClient();
        }
    }, [id]);

    const handleChange = (e) => {
        let { name, value } = e.target;
        if (name === 'phone') value = formatPhone(value);
        if (name === 'zip') value = formatCep(value);
        if (name === 'document') {
            value = value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                if (value.length === 14) {
                    if (!isValidCPF(value.replace(/\D/g, ''))) setDocError('CPF inválido'); else setDocError('');
                } else {
                    setDocError('');
                }
            } else {
                value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
                if (value.length > 18) value = value.substring(0, 18);
                if (value.length === 18) {
                    if (!isValidCNPJ(value.replace(/\D/g, ''))) setDocError('CNPJ inválido'); else setDocError('');
                } else {
                    setDocError('');
                }
            }
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddPhone = () => {
        setFormData(prev => ({
            ...prev,
            additionalPhones: [...prev.additionalPhones, '']
        }));
    };

    const handleExtraPhoneChange = (index, value) => {
        const formatted = formatPhone(value);
        setFormData(prev => {
            const newPhones = [...prev.additionalPhones];
            newPhones[index] = formatted;
            return { ...prev, additionalPhones: newPhones };
        });
    };

    const handleRemoveExtraPhone = (index) => {
        setFormData(prev => {
            const newPhones = [...prev.additionalPhones];
            newPhones.splice(index, 1);
            return { ...prev, additionalPhones: newPhones };
        });
    };

    const containerRecommendation = useMemo(() => {
        return calculateContainers(parseFloat(formData.averageOilLiters));
    }, [formData.averageOilLiters]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setDocError('');

        const rawDoc = formData.document.replace(/\D/g, '');
        if (rawDoc.length > 0) { // Only validate if document is provided
            if (rawDoc.length <= 11 && !isValidCPF(rawDoc)) {
                setDocError('CPF inválido');
                setLoading(false);
                return;
            } else if (rawDoc.length > 11 && !isValidCNPJ(rawDoc)) {
                setDocError('CNPJ inválido');
                setLoading(false);
                return;
            }
        }

        try {
            const cleanedData = {
                ...formData,
                document: formData.document.replace(/\D/g, ''),
                phone: formData.phone.replace(/\D/g, ''),
                additionalPhones: formData.additionalPhones.filter(p => p).map(p => p.replace(/\D/g, '')),
                zip: formData.zip.replace(/\D/g, ''),
                pricePerLiter: formData.pricePerLiter ? parseFloat(formData.pricePerLiter.toString().replace(/\./g, '').replace(',', '.')) : 0,
                averageOilLiters: formData.averageOilLiters ? parseFloat(formData.averageOilLiters.toString().replace(/\./g, '').replace(',', '.')) : 0
            };

            if (id) {
                await api.put(`/clients/${id}`, cleanedData);
            } else {
                await api.post('/clients', cleanedData);
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>CPF ou CNPJ *</label>
                            <input
                                type="text"
                                name="document"
                                value={formData.document}
                                onChange={handleChange}
                                required
                                maxLength={18}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: docError ? '1px solid var(--color-error)' : '1px solid #ddd' }}
                            />
                            {docError && <span style={{ color: 'var(--color-error)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>{docError}</span>}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Telefone Principal (WhatsApp)*</label>
                            <input
                                type="tel"
                                name="phone"
                                placeholder="(00) 00000-0000"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                maxLength="15"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                            {formData.additionalPhones.map((phone, index) => (
                                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="tel"
                                        placeholder="(00) 00000-0000"
                                        value={phone}
                                        onChange={(e) => handleExtraPhoneChange(index, e.target.value)}
                                        maxLength="15"
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExtraPhone(index)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0.5rem'
                                        }}
                                        title="Remover telefone"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddPhone}
                                style={{
                                    marginTop: '0.5rem',
                                    background: '#f1f5f9',
                                    border: '1px dashed #cbd5e1',
                                    color: '#475569',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    width: '100%'
                                }}
                            >
                                <Plus size={16} /> Adicionar número extra
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
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
                                onBlur={handleZipBlur}
                                maxLength={9}
                                placeholder={cepLoading ? 'Buscando...' : ''}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: cepLoading ? '#f3f4f6' : 'white' }}
                            />
                            <small style={{ color: '#666', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Preenche o endereço automaticamente.</small>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Cidade *</label>
                            {cities.length > 0 ? (
                                <select
                                    name="city"
                                    value={formData.city || ''}
                                    onChange={handleChange}
                                    onBlur={handleGeocode}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: 'white' }}
                                >
                                    <option value="" disabled>{citiesLoading ? 'Carregando...' : 'Selecione a cidade'}</option>
                                    {cities.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city || ''}
                                    onChange={handleChange}
                                    onBlur={handleGeocode}
                                    required
                                    placeholder={formData.state ? (citiesLoading ? 'Carregando cidades...' : 'Digite a cidade') : 'Selecione o estado primeiro'}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                                />
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Estado (UF) *</label>
                            <select
                                name="state"
                                value={formData.state || ''}
                                onChange={handleChange}
                                onBlur={handleGeocode}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd', backgroundColor: 'white' }}
                            >
                                <option value="" disabled>Selecione</option>
                                {UFS.map(uf => (
                                    <option key={uf} value={uf}>{uf}</option>
                                ))}
                            </select>
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
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
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Média de Óleo Esperada (L)</label>
                            <input
                                type="number"
                                step="1"
                                name="averageOilLiters"
                                value={formData.averageOilLiters || ''}
                                onChange={handleChange}
                                placeholder="0"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid #ddd' }}
                            />
                            <small style={{ color: '#666' }}>Quantidade média de litros de óleo por coleta.</small>
                        </div>
                    </div>

                    {containerRecommendation && (
                        <div style={{
                            backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
                            padding: '1rem 1.25rem', borderRadius: 'var(--border-radius)',
                            display: 'flex', flexDirection: 'column', gap: '0.5rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', color: '#166534' }}>
                                <Package size={18} />
                                Recipientes Recomendados
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {containerRecommendation.containers.map((c, i) => (
                                    <span key={i} style={{
                                        backgroundColor: '#dcfce7', color: '#166534',
                                        padding: '0.35rem 0.75rem', borderRadius: '999px',
                                        fontSize: '0.9rem', fontWeight: '500'
                                    }}>
                                        {c.count}x {c.size}L
                                    </span>
                                ))}
                            </div>
                            <small style={{ color: '#15803d' }}>
                                Capacidade total: {containerRecommendation.totalCapacity}L
                                ({containerRecommendation.totalContainers} recipiente{containerRecommendation.totalContainers > 1 ? 's' : ''})
                            </small>
                        </div>
                    )}

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
