// src/components/Popup.js
import React from 'react';
import './Popup.css';

const Popup = ({ message, onCancel, onConfirm }) => {
  return (
    <>
      <div className="popup-overlay" onClick={onCancel}></div>
      <div className="popup">
        <p>{message}</p>
        <button className="cancel_btn" onClick={onCancel}>Cancel</button>
        <button className="logout_btn" onClick={onConfirm}>Logout</button>
      </div>
    </>
  );
};

export default Popup;
