// src/components/OrdinookiSelectionModal.js
import React, { useState, useEffect } from 'react';
import './OrdinookiSelectionModal.css'; // Ensure you have appropriate CSS

/**
 * OrdinookiSelectionModal Component
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Function to close the modal
 * @param {function} props.onConfirm - Function to confirm the selection
 * @param {string} props.mode - 'challenge' | 'accept'
 */
const OrdinookiSelectionModal = ({ isOpen, onClose, onConfirm, mode }) => {
  const [ordinookis, setOrdinookis] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchOrdinookis();
    }
  }, [isOpen]);

  const fetchOrdinookis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ordinookis', { // Ensure proxy is set or use absolute URL
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`, // Adjust based on your auth storage
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Ordinookis.');
      }

      const data = await response.json();
      setOrdinookis(data.ordinookis); // Adjust based on your API response
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching Ordinookis.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
  if (!selectedId) {
    setError('Please select an Ordinooki.');
    return;
  }

  setConfirming(true);
  setError(null);
  try {
    // Update selected Ordinooki in the backend
    const response = await fetch('/api/auth/update-ordinookis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        ordinookiIds: [selectedId],
        selectedId: selectedId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update selected Ordinooki.');
    }

    // Notify parent component
    onConfirm(selectedId); // This calls handleOrdinookiConfirm in Game.js
    onClose();
  } catch (err) {
    console.error(err);
    setError(err.message || 'An error occurred while updating Ordinooki.');
  } finally {
    setConfirming(false);
  }
};

  if (!isOpen) return null;

  return (
    <div className="ordinooki-modal-overlay">
      <div className="ordinooki-modal">
        <h2>Select Ordinooki for Battle</h2>
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
        {loading ? (
          <p>Loading Ordinookis...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : ordinookis.length === 0 ? (
          <p>No Ordinookis available for selection.</p>
        ) : (
          <div className="ordinooki-list">
            {ordinookis.map((ordinooki) => (
              <div
                key={ordinooki.id}
                className={`ordinooki-item ${selectedId === ordinooki.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(ordinooki.id)}
              >
                <img
                  src={`https://static.unisat.io/content/${ordinooki.id}`} // Ensure correct URL and extension
                  alt={ordinooki.meta.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/path/to/placeholder.png'; // Provide a valid placeholder image path
                  }}
                />
                <p>{ordinooki.meta.name}</p>
              </div>
            ))}
          </div>
        )}
        <button
          className="confirm-button"
          onClick={handleConfirm}
          disabled={confirming || loading}
        >
          {confirming ? 'Confirming...' : 'Confirm Selection'}
        </button>
      </div>
    </div>
  );
};

export default OrdinookiSelectionModal;
