import { Brain, Thermometer, Droplets, Eye, Heart, Users, AlertTriangle, CheckCircle, Stethoscope } from "lucide-react";
import { SOURCE_OF_ALERT_OPTIONS } from "@/lib/source-of-alert";


const signsAndSymptoms = [
    "Abdominal Pain",
    "Aching Muscles/Pain",
    "Bleeding",
    "Difficulty Breathing",
    "Difficulty Swallowing",
    "Fever (≥38°C)",
    "General Weakness",
    "Headache",
    "Lethargy/Weakness",
    "Skin/Body Rash",
    "Sore Throat",
    "Vomiting",
];


const alertSource = SOURCE_OF_ALERT_OPTIONS.map((name) => ({ name }))


// Priority diseases, conditions and events under surveillance.
// `code` is the value stored on the alert record; `name` is the display label.
// Codes are reused from the previous list where a disease maps cleanly, so
// existing alert records keep resolving to the correct label.
const alertResponse = [
    { code: "ViralHemorrhagicFever", name: "Acute haemorrhagic fever syndrome" },
    { code: "AcuteFlaccidParalysis", name: "Acute flaccid paralysis" },
    { code: "Anthrax", name: "Anthrax" },
    { code: "Meningitis", name: "Bacterial meningitis" },
    { code: "BuruliUlcer", name: "Buruli ulcer" },
    { code: "Brucellosis", name: "Brucellosis" },
    { code: "Chikungunya", name: "Chikungunya" },
    { code: "Cholera", name: "Cholera" },
    { code: "COVID19", name: "COVID-19" },
    { code: "Dengue Fever", name: "Dengue fever" },
    { code: "DiabetesMellitus", name: "Diabetes mellitus (new cases)" },
    { code: "Dysentry", name: "Diarrhoea with blood (Shigella)" },
    { code: "DiarrhoeaWithDehydration", name: "Diarrhoea with dehydration in children under 5 years" },
    { code: "Guinea Worm", name: "Dracunculiasis (Guinea worm disease)" },
    { code: "Epilepsy", name: "Epilepsy" },
    { code: "HIVAIDS", name: "HIV/AIDS (new cases)" },
    { code: "HumanAfricanTrypanosomiasis", name: "Human African trypanosomiasis" },
    { code: "Rabies", name: "Human rabies" },
    { code: "Hypertension", name: "Hypertension (new cases)" },
    { code: "InjuriesRTA", name: "Injuries (road traffic accidents)" },
    { code: "Leishmaniasis", name: "Leishmaniasis" },
    { code: "Leprosy", name: "Leprosy" },
    { code: "LymphaticFilariasis", name: "Lymphatic filariasis" },
    { code: "Malaria", name: "Malaria" },
    { code: "Malnutrition", name: "Malnutrition in children under 5 years" },
    { code: "Maternal Death", name: "Maternal deaths" },
    { code: "Measles/Rubella", name: "Measles" },
    { code: "NeonatalTetanus", name: "Neonatal tetanus" },
    { code: "NonNeonatalTetanus", name: "Non-neonatal tetanus" },
    { code: "Onchocerciasis", name: "Onchocerciasis" },
    { code: "Perinatal Death", name: "Perinatal deaths" },
    { code: "Plague", name: "Plague" },
    { code: "Polio", name: "Poliomyelitis" },
    { code: "SARS", name: "SARS" },
    { code: "Schistosomiasis", name: "Schistosomiasis" },
    { code: "SeverePneumonia", name: "Severe pneumonia in children under 5 years" },
    { code: "STIs", name: "Sexually transmitted infections (STIs)" },
    { code: "SoilTransmittedHelminths", name: "Soil-transmitted helminths" },
    { code: "Trachoma", name: "Trachoma" },
    { code: "Tuberculosis", name: "Tuberculosis" },
    { code: "Typhoid", name: "Typhoid fever" },
    { code: "Hepatitis", name: "Viral hepatitis (acute and chronic)" },
    { code: "YellowFever", name: "Yellow fever" },
    { code: "Zika", name: "Zika virus disease" },
    { code: "AEFI/ADR", name: "Adverse Events Following Immunization (AEFI)" },
    { code: "ClusterOfDeaths", name: "Cluster of deaths in the community (human or animal deaths)" },
    { code: "ClusterOfUnwell", name: "Cluster of unwell people or animals with similar symptoms" },
    { code: "HumanInfluenzaNewSubtype", name: "Human influenza due to a new subtype" },
    { code: "PublicHealthEventOfConcern", name: "Any public health event of international or national concern (infectious, zoonotic, foodborne, chemical, radiological, or due to an unknown condition)" },
    // Environmental hazards, injuries and community events. New codes: the value
    // stored on the alert IS the code; the backend canonicalises it (splitCamelCase)
    // to the display label, so "FoodPoisoning" → "Food Poisoning" folds together.
    { code: "Drowning", name: "Drowning" },
    { code: "Floods", name: "Floods" },
    { code: "Landslides", name: "Landslides" },
    { code: "FoodPoisoning", name: "Food poisoning" },
    { code: "SuddenDeath", name: "Sudden death" },
]

