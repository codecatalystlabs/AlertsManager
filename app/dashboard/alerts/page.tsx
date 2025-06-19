"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, Eye, Edit, Trash2, Download, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/ui/data-table"

// Enhanced Alert type
interface Alert {
  id: string
  status: "Alive" | "Dead" | "Unknown"
  date: string
  callTime: string
  callTaker: string
  nameOfPerson: string
  sourceOfAlert: string
  village: string
  alertCaseParish: string
  district: string
  subCounty: string
  contactNumber: string
  alertCaseName: string
  alertCaseAge: number
  alertCaseSex: "Male" | "Female"
  alertCasePregnant: number
  duration: string
  alertCaseVillage: string
}

// Enhanced mock data
const alerts: Alert[] = [
  {
    id: "ALT001",
    status: "Alive",
    date: "2025-06-16",
    callTime: "07:35:00",
    callTaker: "Dr. Sarah Nakamya",
    nameOfPerson: "John Okello",
    sourceOfAlert: "VHT",
    village: "Kaserere",
    alertCaseParish: "St. Peters",
    district: "Buvuma District",
    subCounty: "Central",
    contactNumber: "0774776921",
    alertCaseName: "Mukisa Badru",
    alertCaseAge: 35,
    alertCaseSex: "Male",
    alertCasePregnant: 0,
    duration: "00:05:23",
    alertCaseVillage: "Kaserere",
  },
  {
    id: "ALT002",
    status: "Alive",
    date: "2025-06-12",
    callTime: "11:26:00",
    callTaker: "Mary Atim",
    nameOfPerson: "Grace Nakato",
    sourceOfAlert: "Facility",
    village: "Nyabughesera ward",
    alertCaseParish: "Holy Cross",
    district: "Bundibugyo District",
    subCounty: "Bundibugyo",
    contactNumber: "0775677566",
    alertCaseName: "Kyasibangi",
    alertCaseAge: 14,
    alertCaseSex: "Male",
    alertCasePregnant: 0,
    duration: "00:03:45",
    alertCaseVillage: "bundibugyo",
  },
  {
    id: "ALT003",
    status: "Unknown",
    date: "2025-06-11",
    callTime: "14:34:00",
    callTaker: "James Okwir",
    nameOfPerson: "Peter Ssali",
    sourceOfAlert: "Community",
    village: "Kyamagabo",
    alertCaseParish: "St. Mary",
    district: "Kyegegwa District",
    subCounty: "Kyegegwa",
    contactNumber: "0780115709",
    alertCaseName: "Monday Steven",
    alertCaseAge: 28,
    alertCaseSex: "Male",
    alertCasePregnant: 0,
    duration: "00:07:12",
    alertCaseVillage: "Kyamagabo",
  },
  {
    id: "ALT004",
    status: "Alive",
    date: "2025-06-11",
    callTime: "14:40:00",
    callTaker: "Agnes Nalwoga",
    nameOfPerson: "Susan Nakirya",
    sourceOfAlert: "Health Worker",
    village: "Kyamagabo",
    alertCaseParish: "St. Joseph",
    district: "Kyegegwa District",
    subCounty: "Kyegegwa",
    contactNumber: "0780115709",
    alertCaseName: "Nyakato Angelique",
    alertCaseAge: 52,
    alertCaseSex: "Female",
    alertCasePregnant: 0,
    duration: "00:04:56",
    alertCaseVillage: "Kyamagabo",
  },
  {
    id: "ALT005",
    status: "Alive",
    date: "2025-06-10",
    callTime: "11:03:00",
    callTaker: "David Okello",
    nameOfPerson: "Reagan Musoke",
    sourceOfAlert: "Facility",
    village: "Kivulu",
    alertCaseParish: "Sacred Heart",
    district: "Kampala District",
    subCounty: "Central",
    contactNumber: "0775311067",
    alertCaseName: "Yawe Brasio",
    alertCaseAge: 11,
    alertCaseSex: "Male",
    alertCasePregnant: 0,
    duration: "00:06:34",
    alertCaseVillage: "Kivulu",
  },
]

