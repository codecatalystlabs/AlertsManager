"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/ui/data-table"
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Phone,
  Filter,
  Download,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Enhanced Alert interface
interface DashboardAlert {
  id: string
  personCalling: string
  source: string
  phone: string
  date: string
  reportedBefore: string
  village: string
  parish: string
  subcounty: string
  district: string
  caseName: string
  age: number
  sex: "Male" | "Female"
  nextOfKin: string
  status: "Verified" | "Pending" | "Investigating" | "Resolved"
  priority: "High" | "Medium" | "Low"
  duration: string
}

// Mock data with enhanced fields
const dashboardStats = {
  verifiedWithinHour: 3454,
  notVerifiedIn59Minutes: 0,
  notVerifiedOverHour: 8,
  notVerifiedWithin24Hours: 8,
  totalCalls: 156,
  activeCases: 24,
  resolvedToday: 12,
}

const recentAlerts: DashboardAlert[] = [
  {
    id: "3650",
    personCalling: "Mukisa Badru",
    source: "VHT",
    phone: "0774776921",
    date: "2025-06-16",
    reportedBefore: "Yes",
    village: "Kaserere",
    parish: "St. Peters",
    subcounty: "Central",
    district: "Buvuma District",
    caseName: "Mukisa Badru",
    age: 35,
    sex: "Male",
    nextOfKin: "0756291949",
    status: "Verified",
    priority: "High",
    duration: "00:05:23",
  },
  {
    id: "3649",
    personCalling: "Kyasibangi",
    source: "Facility",
    phone: "0775677566",
    date: "2025-06-12",
    reportedBefore: "No",
    village: "Nyabughesera ward",
    parish: "Holy Cross",
    subcounty: "Bundibugyo",
    district: "Bundibugyo District",
    caseName: "Kyasibangi",
    age: 14,
    sex: "Male",
    nextOfKin: "0787248737",
    status: "Pending",
    priority: "Medium",
    duration: "00:03:45",
  },
  {
    id: "3648",
    personCalling: "Grace Nakato",
    source: "Community",
    phone: "0701234567",
    date: "2025-06-11",
    reportedBefore: "No",
    village: "Kyamagabo",
    parish: "St. Mary",
    subcounty: "Kyegegwa",
    district: "Kyegegwa District",
    caseName: "Monday Steven",
    age: 28,
    sex: "Male",
    nextOfKin: "0780115709",
    status: "Investigating",
    priority: "High",
    duration: "00:07:12",
  },
  {
    id: "3647",
    personCalling: "Peter Ssali",
    source: "Health Worker",
    phone: "0756789012",
    date: "2025-06-10",
    reportedBefore: "Yes",
    village: "Kivulu",
    parish: "Sacred Heart",
    subcounty: "Central",
    district: "Kampala District",
    caseName: "Yawe Brasio",
    age: 11,
    sex: "Male",
    nextOfKin: "0775311067",
    status: "Resolved",
    priority: "Low",
    duration: "00:04:56",
  },
]

