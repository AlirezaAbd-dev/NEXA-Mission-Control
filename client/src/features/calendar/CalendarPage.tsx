import React from 'react';
import { useParams } from 'react-router';
import { useCards } from '@/hooks/card/useCards';
import { useUiStore } from '@/stores/ui.store';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const CalendarPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: cards = [], isLoading } = useCards({ project_id: projectId || '' });
  const openCardModal = useUiStore((s) => s.openCardModal);

  const [currentDate, setCurrentDate] = React.useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading calendar...</div>;
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-4 overflow-hidden max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {monthNames[month]} {year}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button size="icon" variant="outline" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-semibold py-2 text-slate-400 bg-slate-50 dark:bg-slate-850">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-slate-200 dark:divide-slate-800 min-h-[480px]">
          {blanks.map((b) => (
            <div key={`blank-${b}`} className="bg-slate-50/50 dark:bg-slate-900/40 p-2 min-h-[80px]" />
          ))}

          {days.map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayCards = cards.filter((c) => c.due_date?.startsWith(dateStr));
            const isToday =
              new Date().toISOString().slice(0, 10) === dateStr;

            return (
              <div
                key={day}
                className={`p-2 min-h-[80px] flex flex-col gap-1 transition-colors ${
                  isToday ? 'bg-indigo-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'
                }`}
              >
                <span
                  className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  {day}
                </span>

                <div className="flex-1 space-y-1 overflow-y-auto">
                  {dayCards.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => openCardModal(c.id)}
                      className="text-xs p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 text-slate-900 dark:text-slate-100 truncate cursor-pointer transition-colors"
                      title={c.title}
                    >
                      {c.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
