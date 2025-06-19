"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Upload,
  Users,
  LogOut,
  X,
  Phone,
  Stethoscope,
  ChevronDown,
  Bell,
  Settings,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: "Add Alert",
    href: "/dashboard/add-alert",
    icon: AlertTriangle,
    badge: null,
  },
  {
    name: "View Alerts",
    href: "/dashboard/alerts",
    icon: FileText,
    badge: "12",
  },
  {
    name: "Call Logs",
    href: "/dashboard/call-logs",
    icon: Phone,
    badge: "3",
  },
  {
    name: "Upload CSV",
    href: "/dashboard/upload",
    icon: Upload,
    badge: null,
  },
  {
    name: "EVD Case Definition",
    href: "/dashboard/evd-definition",
    icon: Stethoscope,
    badge: "New",
  },
  {
    name: "Manage Users",
    href: "/dashboard/users",
    icon: Users,
    badge: null,
  },
]

interface ModernSidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export function ModernSidebar({ sidebarOpen, setSidebarOpen }: ModernSidebarProps) {
  const pathname = usePathname()
  const [alertsExpanded, setAlertsExpanded] = useState(true)

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl">
          <SidebarContent pathname={pathname} alertsExpanded={alertsExpanded} setAlertsExpanded={setAlertsExpanded} />
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent pathname={pathname} alertsExpanded={alertsExpanded} setAlertsExpanded={setAlertsExpanded} />
      </div>
    </>
  )
}

function SidebarContent({
  pathname,
  alertsExpanded,
  setAlertsExpanded,
}: {
  pathname: string
  alertsExpanded: boolean
  setAlertsExpanded: (expanded: boolean) => void
}) {
  return (
    <div className="flex flex-col flex-grow bg-gradient-to-b from-white to-gray-50/50 shadow-xl border-r border-gray-200/50">
      {/* Header */}
      <div className="flex h-20 items-center px-6 bg-gradient-to-r from-uganda-red via-uganda-red to-uganda-yellow relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
            <span className="text-xl font-bold text-white">MoH</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Health Alert</h1>
            <p className="text-xs text-white/80">Ministry of Health Uganda</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="px-6 py-4 border-b border-gray-200/50">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-uganda-yellow to-uganda-red text-white font-semibold text-sm">
            AU
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">Admin User</p>
            <p className="text-xs text-gray-500 truncate">admin@health.go.ug</p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
            Online
          </Badge>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="space-y-2">
          {/* Quick Stats */}
          <div className="mb-6">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200/50">
                <div className="text-lg font-bold text-green-700">24</div>
                <div className="text-xs text-green-600">Active</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg border border-red-200/50">
                <div className="text-lg font-bold text-red-700">3</div>
                <div className="text-xs text-red-600">Critical</div>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Main Navigation */}
          <div className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Main Menu</h3>

            {navigation.slice(0, 1).map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg shadow-uganda-red/25"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 transition-colors ${
                      isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  {item.name}
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className={`ml-auto text-xs ${isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}

            {/* Alerts Section */}
            <Collapsible open={alertsExpanded} onOpenChange={setAlertsExpanded}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg"
                >
                  <AlertTriangle className="mr-3 h-5 w-5 text-gray-400" />
                  Alert Management
                  <ChevronDown
                    className={`ml-auto h-4 w-4 transition-transform ${alertsExpanded ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 ml-6 mt-1">
                {navigation.slice(1, 4).map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg shadow-uganda-red/25"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-4 w-4 transition-colors ${
                          isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                        }`}
                      />
                      {item.name}
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className={`ml-auto text-xs ${
                            isActive
                              ? "bg-white/20 text-white"
                              : item.badge === "New"
                                ? "bg-uganda-yellow text-uganda-black"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>

            {/* Other Navigation Items */}
            {navigation.slice(4).map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-uganda-red to-uganda-yellow text-white shadow-lg shadow-uganda-red/25"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 transition-colors ${
                      isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  {item.name}
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className={`ml-auto text-xs ${
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badge === "New"
                            ? "bg-uganda-yellow text-uganda-black"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </div>

          <Separator className="my-4" />

          {/* System Section */}
          <div className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">System</h3>
            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg"
            >
              <Settings className="mr-3 h-5 w-5 text-gray-400" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg"
            >
              <Bell className="mr-3 h-5 w-5 text-gray-400" />
              Notifications
              <Badge variant="secondary" className="ml-auto bg-red-100 text-red-700 text-xs">
                2
              </Badge>
            </Button>
          </div>
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/50">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg"
          onClick={() => (window.location.href = "/login")}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
