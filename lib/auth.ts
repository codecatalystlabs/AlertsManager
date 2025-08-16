const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8089/api/v1'

interface LoginCredentials {
    username: string
    password: string
}

// Updated user interface to match API response
export interface User {
    id: number
    username: string
    firstName: string
    lastName: string
    otherName: string
    email: string
    affiliation: string
    userType: string
    level: string
    createdAt: string
    updatedAt: string
}

// Alert interface to match the Go struct
export interface Alert {
    id?: number
    status: string
    date: string
    time: string
    callTaker?: string
    cifNo?: string
    personReporting: string
    village?: string
    subCounty?: string
    contactNumber: string
    sourceOfAlert: string
    alertCaseName: string
    alertCaseAge: number
    alertCaseSex: string
    alertCasePregnantDuration?: number
    alertCaseVillage?: string
    alertCaseParish?: string
    alertCaseSubCounty?: string
    alertCaseDistrict?: string
    alertCaseNationality?: string
    pointOfContactName?: string
    pointOfContactRelationship?: string
    pointOfContactPhone?: string
    history?: string
    healthFacilityVisit?: string
    traditionalHealerVisit?: string
    symptoms?: string
    actions?: string
    caseVerificationDesk?: string
    fieldVerification?: string
    fieldVerificationDecision?: string
    feedback?: string
    labResult?: string
    labResultDate?: string | null
    isHighlighted?: boolean
    assignedTo?: string
    alertReportedBefore?: string
    alertFrom?: string
    verified?: string
    comments?: string
    verificationDate?: string | null
    verificationTime?: string | null
    response?: string
    narrative?: string
    facilityType?: string
    facility?: string
    isVerified?: boolean
    verifiedBy?: string
    region?: string
    createdAt?: string
    updatedAt?: string
}

interface LoginResponse {
    token: string
    user?: User
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
                    const errorData: ApiError = await response.json()
                    errorMessage = errorData.message || errorMessage
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

