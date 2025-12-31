import { useState, useEffect, useRef } from 'react'

export default function DatePicker({ selectedDate, onDateSelect, onClose }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Start at selected date if available, otherwise current month
    if (selectedDate) {
      return { month: selectedDate.month, year: selectedDate.year }
    }
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  })
  
  const calendarRef = useRef(null)

  // Update current month when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth({ month: selectedDate.month, year: selectedDate.year })
    }
  }, [selectedDate])

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay()
  }

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) {
        return { month: 11, year: prev.year - 1 }
      }
      return { month: prev.month - 1, year: prev.year }
    })
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) {
        return { month: 0, year: prev.year + 1 }
      }
      return { month: prev.month + 1, year: prev.year }
    })
  }

  const handleDateClick = (day) => {
    if (day === null) {
      onDateSelect(null)
    } else {
      onDateSelect({
        month: currentMonth.month,
        year: currentMonth.year,
        day: day
      })
    }
  }

  const handleToday = () => {
    const today = new Date()
    onDateSelect({
      month: today.getMonth(),
      year: today.getFullYear(),
      day: today.getDate()
    })
    setCurrentMonth({ month: today.getMonth(), year: today.getFullYear() })
  }

  const daysInMonth = getDaysInMonth(currentMonth.month, currentMonth.year)
  const firstDay = getFirstDayOfMonth(currentMonth.month, currentMonth.year)
  const days = []

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  // Get previous month's last days for display
  const prevMonthDays = getDaysInMonth(
    currentMonth.month === 0 ? 11 : currentMonth.month - 1,
    currentMonth.month === 0 ? currentMonth.year - 1 : currentMonth.year
  )

  return (
    <div className="date-picker" ref={calendarRef}>
      <div className="date-picker__header">
        <button 
          className="date-picker__nav date-picker__nav--prev"
          onClick={handlePrevMonth}
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        
        <div className="date-picker__month-year">
          {monthNames[currentMonth.month]}, {currentMonth.year}
        </div>
        
        <button 
          className="date-picker__nav date-picker__nav--next"
          onClick={handleNextMonth}
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <div className="date-picker__days-header">
        {dayNames.map((day, index) => (
          <div key={index} className="date-picker__day-name">{day}</div>
        ))}
      </div>

      <div className="date-picker__days-grid">
        {days.map((day, index) => {
          if (day === null) {
            // Show previous month's days (grayed out)
            const prevDay = prevMonthDays - (firstDay - index - 1)
            return (
              <div key={`prev-${index}`} className="date-picker__day date-picker__day--other-month">
                {prevDay > 0 ? prevDay : ''}
              </div>
            )
          }
          
          const isSelected = selectedDate && 
                            selectedDate.day === day &&
                            selectedDate.month === currentMonth.month &&
                            selectedDate.year === currentMonth.year
          const today = new Date()
          const isToday = day === today.getDate() && 
                        currentMonth.month === today.getMonth() && 
                        currentMonth.year === today.getFullYear()

          return (
            <button
              key={day}
              className={`date-picker__day ${isSelected ? 'date-picker__day--selected' : ''} ${isToday ? 'date-picker__day--today' : ''}`}
              onClick={() => handleDateClick(day)}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="date-picker__footer">
        <button className="date-picker__today" onClick={handleToday}>
          Today
        </button>
        <button 
          className="date-picker__clear" 
          onClick={() => {
            onDateSelect(null)
            onClose?.()
          }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

