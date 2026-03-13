export type LostFoundType = 'lost' | 'found';

export type ItemCategory = 'ID Card' | 'Wallet' | 'Book' | 'Device' | 'Other';

export interface LostFoundPost {
  id: string;
  type: LostFoundType;
  category: ItemCategory;
  title: string;
  description?: string;
  timeHint?: string;
  createdAt: string;
  status: 'open' | 'resolved';
}

export type CreateLostFoundPostInput = Omit<
  LostFoundPost,
  'id' | 'createdAt' | 'status'
>;

export * from './complaints';
