import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a case, reconnects, and posts a follow-up message', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/public/cases')
      .send({
        title: 'Anonymous harassment report',
        category: 'harassment',
        description: 'A student has been repeatedly harassing me near the canteen.',
        consent: true,
      })
      .expect(201);

    expect(createResponse.body.anonId).toMatch(/^ANON-\d{5}$/);
    expect(createResponse.body.secret).toHaveLength(32);

    const reconnectResponse = await request(app.getHttpServer())
      .post('/api/public/cases/reconnect')
      .send({
        anonId: createResponse.body.anonId,
        secret: createResponse.body.secret,
      })
      .expect(201);

    const token = reconnectResponse.body.sessionToken as string;

    const messageResponse = await request(app.getHttpServer())
      .post('/api/public/cases/me/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({
        body: 'I can share more details if needed.',
      })
      .expect(201);

    expect(messageResponse.body.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          body: 'I can share more details if needed.',
        }),
      ]),
    );
  });
});
