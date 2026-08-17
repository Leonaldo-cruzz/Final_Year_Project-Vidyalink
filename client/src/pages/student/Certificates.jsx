import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Award,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import DashboardLayout from '@/layouts/DashboardLayout';
import { SectionCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { FullPageSpinner } from '@/components/ui/Spinner';
import CertificateCard from '@/components/certificates/CertificateCard';
import CreateCertificateModal from '@/components/certificates/CreateCertificateModal';
import EditCertificateModal from '@/components/certificates/EditCertificateModal';
import { getCertificates, deleteCertificate } from '@/services/certificateService';
import { getErrorMessage } from '@/utils/formatters';

const STATUS_FILTERS = ['All', 'Verified', 'Pending', 'Rejected'];
const SORT_OPTIONS = ['Latest', 'Oldest', 'Verified First'];

const Certificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filter, Search & Sort state
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Latest');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCertificates();
  }, [activeFilter, sortBy]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await getCertificates({
        status: activeFilter,
        search: searchQuery,
        sort: sortBy,
      });
      setCertificates(res.data || []);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to load certificates'));
    } finally {
      setLoading(false);
    }
  };

  // Client-side search filtering if user types rapidly
  const filteredCertificates = useMemo(() => {
    if (!searchQuery.trim()) return certificates;
    const query = searchQuery.toLowerCase().trim();
    return certificates.filter(
      (cert) =>
        cert.title?.toLowerCase().includes(query) ||
        cert.issuer?.toLowerCase().includes(query) ||
        cert.category?.toLowerCase().includes(query) ||
        cert.skills?.some((s) => s.toLowerCase().includes(query))
    );
  }, [certificates, searchQuery]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCreateSuccess = (newCert) => {
    setCertificates((prev) => [newCert, ...prev]);
    showNotification('Certificate added successfully and queued for verification!');
  };

  const handleEditSuccess = (updatedCert) => {
    setCertificates((prev) =>
      prev.map((c) => (c._id === updatedCert._id ? updatedCert : c))
    );
    showNotification('Certificate updated successfully!');
  };

  const handleDeleteConfirm = async () => {
    if (!certificateToDelete) return;
    try {
      setDeleting(true);
      await deleteCertificate(certificateToDelete);
      setCertificates((prev) => prev.filter((c) => c._id !== certificateToDelete));
      setDeleteModalOpen(false);
      setCertificateToDelete(null);
      showNotification('Certificate deleted successfully.');
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to delete certificate'));
    } finally {
      setDeleting(false);
    }
  };

  // Counts for top bar
  const counts = useMemo(() => {
    const total = certificates.length;
    const verified = certificates.filter((c) => c.verificationStatus === 'Verified').length;
    const pending = certificates.filter((c) => c.verificationStatus === 'Pending').length;
    const rejected = certificates.filter((c) => c.verificationStatus === 'Rejected').length;
    return { total, verified, pending, rejected };
  }, [certificates]);

  if (loading && certificates.length === 0) {
    return <FullPageSpinner message="Loading certificate portfolio…" />;
  }

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Verified Certificates Portfolio
              <Badge variant="blue" size="sm">
                {counts.verified}/{counts.total} Verified
              </Badge>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Upload your course credentials, hackathons, and certifications for faculty & AI verification.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            leftIcon={Plus}
            onClick={() => setCreateModalOpen(true)}
          >
            Add Certificate
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-center gap-3 fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-3 fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Control Bar (Search, Filters, Sort) */}
      <div className="mb-6 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, issuer, or skill..."
            className="form-input pl-10 h-10 text-xs"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-500 mr-1 flex-shrink-0" />
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap
                ${
                  activeFilter === status
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }
              `}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <ArrowUpDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="form-input h-10 text-xs bg-slate-950 w-auto"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                Sort: {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Certificates */}
      {filteredCertificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
          {filteredCertificates.map((cert) => (
            <CertificateCard
              key={cert._id}
              certificate={cert}
              onPreview={(c) => {
                setSelectedCertificate(c);
                setPreviewModalOpen(true);
              }}
              onEdit={(c) => {
                setSelectedCertificate(c);
                setEditModalOpen(true);
              }}
              onDelete={(id) => {
                setCertificateToDelete(id);
                setDeleteModalOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <SectionCard className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {searchQuery || activeFilter !== 'All'
              ? 'No matching certificates found'
              : 'No certificates added yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            {searchQuery || activeFilter !== 'All'
              ? 'Try adjusting your search query or status filter.'
              : 'Start building your verified digital portfolio by adding your first certificate or credential.'}
          </p>

          {!searchQuery && activeFilter === 'All' && (
            <Button
              variant="primary"
              size="md"
              leftIcon={Plus}
              onClick={() => setCreateModalOpen(true)}
            >
              Add Your First Certificate
            </Button>
          )}
        </SectionCard>
      )}

      {/* Create Modal */}
      <CreateCertificateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Modal */}
      <EditCertificateModal
        open={editModalOpen}
        certificate={selectedCertificate}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedCertificate(null);
        }}
        onSuccess={handleEditSuccess}
      />

      {/* Document Preview Modal */}
      {selectedCertificate && (
        <Modal
          open={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setSelectedCertificate(null);
          }}
          title={`Certificate Preview: ${selectedCertificate.title}`}
          size="lg"
        >
          <div className="w-full h-[65vh] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {selectedCertificate.certificateFile?.mimeType?.startsWith('image/') ? (
              <img
                src={selectedCertificate.certificateFile.fileUrl}
                alt={selectedCertificate.title}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <iframe
                src={selectedCertificate.certificateFile?.fileUrl}
                title="Certificate Document Preview"
                className="w-full h-full border-0"
              />
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCertificateToDelete(null);
        }}
        title="Delete Certificate"
        size="sm"
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeleteModalOpen(false);
                setCertificateToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDeleteConfirm}
            >
              Delete Permanently
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-3 text-slate-300 text-sm">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <p>
            Are you sure you want to delete this certificate? This action cannot be undone.
          </p>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default Certificates;
