import { User } from '@prisma/client';

export const parsePrismaUser = (user: User, complete = false) => {
  if (complete) {
    return {
      id: user.id,
      name: user.displayName,
      email: user.email,
      avatar: user.avatarUrl,
      left: user.refCodeL,
      right: user.refCodeR,
      sponsor_id: user.sponsorId,
      country: user.country,
      state: null,
      city: null,
      whatsapp: user.phone,
      roles: user.roles,
      membership: user.membership,
      membership_status: user.membershipStatus,
      is_new: user.isNew,
      position: user.position,
      parent_binary_user_id: user.parentBinaryUserId,
      left_binary_user_id: user.leftBinaryUserId,
      right_binary_user_id: user.rightBinaryUserId,
      is_binary_active: user.isBinaryActive,
      left_points: Number(user.leftPoints),
      right_points: Number(user.rightPoints),
      rank_name: user.rank,
      max_rank_name: user.maxRank,
      membership_link_disruptive: user.membership_link_disruptive,
      deposit_link_disruptive: user.deposit_link_disruptive,
    };
  }
  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    avatar: user.avatarUrl,
    rank: Number(user.bondRank) || 0,
    membership: user.membershipStatus,
    is_active: user.membershipStatus === 'paid',
    sponsor_id: user.sponsorId,
    position: user.position,
    created_at: user.createdAt.toISOString(),
    rank_name: user.rank,
    max_rank_name: user.maxRank,
  };
};
