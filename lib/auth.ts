const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8089/api/v1'

interface LoginCredentials {
    username: string
    password: string
}

interface LoginResponse {
    token: string
    user?: {
        id: string
        username: string
        email: string
        level: string
        affiliation: string
        userType: string
    }
}

interface ApiError {
    message: string
    code?: string
    details?: any
}

export class AuthService {
    private static readonly TOKEN_KEY = 'uganda_health_auth_token'
    private static readonly USER_KEY = 'uganda_health_user'

    static async login(credentials: LoginCredentials): Promise<LoginResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            })

            if (!response.ok) {
                let errorMessage = 'Login failed'
                try {
                    const errorData = await response.json()
                    errorMessage = errorData.message || errorData.error || errorMessage
                } catch (e) {
                    // If response is not JSON, use status text
                    errorMessage = response.statusText || errorMessage
                }

                // Handle specific HTTP status codes
                if (response.status === 401) {
                    errorMessage = 'Invalid username or password'
                } else if (response.status === 403) {
                    errorMessage = 'Access denied'
                } else if (response.status === 404) {
                    errorMessage = 'Login service not found'
                } else if (response.status >= 500) {
                    errorMessage = 'Server error. Please try again later.'
                }

                throw new Error(errorMessage)
            }

            const data = await response.json()

            // Store token and user data
            if (data.token) {
                this.setToken(data.token)
                if (data.user) {
                    this.setUser(data.user)
                }
            } else {
                throw new Error('No authentication token received')
            }

            return data
        } catch (error) {
            // Handle network errors
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('Cannot connect to server. Please check your internet connection.')
            }
            throw error
        }
    }

    static async logout(): Promise<void> {
        try {
            // Call the logout API endpoint if we have a token
            const token = this.getToken()
            if (token) {
                try {
                    await fetch(`${API_BASE_URL}/users/logout`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                    })
                    // Note: We don't throw errors here because we want to clear local storage regardless
                } catch (error) {
                    console.warn('Logout API call failed, but continuing with local cleanup:', error)
                }
            }
        } finally {
            // Always clear local storage, regardless of API call success
            this.clearLocalStorage()
        }
    }

    static clearLocalStorage(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(this.TOKEN_KEY)
            localStorage.removeItem(this.USER_KEY)
        }
    }

    static setToken(token: string): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.TOKEN_KEY, token)
        }
    }

    static getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(this.TOKEN_KEY)
        }
        return null
    }

    static setUser(user: any): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user))
        }
    }

    static getUser(): any | null {
        if (typeof window !== 'undefined') {
            try {
                const userData = localStorage.getItem(this.USER_KEY)
                return userData ? JSON.parse(userData) : null
            } catch (error) {
                console.error('Error parsing user data:', error)
                return null
            }
        }
        return null
    }

    static isAuthenticated(): boolean {
        const token = this.getToken()
        if (!token) return false

        // Basic token validation (check if it's not expired)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            const currentTime = Date.now() / 1000
            return payload.exp > currentTime
        } catch (error) {
            // If token is malformed, consider it invalid
            return false
        }
    }

    static getAuthHeaders(): Record<string, string> {
        const token = this.getToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
    }

    static async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers,
        }

        const response = await fetch(url, {
            ...options,
            headers,
        })

        // If we get a 401, the token might be expired
        if (response.status === 401) {
            this.clearLocalStorage()
            window.location.href = '/login'
            throw new Error('Session expired. Please login again.')
        }

        return response
    }
} 