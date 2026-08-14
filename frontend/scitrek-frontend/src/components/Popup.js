// src/components/Popup.js
import React, { useEffect } from 'react';
import './Popup.css';

const Popup = ({ message, onCancel, onConfirm }) => {
  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <>
      <div className="popup-overlay" onClick={onCancel}></div>
      <div
        className="popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
      >
        <p id="logout-dialog-title">{message}</p>
        <button className="cancel_btn" onClick={onCancel}>Cancel</button>
        <button className="logout_btn" onClick={onConfirm}>Logout</button>
      </div>
    </>
  );
};

export default Popup;
