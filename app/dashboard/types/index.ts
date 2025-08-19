// Enhanced Alert interface
interface DashboardAlert {
    id: string;
    personCalling: string;
    source: string;
    phone: string;
    date: string;
    reportedBefore: string;
    village: string;
    parish: string;
    subcounty: string;
    district: string;
    caseName: string;
    age: number;
    sex: "Male" | "Female";
    nextOfKin: string;
    status: "Verified" | "Pending" | "Investigating" | "Resolved";
    priority: "High" | "Medium" | "Low";
    duration: string;
}

interface AlertCounts {
    verified: number;
    notVerified: number;
    total: number;
}

interface CallLogAlert {
    id: number;
    status: string;
    date: string;
    time: string;
    callTaker: string;
    cifNo: string;
    personReporting: string;
    village: string;
    subCounty: string;
    contactNumber: string;
    sourceOfAlert: string;
    alertCaseName: string;
    alertCaseAge: number;
    alertCaseSex: string;
    alertCasePregnantDuration: number;
    alertCaseVillage: string;
    alertCaseParish: string;
    alertCaseSubCounty: string;
    alertCaseDistrict: string;
    alertCaseNationality: string;
    pointOfContactName: string;
    pointOfContactRelationship: string;
    pointOfContactPhone: string;
    history: string;
    healthFacilityVisit: string;
    traditionalHealerVisit: string;
    symptoms: string;
    actions: string;
    caseVerificationDesk: string;
    fieldVerification: string;
    fieldVerificationDecision: string;
    feedback: string;
    labResult: string;
    labResultDate: string | null;
    isHighlighted: boolean;
    assignedTo: string;
    alertReportedBefore: string;
    alertFrom: string;
    verified: string;
    comments: string;
    verificationDate: string;
    verificationTime: string;
    response: string;
    narrative: string;
    facilityType: string;
    facility: string;
    isVerified: boolean;
    verifiedBy: string;
    region: string;
    createdAt: string;
    updatedAt: string;
}


export type { DashboardAlert, AlertCounts, CallLogAlert };