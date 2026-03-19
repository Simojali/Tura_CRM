import { useState, useEffect } from 'react'
import { loadProviders, addProvider, updateProvider, deleteProvider } from '../lib/constants'

const EMPTY_FORM = { name: '', email: '', phone: '', website: '', notes: '' }

export default function ManageProvidersModal({ onClose, onUpdate }) {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM })
  const [showAddForm, setShowAddForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const [error, setError] = useState('')

  useEffect(() => {
    loadProviders().then((data) => { setProviders(data); setLoading(false) })
  }, [])

  const notify = (list) => {
    setProviders(list)
    if (onUpdate) onUpdate(list)
  }

  const handleAdd = async () => {
    const name = addForm.name.trim()
    if (!name) return
    if (providers.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setError('Provider already exists')
      return
    }
    setError('')
    try {
      const payload = {
        name,
        email: addForm.email.trim() || null,
        phone: addForm.phone.trim() || null,
        website: addForm.website.trim() || null,
        notes: addForm.notes.trim() || null,
      }
      const created = await addProvider(payload)
      const next = [...providers, created].sort((a, b) => a.name.localeCompare(b.name))
      notify(next)
      setAddForm({ ...EMPTY_FORM })
      setShowAddForm(false)
    } catch {
      setError('Failed to add provider')
    }
  }

  const handleEdit = async (id) => {
    const name = editForm.name.trim()
    if (!name) return
    if (providers.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) {
      setError('Provider already exists')
      return
    }
    setError('')
    try {
      const updates = {
        name,
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        website: editForm.website.trim() || null,
        notes: editForm.notes.trim() || null,
      }
      await updateProvider(id, updates)
      const next = providers.map((p) => (p.id === id ? { ...p, ...updates } : p)).sort((a, b) => a.name.localeCompare(b.name))
      notify(next)
      setEditId(null)
    } catch {
      setError('Failed to update provider')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteProvider(id)
      const next = providers.filter((p) => p.id !== id)
      notify(next)
    } catch {
      setError('Failed to delete provider')
    }
  }

  const startEdit = (p) => {
    setEditId(p.id)
    setEditForm({ name: p.name, email: p.email || '', phone: p.phone || '', website: p.website || '', notes: p.notes || '' })
    setError('')
  }

  const renderForm = (form, setForm, onSubmit, onCancel) => (
    <div className="manage-provider-form">
      <div className="manage-provider-form-grid">
        <input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      </div>
      <textarea placeholder="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <div className="manage-provider-form-actions">
        <button className="btn btn-success btn-sm" onClick={onSubmit}>Save</button>
        <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Providers</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Add button / form */}
          {showAddForm ? (
            renderForm(addForm, setAddForm, handleAdd, () => { setShowAddForm(false); setAddForm({ ...EMPTY_FORM }) })
          ) : (
            <button className="btn btn-success btn-sm" style={{ marginBottom: '0.75rem' }} onClick={() => setShowAddForm(true)}>
              + Add Provider
            </button>
          )}

          {error && <p className="manage-error">{error}</p>}

          {/* List */}
          <div className="manage-list">
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '1rem' }}>Loading...</p>
            ) : providers.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '1rem' }}>No providers yet.</p>
            ) : (
              providers.map((p) => (
                <div key={p.id} className="manage-list-row manage-provider-row">
                  {editId === p.id ? (
                    renderForm(editForm, setEditForm, () => handleEdit(p.id), () => setEditId(null))
                  ) : (
                    <>
                      <div className="manage-provider-info">
                        <span className="manage-list-name">{p.name}</span>
                        <span className="manage-provider-detail">
                          {[p.email, p.phone].filter(Boolean).join(' · ') || ''}
                        </span>
                      </div>
                      <div className="manage-list-actions">
                        <button className="btn-icon" title="Edit" onClick={() => startEdit(p)}>&#9998;</button>
                        <button className="btn-icon btn-icon-danger" title="Delete" onClick={() => handleDelete(p.id)}>&times;</button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
