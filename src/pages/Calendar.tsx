import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// ============================================================================
// FAMILY CALENDAR DASHBOARD - UNIFIED CALENDAR INTERFACE
// ============================================================================

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  calendar_id: string;
  account_id: string;
  location?: string;
  attendees?: string[];
  created_at: string;
  updated_at: string;
  account?: {
    provider_id: string;
    account_name: string;
  };
}

interface CalendarAccount {
  id: string;
  provider_id: string;
  account_name: string;
  account_email: string;
  status: 'connected' | 'error' | 'syncing';
  last_sync: string;
  color: string;
}

type ViewMode = 'month' | 'week' | 'day' | 'list';

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const [visibleAccounts, setVisibleAccounts] = useState<Set<string>>(new Set());
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    all_day: false,
    location: '',
    account_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Family member colors
  const familyColors = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
    '#f97316', // Orange
    '#06b6d4', // Cyan
    '#84cc16', // Lime
  ];

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setLoading(true);

      // Load calendar accounts
      const accountsResponse = await fetch('/api/calendar/accounts');
      const accountsData = await accountsResponse.json();

      // Load calendar events
      const eventsResponse = await fetch('/api/calendar/events');
      const eventsData = await eventsResponse.json();

      if (accountsData.success) {
        const accountsWithColors = accountsData.data.accounts.map((account: any, index: number) => ({
          ...account,
          color: familyColors[index % familyColors.length],
        }));
        setAccounts(accountsWithColors);
        setVisibleAccounts(new Set(accountsWithColors.map((acc: any) => acc.id)));
      }

      if (eventsData.success) {
        setEvents(eventsData.data.events);
      }
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/calendar/sync', { method: 'POST' });
      const result = await response.json();

      if (result.success) {
        await loadCalendarData();
      }
    } catch (error) {
      console.error('Failed to sync calendars:', error);
    } finally {
      setSyncing(false);
    }
  };

  const toggleAccountVisibility = (accountId: string) => {
    const newVisible = new Set(visibleAccounts);
    if (newVisible.has(accountId)) {
      newVisible.delete(accountId);
    } else {
      newVisible.add(accountId);
    }
    setVisibleAccounts(newVisible);
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      all_day: false,
      location: '',
      account_id: accounts[0]?.id || '',
    });
  };

  const handleCreateEvent = () => {
    resetEventForm();
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);

    setEventForm({
      title: event.title,
      description: event.description || '',
      start_date: startDate.toISOString().split('T')[0],
      start_time: event.all_day ? '' : startDate.toTimeString().slice(0, 5),
      end_date: endDate.toISOString().split('T')[0],
      end_time: event.all_day ? '' : endDate.toTimeString().slice(0, 5),
      all_day: event.all_day,
      location: event.location || '',
      account_id: event.account_id,
    });

    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleSubmitEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.account_id) {
      alert('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      const startDateTime = eventForm.all_day
        ? new Date(eventForm.start_date + 'T00:00:00')
        : new Date(eventForm.start_date + 'T' + eventForm.start_time);

      const endDateTime = eventForm.all_day
        ? new Date(eventForm.end_date + 'T23:59:59')
        : new Date(eventForm.end_date + 'T' + eventForm.end_time);

      const eventData = {
        title: eventForm.title,
        description: eventForm.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: eventForm.all_day,
        location: eventForm.location,
        account_id: eventForm.account_id,
      };

      const url = selectedEvent
        ? `/api/calendar/events/${selectedEvent.id}`
        : '/api/calendar/events';

      const method = selectedEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const result = await response.json();

      if (result.success) {
        setShowEventModal(false);
        await loadCalendarData();
      } else {
        alert(`Failed to ${selectedEvent ? 'update' : 'create'} event: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to submit event:', error);
      alert('Failed to save event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setShowEventModal(false);
        setSelectedEvent(null);
        await loadCalendarData();
      } else {
        alert(`Failed to delete event: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const getVisibleEvents = () => {
    return events.filter(event => visibleAccounts.has(event.account_id));
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (viewMode) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }

    setCurrentDate(newDate);
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Family Calendar
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>

          <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 min-w-[200px] text-center">
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatDate(currentDate)}
            </span>
          </div>

          <button
            onClick={() => navigateDate('next')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* View Mode Selector */}
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          {[
            { mode: 'month' as ViewMode, icon: Squares2X2Icon, label: 'Month' },
            { mode: 'week' as ViewMode, icon: ViewColumnsIcon, label: 'Week' },
            { mode: 'day' as ViewMode, icon: ClockIcon, label: 'Day' },
            { mode: 'list' as ViewMode, icon: ListBulletIcon, label: 'List' },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg transition-colors"
        >
          <ArrowPathIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Sync'}</span>
        </button>

        {/* Add Event Button */}
        <button
          onClick={handleCreateEvent}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Event</span>
        </button>
      </div>
    </div>
  );

  const renderAccountsSidebar = () => (
    <div className="w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <UserGroupIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Family Calendars</h3>
      </div>

      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => toggleAccountVisibility(account.id)}
                className="flex items-center space-x-2"
              >
                <div
                  className="w-4 h-4 rounded-full border-2"
                  style={{
                    backgroundColor: visibleAccounts.has(account.id) ? account.color : 'transparent',
                    borderColor: account.color
                  }}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {account.account_name}
                </span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {account.status === 'connected' && (
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
              )}
              {account.status === 'error' && (
                <ExclamationCircleIcon className="w-4 h-4 text-red-500" />
              )}
              {account.status === 'syncing' && (
                <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" />
              )}

              <span className="text-xs text-gray-500 dark:text-gray-400">
                {account.provider_id}
              </span>
            </div>
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No calendar accounts connected
            </p>
            <button
              onClick={() => window.location.href = '/settings'}
              className="text-sm text-blue-500 hover:text-blue-600 mt-2"
            >
              Connect accounts in Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDay = new Date(startDate);

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const visibleEvents = getVisibleEvents();

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {dayNames.map((day) => (
            <div key={day} className="p-4 text-center font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const isCurrentMonth = day.getMonth() === month;
            const isToday = day.toDateString() === new Date().toDateString();
            const dayEvents = visibleEvents.filter(event => {
              const eventDate = new Date(event.start_time);
              return eventDate.toDateString() === day.toDateString();
            });

            return (
              <motion.div
                key={index}
                className={`min-h-[120px] p-2 border-r border-b border-gray-200 dark:border-gray-700 ${
                  !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900' : ''
                } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
              >
                <div className={`text-sm font-medium mb-1 ${
                  !isCurrentMonth ? 'text-gray-400' : isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {day.getDate()}
                </div>

                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => {
                    const account = accounts.find(acc => acc.id === event.account_id);
                    return (
                      <motion.div
                        key={event.id}
                        className="text-xs p-1 rounded cursor-pointer truncate"
                        style={{ backgroundColor: account?.color + '20', color: account?.color }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleEditEvent(event)}
                      >
                        {event.title}
                      </motion.div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });

    const visibleEvents = getVisibleEvents();
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Week Header */}
        <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
          <div className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            Time
          </div>
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`p-4 text-center border-l border-gray-200 dark:border-gray-700 ${
                day.toDateString() === new Date().toDateString()
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : ''
              }`}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-bold ${
                day.toDateString() === new Date().toDateString()
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Week Grid */}
        <div className="max-h-96 overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {weekDays.map((day, dayIndex) => {
                const dayEvents = visibleEvents.filter(event => {
                  const eventDate = new Date(event.start_time);
                  const eventHour = eventDate.getHours();
                  return (
                    eventDate.toDateString() === day.toDateString() &&
                    (event.all_day || eventHour === hour)
                  );
                });

                return (
                  <div
                    key={dayIndex}
                    className="min-h-[60px] p-1 border-l border-gray-100 dark:border-gray-700 relative"
                  >
                    {dayEvents.map((event) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-1 p-1 rounded text-xs cursor-pointer"
                        style={{
                          backgroundColor: accounts.find(acc => acc.id === event.account_id)?.color || '#3b82f6',
                          color: 'white'
                        }}
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowEventModal(true);
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        {!event.all_day && (
                          <div className="opacity-75">
                            {new Date(event.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const visibleEvents = getVisibleEvents();
    const dayEvents = visibleEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === currentDate.toDateString();
    });

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const isToday = currentDate.toDateString() === new Date().toDateString();

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Day Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              {isToday && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mt-2">
                  Today
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Day Timeline */}
        <div className="max-h-96 overflow-y-auto">
          {hours.map((hour) => {
            const hourEvents = dayEvents.filter(event => {
              const eventHour = new Date(event.start_time).getHours();
              return event.all_day || eventHour === hour;
            });

            const currentHour = new Date().getHours();
            const isCurrentHour = isToday && hour === currentHour;

            return (
              <div
                key={hour}
                className={`flex border-b border-gray-100 dark:border-gray-700 ${
                  isCurrentHour ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="w-20 p-4 text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className={`font-medium ${isCurrentHour ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </div>
                </div>
                <div className="flex-1 min-h-[80px] p-4">
                  {hourEvents.length === 0 ? (
                    <div className="h-full flex items-center text-gray-400 dark:text-gray-600 text-sm">
                      {isCurrentHour && <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>}
                      {isCurrentHour ? 'Current time' : ''}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {hourEvents.map((event) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                          style={{
                            backgroundColor: accounts.find(acc => acc.id === event.account_id)?.color || '#3b82f6',
                            color: 'white'
                          }}
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowEventModal(true);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{event.title}</h4>
                              {event.description && (
                                <p className="text-sm opacity-90 mt-1">{event.description}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-sm opacity-75">
                                {!event.all_day && (
                                  <span>
                                    {new Date(event.start_time).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })} - {new Date(event.end_time).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                                {event.all_day && <span>All day</span>}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const visibleEvents = getVisibleEvents();
    const sortedEvents = visibleEvents.sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Group events by date
    const groupedEvents = sortedEvents.reduce((groups, event) => {
      const date = new Date(event.start_time).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {} as Record<string, CalendarEvent[]>);

    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Events List
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {sortedEvents.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Events Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No events found for the selected calendars.
              </p>
            </div>
          ) : (
            Object.entries(groupedEvents).map(([dateString, dayEvents]) => {
              const date = new Date(dateString);
              const isToday = dateString === today;
              const isTomorrow = dateString === tomorrow;

              let dateLabel = date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              });

              if (isToday) dateLabel = `Today, ${dateLabel}`;
              else if (isTomorrow) dateLabel = `Tomorrow, ${dateLabel}`;

              return (
                <div key={dateString} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {dateLabel}
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {dayEvents.map((event) => {
              const account = accounts.find(acc => acc.id === event.account_id);
              const startDate = new Date(event.start_time);
              const endDate = new Date(event.end_time);

              return (
                <motion.div
                  key={event.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  whileHover={{ x: 4 }}
                  onClick={() => handleEditEvent(event)}
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className="w-3 h-3 rounded-full mt-2"
                      style={{ backgroundColor: account?.color }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {!event.all_day && (
                          <span>
                            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {event.all_day && <span>All day</span>}
                        <span className="text-xs">
                          {account?.account_name}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className="min-h-screen p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto">
        {renderHeader()}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Main Calendar View */}
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {viewMode === 'month' && renderMonthView()}
                  {viewMode === 'week' && renderWeekView()}
                  {viewMode === 'day' && renderDayView()}
                  {viewMode === 'list' && renderListView()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Accounts Sidebar */}
            {renderAccountsSidebar()}
          </div>
        )}
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedEvent ? 'Edit Event' : 'Create Event'}
                  </h2>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitEvent(); }}>
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        value={eventForm.title}
                        onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter event title"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={eventForm.description}
                        onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter event description"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* Calendar Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Calendar *
                      </label>
                      <select
                        value={eventForm.account_id}
                        onChange={(e) => setEventForm(prev => ({ ...prev, account_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      >
                        <option value="">Select a calendar</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.account_name} ({account.provider_id})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* All Day Toggle */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="all-day"
                        checked={eventForm.all_day}
                        onChange={(e) => setEventForm(prev => ({ ...prev, all_day: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="all-day" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        All Day Event
                      </label>
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          value={eventForm.start_date}
                          onChange={(e) => setEventForm(prev => ({ ...prev, start_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Date *
                        </label>
                        <input
                          type="date"
                          value={eventForm.end_date}
                          onChange={(e) => setEventForm(prev => ({ ...prev, end_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                    </div>

                    {!eventForm.all_day && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={eventForm.start_time}
                            onChange={(e) => setEventForm(prev => ({ ...prev, start_time: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={eventForm.end_time}
                            onChange={(e) => setEventForm(prev => ({ ...prev, end_time: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={eventForm.location}
                        onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Enter event location"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      {selectedEvent && (
                        <button
                          type="button"
                          onClick={handleDeleteEvent}
                          className="px-4 py-2 text-red-600 hover:text-red-800 transition-colors"
                        >
                          Delete Event
                        </button>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowEventModal(false)}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center space-x-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                      >
                        {submitting ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            <span>{selectedEvent ? 'Updating...' : 'Creating...'}</span>
                          </>
                        ) : (
                          <span>{selectedEvent ? 'Update Event' : 'Create Event'}</span>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Calendar;
