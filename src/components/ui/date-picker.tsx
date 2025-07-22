"use client"

import * as React from "react"
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  selected: Date | null
  onChange: (date: Date | null) => void
  className?: string
  placeholderText?: string
  selectsStart?: boolean
  selectsEnd?: boolean
  startDate?: Date | null
  endDate?: Date | null
  minDate?: Date | null
  maxDate?: Date | null
}

export function DatePicker({
  selected,
  onChange,
  className,
  placeholderText,
  ...props
}: DatePickerProps) {
  return (
    <ReactDatePicker
      selected={selected}
      onChange={onChange}
      className={cn(
        "w-full rounded-md border border-slate-200 px-3 py-2 text-sm",
        className
      )}
      placeholderText={placeholderText}
      {...props}
    />
  )
} 