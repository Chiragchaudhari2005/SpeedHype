import { clerkClient, verifyToken } from '@clerk/express';
import Community from '../models/Community.js';
import { createSocketMessage } from '../controllers/communityController.js';

const roomFor = (communityId) => `community:${communityId}`;

const broadcastToCurrentMembers = async (io, communityId, message) => {
  const community = await Community.findById(communityId).select('members').lean();
  const memberIds = new Set((community?.members || []).map((member) => member.userId));
  const roomSockets = await io.in(roomFor(communityId)).fetchSockets();
  await Promise.all(roomSockets.map((roomSocket) => {
    if (!memberIds.has(roomSocket.data.userId)) {
      return roomSocket.leave(roomFor(communityId));
    }
    roomSocket.emit('community:message', message);
    return undefined;
  }));
};

export const attachCommunitySocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || !process.env.CLERK_SECRET_KEY) {
        next(new Error('Authentication required.'));
        return;
      }
      const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      if (!claims.sub) {
        next(new Error('Authentication required.'));
        return;
      }
      const user = await clerkClient.users.getUser(claims.sub);
      socket.data.userId = claims.sub;
      socket.data.userName = user.fullName || user.username || user.primaryEmailAddress?.emailAddress || 'SpeedHype member';
      socket.data.userImage = user.imageUrl || '';
      next();
    } catch {
      next(new Error('Authentication required.'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('community:join-room', async (payload, acknowledge) => {
      try {
        const communityId = String(payload?.communityId || '');
        const community = await Community.findById(communityId);
        if (!community) throw new Error('Community not found.');
        const isMember = (community.members || []).some((member) => member.userId === socket.data.userId);
        if (!isMember) throw new Error('Join this community before opening its chat.');
        await socket.join(roomFor(communityId));
        acknowledge?.({ success: true });
      } catch (error) {
        acknowledge?.({ success: false, message: error.message });
      }
    });

    socket.on('community:leave-room', (payload) => {
      const communityId = String(payload?.communityId || '');
      if (communityId) socket.leave(roomFor(communityId));
    });

    socket.on('community:message', async (payload, acknowledge) => {
      try {
        const message = await createSocketMessage({
          communityId: payload?.communityId,
          userId: socket.data.userId,
          userName: socket.data.userName,
          userImage: socket.data.userImage,
          text: payload?.text,
          media: payload?.media,
        });
        await broadcastToCurrentMembers(io, String(payload.communityId), message);
        acknowledge?.({ success: true, message });
      } catch (error) {
        acknowledge?.({
          success: false,
          message: error.statusCode ? error.message : 'Message could not be sent. Please try again.',
        });
      }
    });
  });
};
