import { useState, useEffect } from "react";
import Modal from "./ui/Modal.jsx";
import Button from "./ui/Button.jsx";
import Input from "./ui/Input.jsx";
import Textarea from "./ui/Textarea.jsx";
import { toast } from "sonner";
import moment from "moment";
import { apiFetch, apiUrl } from "../lib/api.js";
import apiClient from "../lib/apiClient.js";

const PostEventModal = ({ 
  isOpen, 
  onClose, 
  event, 
  onEventUpdate,
  onEventDelete 
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduled_time: "",
    scheduled_date: "",
    scheduled_time_only: "",
    image_url: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [postData, setPostData] = useState(null);

  // Load event data when modal opens
  useEffect(() => {
    if (isOpen && event) {
      const scheduledMoment = event.start_time ? moment(event.start_time) : null;
      setFormData({
        title: event.title || "",
        description: event.description || "",
        scheduled_time: scheduledMoment ? scheduledMoment.format("YYYY-MM-DDTHH:mm") : "",
        scheduled_date: scheduledMoment ? scheduledMoment.format("YYYY-MM-DD") : "",
        scheduled_time_only: scheduledMoment ? scheduledMoment.format("HH:mm") : "",
        image_url: event.metadata?.image_url || ""
      });
      
      // Fetch post data if this event has a post_id
      if (event.post_id) {
        fetchPostData(event.post_id);
      }
    }
  }, [isOpen, event]);

  const fetchPostData = async (postId) => {
    try {
      // First try to fetch the specific post
      try {
        const postResp = await apiFetch(`/api/posts/${postId}`);
        const postDataResp = await postResp.json();
        if (postDataResp.success && postDataResp.post) {
          console.log('Post data from database:', postDataResp.post);
          setPostData(postDataResp.post);
          setFormData(prev => ({
            ...prev,
            title: `📱 ${postDataResp.post.original_description?.substring(0, 50)}...`,
            description: postDataResp.post.caption || postDataResp.post.original_description,
            image_url: postDataResp.post.image_path || postDataResp.post.image_url || ""
          }));
          return;
        }
      } catch (e) {
        console.warn('Failed to fetch single post, trying fallback:', e);
      }
      
      // Fallback: get all posts and find the one we want
      const data = await apiClient.getPosts({ limit: 100 });
      if (data && data.success && data.posts) {
        const p = data.posts.find(x => String(x.id) === String(postId));
        if (p) {
          console.log('Post data from fallback:', p);
          setPostData(p);
          setFormData(prev => ({
            ...prev,
            title: `📱 ${p.original_description?.substring(0, 50)}...`,
            description: p.caption || p.original_description,
            image_url: p.image_path || p.image_url || ""
          }));
        } else {
          console.warn(`Post with ID ${postId} not found in ${data.posts.length} posts`);
        }
      }
    } catch (error) {
      console.error("Failed to fetch post data:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Event title is required");
      return;
    }

    if (!formData.scheduled_time) {
      toast.error("Scheduled time is required");
      return;
    }

    setIsLoading(true);

    try {
      const scheduledDateTime = new Date(formData.scheduled_time).toISOString();
      
      // Update calendar event
      const eventUpdateData = {
        title: formData.title.trim(),
        description: formData.description,
        start_time: scheduledDateTime,
        end_time: scheduledDateTime, // Point-in-time event
        metadata: {
          ...event.metadata,
          image_url: formData.image_url
        }
      };

      // Update the calendar event
      if (onEventUpdate) {
        await onEventUpdate(event.id, eventUpdateData);
      }

      // If this event is linked to a post, also update the post in database
      if (event.post_id) {
        try {
          const postUpdateResponse = await apiFetch(`/api/posts/${event.post_id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caption: formData.description,
              scheduled_at: scheduledDateTime
            })
          });

          if (!postUpdateResponse.ok) {
            console.error("Failed to update post in database");
            toast.warning("Event updated but failed to sync with database");
          } else {
            toast.success("Event and post updated successfully");
          }
        } catch (postError) {
          console.error("Error updating post:", postError);
          toast.warning("Event updated but failed to sync with database");
        }
      } else {
        toast.success("Event updated successfully");
      }

      onClose();
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error(`Failed to update event: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    setIsLoading(true);

    try {
      if (onEventDelete) {
        await onEventDelete(event.id);
      }
      toast.success("Event deleted successfully");
      onClose();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error(`Failed to delete event: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      scheduled_time: "",
      image_url: ""
    });
    setPostData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!event) return null;

  return (
    <Modal 
      open={isOpen} 
      onOpenChange={handleClose}
      title="Edit Post Event"
      className="max-w-md"
    >
      <div className="space-y-3 max-w-md mx-auto">
        {/* Generated Image Display */}
        {formData.image_url && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-contrast mb-1">
              Generated Image
            </label>
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <img
                src={formData.image_url.startsWith('/') ? apiUrl(formData.image_url) : formData.image_url}
                alt="Post preview"
                className="w-full h-12 object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div 
                className="w-full h-12 flex items-center justify-center text-gray-400 bg-gray-100"
                style={{ display: 'none' }}
              >
                <div className="text-center">
                  <div className="text-xl mb-1">🖼️</div>
                  <div className="text-xs">Image not available</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Event Title - Non-editable */}
        <div>
          <label className="block text-sm font-medium text-contrast mb-1">
            Event Title
          </label>
          <div className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-muted)] text-sm text-contrast">
            {formData.title}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-contrast mb-1">
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Enter event description..."
            rows={3}
            disabled={isLoading}
          />
          <div className="text-xs text-muted-contrast mt-1">
            {formData.description.length}/280 characters
          </div>
        </div>

        {/* Scheduled Date & Time */}
        <div>
          <label className="block text-sm font-medium text-contrast mb-1">
            Scheduled Date & Time
          </label>
          
          {/* Separate date and time inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  handleInputChange("scheduled_date", newDate);
                  // Combine with time
                  if (newDate && formData.scheduled_time_only) {
                    const combined = `${newDate}T${formData.scheduled_time_only}`;
                    handleInputChange("scheduled_time", combined);
                  }
                }}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-contrast bg-[var(--surface)]"
                disabled={isLoading}
                required
                min={moment().format("YYYY-MM-DD")}
                max={moment().add(1, 'year').format("YYYY-MM-DD")}
              />
            </div>
            <div>
              <input
                type="time"
                value={formData.scheduled_time_only}
                onChange={(e) => {
                  const newTime = e.target.value;
                  handleInputChange("scheduled_time_only", newTime);
                  // Combine with date
                  if (formData.scheduled_date && newTime) {
                    const combined = `${formData.scheduled_date}T${newTime}`;
                    handleInputChange("scheduled_time", combined);
                  }
                }}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-contrast bg-[var(--surface)]"
                disabled={isLoading}
                required
              />
            </div>
            <div className="col-span-2 text-xs text-muted-contrast">
              Select date and time separately
            </div>
          </div>
        </div>

        {/* Post Information Display */}
        {(postData || event) && (
          <div className="bg-[var(--bg-muted)] p-2 rounded-md">
            <h4 className="text-xs font-medium text-contrast mb-1">Post Information</h4>
            <div className="text-xs text-muted-contrast space-y-0.5">
              <div><strong>Platform:</strong> {
                (() => {
                  // Try multiple platform field formats
                  let platformValue = null;
                  
                  // Check postData first (from database)
                  if (postData) {
                    if (Array.isArray(postData.platforms) && postData.platforms.length > 0) {
                      platformValue = postData.platforms.join(', ');
                    } else if (postData.platform) {
                      platformValue = postData.platform;
                    }
                  }
                  
                  // Check event data if postData doesn't have platform info
                  if (!platformValue && event) {
                    if (Array.isArray(event.platforms) && event.platforms.length > 0) {
                      platformValue = event.platforms.join(', ');
                    } else if (event.platform) {
                      platformValue = event.platform;
                    }
                  }
                  
                  // Capitalize first letter if we found a platform
                  if (platformValue) {
                    return platformValue.split(', ').map(p => 
                      p.charAt(0).toUpperCase() + p.slice(1)
                    ).join(', ');
                  }
                  
                  return 'Not specified';
                })()
              }</div>
              <div><strong>Status:</strong> {postData?.status || event?.status || 'scheduled'}</div>
              <div><strong>Created:</strong> {new Date(postData?.created_at || event?.created_at || Date.now()).toLocaleDateString()}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-3 border-t">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="text-sm px-3 py-1.5 scale-90"
          >
            Cancel
          </Button>
          
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isLoading}
            className="text-sm px-3 py-1.5 scale-90"
          >
            Delete
          </Button>
          
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isLoading}
            className="text-sm px-3 py-1.5 scale-90"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PostEventModal;
