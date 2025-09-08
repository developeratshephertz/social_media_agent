import { useState, useEffect, useMemo } from "react";
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Modal from "./ui/Modal.jsx";
import Button from "./ui/Button.jsx";
import Input from "./ui/Input.jsx";
import Textarea from "./ui/Textarea.jsx";
import { toast } from "sonner";

const localizer = momentLocalizer(moment);

const Calendar = ({ 
  events = [], 
  onEventCreate, 
  onEventUpdate, 
  onEventDelete,
  onEventSelect,
  editable = true,
  height = 600 
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

  // Transform events for BigCalendar
  const calendarEvents = useMemo(() => {
    return events.map(event => ({
      ...event,
      start: new Date(event.start_time || event.start),
      end: new Date(event.end_time || event.end),
      title: event.title || "Untitled Event"
    }));
  }, [events]);

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
      description: event.description || "",
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
        }
        toast.success("Event created successfully");
      } else if (modalMode === "edit") {
        if (onEventUpdate) {
          await onEventUpdate(selectedEvent.id, eventData);
        }
        toast.success("Event updated successfully");
      }
      
      setIsModalOpen(false);
      resetForm();
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
      }
      toast.success("Event deleted successfully");
      setIsModalOpen(false);
      resetForm();
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
          toolbar: CustomToolbar
        }}
        step={30}
        timeslots={2}
        view={currentView}
        onView={(view) => setCurrentView(view)}
        views={["month", "week", "day", "agenda"]}
        popup={false}
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
