import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UploadCloud,
  FileText,
  AlertCircle,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { createCertificate } from '@/services/certificateService';
import { getErrorMessage } from '@/utils/formatters';

const CATEGORIES = [
  'Internship',
  'Course',
  'Hackathon',
  'Workshop',
  'Competition',
  'Research',
  'Cloud Certification',
  'Other',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const certificateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Certificate title is required')
    .max(200, 'Title must not exceed 200 characters'),
  issuer: z
    .string()
    .trim()
    .min(1, 'Issuing organization is required')
    .max(200, 'Issuer must not exceed 200 characters'),
  category: z.enum(CATEGORIES, { required_error: 'Select a category' }),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().optional().nullable(),
  credentialId: z.string().trim().optional().nullable(),
  credentialUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val === '' || /^https?:\/\/.+/i.test(val),
      'Enter a valid HTTP or HTTPS URL'
    ),
  skills: z.string().optional().nullable(),
  certificateFile: z
    .any()
    .refine((files) => files && files.length > 0, 'Please upload a certificate document')
    .refine((files) => {
      if (!files || files.length === 0) return false;
      const file = files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      const validExts = ['.pdf', '.jpg', '.jpeg', '.png'];
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      return validTypes.includes(file.type) || validExts.includes(ext);
    }, 'Only PDF, JPG, and PNG files are allowed')
    .refine(
      (files) => files && files[0]?.size <= MAX_FILE_SIZE,
      'File size must not exceed 5 MB'
    ),
});

const CreateCertificateModal = ({ open, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      category: 'Course',
    },
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setValue('certificateFile', e.target.files, { shouldValidate: true });
    }
  };

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      setErrorMsg('');

      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('issuer', data.issuer);
      formData.append('category', data.category);
      formData.append('issueDate', data.issueDate);
      if (data.expiryDate) formData.append('expiryDate', data.expiryDate);
      if (data.credentialId) formData.append('credentialId', data.credentialId);
      if (data.credentialUrl) formData.append('credentialUrl', data.credentialUrl);
      if (data.skills) formData.append('skills', data.skills);
      if (selectedFile) formData.append('certificateFile', selectedFile);

      const res = await createCertificate(formData);
      reset();
      setSelectedFile(null);
      onSuccess(res.data);
      onClose();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to create certificate'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        setSelectedFile(null);
        setErrorMsg('');
        onClose();
      }}
      title="Add New Certificate"
      size="lg"
    >
      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
        {/* Title & Issuer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Certificate Title <span className="text-red-400">*</span>
            </label>
            <input
              {...register('title')}
              placeholder="e.g. AWS Certified Solutions Architect"
              className="form-input"
            />
            {errors.title && (
              <p className="text-red-400 mt-1 text-[11px]">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Issuing Organization <span className="text-red-400">*</span>
            </label>
            <input
              {...register('issuer')}
              placeholder="e.g. Amazon Web Services, Coursera"
              className="form-input"
            />
            {errors.issuer && (
              <p className="text-red-400 mt-1 text-[11px]">{errors.issuer.message}</p>
            )}
          </div>
        </div>

        {/* Category & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Category <span className="text-red-400">*</span>
            </label>
            <select {...register('category')} className="form-input bg-slate-900">
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-400 mt-1 text-[11px]">{errors.category.message}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Issue Date <span className="text-red-400">*</span>
            </label>
            <input {...register('issueDate')} type="date" className="form-input" />
            {errors.issueDate && (
              <p className="text-red-400 mt-1 text-[11px]">{errors.issueDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Expiry Date (Optional)
            </label>
            <input {...register('expiryDate')} type="date" className="form-input" />
          </div>
        </div>

        {/* Credential ID & URL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Credential ID (Optional)
            </label>
            <input
              {...register('credentialId')}
              placeholder="e.g. AWS-123456789"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Credential URL (Optional)
            </label>
            <input
              {...register('credentialUrl')}
              placeholder="https://coursera.org/verify/..."
              className="form-input"
            />
            {errors.credentialUrl && (
              <p className="text-red-400 mt-1 text-[11px]">
                {errors.credentialUrl.message}
              </p>
            )}
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1.5">
            Skills Learned (Comma Separated)
          </label>
          <input
            {...register('skills')}
            placeholder="e.g. Cloud Computing, AWS, Docker, Kubernetes"
            className="form-input"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1.5">
            Upload Certificate Document <span className="text-red-400">*</span>
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-5 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-900/60 transition-all flex flex-col items-center justify-center"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf,image/jpeg,image/png"
              className="hidden"
            />
            <UploadCloud className="w-6 h-6 text-blue-400 mb-2" />
            {selectedFile ? (
              <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <FileText className="w-4 h-4" /> {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-300">
                  Click to browse certificate document (PDF, JPG, PNG)
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Max size 5 MB</p>
              </>
            )}
          </div>
          {errors.certificateFile && (
            <p className="text-red-400 mt-1 text-[11px]">
              {errors.certificateFile.message}
            </p>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => {
              reset();
              setSelectedFile(null);
              onClose();
            }}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button type="submit" variant="primary" size="md" loading={submitting}>
            Add Certificate
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateCertificateModal;
