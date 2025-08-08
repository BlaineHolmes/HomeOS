import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  UserPlusIcon,
  UserIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { GlassCard, GlassButton, GlassInput, GlassModal } from '../glass';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

// ============================================================================
// FAMILY MEMBER MODAL - MANAGE FAMILY MEMBERS
// ============================================================================

interface FamilyMember {
  id: string;
  name: string;
  role: 'admin' | 'user' | 'child';
  email?: string;
}

interface FamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onAddMember: (member: { name: string; role: 'admin' | 'user' | 'child'; email?: string }) => Promise<boolean>;
  onUpdateMember: (id: string, updates: Partial<FamilyMember>) => Promise<boolean>;
  onDeleteMember: (id: string) => Promise<boolean>;
}

const FamilyMemberModal: React.FC<FamilyMemberModalProps> = ({
  isOpen,
  onClose,
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    role: 'user' as 'admin' | 'user' | 'child',
    email: '',
  });

  // Role configurations
  const roles = [
    { id: 'admin', name: 'Parent/Admin', icon: '👨‍💼', color: 'blue', description: 'Full access' },
    { id: 'user', name: 'Family Member', icon: '👤', color: 'green', description: 'Standard access' },
    { id: 'child', name: 'Child', icon: '🧒', color: 'purple', description: 'Limited access' },
  ];

  // Reset form
  const resetForm = () => {
    setForm({ name: '', role: 'user', email: '' });
    setShowAddForm(false);
    setEditingId(null);
  };

  // Handle add member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSubmitting(true);
    
    const success = await onAddMember({
      name: form.name.trim(),
      role: form.role,
      email: form.email.trim() || undefined,
    });
    
    if (success) {
      resetForm();
      toast.success('Family member added successfully!');
    }
    
    setIsSubmitting(false);
  };

  // Handle edit member
  const handleEditMember = async (id: string) => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSubmitting(true);
    
    const success = await onUpdateMember(id, {
      name: form.name.trim(),
      role: form.role,
      email: form.email.trim() || undefined,
    });
    
    if (success) {
      resetForm();
      toast.success('Family member updated successfully!');
    }
    
    setIsSubmitting(false);
  };

  // Handle delete member
  const handleDeleteMember = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from the family?`)) {
      const success = await onDeleteMember(id);
      if (success) {
        toast.success('Family member removed successfully!');
      }
    }
  };

  // Start editing
  const startEdit = (member: FamilyMember) => {
    setForm({
      name: member.name,
      role: member.role,
      email: member.email || '',
    });
    setEditingId(member.id);
    setShowAddForm(true);
  };

  // Get role info
  const getRoleInfo = (role: string) => {
    return roles.find(r => r.id === role) || roles[1];
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Family Members"
      size="lg"
    >
      <div className="space-y-6">
        {/* Add Member Button */}
        {!showAddForm && (
          <GlassButton
            onClick={() => setShowAddForm(true)}
            variant="primary"
            className="w-full justify-center py-3"
          >
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Add Family Member
          </GlassButton>
        )}

        {/* Add/Edit Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard variant="elevated" className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {editingId ? 'Edit Family Member' : 'Add New Family Member'}
                  </h3>
                  <GlassButton
                    onClick={resetForm}
                    variant="ghost"
                    size="sm"
                    disabled={isSubmitting}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </GlassButton>
                </div>

                <form onSubmit={editingId ? (e) => { e.preventDefault(); handleEditMember(editingId); } : handleAddMember} className="space-y-4">
                  {/* Name */}
                  <GlassInput
                    label="Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter family member name"
                    required
                    icon={<UserIcon className="w-5 h-5" />}
                  />

                  {/* Email (Optional) */}
                  <GlassInput
                    label="Email (Optional)"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Enter email address"
                  />

                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Role
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {roles.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setForm({ ...form, role: role.id as any })}
                          className={cn(
                            'p-3 rounded-lg border-2 transition-all duration-200',
                            'flex items-center space-x-3 text-left',
                            form.role === role.id
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                        >
                          <span className="text-2xl">{role.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {role.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {role.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <GlassButton
                      type="submit"
                      variant="primary"
                      disabled={!form.name.trim() || isSubmitting}
                      loading={isSubmitting}
                      className="flex-1"
                    >
                      {editingId ? 'Update Member' : 'Add Member'}
                    </GlassButton>
                    
                    <GlassButton
                      type="button"
                      onClick={resetForm}
                      variant="ghost"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </GlassButton>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Family Members List */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Current Family Members ({members.length})
          </h3>
          
          {members.length === 0 ? (
            <GlassCard variant="subtle" className="p-6 text-center">
              <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                No family members added yet. Add your first family member to get started!
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const roleInfo = getRoleInfo(member.role);
                return (
                  <motion.div
                    key={member.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <GlassCard variant="default" className="p-4" hover>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{roleInfo.icon}</div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {member.name}
                            </h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                              <span>{roleInfo.name}</span>
                              {member.email && (
                                <>
                                  <span>•</span>
                                  <span>{member.email}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-1">
                          <GlassButton
                            onClick={() => startEdit(member)}
                            variant="ghost"
                            size="sm"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </GlassButton>
                          
                          <GlassButton
                            onClick={() => handleDeleteMember(member.id, member.name)}
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </GlassButton>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </GlassModal>
  );
};

export default FamilyMemberModal;
