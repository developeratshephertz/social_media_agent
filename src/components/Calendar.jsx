import { useState, useEffect, useMemo } from "react";
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Modal from "./ui/Modal.jsx";
import Button from "./ui/Button.jsx";
import Input from "./ui/Input.jsx";
import Textarea from "./ui/Textarea.jsx";
import { toast } from "sonner";
import apiClient from "../lib/apiClient.js";
import { apiFetch, apiUrl } from "../lib/api.js";

const localizer = momentLocalizer(moment);

const Calendar = ({
  events = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  onEventSelect,
  editable = true,
  height = 600,
  autoLoad = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create, edit, view
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start: new Date(),
    end: new Date(),
    color: "#3174ad",
    allDay: false,
    location: "",
    reminder: 15
  });

  // Internal events loaded from backend
  const [backendEvents, setBackendEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const loadEvents = async () => {
    // Don't load events if filtered events are provided as props
    if (!autoLoad || events.length > 0) return;
    try {
      setLoadingEvents(true);
      const data = await apiClient.getCalendarEvents();
      if (data && data.success && Array.isArray(data.events)) {
        setBackendEvents(data.events);
      }
    } catch (e) {
      console.warn('Failed to load calendar events:', e);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => { loadEvents(); }, [events]);

  // Custom event style getter
  const eventStyleGetter = (event) => {
    const backgroundColor = event.color || "#3174ad";
    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
        fontSize: "12px",
        fontWeight: "500"
      }
    };
  };

  // Transform events for BigCalendar and enrich with media/platform metadata
  const calendarEvents = useMemo(() => {
    // If events are provided as props, use only those (for filtering)
    // Otherwise, use backend events (for general calendar view)
    const eventsToUse = events.length > 0 ? events : backendEvents;

    return eventsToUse.map(event => ({
      ...event,
      start: new Date(event.start_time || event.start),
      end: new Date(event.end_time || event.end),
      title: event.title || "Untitled Event",
      // Common aliases
      imageUrl: event.imageUrl || event.image_url || event.driveImageUrl || event.image,
      caption: event.generatedContent || event.caption || event.description,
      platforms: Array.isArray(event.platforms)
        ? event.platforms
        : (event.platform ? [event.platform] : []),
    }));
  }, [events, backendEvents]);

  // Handle slot selection (creating new events)
  const handleSelectSlot = ({ start, end }) => {
    if (!editable) return;

    setSelectedSlot({ start, end });
    setFormData({
      title: "",
      description: "",
      start,
      end,
      color: "#3174ad",
      allDay: moment(end).diff(moment(start), 'hours') >= 24,
      location: "",
      reminder: 15
    });
    setModalMode("create");
    setIsModalOpen(true);
  };

  // Handle event selection
  const handleSelectEvent = (event) => {
    // Only call external handler, don't open default modal
    if (onEventSelect) {
      onEventSelect(event);
      return; // Exit early to prevent default modal
    }

    // Fallback to default behavior only if no external handler
    setSelectedEvent(event);
    setFormData({
      title: event.title || "",
      description: event.caption || event.description || "",
      start: new Date(event.start_time || event.start),
      end: new Date(event.end_time || event.end),
      color: event.color || "#3174ad",
      allDay: event.all_day || false,
      location: event.location || "",
      reminder: event.reminder_minutes || 15
    });

    if (editable) {
      setModalMode("edit");
    } else {
      setModalMode("view");
    }
    setIsModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle saving (create or update)
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Event title is required");
      return;
    }

    const eventData = {
      title: formData.title.trim(),
      description: formData.description,
      start_time: formData.start.toISOString(),
      end_time: formData.end.toISOString(),
      color: formData.color,
      all_day: formData.allDay,
      location: formData.location,
      reminder_minutes: parseInt(formData.reminder),
      status: "scheduled"
    };

    try {
      if (modalMode === "create") {
        if (onEventCreate) {
          await onEventCreate(eventData);
        } else {
          await apiClient.createCalendarEvent(eventData);
        }
        toast.success("Event created successfully");
      } else if (modalMode === "edit") {
        if (onEventUpdate) {
          await onEventUpdate(selectedEvent.id, eventData);
        } else if (selectedEvent?.id) {
          await apiClient.updateCalendarEvent(selectedEvent.id, eventData);
        }
        // If this event is linked to a post, also sync the scheduled time
        if (selectedEvent?.post_id) {
          try {
            await apiClient.updatePost(String(selectedEvent.post_id), { scheduled_at: eventData.start_time, status: 'scheduled' });
          } catch (e) {
            console.warn('Failed to sync campaign with event update:', e);
          }
        }
        toast.success("Event updated successfully");
      }

      setIsModalOpen(false);
      resetForm();
      // Refresh backend events to reflect changes
      loadEvents();
    } catch (error) {
      toast.error(`Failed to save event: ${error.message}`);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedEvent?.id) return;

    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      if (onEventDelete) {
        await onEventDelete(selectedEvent.id);
      } else {
        await apiClient.deleteCalendarEvent(selectedEvent.id);
      }
      // If linked to a post, clear its schedule
      if (selectedEvent?.post_id) {
        try { await apiClient.updatePost(String(selectedEvent.post_id), { scheduled_at: null, status: 'draft' }); } catch { }
      }
      toast.success("Event deleted successfully");
      setIsModalOpen(false);
      resetForm();
      loadEvents();
    } catch (error) {
      toast.error(`Failed to delete event: ${error.message}`);
    }
  };

  // Reset form and state
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      start: new Date(),
      end: new Date(),
      color: "#3174ad",
      allDay: false,
      location: "",
      reminder: 15
    });
    setSelectedEvent(null);
    setSelectedSlot(null);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // State management for calendar view - default to week
  const [currentView, setCurrentView] = useState("week");

  // Enrich events with post details when available (caption, image, platforms)
  useEffect(() => {
    const enrich = async () => {
      try {
        const needs = backendEvents.filter(ev => ev && ev.post_id && (!ev.caption || !ev.platforms || ev.platforms.length === 0 || !ev.imageUrl));
        if (needs.length === 0) return;
        const results = await Promise.allSettled(needs.map(async (ev) => {
          try {
            const resp = await apiFetch(`/api/posts/${ev.post_id}`);
            const data = await resp.json();
            if (data && data.success && data.post) {
              const p = data.post;
              const platforms = Array.isArray(p.platforms) ? p.platforms : (p.platform ? [p.platform] : []);
              const imageUrl = p.image_path ? apiUrl(p.image_path) : (p.image_url || ev.imageUrl);
              return { ...ev, caption: p.caption || p.original_description || ev.caption, platforms: platforms.length ? platforms : ev.platforms, imageUrl };
            }
          } catch { }
          return ev;
        }));
        // Merge back into backendEvents
        const byId = new Map(backendEvents.map(e => [e.id || `${e.title}-${e.start_time || e.start}`, e]));
        results.forEach(r => {
          if (r.status === 'fulfilled') {
            const e = r.value;
            const id = e.id || `${e.title}-${e.start_time || e.start}`;
            byId.set(id, e);
          }
        });
        setBackendEvents(Array.from(byId.values()));
      } catch { }
    };
    enrich();
  }, [backendEvents]);

  const CustomToolbar = ({ label, onNavigate, onView }) => {
    const handleViewChange = (newView) => {
      console.log(`🗓️ Changing calendar view to: ${newView}`);
      setCurrentView(newView);
      onView(newView);
    };

    return (
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              console.log('📅 Navigating to previous period');
              onNavigate("PREV");
            }}
          >
            ←
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              console.log('📅 Navigating to today');
              onNavigate("TODAY");
            }}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              console.log('📅 Navigating to next period');
              onNavigate("NEXT");
            }}
          >
            →
          </Button>
        </div>

        <h2 className="text-lg font-semibold text-gray-900">{label}</h2>

        <div className="flex items-center space-x-1">
          {["month", "week", "day", "agenda"].map(viewName => (
            <Button
              key={viewName}
              size="sm"
              variant={currentView === viewName ? "primary" : "secondary"}
              onClick={() => handleViewChange(viewName)}
              className={currentView === viewName ? "bg-blue-600 text-white" : ""}
            >
              {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // Custom compact event renderer (thumbnail + title)
  const EventContent = ({ event }) => {
    return (
      <div className="flex items-center gap-1 overflow-hidden">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="thumb" className="w-4 h-4 rounded object-cover" />
        ) : null}
        <span className="truncate">{event.title}</span>
      </div>
    );
  };

  return (
    <div className="w-full">
      <style jsx>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-toolbar {
          display: none !important;
        }
        .rbc-event {
          border-radius: 4px;
          padding: 2px 4px;
        }
        .rbc-day-slot {
          min-height: 20px;
        }
        .rbc-time-slot {
          border-bottom: 1px solid #e5e7eb;
        }
        .rbc-today {
          background-color: #f0f9ff;
        }
        .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 2px;
          z-index: 1;
        }
      `}</style>

      <BigCalendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height }}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        selectable={editable}
        eventPropGetter={eventStyleGetter}
        components={{
          toolbar: CustomToolbar,
          event: EventContent
        }}
        step={30}
        timeslots={2}
        view={currentView}
        onView={(view) => setCurrentView(view)}
        views={["month", "week", "day", "agenda"]}
        popup
        showMultiDayTimes
      />

      {/* Event Modal */}
      <Modal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        title={
          modalMode === "create"
            ? "Create Event"
            : modalMode === "edit"
              ? "Edit Event"
              : "View Event"
        }
      >
        <div className="space-y-4 max-w-lg mx-auto">
          {/* Preview section: image, caption, platforms */}
          {selectedEvent && (
            <div className="rounded-lg border p-3 bg-gray-50">
              <div className="flex items-start gap-3">
                {selectedEvent.imageUrl ? (
                  <img
                    src={selectedEvent.imageUrl}
                    alt="preview"
                    className="w-16 h-16 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded bg-white border flex items-center justify-center text-gray-400">
                    🖼️
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{selectedEvent.title || "Untitled Event"}</div>
                  {selectedEvent.caption && (
                    <div className="text-xs text-black line-clamp-2">{selectedEvent.caption}</div>
                  )}
                  {selectedEvent.platforms && selectedEvent.platforms.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedEvent.platforms.map((pf, i) => (
                        <span key={`${pf}-${i}`} className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-800">
                          {pf === 'twitter' ? 'X (Twitter)' : (pf || '').charAt(0).toUpperCase() + (pf || '').slice(1)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Title */}
          <Input
            label="Event Title"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Enter event title..."
            disabled={modalMode === "view"}
            required
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter event description..."
              rows={3}
              disabled={modalMode === "view"}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={moment(formData.start).format("YYYY-MM-DDTHH:mm")}
                onChange={(e) => handleInputChange("start", new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={modalMode === "view"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={moment(formData.end).format("YYYY-MM-DDTHH:mm")}
                onChange={(e) => handleInputChange("end", new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={modalMode === "view"}
              />
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allDay"
              checked={formData.allDay}
              onChange={(e) => handleInputChange("allDay", e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={modalMode === "view"}
            />
            <label htmlFor="allDay" className="ml-2 text-sm font-medium text-gray-700">
              All day event
            </label>
          </div>

          {/* Location */}
          <Input
            label="Location (Optional)"
            value={formData.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
            placeholder="Enter location..."
            disabled={modalMode === "view"}
          />

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => handleInputChange("color", e.target.value)}
                className="h-8 w-16 border border-gray-300 rounded cursor-pointer"
                disabled={modalMode === "view"}
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleInputChange("color", e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={modalMode === "view"}
                placeholder="#3174ad"
              />
            </div>
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reminder (minutes before)
            </label>
            <select
              value={formData.reminder}
              onChange={(e) => handleInputChange("reminder", parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={modalMode === "view"}
            >
              <option value={0}>No reminder</option>
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={1440}>1 day</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={handleModalClose}
            >
              {modalMode === "view" ? "Close" : "Cancel"}
            </Button>

            {modalMode === "edit" && editable && (
              <Button
                variant="danger"
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}

            {modalMode !== "view" && (
              <Button
                variant="primary"
                onClick={handleSave}
              >
                {modalMode === "create" ? "Create Event" : "Save Changes"}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Calendar;