const columns: ColumnDef<Alert>[] = [
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
            status === "Alive"
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : status === "Dead"
                ? "bg-red-100 text-red-800 hover:bg-red-200"
                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
          }
        >
          {status}
        </Badge>
      )
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
    accessorKey: "callTime",
    header: "Call Time",
  },
  {
    accessorKey: "callTaker",
    header: "Call Taker",
  },
  {
    accessorKey: "nameOfPerson",
    header: "Name of Person",
  },
  {
    accessorKey: "sourceOfAlert",
    header: "Source of Alert",
    cell: ({ row }) => {
      const source = row.getValue("sourceOfAlert") as string
      return (
        <Badge variant="outline" className="border-uganda-blue text-uganda-blue">
          {source}
        </Badge>
      )
    },
  },
  {
    accessorKey: "village",
    header: "Village",
  },
  {
    accessorKey: "district",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-uganda-yellow/10"
        >
          District
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "contactNumber",
    header: "Contact Number",
  },
  {
    accessorKey: "alertCaseName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-uganda-yellow/10"
        >
          Alert Case Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("alertCaseName")}</div>
    },
  },
  {
    accessorKey: "alertCaseAge",
    header: "Age",
  },
  {
    accessorKey: "alertCaseSex",
    header: "Sex",
  },
  {
    accessorKey: "duration",
    header: "Duration",
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

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [districtFilter, setDistrictFilter] = useState<string>("")
  const [sourceFilter, setSourceFilter] = useState<string>("")

  // Filter data based on selected filters
  const filteredData = alerts.filter((alert) => {
    const matchesStatus = !statusFilter || statusFilter === "all" || alert.status === statusFilter
    const matchesDistrict = !districtFilter || districtFilter === "all" || alert.district === districtFilter
    const matchesSource = !sourceFilter || sourceFilter === "all" || alert.sourceOfAlert === sourceFilter

    return matchesStatus && matchesDistrict && matchesSource
  })

  const exportToExcel = () => {
    // Create CSV content
    const headers = [
      "Alert ID",
      "Status",
      "Date",
      "Call Time",
      "Call Taker",
      "Name of Person",
      "Source of Alert",
      "Village",
      "District",
      "Contact Number",
      "Alert Case Name",
      "Age",
      "Sex",
      "Duration",
    ]

    const csvContent = [
      headers.join(","),
      ...filteredData.map((alert) =>
        [
          alert.id,
          alert.status,
          alert.date,
          alert.callTime,
          alert.callTaker,
          alert.nameOfPerson,
          alert.sourceOfAlert,
          alert.village,
          alert.district,
          alert.contactNumber,
          alert.alertCaseName,
          alert.alertCaseAge,
          alert.alertCaseSex,
          alert.duration,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `alerts_export_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-uganda-black">Alerts Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage health alerts across Uganda</p>
        </div>
        <Button
          onClick={exportToExcel}
          className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white hover:from-uganda-red/90 hover:to-uganda-yellow/90"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Active Cases</p>
                <p className="text-2xl font-bold text-green-700">{alerts.filter((a) => a.status === "Alive").length}</p>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Critical Cases</p>
                <p className="text-2xl font-bold text-red-700">{alerts.filter((a) => a.status === "Dead").length}</p>
              </div>
              <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {alerts.filter((a) => a.status === "Unknown").length}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Alerts</p>
                <p className="text-2xl font-bold text-blue-700">{alerts.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-uganda-red" />
            Advanced Filters
          </CardTitle>
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
                  <SelectItem value="Alive">Alive</SelectItem>
                  <SelectItem value="Dead">Dead</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
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
              <Label htmlFor="source-filter">Filter by Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger id="source-filter">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="VHT">VHT</SelectItem>
                  <SelectItem value="Facility">Facility</SelectItem>
                  <SelectItem value="Community">Community</SelectItem>
                  <SelectItem value="Health Worker">Health Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-filter">Filter by Date</Label>
              <Input
                id="date-filter"
                type="date"
                className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Alerts ({filteredData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredData}
            searchKey="alertCaseName"
            searchPlaceholder="Search by case name..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
