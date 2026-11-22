async function fetchJson(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Send session cookies
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP error ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  async getMe() {
    return fetchJson('/auth/me');
  },
  async devLogin(payload = {}) {
    return fetchJson('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async logout() {
    return fetchJson('/auth/logout', { method: 'POST' });
  },

  // Lot & Slots
  async getLotInfo() {
    return fetchJson('/health');
  },
  async getSlots(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return fetchJson(`/api/slots${query}`);
  },
  async getSlot(id) {
    return fetchJson(`/api/slots/${id}`);
  },

  // Bookings
  async createBooking(slotId) {
    return fetchJson('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ slot_id: slotId }),
    });
  },
  async getMyBookings() {
    return fetchJson('/api/bookings/my');
  },
  async getBooking(id) {
    return fetchJson(`/api/bookings/${id}`);
  },
  async confirmArrival(bookingId, lat, lng) {
    return fetchJson(`/api/bookings/${bookingId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    });
  },
  async releaseBooking(bookingId) {
    return fetchJson(`/api/bookings/${bookingId}/release`, {
      method: 'POST',
    });
  },
};
