const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('trustlayer_token') : null;
  
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('trustlayer_token');
      localStorage.removeItem('trustlayer_user');
      window.location.href = '/login';
    }
    throw new Error(data.error || data.detail || JSON.stringify(data));
  }

  return data;
}

// Auth
export const sendOTP = (phone_number, full_name = '') =>
  request('/auth/send-otp/', { method: 'POST', body: JSON.stringify({ phone_number, full_name }) });

export const verifyOTP = (phone_number, otp_code) =>
  request('/auth/verify-otp/', { method: 'POST', body: JSON.stringify({ phone_number, otp_code }) });

export const getProfile = () => request('/auth/profile/');

export const demoOAuthLogin = (role) =>
  request('/auth/demo-login/', { method: 'POST', body: JSON.stringify({ role }) });

export const googleOAuthLogin = (credential) =>
  request('/auth/google-login/', { method: 'POST', body: JSON.stringify({ credential }) });

// Contracts
export const listContracts = () => request('/contracts/');
export const listAvailableContracts = () => request('/contracts/available/');
export const getContract = (id) => request(`/contracts/${id}/`);

export const createContract = (data) =>
  request('/contracts/', { method: 'POST', body: JSON.stringify(data) });

export const contractAction = (id, action, payload = {}) => {
  const safeAction = action.replace(/_/g, '-');
  return request(`/contracts/${id}/${safeAction}/`, { method: 'POST', body: JSON.stringify(payload) });
};

export const submitWork = (id, description, file) => {
  const formData = new FormData();
  formData.append('description', description);
  if (file) formData.append('file', file);
  return request(`/contracts/${id}/submit-work/`, { method: 'POST', body: formData });
};

// Escrow
export const getEscrowStatus = (contractId) =>
  request(`/escrow/${contractId}/status/`);

// Disputes
export const listDisputes = () => request('/disputes/');

export const createDispute = (contractId, reason) =>
  request(`/disputes/contract/${contractId}/`, { method: 'POST', body: JSON.stringify({ reason }) });

export const resolveDispute = (disputeId, data) =>
  request(`/disputes/${disputeId}/resolve/`, { method: 'POST', body: JSON.stringify(data) });

// AI
export const parseContractAI = (text) =>
  request('/ai/parse-contract/', { method: 'POST', body: JSON.stringify({ text }) });

export const parseContractDemo = (text) =>
  request('/ai/parse-contract/demo/', { method: 'POST', body: JSON.stringify({ text }) });

// Blockchain
export const getContractHashToSign = (contractId) =>
  request(`/blockchain/hash/${contractId}/`);

export const registerOnBlockchain = (contractId) =>
  request(`/blockchain/register/${contractId}/`, { method: 'POST', body: JSON.stringify({}) });

export const verifyOnBlockchain = (contractId) =>
  request(`/blockchain/verify/${contractId}/`);
