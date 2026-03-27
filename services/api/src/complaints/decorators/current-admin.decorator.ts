import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest().admin,
);
