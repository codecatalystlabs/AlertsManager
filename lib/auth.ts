import { normalizeAlertFromApi } from '@/lib/alert-normalize'
import { getClientApiBaseUrl } from '@/lib/api-config'
import { notifyAuthStatusChange } from '@/lib/auth-events'
import { notifyAlertsChanged } from '@/lib/alerts-events'
import { clearPersistedSwrCache } from '@/lib/swr-cache-provider'
import type { Scope } from '@/lib/access'

const API_BASE_URL = getClientApiBaseUrl()

function parseCountFromResponse(data: unknown): number {
    if (typeof data === 'number') return data;
    if (!data || typeof data !== 'object') return 0;
    const body = data as Record<string, unknown>;
    const nested = body.data as Record<string, unknown> | undefined;
    return Number(
        body.count ??
            body.total ??
            nested?.count ??
            nested?.total ??
            0
    );
}

interface LoginCredentials {
    username: string
    password: string
}

/**
 * The signed-in account, as POST /login and GET /users/profile return it. The
 * role, area and permissions are what lib/access.ts reads to decide what to
 * show; the API enforces them regardless.
 */
export interface User {
    id: number
    username: string
    firstName: string
    lastName: string
    otherName: string
    email: string
    affiliation: string
    userType: string
    /** Mirror of the role's name, kept for older readers. */
    level: string
    role?: { id: number; name: string; scope: Scope; isSystem: boolean } | null
    /** Effective scope: national, one region or one district. */
    scope?: Scope
    /** The built-in administrator: every permission. */
    isSuperAdmin?: boolean
    /** Permission codes the role grants (see lib/access.ts PERM). */
    permissions?: string[]
    /** District a district-scoped account is limited to. */
    district?: string | null
    /** Region a region-scoped account is limited to. */
    region?: string | null
    isActive?: boolean
    lastLoginAt?: string | null
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
    channelOfReporting?: string
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
    /** Minimum dataset item 4: estimated number affected. null = reporter did not know. */
    numberAffected?: number | null
    /** Triage priority (High/Medium/Low). Absent = not yet triaged. */
    priority?: string | null
    /** Annex I / Annex II signal code named at triage (CH1, FH3, CE4…). */
    signalCode?: string | null
    /**
     * Which exit the signal took at the triage gate: "Forwarded to
     * Verification" | "Logged" | "Discarded". Absent = not yet triaged.
     */
    triageDecision?: string | null
    /** Why that decision was reached (required when the signal leaves the pipeline). */
    triageReason?: string | null
    /** The earlier signal this one duplicates, when discarded as a duplicate. */
    triageDuplicateOf?: number | null
    triagedAt?: string | null
    triagedBy?: string | null
    /** Verification outcome: Confirmed | Discarded | Escalated to Field. */
    verificationOutcome?: string | null
    /** Comma-joined response actions taken. */
    responseActions?: string | null
    /** The verifier's description of the decision. Mandatory on every conclusion. */
    verificationNote?: string | null
    /**
     * An attempt that did NOT conclude: why the signal could not be verified.
     * Carries no outcome, so the signal stays in the verification queue.
     */
    verificationPendingReason?: string | null
    verificationAttemptedAt?: string | null
    verificationAttemptedBy?: string | null
    /** Which level reached the current outcome: "Desk" | "Field". */
    verificationLevel?: string | null
    /** Why it was discarded, from DISCARD_REASONS. */
    discardReason?: string | null
    /** The desk → field handover: when, by whom, and what was asked for. */
    escalatedToFieldAt?: string | null
    escalatedToFieldBy?: string | null
    fieldVerificationRequest?: string | null
    /** The field team's own conclusion, kept apart from the desk's note. */
    fieldVerifiedAt?: string | null
    fieldVerifiedBy?: string | null
    fieldVerificationNote?: string | null
    /** Risk assessment (EBS step 4). */
    riskLevel?: string | null
    riskSevere?: boolean | null
    riskSpread?: boolean | null
    riskControl?: boolean | null
    riskAssessedAt?: string | null
    riskAssessedBy?: string | null
    /** Risk-assessment worksheet. */
    riskLikelihood?: string | null
    riskImpact?: string | null
    riskHazardNote?: string | null
    riskExposureNote?: string | null
    riskContextNote?: string | null
    riskTeamLead?: string | null
    riskTeamMembers?: string | null
    /** "What action have you taken?" — comma-joined; see lib/alert-risk.ts. */
    riskActionTaken?: string | null
    riskEvacuationFacility?: string | null
    riskEvacuationFacilityUid?: string | null
    /** Reporter feedback (EBS step 7). */
    feedbackGivenAt?: string | null
    feedbackBy?: string | null
    feedbackChannel?: string | null
    caseVerificationDesk?: string
    fieldVerification?: string
    fieldVerificationDecision?: string
    feedback?: string
    labSamplesCollected?: string
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
    /** When it was moved or logged in from a feed; null if logged directly. */
    forwardedAt?: string | null
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
                credentials: 'omit',
            })

            if (!response.ok) {
                let errorMessage = 'Login failed'
                let serverMessage = ''
                try {
                    const errorData: ApiError & { error?: string } = await response.json()
                    serverMessage = errorData.error || errorData.message || ''
                    errorMessage = serverMessage || errorMessage
                } catch (e) {
                    // If response is not JSON, use status text
                    errorMessage = response.statusText || errorMessage
                }

                // Handle specific HTTP status codes
                if (response.status === 401) {
                    errorMessage = 'Invalid username or password'
                } else if (response.status === 403) {
                    // The password was right but the account cannot sign in:
                    // no role, or deactivated. The server says which.
                    errorMessage = serverMessage || 'Access denied'
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
                        credentials: 'omit',
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
        if (typeof window === 'undefined') return
        try {
            localStorage.removeItem(this.TOKEN_KEY)
            localStorage.removeItem(this.USER_KEY)
        } catch {
            /* private mode / storage disabled */
        }
        // Drop the persisted SWR cache so a new login never sees the prior user's data.
        clearPersistedSwrCache()
        notifyAuthStatusChange()
    }

    static setToken(token: string): void {
        if (typeof window === 'undefined') return
        try {
            localStorage.setItem(this.TOKEN_KEY, token)
        } catch {
            /* private mode / storage disabled */
        }
        notifyAuthStatusChange()
    }

    static getToken(): string | null {
        if (typeof window === 'undefined') return null
        try {
            return localStorage.getItem(this.TOKEN_KEY)
        } catch {
            return null
        }
    }

    private static decodeJwtPayload(token: string): Record<string, unknown> | null {
        try {
            const parts = token.split('.')
            if (parts.length !== 3) return null

            const base64Url = parts[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
            return JSON.parse(atob(padded))
        } catch {
            return null
        }
    }

    static setUser(user: User): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user))
            notifyAuthStatusChange()
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
            notifyAlertsChanged()
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

            notifyAlertsChanged()
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
            return normalizeAlertFromApi(alert)
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

            const updatedAlert = normalizeAlertFromApi(await response.json())
            notifyAlertsChanged()
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
            return parseCountFromResponse(data)
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
            return parseCountFromResponse(data)
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

    /**
     * Record an ATTEMPT that did not conclude — "no, I have not verified this
     * signal" plus the reason.
     *
     * Hits the same endpoint as a conclusion, with `verified: false`, which the
     * server routes to a branch that writes ONLY the reason: no outcome, no
     * is_verified, no verification timestamp. The signal keeps its place in the
     * verification queue and its SLA clock keeps running, because an attempt is
     * not a verification.
     */
    static async recordVerificationAttempt(alertId: number, data: {
        token: string
        verificationPendingReason: string
        verifiedBy?: string
    }): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, verified: false }),
            credentials: 'omit',
        })

        if (!response.ok) {
            let errorMessage = 'Failed to record the verification attempt'
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorData.error || errorMessage
            } catch {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        notifyAlertsChanged()
    }

    /**
     * Record a CONCLUDED verification (EBS step 3).
     *
     * Every field is optional except the token and the two things a conclusion
     * must carry: the outcome and the verifier's note. The verify endpoint only
     * writes columns the client actually sent, so a short payload can no longer
     * blank case data — which is what let the form stop being a case
     * investigation. The wider fields remain accepted for the paths that still
     * submit them.
     */
    static async verifyAlert(alertId: number, verificationData: {
        token: string
        /** Answer to "have you verified this signal?". False takes the pending path. */
        verified?: boolean
        /** Confirmed | Discarded | Escalated to Field. Required on a conclusion. */
        verificationOutcome?: string
        /** The verifier's description of the decision. */
        verificationNote?: string
        /**
         * Which level answered: "Desk" (default) or "Field". Only the desk may
         * escalate, and a field note is stored separately from the desk's so a
         * visit adds to the record rather than overwriting it.
         */
        verificationLevel?: string
        /** One of DISCARD_REASONS. Required by the server on a discard. */
        discardReason?: string
        /** What the desk is asking the field team to check, on an escalation. */
        fieldVerificationRequest?: string
        status?: string
        /** Suspected etiology — an alertResponse code. */
        response?: string
        verificationDate?: string
        verificationTime?: string
        verifiedBy?: string
        isVerified?: boolean
        /** EBS step 6. Kept accepted so the EMS-evacuation trigger stays reachable. */
        responseActions?: string[]
        caseCode?: string
    }): Promise<{ alert: Alert; emsNotified: boolean; emsDispatched: boolean }> {
        try {
            const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // The endpoint is public (the one-time token in the body is
                    // what authorises it), but a signed-in verifier's token lets
                    // the backend name them in the audit trail. Without it every
                    // desk verification was recorded with no user. No token →
                    // anonymous, exactly as before.
                    ...this.getAuthHeaders(),
                },
                body: JSON.stringify(verificationData),
                credentials: 'omit',
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
            notifyAlertsChanged()
            // emsNotified: this verification registered the case for EMS
            // evacuation. emsDispatched: a webhook was actually POSTed to the
            // EMS system (false when only the EMS pull feed serves it).
            return {
                alert: data.alert,
                emsNotified: Boolean(data.emsNotified),
                emsDispatched: Boolean(data.emsDispatched),
            }
        } catch (error) {
            console.error('Error verifying alert:', error)
            throw error
        }
    }

    // PURE: no side effects. It is read from useSyncExternalStore's getSnapshot
    // during render, so it must never mutate storage or dispatch events (that
    // violates React's snapshot purity and is fragile under concurrent rendering).
    // Proactive cleanup of an expired/invalid token lives in clearSessionIfExpired,
    // which is called from an effect.
    static isAuthenticated(): boolean {
        try {
            const token = this.getToken()
            if (!token) return false

            const payload = this.decodeJwtPayload(token)
            if (!payload) return false

            if (typeof payload.exp === 'number') {
                return payload.exp > Date.now() / 1000
            }

            // Valid JWT shape but no expiry claim — treat as authenticated
            return true
        } catch {
            return false
        }
    }

    /**
     * Drop an expired or malformed token (and the cached user/SWR data) from
     * storage. Safe to call from an effect — NOT from render — because
     * clearLocalStorage dispatches an auth-change event. Without this an expired
     * token lingered until the next API call happened to 401.
     */
    static clearSessionIfExpired(): void {
        if (typeof window === 'undefined') return
        const token = this.getToken()
        if (!token) return
        const payload = this.decodeJwtPayload(token)
        const expired =
            !payload ||
            (typeof payload.exp === 'number' && payload.exp <= Date.now() / 1000)
        if (expired) {
            this.clearLocalStorage()
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
            // Auth uses the Bearer token above, not cookies. Omitting credentials
            // keeps the (shared, often huge) localhost cookie jar out of API
            // requests, which otherwise triggers 431 Request Header Fields Too Large.
            credentials: 'omit',
        })

        // 401: the token expired, or an administrator deactivated the account
        // (code "inactive"). 403 "no_role": the account's role was removed.
        // Either way the session is over; the login page says why.
        if (response.status === 401 || response.status === 403) {
            const code = await AuthService.accessCode(response)
            if (response.status === 401 || code === 'no_role') {
                this.clearLocalStorage()
                window.location.href = code ? `/login?reason=${code}` : '/login'
                throw new Error(
                    code === 'inactive'
                        ? 'Your account has been deactivated.'
                        : code === 'no_role'
                          ? 'Your account has no access role.'
                          : 'Session expired. Please login again.'
                )
            }
        }

        return response
    }

    /** The "code" of an access-failure body, read without consuming it. */
    private static async accessCode(response: Response): Promise<string | null> {
        try {
            const body = await response.clone().json()
            return typeof body?.code === 'string' ? body.code : null
        } catch {
            return null
        }
    }
} 