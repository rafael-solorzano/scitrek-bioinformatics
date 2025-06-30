import axios from 'axios';
import { getAccessToken, getRefreshToken, removeTokens } from '../utils/auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: API_BASE_URL });

// Attach access token on every request
api.interceptors.request.use(
  config => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

// Refresh token flow on 401 responses
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = getRefreshToken();
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${API_BASE_URL}/api/token/refresh/`,
            { refresh }
          );
          localStorage.setItem('accessToken', data.access);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch (e) {
          removeTokens();
          window.location.href = '/login';
          return Promise.reject(e);
        }
      } else {
        removeTokens();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// — Authentication —

// Sign in, store tokens
export const loginUser = async (username, password) => {
  const res = await axios.post(`${API_BASE_URL}/api/token/`, {
    username,
    password,
  });
  localStorage.setItem('accessToken', res.data.access);
  localStorage.setItem('refreshToken', res.data.refresh);
  return res.data;
};

// Sign up a new student
export const signupUser = async userData => {
  const res = await api.post('/api/student/signup/', userData);
  return res.data;
};

// Fetch the current student’s profile
export const getCurrentUser = async () => {
  const res = await api.get('/api/student/profile/');
  return res.data;
};

// — Classroom enrollment —

// List all classrooms a student *could* join
export const getClassrooms = async () => {
  const res = await api.get('/api/classroom/classrooms/');
  return res.data;
};

// Add the current student to a classroom by username
export const addToRoster = async (classroomId, studentUsername) => {
  const res = await api.post(
    `/api/classroom/classrooms/${classroomId}/students/add/`,
    { student_username: studentUsername }
  );
  return res.data;
};

// — Inbox —

// Fetch paginated inbox messages
export const fetchInbox = async () => {
  const res = await api.get('/api/student/inbox/');
  return res.data.results;
};

// Toggle read/unread status on a message
export const toggleReadMessage = async (messageId, isRead) => {
  const res = await api.patch(
    `/api/student/inbox/${messageId}/read/`,
    { is_read: isRead }
  );
  return res.data;
};

// — Modules —

// Fetch list of all modules (Day 1–5)
export const fetchModules = async () => {
  const res = await api.get('/api/student/modules/');
  return res.data;
};

// Fetch one module’s detail
export const fetchModuleDetail = async moduleId => {
  const res = await api.get(`/api/student/modules/${moduleId}/`);
  return res.data;
};

// — Student Responses —

// Get existing answers for a module
export const getResponseDetail = moduleId =>
  api.get(`/api/student/modules/${moduleId}/response/detail/`).then(res => res.data);

// Create or update answers for a module
export const upsertResponse = (moduleId, answers) =>
  api
    .post(`/api/student/modules/${moduleId}/response/`, { answers })
    .then(res => res.data);

// — Workbooks —

// Fetch all workbooks
export const getWorkbooks = () =>
  api.get('/api/workbooks/workbooks/').then(res => res.data.results || []);

// Fetch one workbook with all of its sections
export const getWorkbookDetail = (workbookId, includeToc = false) =>
  api
    .get(`/api/workbooks/workbooks/${workbookId}/`, {
      params: { include_toc: includeToc }
    })
    .then(res => res.data);

export default api;
