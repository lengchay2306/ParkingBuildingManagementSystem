import type { AppRole } from '@/roles';

export type ChatbotAudience = 'customer' | 'staff';

export function resolveChatbotAudience(role: AppRole | null): ChatbotAudience | null {
  if (role === 'STAFF') {
    return 'staff';
  }
  if (role === 'CUSTOMER') {
    return 'customer';
  }
  return null;
}

export type ChatbotRolePresentation = {
  fabLabel: string;
  panelTitle: string;
  panelSubtitle: string;
  quickPrompts: [string, string][];
};

export function getChatbotRolePresentation(
  audience: ChatbotAudience,
  t: (vi: string, en: string) => string,
): ChatbotRolePresentation {
  if (audience === 'staff') {
    return {
      fabLabel: t('Trợ lý NV', 'Staff AI'),
      panelTitle: t('Trợ lý nhân viên', 'Staff assistant'),
      panelSubtitle: t(
        'Hỗ trợ check-in, tra đặt chỗ và tình trạng bãi',
        'Help with check-in, reservations, and lot status',
      ),
      quickPrompts: [
        [
          'Quy trình check-in xe có đặt chỗ PENDING?',
          'How do I check in a vehicle with a PENDING reservation?',
        ],
        [
          'Tra reservation theo biển số như thế nào?',
          'How do I look up a reservation by license plate?',
        ],
        ['Tầng SEDAN còn bao nhiêu ô trống?', 'How many SEDAN spots are available?'],
      ],
    };
  }

  return {
    fabLabel: t('Trợ lý AI', 'AI assistant'),
    panelTitle: t('Trợ lý đỗ xe', 'Parking assistant'),
    panelSubtitle: t(
      'Đặt chỗ, gợi ý slot và theo dõi reservation của bạn',
      'Bookings, slot tips, and your reservations',
    ),
    quickPrompts: [
      ['Tầng SUV còn trống không?', 'Are there available SUV spots?'],
      ['Gợi ý slot cho xe của tôi', 'Suggest a spot for my vehicle'],
      ['Cách đặt chỗ trên app?', 'How do I book a spot in the app?'],
    ],
  };
}
