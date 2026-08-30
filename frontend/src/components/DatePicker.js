import React, { useEffect, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

const DatePicker = ({ value, onChange }) => {
  const selected = value ? parseISO(value) : new Date();
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected));

  useEffect(() => {
    if (value) {
      setViewMonth(startOfMonth(parseISO(value)));
    }
  }, [value]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  });

  return (
    <div className="date-picker">
      <div className="date-picker-header">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setViewMonth((month) => addMonths(month, -1))}
        >
          Prev
        </button>
        <strong>{format(viewMonth, 'MMMM yyyy')}</strong>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setViewMonth((month) => addMonths(month, 1))}
        >
          Next
        </button>
      </div>
      <div className="date-picker-weekdays">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
          <span key={label} className={label === 'Wed' ? 'weekday-wed' : undefined}>
            {label}
          </span>
        ))}
      </div>
      <div className="date-picker-grid">
        {days.map((day) => {
          const isWed = getDay(day) === 3;
          const inMonth = isSameMonth(day, viewMonth);
          const isSelected = value && isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={[
                'date-picker-day',
                inMonth ? '' : 'outside-month',
                isWed ? 'wednesday' : '',
                isSelected ? 'selected' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onChange(format(day, 'yyyy-MM-dd'))}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
      <p className="date-picker-hint">Wednesdays are highlighted</p>
    </div>
  );
};

export default DatePicker;
