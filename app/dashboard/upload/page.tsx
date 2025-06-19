"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
      setUploadStatus("idle")
    } else {
      alert("Please select a valid CSV file")
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)

    // Simulate upload process
    setTimeout(() => {
      setUploading(false)
      setUploadStatus("success")
    }, 3000)
  }

  const downloadTemplate = () => {
    // Create a sample CSV template
    const csvContent = `Date,Call Time,Alert Reported Before,Name of Person Reporting,Number of Person Reporting,Status,Response,District,Subcounty,Village,Parish,Source of Alert,Case Alert Description,Case Name,Case Age,Case Sex,Name of Next of Kin,Next of Kin Phone Number,Narrative,Signs and Symptoms
2025-01-15,09:30,No,John Doe,0701234567,Pending,Immediate,Kampala,Central,Nakawa,St. Peters,VHT,Fever case,Jane Smith,25,Female,Mary Smith,0709876543,Patient reported high fever,Fever;Headache;General Weakness`

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "alert_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-uganda-black">Upload Alerts CSV</h1>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Before uploading:</h3>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Download the CSV template to ensure proper formatting</li>
              <li>Fill in all required fields</li>
              <li>Use the exact column headers as shown in the template</li>
              <li>Save your file as CSV format</li>
              <li>Maximum file size: 10MB</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">Required Fields:</h3>
            <p className="text-yellow-800">
              Date, Call Time, Name of Person Reporting, Number of Person Reporting, District, Source of Alert, Case
              Name, Case Age, Case Sex
            </p>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Select CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-lg font-medium text-gray-700">Click to upload or drag and drop</span>
                <Input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </Label>
              <p className="text-sm text-gray-500">CSV files only, up to 10MB</p>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                  }
                }}
                variant="outline"
                size="sm"
              >
                Remove
              </Button>
            </div>
          )}

          {uploadStatus === "success" && (
            <div className="flex items-center space-x-2 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">File uploaded successfully! Processing alerts...</span>
            </div>
          )}

          {uploadStatus === "error" && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">
                Upload failed. Please check your file format and try again.
              </span>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="bg-gradient-to-r from-uganda-red to-uganda-yellow text-white"
            >
              {uploading ? "Uploading..." : "Upload CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">alerts_batch_001.csv</p>
                  <p className="text-sm text-gray-500">Uploaded 2 hours ago • 150 records</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Processed</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">alerts_batch_002.csv</p>
                  <p className="text-sm text-gray-500">Uploaded 1 day ago • 89 records</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Processed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
