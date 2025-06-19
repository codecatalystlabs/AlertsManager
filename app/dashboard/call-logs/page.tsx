"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  ArrowUpDown,
  MoreHorizontal,
  Phone,
  Download,
  Filter,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react"

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

interface CallLog {
  id: string
  date: string
  time: string
  duration: string
  callerName: string
  callerNumber: string
  callType: "Incoming" | "Outgoing"
  status: "Completed" | "Missed" | "In Progress"
  alertId: string
  notes: string
  callTaker: string
  priority: "High" | "Medium" | "Low"
}

// Enhanced mock call log data
const callLogs: CallLog[] = [
  {
    id: "CL001",
    date: "2025-01-15",
    time: "09:30:00",
    duration: "00:05:23",
    callerName: "Dr. Sarah Nakamya",
    callerNumber: "0701234567",
    callType: "Incoming",
    status: "Completed",
    alertId: "ALT001",
    notes: "Fever case reported from Kampala district - immediate response required",
    callTaker: "John Okello",
    priority: "High",
  },
  {
    id: "CL002",
    date: "2025-01-15",
    time: "10:15:00",
    duration: "00:03:45",
    callerName: "John Okello",
    callerNumber: "0709876543",
    callType: "Outgoing",
    status: "Completed",
    alertId: "ALT002",
    notes: "Follow-up call for verification of reported case",
    callTaker: "Mary Atim",
    priority: "Medium",
  },
  {
    id: "CL003",
    date: "2025-01-15",
    time: "11:20:00",
    duration: "00:02:10",
    callerName: "Mary Atim",
    callerNumber: "0756123456",
    callType: "Incoming",
    status: "Missed",
    alertId: "",
    notes: "Missed call - attempted callback unsuccessful",
    callTaker: "Agnes Nalwoga",
    priority: "Low",
  },
  {
    id: "CL004",
    date: "2025-01-15",
    time: "12:45:00",
    duration: "00:07:12",
    callerName: "Peter Ssemakula",
    callerNumber: "0782345678",
    callType: "Incoming",
    status: "Completed",
    alertId: "ALT003",
    notes: "Multiple symptoms reported - requires immediate investigation",
    callTaker: "David Okello",
    priority: "High",
  },
  {
    id: "CL005",
    date: "2025-01-14",
    time: "16:30:00",
    duration: "00:04:56",
    callerName: "Grace Nakato",
    callerNumber: "0798765432",
    callType: "Outgoing",
    status: "Completed",
    alertId: "ALT004",
    notes: "Confirmation call for case resolution",
    callTaker: "James Okwir",
    priority: "Medium",
  },
]