// Table columns definition
const columns: ColumnDef<DashboardAlert>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-uganda-yellow/10"
        >
          Alert ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-mono text-sm font-medium">{row.getValue("id")}</div>
    },
  },
  {
    accessorKey: "personCalling",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-uganda-yellow/10"
        >
          Person Calling
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("personCalling")}</div>
    },
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => {
      const source = row.getValue("source") as string
      return (
        <Badge variant="outline" className="border-uganda-blue text-uganda-blue">
          {source}
        </Badge>
      )
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      return <div className="font-mono text-sm">{row.getValue("phone")}</div>
    },
  },
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-uganda-yellow/10"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "district",
    header: "District",
  },
  {
    accessorKey: "caseName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-uganda-yellow/10"
        >
          Case Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("caseName")}</div>
    },
  },
  {
    accessorKey: "age",
    header: "Age",
  },
  {
    accessorKey: "sex",
    header: "Sex",
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-uganda-yellow/10"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge
          variant="secondary"
          className={
            status === "Verified"
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : status === "Pending"
                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                : status === "Investigating"
                  ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string
      return (
        <Badge
          variant="outline"
          className={
            priority === "High"
              ? "border-red-500 text-red-700 bg-red-50"
              : priority === "Medium"
                ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                : "border-gray-500 text-gray-700 bg-gray-50"
          }
        >
          {priority}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const alert = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-uganda-yellow/10">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(alert.id)}>Copy Alert ID</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Alert
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete Alert
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function DashboardPage() {
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [districtFilter, setDistrictFilter] = useState<string>("")
  const [priorityFilter, setPriorityFilter] = useState<string>("")

  // Filter data based on selected filters
  const filteredData = recentAlerts.filter((alert) => {
    const matchesStatus = !statusFilter || statusFilter === "all" || alert.status === statusFilter
    const matchesDistrict = !districtFilter || districtFilter === "all" || alert.district === districtFilter
    const matchesPriority = !priorityFilter || priorityFilter === "all" || alert.priority === priorityFilter

    return matchesStatus && matchesDistrict && matchesPriority
  })

  const exportToExcel = () => {
    const headers = [
      "Alert ID",
      "Person Calling",
      "Source",
      "Phone",
      "Date",
      "District",
      "Case Name",
      "Age",
      "Sex",
      "Status",
      "Priority",
    ]

    const csvContent = [
      headers.join(","),
      ...filteredData.map((alert) =>
        [
          alert.id,
          alert.personCalling,
          alert.source,
          alert.phone,
          alert.date,
          alert.district,
          alert.caseName,
          alert.age,
          alert.sex,
          alert.status,
          alert.priority,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dashboard_alerts_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-uganda-red via-uganda-red to-uganda-yellow rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative">
          <h1 className="text-3xl font-bold mb-2">Welcome to Health Alert Dashboard</h1>
          <p className="text-white/90 text-lg">Monitor and manage health alerts across Uganda in real-time</p>
          <div className="mt-6 flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">System Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200/50 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium mb-1">Verified within 1 hour</p>
                <p className="text-3xl font-bold text-green-700">
                  {dashboardStats.verifiedWithinHour.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-xs text-green-600">+12% from last week</span>
                </div>
              </div>
              <div className="h-16 w-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200/50 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium mb-1">Not verified in 59 min</p>
                <p className="text-3xl font-bold text-blue-700">{dashboardStats.notVerifiedIn59Minutes}</p>
                <div className="flex items-center mt-2">
                  <Clock className="h-4 w-4 text-blue-600 mr-1" />
                  <span className="text-xs text-blue-600">Target: 0 cases</span>
                </div>
              </div>
              <div className="h-16 w-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200/50 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium mb-1">Not verified {">"} 1 hour</p>
                <p className="text-3xl font-bold text-yellow-700">{dashboardStats.notVerifiedOverHour}</p>
                <div className="flex items-center mt-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mr-1" />
                  <span className="text-xs text-yellow-600">Needs attention</span>
                </div>
              </div>
              <div className="h-16 w-16 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200/50 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium mb-1">Not verified in 24h</p>
                <p className="text-3xl font-bold text-red-700">{dashboardStats.notVerifiedWithin24Hours}</p>
                <div className="flex items-center mt-2">
                  <XCircle className="h-4 w-4 text-red-600 mr-1" />
                  <span className="text-xs text-red-600">Critical priority</span>
                </div>
              </div>
              <div className="h-16 w-16 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <XCircle className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Total Calls Today</p>
                <p className="text-2xl font-bold text-purple-700">{dashboardStats.totalCalls}</p>
              </div>
              <Phone className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-600 text-sm font-medium">Active Cases</p>
                <p className="text-2xl font-bold text-indigo-700">{dashboardStats.activeCases}</p>
              </div>
              <Users className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-600 text-sm font-medium">Resolved Today</p>
                <p className="text-2xl font-bold text-teal-700">{dashboardStats.resolvedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Export Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-uganda-red" />
              Filter Recent Alerts
            </CardTitle>
            <Button
              onClick={exportToExcel}
              className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white hover:from-uganda-red/90 hover:to-uganda-yellow/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Investigating">Investigating</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="district-filter">Filter by District</Label>
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger id="district-filter">
                  <SelectValue placeholder="All Districts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  <SelectItem value="Buvuma District">Buvuma District</SelectItem>
                  <SelectItem value="Bundibugyo District">Bundibugyo District</SelectItem>
                  <SelectItem value="Kyegegwa District">Kyegegwa District</SelectItem>
                  <SelectItem value="Kampala District">Kampala District</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority-filter">Filter by Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger id="priority-filter">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStatusFilter("")
                  setDistrictFilter("")
                  setPriorityFilter("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts ({filteredData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredData}
            searchKey="caseName"
            searchPlaceholder="Search by case name..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
