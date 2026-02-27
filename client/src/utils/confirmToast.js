import toast from 'react-hot-toast';
import React from 'react';

export const confirmToast = (message, onConfirm) => {
    toast((t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontWeight: '500' }}>{message}</span>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                    onClick={() => toast.dismiss(t.id)}
                    style={{
                        padding: '0.35rem 0.75rem', borderRadius: '4px',
                        border: '1px solid #ddd', background: 'white', cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                >
                    Cancelar
                </button>
                <button
                    onClick={() => {
                        toast.dismiss(t.id);
                        onConfirm();
                    }}
                    style={{
                        padding: '0.35rem 0.75rem', borderRadius: '4px', border: 'none',
                        background: 'var(--color-primary, #3b82f6)', color: 'white', cursor: 'pointer',
                        fontWeight: '600', fontSize: '0.85rem'
                    }}
                >
                    Confirmar
                </button>
            </div>
        </div>
    ), {
        duration: 8000,
        style: { border: '1px solid #f87171', padding: '16px', color: '#7f1d1d' }
    });
};