const columns: ColumnDef<CallLog>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-uganda-yellow/10"
        >
          Call ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-mono text-sm">{row.getValue("id")}</div>
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
    accessorKey: "time",
    header: "Time",
    cell: ({ row }) => {
      return <div className="font-mono text-sm">{row.getValue("time")}</div>
    },
  },
  {
    accessorKey: "duration",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-uganda-yellow/10"
        >
          Duration
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-mono text-sm">{row.getValue("duration")}</div>
    },
  },
  {
    accessorKey: "callerName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-uganda-yellow/10"
        >
          Caller Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("callerName")}</div>
    },
  },
  {
    accessorKey: "callerNumber",
    header: "Caller Number",
    cell: ({ row }) => {
      return <div className="font-mono text-sm">{row.getValue("callerNumber")}</div>
    },
  },
  {
    accessorKey: "callType",
    header: "Call Type",
    cell: ({ row }) => {
      const callType = row.getValue("callType") as string
      return (
        <Badge
          variant="outline"
          className={
            callType === "Incoming"
              ? "border-blue-500 text-blue-700 bg-blue-50"
              : "border-green-500 text-green-700 bg-green-50"
          }
        >
          {callType === "Incoming" ? (
            <PhoneIncoming className="w-3 h-3 mr-1" />
          ) : (
            <PhoneOutgoing className="w-3 h-3 mr-1" />
          )}
          {callType}
        </Badge>
      )
    },
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
            status === "Completed"
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : status === "Missed"
                ? "bg-red-100 text-red-800 hover:bg-red-200"
                : "bg-blue-100 text-blue-800 hover:bg-blue-200"
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
    accessorKey: "callTaker",
    header: "Call Taker",
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("callTaker")}</div>
    },
  },
  {
    accessorKey: "alertId",
    header: "Alert ID",
    cell: ({ row }) => {
      const alertId = row.getValue("alertId") as string
      return alertId ? (
        <Badge variant="outline" className="border-uganda-blue text-uganda-blue font-mono">
          {alertId}
        </Badge>
      ) : (
        <span className="text-gray-400 text-sm">-</span>
      )
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string
      return (
        <div className="max-w-xs truncate" title={notes}>
          {notes}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const callLog = row.original

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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(callLog.id)}>Copy Call ID</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4" />
              Call Back
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">View Details</DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">Add Notes</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function CallLogsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [callTypeFilter, setCallTypeFilter] = useState<string>("")
  const [priorityFilter, setPriorityFilter] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("")

  // Filter data based on selected filters
  const filteredData = callLogs.filter((log) => {
    const matchesStatus = !statusFilter || statusFilter === "all" || log.status === statusFilter
    const matchesCallType = !callTypeFilter || callTypeFilter === "all" || log.callType === callTypeFilter
    const matchesPriority = !priorityFilter || priorityFilter === "all" || log.priority === priorityFilter
    const matchesDate = !dateFilter || log.date === dateFilter

    return matchesStatus && matchesCallType && matchesPriority && matchesDate
  })

  const exportToExcel = () => {
    const headers = [
      "Call ID",
      "Date",
      "Time",
      "Duration",
      "Caller Name",
      "Caller Number",
      "Call Type",
      "Status",
      "Alert ID",
      "Call Taker",
      "Priority",
      "Notes",
    ]

    const csvContent = [
      headers.join(","),
      ...filteredData.map((log) =>
        [
          log.id,
          log.date,
          log.time,
          log.duration,
          log.callerName,
          log.callerNumber,
          log.callType,
          log.status,
          log.alertId,
          log.callTaker,
          log.priority,
          `"${log.notes.replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `call_logs_export_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-uganda-black">Call Logs</h1>
          <p className="text-gray-600 mt-1">Track and manage all health alert calls</p>
        </div>
        <Button
          onClick={exportToExcel}
          className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white hover:from-uganda-red/90 hover:to-uganda-yellow/90"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Call Logs
        </Button>
      </div>

      {/* Call Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Completed Calls</p>
                <p className="text-2xl font-bold text-green-700">
                  {callLogs.filter((log) => log.status === "Completed").length}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                <Phone className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Missed Calls</p>
                <p className="text-2xl font-bold text-red-700">
                  {callLogs.filter((log) => log.status === "Missed").length}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
                <Phone className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Incoming Calls</p>
                <p className="text-2xl font-bold text-blue-700">
                  {callLogs.filter((log) => log.callType === "Incoming").length}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                <PhoneIncoming className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-uganda-yellow/20 to-uganda-yellow/30 border-uganda-yellow/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-uganda-black text-sm font-medium">Outgoing Calls</p>
                <p className="text-2xl font-bold text-uganda-black">
                  {callLogs.filter((log) => log.callType === "Outgoing").length}
                </p>
              </div>
              <div className="h-12 w-12 bg-uganda-yellow rounded-full flex items-center justify-center">
                <PhoneOutgoing className="h-6 w-6 text-uganda-black" />
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Missed">Missed</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type-filter">Filter by Type</Label>
              <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Incoming">Incoming</SelectItem>
                  <SelectItem value="Outgoing">Outgoing</SelectItem>
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
              <Label htmlFor="date-filter">Filter by Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border-gray-300 focus:border-uganda-yellow focus:ring-uganda-yellow/20"
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStatusFilter("")
                  setCallTypeFilter("")
                  setPriorityFilter("")
                  setDateFilter("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Call History ({filteredData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredData}
            searchKey="callerName"
            searchPlaceholder="Search by caller name..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
