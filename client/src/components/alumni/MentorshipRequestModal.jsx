import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Target, Send, Sparkles } from 'lucide-react';

const MentorshipRequestModal = ({ isOpen, onClose, alumni, onSubmit, loading = false }) => {
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [goals, setGoals] = useState([]);
  const [error, setError] = useState('');

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!goalInput.trim()) return;
    if (goals.length >= 5) {
      setError('You can add up to 5 goals.');
      return;
    }
    setGoals([...goals, goalInput.trim()]);
    setGoalInput('');
    setError('');
  };

  const handleRemoveGoal = (index) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please specify a mentorship topic');
      return;
    }
    if (!message.trim() || message.length < 10) {
      setError('Please provide a message with at least 10 characters explaining your goals');
      return;
    }

    try {
      await onSubmit({
        alumniId: alumni._id || alumni.id,
        topic: topic.trim(),
        message: message.trim(),
        goals,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit request');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Request Mentorship — ${alumni?.fullName || 'Alumni Mentor'}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
            {alumni?.fullName?.charAt(0) || 'M'}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">{alumni?.fullName}</h4>
            <p className="text-xs text-slate-400">
              {alumni?.designation ? `${alumni.designation} at ${alumni.company}` : alumni?.college || 'Alumni Mentor'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Mentorship Topic / Focus Area <span className="text-rose-400">*</span>
          </label>
          <Input
            placeholder="e.g. System Design, Career Transition to Cloud, Resume Review"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Request Note & Introduction <span className="text-rose-400">*</span>
          </label>
          <textarea
            className="w-full h-28 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
            placeholder="Introduce yourself, your background, and why you are seeking guidance from this mentor..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Key Learning Goals (Optional)
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="e.g. Master distributed caching fundamentals"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
            />
            <Button type="button" variant="secondary" size="sm" onClick={handleAddGoal}>
              Add
            </Button>
          </div>
          {goals.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {goals.map((g, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700"
                >
                  <Target className="w-3 h-3 text-amber-400" />
                  {g}
                  <button
                    type="button"
                    onClick={() => handleRemoveGoal(i)}
                    className="text-slate-500 hover:text-rose-400 ml-1 text-xs"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Send className="w-4 h-4 mr-1.5" />
            Send Mentorship Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MentorshipRequestModal;
