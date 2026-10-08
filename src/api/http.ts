import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

export const TOKEN_KEY = 'dq_token'

/** الشكل الموحّد لردود الباك اند (ApiResponser) */
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  code: number
  data: T
  total?: number
  skip?: number | string
  limit?: number | string
  errors?: Record<string, string[]> | null
}

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>
  data: any

  constructor(message: string, status = 0, errors: Record<string, string[]> = {}, data: any = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.data = data
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api',
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLoginRequest = error.config?.url?.includes('auth/access-tokens') && error.config?.method === 'post'
    if (error.response?.status === 401 && !isLoginRequest) {
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

const STATUS_MESSAGES: Record<number, string> = {
  401: 'انتهت الجلسة، يرجى تسجيل الدخول من جديد',
  403: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
  404: 'العنصر المطلوب غير موجود',
  419: 'انتهت صلاحية الجلسة',
  429: 'محاولات كثيرة، يرجى الانتظار قليلاً',
  500: 'حدث خطأ في الخادم',
  502: 'تعذّر الاتصال بالخدمة الخارجية',
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiError('تعذّر الاتصال بالخادم، تأكد من تشغيل الباك اند وعنوان الـ API')
    }
    const { status, data } = error.response as { status: number; data: any }
    const serverMessage: string | undefined = data?.message
    // رسائل Laravel الافتراضية بالإنجليزية تُستبدل برسالة عربية حسب رمز الحالة
    const isDefaultEnglish = !serverMessage || /^[\x00-\x7F]*$/.test(serverMessage)
    const message = isDefaultEnglish ? (STATUS_MESSAGES[status] ?? serverMessage ?? 'حدث خطأ غير متوقع') : serverMessage
    return new ApiError(message, status, data?.errors ?? {}, data?.data ?? null)
  }

  return new ApiError(error instanceof Error ? error.message : 'حدث خطأ غير متوقع')
}

/** يحذف القيم الفارغة من معاملات الاستعلام */
export function cleanParams(params: Record<string, any> = {}): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    out[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value
  }
  return out
}

async function request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  try {
    const response = await http.request<ApiResponse<T>>(config)
    return response.data
  } catch (error) {
    throw toApiError(error)
  }
}

export const api = {
  get: <T = any>(url: string, params?: Record<string, any>) =>
    request<T>({ method: 'get', url, params: cleanParams(params) }),
  post: <T = any>(url: string, data?: any) => request<T>({ method: 'post', url, data }),
  put: <T = any>(url: string, data?: any) => request<T>({ method: 'put', url, data }),
  delete: <T = any>(url: string, data?: any) => request<T>({ method: 'delete', url, data }),

  /** إرسال multipart؛ التعديل يتم عبر POST مع _method=PUT لأن PHP لا يقرأ ملفات PUT */
  upload: <T = any>(url: string, fields: Record<string, any>, method: 'post' | 'put' = 'post') => {
    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) {
      if (value === null || value === undefined || value === '') continue
      if (typeof value === 'boolean') form.append(key, value ? '1' : '0')
      else form.append(key, value)
    }
    if (method === 'put') form.append('_method', 'PUT')
    return request<T>({ method: 'post', url, data: form })
  },

  /** تنزيل ملف (تصدير Excel) */
  async download(url: string, filename: string, params?: Record<string, any>) {
    try {
      const response = await http.get(url, { params: cleanParams(params), responseType: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(response.data)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      throw toApiError(error)
    }
  },
}

/** الجذر العام للباك اند (لروابط الملفات مثل storage/...) */
export const backendOrigin = (http.defaults.baseURL ?? '').replace(/\/api\/?$/, '')
