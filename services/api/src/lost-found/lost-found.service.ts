import { Injectable, NotFoundException } from '@nestjs/common';

export type LostFoundType = 'lost' | 'found';

export type ItemCategory =
  | 'ID Card'
  | 'Wallet'
  | 'Book'
  | 'Device'
  | 'Other';

export interface LostFoundPost {
  id: string;
  type: LostFoundType;
  category: ItemCategory;
  title: string;
  description?: string;
  timeHint?: string;
  images?: string[];
  createdAt: string;
  status: 'open' | 'resolved';
}

export type CreateLostFoundPostInput = Omit<
  LostFoundPost,
  'id' | 'createdAt' | 'status'
>;

@Injectable()
export class LostFoundService {
  private posts: LostFoundPost[] = [];
  private nextId = 1;

  constructor() {
    // Removed the hard-coded post
  }

  findAll(): LostFoundPost[] {
    return this.posts;
  }

  findOne(id: string): LostFoundPost {
    const post = this.posts.find((p) => p.id === id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  create(input: CreateLostFoundPostInput): LostFoundPost {
    const post: LostFoundPost = {
      id: String(this.nextId++),
      createdAt: new Date().toISOString(),
      status: 'open',
      ...input,
    };
    this.posts.unshift(post);
    return post;
  }

  resolve(id: string): LostFoundPost {
    const post = this.findOne(id);
    post.status = 'resolved';
    return post;
  }
  delete(id: string): boolean {
    const index = this.posts.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException('Post not found');
    this.posts.splice(index, 1);
    return true;
  }
}