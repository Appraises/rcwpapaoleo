import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, User as UserIcon, Phone, Truck } from 'lucide-react';
import api from '../api/axios';
import UserModal from '../components/UserModal';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/auth/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleEdit = (user) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
            try {
                await api.delete(`/auth/users/${id}`);
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2>Equipe</h2>
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
                    Novo Coletador
                </button>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : (
                <div style={{ backgroundColor: 'white', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', backgroundColor: '#f9f9f9' }}>
                                <th style={{ padding: '1rem' }}>Nome</th>
                                <th style={{ padding: '1rem' }}>Email</th>
                                <th style={{ padding: '1rem' }}>Telefone</th>
                                <th style={{ padding: '1rem' }}>Função</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '1rem', fontWeight: '500' }}>{u.name || '-'}</td>
                                    <td style={{ padding: '1rem', color: '#666' }}>{u.email}</td>
                                    <td style={{ padding: '1rem', color: '#666' }}>
                                        {u.phone ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Phone size={14} />{u.phone}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#ccc' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                padding: '0.25rem 0.75rem', borderRadius: '1rem',
                                                fontSize: '0.85rem', fontWeight: '500', width: 'fit-content',
                                                backgroundColor: u.role === 'admin' ? '#e0f2fe' : '#f3f4f6',
                                                color: u.role === 'admin' ? '#0369a1' : '#374151'
                                            }}>
                                                {u.role === 'admin' ? <Shield size={14} /> : <UserIcon size={14} />}
                                                {u.role === 'admin' ? 'Admin' : 'Coletador'}
                                            </span>
                                            {u.isCollector && (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                    padding: '0.25rem 0.75rem', borderRadius: '1rem',
                                                    fontSize: '0.75rem', fontWeight: '600', width: 'fit-content',
                                                    backgroundColor: '#dcfce7', color: '#166534'
                                                }}>
                                                    <Truck size={12} />
                                                    Atua em Campo
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button onClick={() => handleEdit(u)} style={{ marginRight: '1rem', color: 'var(--color-primary)', background: 'none' }}>
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(u.id)} style={{ color: 'var(--color-error)', background: 'none' }}>
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
                <UserModal
                    user={editingUser}
                    onClose={handleCloseModal}
                    onSuccess={() => { handleCloseModal(); fetchUsers(); }}
                />
            )}
        </div>
    );
};

export default UsersPage;
