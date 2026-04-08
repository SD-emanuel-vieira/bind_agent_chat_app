import {
  Router,
  type Request,
  type Response,
  type Router as RouterType,
} from 'express';
import { authMiddleware, requireAuth } from '../middleware/auth';
import { getVotesByChatId, voteMessage, isDatabaseAvailable } from '@chat-template/db';
import { ChatSDKError, checkChatAccess } from '@chat-template/core';

export const voteRouter: RouterType = Router();

// Apply auth middleware
voteRouter.use(authMiddleware);

/**
 * GET /api/vote?chatId=:chatId - Get votes for a chat
 */
voteRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  if (!isDatabaseAvailable()) {
    return res.status(204).end();
  }

  const { chatId } = req.query;

  if (!chatId || typeof chatId !== 'string') {
    const error = new ChatSDKError('bad_request:api', 'chatId is required');
    const response = error.toResponse();
    return res.status(response.status).json(response.json);
  }

  const { allowed } = await checkChatAccess(chatId, req.session?.user.id);

  if (!allowed) {
    const error = new ChatSDKError('forbidden:chat');
    const response = error.toResponse();
    return res.status(response.status).json(response.json);
  }

  try {
    const votes = await getVotesByChatId({ id: chatId });
    return res.json(votes);
  } catch (error) {
    console.error('[/api/vote] Error:', error);
    return res.status(500).json({ error: 'Failed to get votes' });
  }
});

/**
 * PATCH /api/vote - Vote on a message
 */
voteRouter.patch('/', requireAuth, async (req: Request, res: Response) => {
  if (!isDatabaseAvailable()) {
    return res.status(204).end();
  }

  const { chatId, messageId, type } = req.body;

  if (!chatId || !messageId || !type || !['up', 'down'].includes(type)) {
    const error = new ChatSDKError(
      'bad_request:api',
      'chatId, messageId, and type (up/down) are required',
    );
    const response = error.toResponse();
    return res.status(response.status).json(response.json);
  }

  const { allowed } = await checkChatAccess(chatId, req.session?.user.id);

  if (!allowed) {
    const error = new ChatSDKError('forbidden:chat');
    const response = error.toResponse();
    return res.status(response.status).json(response.json);
  }

  try {
    await voteMessage({ chatId, messageId, type });
    return res.json({ success: true });
  } catch (error) {
    console.error('[/api/vote] Error:', error);
    return res.status(500).json({ error: 'Failed to vote' });
  }
});