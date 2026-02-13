import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ApiError } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token management
let authToken: string | null = localStorage.getItem('token')

export const setAuthToken = (token: string | null) => {
  authToken = token
  if (token) {
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }
}

// Initialize token from localStorage
if (authToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const errorData = error.response?.data

    // Handle banned/suspended accounts
    if (errorData?.code === 'ACCOUNT_BANNED') {
      setAuthToken(null)
      window.location.href = '/login?error=banned'
      return Promise.reject(error)
    }

    if (errorData?.code === 'ACCOUNT_SUSPENDED') {
      setAuthToken(null)
      window.location.href = `/login?error=suspended&until=${errorData.suspendedUntil}`
      return Promise.reject(error)
    }

    // Handle 401 unauthorized
    if (error.response?.status === 401) {
      setAuthToken(null)
      window.location.href = '/login?error=session_expired'
      return Promise.reject(error)
    }

    // Handle 403 forbidden (permission denied)
    if (error.response?.status === 403) {
      // Let the caller handle permission errors
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

export default api
