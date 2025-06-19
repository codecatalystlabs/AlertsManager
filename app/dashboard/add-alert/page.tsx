"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, UserIcon, MapPinIcon, AlertTriangleIcon, HeartIcon } from "lucide-react"

const ugandaDistricts = [
  "Abim",
  "Adjumani",
  "Agago",
  "Alebtong",
  "Amolatar",
  "Amudat",
  "Amuria",
  "Amuru",
  "Apac",
  "Arua",
  "Budaka",
  "Bududa",
  "Bugiri",
  "Buhweju",
  "Buikwe",
  "Bukedea",
  "Bukomansimbi",
  "Bukwo",
  "Bulambuli",
  "Buliisa",
  "Bundibugyo",
  "Bushenyi",
  "Busia",
  "Butaleja",
  "Butambala",
  "Buvuma",
  "Buyende",
  "Dokolo",
  "Gomba",
  "Gulu",
  "Hoima",
  "Ibanda",
  "Iganga",
  "Isingiro",
  "Jinja",
  "Kaabong",
  "Kabale",
  "Kabarole",
  "Kaberamaido",
  "Kalangala",
  "Kaliro",
  "Kampala",
  "Kamuli",
  "Kamwenge",
  "Kanungu",
  "Kapchorwa",
  "Kasese",
  "Katakwi",
  "Kayunga",
  "Kibaale",
  "Kiboga",
  "Kibuku",
  "Kiruhura",
  "Kiryandongo",
  "Kisoro",
  "Kitgum",
  "Koboko",
  "Kole",
  "Kotido",
  "Kumi",
  "Kween",
  "Kyankwanzi",
  "Kyegegwa",
  "Kyenjojo",
  "Lamwo",
  "Lira",
  "Luuka",
  "Luwero",
  "Lwengo",
  "Lyantonde",
  "Manafwa",
  "Maracha",
  "Masaka",
  "Masindi",
  "Mayuge",
  "Mbale",
  "Mbarara",
  "Mitooma",
  "Mityana",
  "Mokono",
  "Moroto",
  "Moyo",
  "Mpigi",
  "Mubende",
  "Mukono",
  "Nakapiripirit",
  "Nakaseke",
  "Nakasongola",
  "Namayingo",
  "Namutumba",
  "Napak",
  "Nebbi",
  "Ngora",
  "Ntoroko",
  "Ntungamo",
  "Nwoya",
  "Otuke",
  "Oyam",
  "Pader",
  "Pallisa",
  "Rakai",
  "Rubirizi",
  "Rukungiri",
  "Sembabule",
  "Serere",
  "Sheema",
  "Sironko",
  "Soroti",
  "Tororo",
  "Wakiso",
  "Yumbe",
  "Zombo",
]

const signsAndSymptoms = [
  "Fever (≥38°C)",
  "Headache",
  "General Weakness",
  "Skin/Body Rash",
  "Sore Throat",
  "Vomiting",
  "Bleeding",
  "Abdominal Pain",
  "Aching Muscles/Pain",
  "Difficulty Swallowing",
  "Difficulty Breathing",
  "Lethargy/Weakness",
]

