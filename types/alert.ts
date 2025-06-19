export interface Alert {
  id: string
  date: string
  callTime: string
  alertReportedBefore: boolean
  nameOfPersonReporting: string
  numberOfPersonReporting: string
  status: AlertStatus
  response: AlertResponse
  alertLocation: {
    district: string
    subcounty: string
    village: string
    parish: string
  }
  sourceOfAlert: AlertSource
  caseAlertDescription: string
  caseName: string
  caseAge: number
  caseSex: "Male" | "Female"
  nameOfNextOfKin: string
  nextOfKinPhoneNumber: string
  narrative: string
  signsAndSymptoms: string[]
  createdAt: string
  updatedAt: string
}

export type AlertStatus = "Pending" | "Verified" | "Investigating" | "Resolved" | "False Alarm"
export type AlertResponse = "Immediate" | "Within 24 Hours" | "Routine" | "No Action Required"
export type AlertSource = "VHT" | "Facility" | "Community" | "Health Worker" | "Other"

export interface User {
  id: string
  name: string
  email: string
  role: "Admin" | "Operator" | "Viewer"
  createdAt: string
}

export interface DashboardStats {
  verifiedWithinHour: number
  notVerifiedIn59Minutes: number
  notVerifiedOverHour: number
  notVerifiedWithin24Hours: number
}
