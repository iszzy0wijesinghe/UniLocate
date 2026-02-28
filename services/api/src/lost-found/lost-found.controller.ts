import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import type {
  CreateLostFoundPostInput,
  LostFoundPost,
} from './lost-found.service';
import { LostFoundService } from './lost-found.service';

@Controller('lost-found')
export class LostFoundController {
  constructor(private readonly service: LostFoundService) {}

  @Get('posts')
  getPosts(): LostFoundPost[] {
    return this.service.findAll();
  }

  @Get('posts/:id')
  getPost(@Param('id') id: string): LostFoundPost {
    return this.service.findOne(id);
  }

  @Post('posts')
  createPost(@Body() body: CreateLostFoundPostInput): LostFoundPost {
    return this.service.create(body);
  }

  @Post('posts/:id/resolve')
  resolvePost(@Param('id') id: string): LostFoundPost {
    return this.service.resolve(id);
  }

   @Delete('posts/:id')
  deletePost(@Param('id') id: string): { success: boolean } {
    this.service.delete(id);
    return { success: true };
  }
}
