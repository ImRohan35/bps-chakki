const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

export async function fetchApi(endpoint, options = {}) {
  const cleanEp = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const isAdminEndpoint = cleanEp.startsWith('/admin') || cleanEp.startsWith('/backup') || cleanEp.startsWith('/support/tickets/admin');
  const isDeliveryEndpoint = cleanEp.startsWith('/delivery');

  let token = null;
  if (isAdminEndpoint) {
    token = localStorage.getItem('bps_admin_token') || localStorage.getItem('bps_token');
  } else if (isDeliveryEndpoint) {
    token = localStorage.getItem('bps_delivery_token') || localStorage.getItem('bps_token');
  } else {
    token = localStorage.getItem('bps_token') || localStorage.getItem('bps_admin_token');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const url = `${API_BASE}${cleanEp}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.message || 'Something went wrong. Please try again.');
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}
