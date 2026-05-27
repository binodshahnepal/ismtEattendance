/**
 * Calendar.jsx - Month Date Grid Picker Component
 * 
 * Draws dynamic dates grids, displays complete (green) or partial (amber) status dots,
 * and handles clicks to change the selected tutor date.
 */

import React, { useState, useEffect } from 'react';

const Calendar = ({ selectedDate, onSelectDate, dateStatuses }) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleMonthOffset = (offset) => {
    let nextMonth = currentMonth + offset;
    let nextYear = currentYear;

    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    } else if (nextMonth < 0) {
      nextMonth = 11;
      nextYear--;
    }

    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
  };

  // Helper to build dates
  const firstDayRaw = new Date(currentYear, currentMonth, 1).getDay();
  // Align Monday index=0, Sunday index=6
  const firstDayIndex = firstDayRaw === 0 ? 6 : firstDayRaw - 1;
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  const todayStr = new Date().toISOString().split('T')[0];

  const renderCells = () => {
    const cells = [];

    // Empty cells padding
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="cal-cell empty"></div>);
    }

    // Active day cells
    for (let day = 1; day <= totalDays; day++) {
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${currentYear}-${mm}-${dd}`;

      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;
      const dateStatus = dateStatuses[dateStr] || 'unmarked';

      cells.push(
        <div
          key={`day-${day}`}
          className={`cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => onSelectDate(dateStr)}
        >
          {day}
          {dateStatus !== 'unmarked' && (
            <div className={`cal-dot ${dateStatus}`}></div>
          )}
        </div>
      );
    }

    return cells;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="calendar-header">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {monthNames[currentMonth]} {currentYear}
        </h3>
        <div className="btn-group">
          <button className="cal-nav-btn" onClick={() => handleMonthOffset(-1)}>←</button>
          <button className="cal-nav-btn" onClick={() => handleMonthOffset(1)}>→</button>
        </div>
      </div>

      <div className="calendar-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((lbl, idx) => (
          <div key={`lbl-${idx}`} className="day-label">{lbl}</div>
        ))}
        {renderCells()}
      </div>
    </div>
  );
};

export default Calendar;
export { Calendar };
