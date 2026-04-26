export type LostFoundPost = {
  id: string;
  type: 'lost' | 'found';
  category: 'ID Card' | 'Wallet' | 'Book' | 'Device' | 'Other' | string;
  title: string;
  description?: string | null;
  timeHint?: string | null;
  status: string;
  createdByUserId?: string | null;
  ownerUserId?: string | null;
  ownerUsername?: string | null;
  isFound: boolean;
  createdAt: string;
  updatedAt: string;
  images: string[];
};

export type LostFoundChat = {
  id: string;
  senderType: 'owner' | 'finder' | 'claimant' | 'system' | string;
  senderLabel?: string | null;
  message: string;
  createdAt: string;
};

export type LostFoundPostDetail = LostFoundPost & {
  chats: LostFoundChat[];
};