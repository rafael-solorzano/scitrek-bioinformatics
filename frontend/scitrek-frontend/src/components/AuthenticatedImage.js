import React, { useEffect, useState } from 'react';
import api from '../services/api';

const AuthenticatedImage = ({ src, alt, ...props }) => {
  const [objectUrl, setObjectUrl] = useState('');

  useEffect(() => {
    let active = true;
    let createdUrl = '';

    api.get(src, { responseType: 'blob' })
      .then(response => {
        if (!active) return;
        createdUrl = URL.createObjectURL(response.data);
        setObjectUrl(createdUrl);
      })
      .catch(() => {
        if (active) setObjectUrl('');
      });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  if (!objectUrl) return null;
  return <img src={objectUrl} alt={alt} {...props} />;
};

export default AuthenticatedImage;
