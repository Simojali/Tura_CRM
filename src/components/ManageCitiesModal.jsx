import { useState, useEffect } from 'react'
import { loadCities, addCity, updateCity, deleteCity } from '../lib/referenceData'

export default function ManageCitiesModal({ onClose, onUpdate }) {
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadCities().then((data) => { setCities(data); setLoading(false) })
  }, [])

  const notify = (list) => {
    setCities(list)
    if (onUpdate) onUpdate(list)
  }

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    if (cities.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setError('City already exists')
      return
    }
    setError('')
    try {
      const created = await addCity(name)
      const next = [...cities, created].sort((a, b) => a.name.localeCompare(b.name))
      notify(next)
      setNewName('')
    } catch {
      setError('Failed to add city')
    }
  }

  const handleEdit = async (id) => {
    const name = editName.trim()
    if (!name) return
    if (cities.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      setError('City already exists')
      return
    }
    setError('')
    try {
      await updateCity(id, name)
      const next = cities.map((c) => (c.id === id ? { ...c, name } : c)).sort((a, b) => a.name.localeCompare(b.name))
      notify(next)
      setEditId(null)
    } catch {
      setError('Failed to update city')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteCity(id)
      const next = cities.filter((c) => c.id !== id)
      notify(next)
    } catch {
      setError('Failed to delete city')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Cities</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Add row */}
          <div className="manage-add-row">
            <input
              type="text"
              placeholder="New city name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button className="btn btn-success btn-sm" onClick={handleAdd}>Add</button>
          </div>

          {error && <p className="manage-error">{error}</p>}

          {/* List */}
          <div className="manage-list">
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '1rem' }}>Loading...</p>
            ) : cities.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '1rem' }}>No cities yet.</p>
            ) : (
              cities.map((city) => (
                <div key={city.id} className="manage-list-row">
                  {editId === city.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEdit(city.id)
                          if (e.key === 'Escape') setEditId(null)
                        }}
                        autoFocus
                      />
                      <button className="btn-icon" title="Save" onClick={() => handleEdit(city.id)}>&#10003;</button>
                      <button className="btn-icon" title="Cancel" onClick={() => setEditId(null)}>&#10005;</button>
                    </>
                  ) : (
                    <>
                      <span className="manage-list-name">{city.name}</span>
                      <button
                        className="btn-icon"
                        title="Edit"
                        onClick={() => { setEditId(city.id); setEditName(city.name); setError('') }}
                      >&#9998;</button>
                      <button
                        className="btn-icon btn-icon-danger"
                        title="Delete"
                        onClick={() => handleDelete(city.id)}
                      >&times;</button>
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