export default function AddAlertPage() {
  const [formData, setFormData] = useState({
    date: "",
    callTime: "",
    alertReportedBefore: "",
    nameOfPersonReporting: "",
    numberOfPersonReporting: "",
    status: "",
    response: "",
    district: "",
    subcounty: "",
    village: "",
    parish: "",
    sourceOfAlert: "",
    caseAlertDescription: "",
    caseName: "",
    caseAge: "",
    caseSex: "",
    nameOfNextOfKin: "",
    nextOfKinPhoneNumber: "",
    narrative: "",
    signsAndSymptoms: [] as string[],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSymptomsChange = (symptom: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      signsAndSymptoms: checked
        ? [...prev.signsAndSymptoms, symptom]
        : prev.signsAndSymptoms.filter((s) => s !== symptom),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    setTimeout(() => {
      setIsSubmitting(false)
      alert("Alert submitted successfully!")
    }, 2000)
  }

  const steps = [
    { id: 1, name: "Basic Information", icon: CalendarIcon },
    { id: 2, name: "Reporter Details", icon: UserIcon },
    { id: 3, name: "Location & Source", icon: MapPinIcon },
    { id: 4, name: "Case Information", icon: AlertTriangleIcon },
    { id: 5, name: "Medical Details", icon: HeartIcon },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Progress Steps */}
      <Card className="bg-gradient-to-r from-uganda-red/5 to-uganda-yellow/5 border-uganda-yellow/20">
        <CardContent className="p-6">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {steps.map((step, stepIdx) => (
                <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? "pr-8 sm:pr-20" : ""}`}>
                  <div className="flex items-center">
                    <div
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                        currentStep >= step.id
                          ? "border-uganda-yellow bg-uganda-yellow text-white"
                          : "border-gray-300 bg-white text-gray-500"
                      }`}
                    >
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`ml-4 text-sm font-medium ${
                        currentStep >= step.id ? "text-uganda-black" : "text-gray-500"
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                  {stepIdx !== steps.length - 1 && (
                    <div className="absolute top-5 right-0 hidden h-0.5 w-full bg-gray-200 sm:block">
                      <div className={`h-0.5 ${currentStep > step.id ? "bg-uganda-yellow" : "bg-gray-200"}`} />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </CardContent>
      </Card>

      {/* Main Form */}
      <Card className="shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <AlertTriangleIcon className="h-8 w-8" />
            Health Alert Call Log Form
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Basic Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <CalendarIcon className="h-6 w-6 text-uganda-red" />
                <h3 className="text-xl font-semibold text-uganda-black">Basic Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                    Date *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    required
                    className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callTime" className="text-sm font-medium text-gray-700">
                    Call Time *
                  </Label>
                  <Input
                    id="callTime"
                    type="time"
                    value={formData.callTime}
                    onChange={(e) => handleInputChange("callTime", e.target.value)}
                    required
                    className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Alert reported before? *</Label>
                  <RadioGroup
                    value={formData.alertReportedBefore}
                    onValueChange={(value) => handleInputChange("alertReportedBefore", value)}
                    className="flex gap-6 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="yes" className="border-uganda-red text-uganda-red" />
                      <Label htmlFor="yes" className="text-sm">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="no" className="border-uganda-red text-uganda-red" />
                      <Label htmlFor="no" className="text-sm">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Step 2: Reporter Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <UserIcon className="h-6 w-6 text-uganda-red" />
                <h3 className="text-xl font-semibold text-uganda-black">Reporter Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nameOfPersonReporting" className="text-sm font-medium text-gray-700">
                    Name of person reporting *
                  </Label>
                  <Input
                    id="nameOfPersonReporting"
                    value={formData.nameOfPersonReporting}
                    onChange={(e) => handleInputChange("nameOfPersonReporting", e.target.value)}
                    required
                    placeholder="Enter full name"
                    className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfPersonReporting" className="text-sm font-medium text-gray-700">
                    Phone number *
                  </Label>
                  <Input
                    id="numberOfPersonReporting"
                    value={formData.numberOfPersonReporting}
                    onChange={(e) => handleInputChange("numberOfPersonReporting", e.target.value)}
                    required
                    placeholder="e.g., 0701234567"
                    className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                    Status *
                  </Label>
                  <Select onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="false-alarm">False Alarm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="response" className="text-sm font-medium text-gray-700">
                    Response *
                  </Label>
                  <Select onValueChange={(value) => handleInputChange("response", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20">
                      <SelectValue placeholder="Select Response" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="within-24-hours">Within 24 Hours</SelectItem>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="no-action">No Action Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Step 3: Location & Source */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <MapPinIcon className="h-6 w-6 text-uganda-red" />
                <h3 className="text-xl font-semibold text-uganda-black">Alert Location & Source</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="district" className="text-sm font-medium text-gray-700">
                    District *
                  </Label>
                  <Select onValueChange={(value) => handleInputChange("district", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20">
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      {ugandaDistricts.map((district) => (
                        <SelectItem key={district} value={district.toLowerCase()}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcounty" className="text-sm font-medium text-gray-700">
                    Subcounty/Division
                  </Label>
                  <Input
                    id="subcounty"
                    value={formData.subcounty}
                    onChange={(e) => handleInputChange("subcounty", e.target.value)}
                    placeholder="Enter subcounty or division"
                    className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="village" className="text-sm font-medium text-gray-700">
                    Village
                  </Label>
                  <Input
                    id="village"
                    value={formData.village}
                    onChange={(e) => handleInputChange("village", e.target.value)}
                    placeholder="Enter village name"
                    className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parish" className="text-sm font-medium text-gray-700">
                    Parish
                  </Label>
                  <Input
                    id="parish"
                    value={formData.parish}
                    onChange={(e) => handleInputChange("parish", e.target.value)}
                    placeholder="Enter parish name"
                    className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceOfAlert" className="text-sm font-medium text-gray-700">
                  Source of Alert *
                </Label>
                <Select onValueChange={(value) => handleInputChange("sourceOfAlert", value)}>
                  <SelectTrigger className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20">
                    <SelectValue placeholder="Select source of alert" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vht">VHT (Village Health Team)</SelectItem>
                    <SelectItem value="facility">Health Facility</SelectItem>
                    <SelectItem value="community">Community Member</SelectItem>
                    <SelectItem value="health-worker">Health Worker</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Step 4: Case Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangleIcon className="h-6 w-6 text-uganda-red" />
                <h3 className="text-xl font-semibold text-uganda-black">Case Information</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="caseAlertDescription" className="text-sm font-medium text-gray-700">
                    Case Alert Description
                  </Label>
                  <Textarea
                    id="caseAlertDescription"
                    value={formData.caseAlertDescription}
                    onChange={(e) => handleInputChange("caseAlertDescription", e.target.value)}
                    rows={3}
                    placeholder="Provide a detailed description of the alert case"
                    className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="caseName" className="text-sm font-medium text-gray-700">
                      Case Name *
                    </Label>
                    <Input
                      id="caseName"
                      value={formData.caseName}
                      onChange={(e) => handleInputChange("caseName", e.target.value)}
                      placeholder="Patient's full name"
                      className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caseAge" className="text-sm font-medium text-gray-700">
                      Case Age *
                    </Label>
                    <Input
                      id="caseAge"
                      type="number"
                      value={formData.caseAge}
                      onChange={(e) => handleInputChange("caseAge", e.target.value)}
                      placeholder="Age in years"
                      min="0"
                      max="150"
                      className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Case Sex *</Label>
                    <RadioGroup
                      value={formData.caseSex}
                      onValueChange={(value) => handleInputChange("caseSex", value)}
                      className="flex gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="male" className="border-uganda-red text-uganda-red" />
                        <Label htmlFor="male" className="text-sm">
                          Male
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="female" className="border-uganda-red text-uganda-red" />
                        <Label htmlFor="female" className="text-sm">
                          Female
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nameOfNextOfKin" className="text-sm font-medium text-gray-700">
                      Name of Next of Kin
                    </Label>
                    <Input
                      id="nameOfNextOfKin"
                      value={formData.nameOfNextOfKin}
                      onChange={(e) => handleInputChange("nameOfNextOfKin", e.target.value)}
                      placeholder="Next of kin's full name"
                      className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nextOfKinPhoneNumber" className="text-sm font-medium text-gray-700">
                      Next of Kin Phone Number
                    </Label>
                    <Input
                      id="nextOfKinPhoneNumber"
                      value={formData.nextOfKinPhoneNumber}
                      onChange={(e) => handleInputChange("nextOfKinPhoneNumber", e.target.value)}
                      placeholder="e.g., 0701234567"
                      className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="narrative" className="text-sm font-medium text-gray-700">
                    Narrative/Short Description
                  </Label>
                  <Textarea
                    id="narrative"
                    placeholder="Please provide a short narrative of not more than 50 words"
                    value={formData.narrative}
                    onChange={(e) => handleInputChange("narrative", e.target.value)}
                    maxLength={250}
                    rows={3}
                    className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Maximum 250 characters</span>
                    <span>{formData.narrative.length}/250</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Step 5: Signs and Symptoms */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <HeartIcon className="h-6 w-6 text-uganda-red" />
                <h3 className="text-xl font-semibold text-uganda-black">Signs and Symptoms</h3>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-sm text-gray-600 mb-4">Select all symptoms that apply to this case:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {signsAndSymptoms.map((symptom) => (
                    <div
                      key={symptom}
                      className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-uganda-yellow/50 transition-colors"
                    >
                      <Checkbox
                        id={symptom}
                        checked={formData.signsAndSymptoms.includes(symptom)}
                        onCheckedChange={(checked) => handleSymptomsChange(symptom, checked as boolean)}
                        className="border-uganda-red data-[state=checked]:bg-uganda-red data-[state=checked]:border-uganda-red"
                      />
                      <Label htmlFor={symptom} className="text-sm font-medium cursor-pointer">
                        {symptom}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.signsAndSymptoms.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Selected symptoms:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.signsAndSymptoms.map((symptom) => (
                        <Badge key={symptom} variant="secondary" className="bg-uganda-yellow/20 text-uganda-black">
                          {symptom}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Section */}
            <div className="flex justify-end space-x-4 pt-8 border-t">
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-uganda-red to-uganda-yellow hover:from-uganda-red/90 hover:to-uganda-yellow/90 text-white px-8 py-2 font-semibold"
              >
                {isSubmitting ? "Submitting..." : "Submit Alert"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
