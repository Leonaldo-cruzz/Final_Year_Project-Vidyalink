import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Calendar, Video, MapPin, Clock } from 'lucide-react';

const ScheduleMockInterviewModal = ({
  isOpen,
  onClose,
  interview,
  onSchedule,
  loading = false,
}) => {
  const [mode, setMode] = useState(interview?.mode || 'ONLINE');
  const [scheduledDate, setScheduledDate] = useState(
    interview?.scheduledDate
      ? new Date(interview.scheduledDate).toISOString().slice(0, 16)
      : ''
  );
  const [meetingLink, setMeetingLink] = useState(interview?.meetingLink || '');
  const [location, setLocation] = useState(interview?.location || '');
  const [durationMinutes, setDurationMinutes] = useState(interview?.durationMinutes || 45);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduledDate) {
      setError('Please select date and time for the interview');
      return;
    }

    if (mode === 'ONLINE' && !meetingLink.trim()) {
      setError('Please provide a Google Meet / Zoom meeting link for online interview');
      return;
    }

    if (mode === 'OFFLINE' && !location.trim()) {
      setError('Please specify the campus or office room location for offline interview');
      return;
    }

    try {
      await onSchedule(interview._id, {
        mode,
        scheduledDate: new Date(scheduledDate).toISOString(),
        meetingLink: mode === 'ONLINE' ? meetingLink.trim() : '',
        location: mode === 'OFFLINE' ? location.trim() : '',
        durationMinutes: Number(durationMinutes),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to schedule interview');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Mock Interview Session" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <p className="text-xs text-slate-400">Target Role</p>
          <p className="text-sm font-bold text-slate-100">{interview?.roleTarget || 'Technical Interview'}</p>
          <p className="text-xs text-slate-400 mt-1">
            Student: <span className="text-slate-200 font-semibold">{interview?.student?.fullName}</span>
          </p>
        </div>

        {/* Mode Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Interview Mode</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('ONLINE')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                mode === 'ONLINE'
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Video className="w-4 h-4" /> Online (Video)
            </button>
            <button
              type="button"
              onClick={() => setMode('OFFLINE')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                mode === 'OFFLINE'
                  ? 'bg-amber-600/20 border-amber-500/50 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <MapPin className="w-4 h-4" /> In-Person / Offline
            </button>
          </div>
        </div>

        {/* Date and Time */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Date & Time <span className="text-rose-400">*</span>
          </label>
          <Input
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Duration (Minutes)
          </label>
          <select
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none"
          >
            <option value={30}>30 Minutes</option>
            <option value={45}>45 Minutes (Recommended)</option>
            <option value={60}>60 Minutes</option>
            <option value={90}>90 Minutes</option>
          </select>
        </div>

        {/* Meeting Link or Location */}
        {mode === 'ONLINE' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Google Meet / Zoom URL <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="https://meet.google.com/abc-defg-hij"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              required
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Location / Room Details <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. Block B, Innovation Lab 304, Campus Main Center"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Calendar className="w-4 h-4 mr-1.5" />
            Confirm Schedule
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleMockInterviewModal;
