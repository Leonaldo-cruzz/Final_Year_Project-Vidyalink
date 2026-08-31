import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Award, CheckCircle2 } from 'lucide-react';

const EndorseSkillModal = ({ isOpen, onClose, student, availableSkills = [], onEndorse, loading = false }) => {
  const [selectedSkill, setSelectedSkill] = useState('');
  const [customSkill, setCustomSkill] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSelectSkill = (skill) => {
    setSelectedSkill(skill);
    setCustomSkill('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalSkill = selectedSkill || customSkill;
    if (!finalSkill.trim()) {
      setError('Please select or specify a skill to endorse');
      return;
    }

    try {
      await onEndorse({
        studentId: student._id || student.id,
        skill: finalSkill.trim(),
        message: message.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to endorse skill');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Endorse Skill — ${student?.fullName || 'Student'}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Select a Skill from Student's Profile <span className="text-rose-400">*</span>
          </label>
          {availableSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-slate-900/60 rounded-xl border border-slate-800">
              {availableSkills.map((sk) => {
                const isSelected = selectedSkill === sk;
                return (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => handleSelectSkill(sk)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {sk}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              No skills found on profile. Enter skill name manually below:
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Or Type Skill Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
            placeholder="e.g. React.js, Python, System Design"
            value={customSkill}
            onChange={(e) => {
              setCustomSkill(e.target.value);
              setSelectedSkill('');
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Endorsement Note / Recommendation (Optional)
          </label>
          <textarea
            className="w-full h-24 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            placeholder="Highlight what makes this student proficient in this skill, project quality, or problem solving ability..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            <Award className="w-4 h-4 mr-1.5" />
            Endorse Skill
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EndorseSkillModal;