const alertStatus = [
    { name: "Alive" },
    { name: "Dead" },
    { name: "Unknown" },
    { name: "Pending" },
]

// Status options offered on the alert ENTRY forms (must be Alive or Dead).
const alertEntryStatus = [
    { name: "Alive" },
    { name: "Dead" },
]

const alertActions = [
    { name: "Alert reported" },
    { name: "Alert verified" },
    { name: "Alert investigated" },
    { name: "Alert resolved" },
]





const caseDefinitions = [
    {
        id: "community",
        title: "Community Case Definition",
        icon: Users,
        color: "bg-blue-500",
        description: "Basic definition for community-level identification",
        criteria: {
            primary: "Illness with onset of fever and no response to treatment",
            or: [
                "Bleeding (from the nose or any other part of the body, bloody diarrhea, blood in urine)",
                "Any sudden death",
            ],
        },
    },
    {
        id: "suspect",
        title: "Suspect Case Definition",
        icon: AlertTriangle,
        color: "bg-yellow-500",
        description: "Detailed criteria for suspected EVD cases",
        criteria: {
            primary: "Illness with onset of fever and no response to treatment for usual causes of fever",
            and: "At least three of the following signs:",
            signs: [
                "Headache",
                "Vomiting",
                "Diarrhea",
                "Anorexia/loss of appetite",
                "Lethargy",
                "Stomach pain",
                "Aching muscles or joints",
                "Difficulty swallowing",
                "Breathing difficulties",
                "Hiccups",
                "Convulsions",
            ],
            or: [
                {
                    condition:
                        "Illness with onset of fever and no response to treatment AND at least one of the following signs of unexplained bleeding:",
                    signs: [
                        "Bloody diarrhea",
                        "Bleeding from gums",
                        "Bleeding into skin (purpura)",
                        "Bleeding into eyes and urine",
                        "Bleeding from the nose",
                        "Sudden/unexplained death",
                    ],
                },
                "Any person with history of contact with a probable or confirmed Ebola case and having any one sign and symptom of Ebola Virus Disease",
                "Any person with history of travel to an area with a probable or confirmed Ebola case and having signs and symptoms of Ebola Virus Disease",
            ],
        },
    },
    {
        id: "probable",
        title: "Probable Case",
        icon: Stethoscope,
        color: "bg-orange-500",
        description: "Cases with epidemiological links but no lab confirmation",
        criteria: {
            primary:
                "Any person who died from a 'suspected' EVD and had an epidemiological link to a confirmed case but was not tested and did not have laboratory confirmation of the disease",
        },
    },
    {
        id: "confirmed",
        title: "Confirmed Case",
        icon: CheckCircle,
        color: "bg-green-500",
        description: "Laboratory-confirmed EVD cases",
        criteria: {
            primary: "A suspected case with a positive laboratory result for either:",
            tests: ["Virus antigen", "Viral RNA detected by RT-PCR", "IgM antibodies against Ebola"],
        },
    },
]

const symptoms = [
    { name: "Fever", icon: Thermometer, severity: "high" },
    { name: "Headache", icon: Brain, severity: "high" },
    { name: "Bleeding", icon: Droplets, severity: "critical" },
    { name: "Vomiting", icon: Heart, severity: "medium" },
    { name: "Diarrhea", icon: Heart, severity: "medium" },
    { name: "Eye symptoms", icon: Eye, severity: "medium" },
]

export {
    signsAndSymptoms,
    alertSource,
    alertResponse,
    alertStatus,
    alertEntryStatus,
    alertActions,
    caseDefinitions,
    symptoms
}