    static setUser(user: User): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user))
        }
    }

    static getUser(): User | null {
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

    static async fetchUserProfile(): Promise<User> {
        try {
            const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/users/profile`, {
                method: 'GET',
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch user profile: ${response.statusText}`)
            }

            const userData = await response.json()

            // Update stored user data
            this.setUser(userData)

            return userData
        } catch (error) {
            console.error('Error fetching user profile:', error)
            throw error
        }
    }

    static async fetchAllUsers(): Promise<User[]> {
        try {
            const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/users/all`, {
                method: 'GET',
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch users: ${response.statusText}`)
            }

            const users = await response.json()
            return users
        } catch (error) {
            console.error('Error fetching users:', error)
            throw error
        }
    }

    static async registerUser(userData: {
        username: string
        password: string
        firstName: string
        lastName: string
        otherName?: string
        email: string
        affiliation: string
        userType?: string
        level?: string
    }): Promise<User> {
        try {
            const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/users/register`, {
                method: 'POST',
                body: JSON.stringify(userData),
            })

            if (!response.ok) {
                let errorMessage = 'Failed to register user'
                try {
                    const errorData = await response.json()
                    errorMessage = errorData.message || errorMessage
                } catch (e) {
                    errorMessage = response.statusText || errorMessage
                }
                throw new Error(errorMessage)
            }

            const newUser = await response.json()
            return newUser
        } catch (error) {
            console.error('Error registering user:', error)
            throw error
        }
    }

    // Alert Management Methods
    static async createAlert(alertData: Partial<Alert>): Promise<Alert> {
        try {
            console.log("AuthService.createAlert called with:", alertData); // Debug log

            // Helper function to format time properly
            const formatTime = (timeString?: string): string => {
                if (!timeString) return new Date().toISOString();

                // If it's already an ISO string, use it
                if (timeString.includes('T')) {
                    return new Date(timeString).toISOString();
                }

                // If it's in HH:MM format, create a proper date
                if (timeString.match(/^\d{2}:\d{2}$/)) {
                    const today = new Date();
                    const [hours, minutes] = timeString.split(':');
                    today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                    return today.toISOString();
                }

                // Fallback to current time
                return new Date().toISOString();
            };

            // Format the data to match the Go struct expectations
            const formattedData = {
                ...alertData,
                // Ensure date and time are properly formatted
                date: alertData.date ? new Date(alertData.date).toISOString() : new Date().toISOString(),
                time: formatTime(alertData.time),
                // Ensure required fields have default values
                status: alertData.status || "Pending",
                response: alertData.response || "Routine",
                alertCaseAge: alertData.alertCaseAge || 0,
                isHighlighted: alertData.isHighlighted || false,
                isVerified: alertData.isVerified || false,
                // Convert boolean to string for alertReportedBefore if needed
                alertReportedBefore: alertData.alertReportedBefore === "yes" ? "Yes" :
                    alertData.alertReportedBefore === "no" ? "No" :
                        alertData.alertReportedBefore || "No",
            };

            console.log("Formatted data for API:", formattedData); // Debug log

            const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/alerts/create`, {
                method: 'POST',
                body: JSON.stringify(formattedData),
            })

            console.log("API response status:", response.status); // Debug log

            if (!response.ok) {
                let errorMessage = 'Failed to create alert'
                try {
                    const errorData = await response.json()
                    console.log("API error response:", errorData); // Debug log
                    errorMessage = errorData.message || errorData.error || errorMessage
                } catch (e) {
                    console.log("Could not parse error response:", e); // Debug log
                    errorMessage = response.statusText || errorMessage
                }
                throw new Error(errorMessage)
            }

            const newAlert = await response.json()
            console.log("Alert created successfully:", newAlert); // Debug log
            return newAlert
        } catch (error) {
            console.error('Error creating alert:', error)
            throw error
        }
    }

    static async deleteAlert(alertId: number): Promise<void> {
        try {
            const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/alerts/${alertId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                let errorMessage = 'Failed to delete alert'
                try {
                    const errorData = await response.json()
                    errorMessage = errorData.message || errorMessage
                } catch (e) {
                    errorMessage = response.statusText || errorMessage
                }
                throw new Error(errorMessage)
            }
        } catch (error) {
            console.error('Error deleting alert:', error)
            throw error
        }
    }

    static async fetchAlert(alertId: number): Promise<Alert> {
        try {
            const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/alerts/${alertId}`, {
                method: 'GET',
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch alert: ${response.statusText}`)
            }

            const alert = await response.json()
            return alert
        } catch (error) {
            console.error('Error fetching alert:', error)
            throw error
        }
    }

    static async updateAlert(alertId: number, alertData: Partial<Alert>): Promise<Alert> {
        try {
            const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/alerts/${alertId}`, {
                method: 'PUT',
                body: JSON.stringify(alertData),
            })

            if (!response.ok) {
                let errorMessage = 'Failed to update alert'
                try {
                    const errorData = await response.json()
                    errorMessage = errorData.message || errorMessage
                } catch (e) {
                    errorMessage = response.statusText || errorMessage
                }
                throw new Error(errorMessage)
            }

            const updatedAlert = await response.json()
            return updatedAlert
        } catch (error) {
            console.error('Error updating alert:', error)
            throw error
        }
    }

    static async fetchVerifiedAlertsCount(): Promise<number> {
        try {
            const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/alerts/verified/count`, {
                method: 'GET',
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch verified alerts count: ${response.statusText}`)
            }

            const data = await response.json()
            return data.count || 0
        } catch (error) {
            console.error('Error fetching verified alerts count:', error)
            throw error
        }
    }

    static async fetchNotVerifiedAlertsCount(): Promise<number> {
        try {
            const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/alerts/not-verified/count`, {
                method: 'GET',
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch not-verified alerts count: ${response.statusText}`)
            }

            const data = await response.json()
            return data.count || 0
        } catch (error) {
            console.error('Error fetching not-verified alerts count:', error)
            throw error
        }
    }

    static async fetchAlertCounts(): Promise<{
        verified: number
        notVerified: number
        total: number
    }> {
        try {
            const [verifiedCount, notVerifiedCount] = await Promise.all([
                this.fetchVerifiedAlertsCount(),
                this.fetchNotVerifiedAlertsCount()
            ])

            return {
                verified: verifiedCount,
                notVerified: notVerifiedCount,
                total: verifiedCount + notVerifiedCount
            }
        } catch (error) {
            console.error('Error fetching alert counts:', error)
            throw error
        }
    }

    // Alert Verification Methods
    static async generateVerificationToken(alertId: number): Promise<{ token: string; alertId: number }> {
        try {
            const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/alerts/${alertId}/generate-token`, {
                method: 'POST',
            })

            if (!response.ok) {
                let errorMessage = 'Failed to generate verification token'
                try {
                    const errorData = await response.json()
                    errorMessage = errorData.message || errorData.error || errorMessage
                } catch (e) {
                    errorMessage = response.statusText || errorMessage
                }
                throw new Error(errorMessage)
            }

            const data = await response.json()
            return {
                token: data.token,
                alertId: data.alertId
            }
        } catch (error) {
            console.error('Error generating verification token:', error)
            throw error
        }
    }

    static async verifyAlert(alertId: number, verificationData: {
        token: string
        status: string
        verificationDate: string
        verificationTime: string
        cifNo: string
        personReporting: string
        village: string
        subCounty: string
        contactNumber: string
        sourceOfAlert: string
        alertCaseName: string
        alertCaseAge: number
        alertCaseSex: string
        alertCasePregnantDuration: number
        alertCaseVillage: string
        alertCaseParish: string
        alertCaseSubCounty: string
        alertCaseDistrict: string
        alertCaseNationality: string
        pointOfContactName: string
        pointOfContactRelationship: string
        pointOfContactPhone: string
        history: string
        healthFacilityVisit: string
        traditionalHealerVisit: string
        symptoms: string
        actions: string
        feedback: string
        verifiedBy: string
        deskVerificationActions: string
        fieldVerificationFeedback: string
        caseCode?: string
    }): Promise<Alert> {
        try {
            const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(verificationData),
            })

            if (!response.ok) {
                let errorMessage = 'Failed to verify alert'
                try {
                    const errorData = await response.json()
                    errorMessage = errorData.message || errorData.error || errorMessage
                } catch (e) {
                    errorMessage = response.statusText || errorMessage
                }
                throw new Error(errorMessage)
            }

            const data = await response.json()
            return data.alert
        } catch (error) {
            console.error('Error verifying alert:', error)
            throw error
        }
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