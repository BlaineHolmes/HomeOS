import React from 'react';
import { motion } from 'framer-motion';
import {
  UserIcon,
  StarIcon,
  TrophyIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { GlassCard } from '../glass';
import { cn } from '../../utils/cn';

// ============================================================================
// CHORE ASSIGNMENT COMPONENT - DISPLAY USER ASSIGNMENTS AND PROGRESS
// ============================================================================

interface ChoreAssignment {
  user_id: string;
  user_name: string;
  total_chores: number;
  completed_chores: number;
  total_points: number;
  completed_points: number;
  completion_rate: number;
}

interface ChoreAssignmentProps {
  assignments: ChoreAssignment[];
  onUserSelect?: (userId: string) => void;
  selectedUserId?: string;
  showLeaderboard?: boolean;
}

const ChoreAssignment: React.FC<ChoreAssignmentProps> = ({
  assignments,
  onUserSelect,
  selectedUserId,
  showLeaderboard = true,
}) => {
  // Sort assignments by completion rate and points for leaderboard
  const sortedAssignments = [...assignments].sort((a, b) => {
    // First by completion rate, then by completed points
    if (b.completion_rate !== a.completion_rate) {
      return b.completion_rate - a.completion_rate;
    }
    return b.completed_points - a.completed_points;
  });

  // Get rank badges
  const getRankBadge = (index: number) => {
    const badges = ['🥇', '🥈', '🥉'];
    return badges[index] || '🏅';
  };

  // Get completion status color
  const getCompletionColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 dark:text-green-400';
    if (rate >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (rate >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get progress bar color
  const getProgressBarColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-yellow-500';
    if (rate >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (assignments.length === 0) {
    return (
      <GlassCard variant="subtle" className="p-6 text-center">
        <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Assignments Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Create some chores to see assignment progress here.
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {showLeaderboard && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <TrophyIcon className="w-6 h-6 mr-2 text-yellow-500" />
            Chore Leaderboard
          </h2>
          
          <div className="grid gap-4">
            {sortedAssignments.map((assignment, index) => (
              <motion.div
                key={assignment.user_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard
                  variant={index === 0 ? 'elevated' : 'default'}
                  className={cn(
                    'p-4 cursor-pointer transition-all duration-200',
                    selectedUserId === assignment.user_id && 'ring-2 ring-primary-500/50',
                    index === 0 && 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20'
                  )}
                  onClick={() => onUserSelect?.(assignment.user_id)}
                  hover
                >
                  <div className="flex items-center space-x-4">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0">
                      <div className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center text-2xl',
                        index === 0 && 'bg-yellow-100 dark:bg-yellow-900/30',
                        index === 1 && 'bg-gray-100 dark:bg-gray-900/30',
                        index === 2 && 'bg-orange-100 dark:bg-orange-900/30',
                        index > 2 && 'bg-blue-100 dark:bg-blue-900/30'
                      )}>
                        {getRankBadge(index)}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {assignment.user_name}
                        </h3>
                        <div className="flex items-center space-x-1">
                          <StarIcon className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium text-yellow-600 dark:text-yellow-400">
                            {assignment.completed_points}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            / {assignment.total_points}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">
                            Progress
                          </span>
                          <span className={getCompletionColor(assignment.completion_rate)}>
                            {assignment.completion_rate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all duration-300',
                              getProgressBarColor(assignment.completion_rate)
                            )}
                            style={{ width: `${assignment.completion_rate}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          <span>{assignment.completed_chores} completed</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-4 h-4 text-yellow-500" />
                          <span>{assignment.total_chores - assignment.completed_chores} pending</span>
                        </div>
                      </div>
                    </div>

                    {/* Achievement Badge */}
                    {assignment.completion_rate === 100 && assignment.total_chores > 0 && (
                      <div className="flex-shrink-0">
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                          Perfect!
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Stats */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Assignment Overview
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Assignments */}
          <GlassCard variant="subtle" className="p-4 text-center">
            <UserIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {assignments.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Active Users
            </div>
          </GlassCard>

          {/* Total Chores */}
          <GlassCard variant="subtle" className="p-4 text-center">
            <ClockIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {assignments.reduce((sum, a) => sum + a.total_chores, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Chores
            </div>
          </GlassCard>

          {/* Completed Chores */}
          <GlassCard variant="subtle" className="p-4 text-center">
            <CheckCircleIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {assignments.reduce((sum, a) => sum + a.completed_chores, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Completed
            </div>
          </GlassCard>

          {/* Total Points */}
          <GlassCard variant="subtle" className="p-4 text-center">
            <StarIcon className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {assignments.reduce((sum, a) => sum + a.completed_points, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Points Earned
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default ChoreAssignment;
