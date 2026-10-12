// Study groups and direct messages: the app's real code against the emulator
// with the rules DEPLOYED TODAY. a and b follow each other; c is not a friend.
import { check, finish, freshUser, loadRules, peek, peekAll, rulesUnderTest, seed, signInAs } from './connect.mjs';

const community = await import('@/data/community');
await loadRules(rulesUnderTest());
const s = Date.now().toString(36).slice(-5);
const [a, b, c] = [await freshUser('grp-a'), await freshUser('grp-b'), await freshUser('grp-c')];
a.username = `owner_${s}`; b.username = `friend_${s}`; c.username = `other_${s}`;
for (const p of [a, b, c]) await seed(`users/${p.uid}`, { username: p.username });
const follow = (x, y) => seed(`follows/${x.uid}_${y.uid}`, { follower: x.uid, followee: y.uid, followerName: x.username, followeeName: y.username, createdAt: 1 });
await follow(a, b); await follow(b, a); await follow(c, a);
const failsWith = async (promise) => { try { await promise; return null; } catch (error) { return error.message || String(error); } };

// ── Groups ──
await signInAs(a);
const groupId = await community.createStudyGroup({ title: 'Biochem crew', description: 'Metabolism revision' });
const group = await peek(`groups/${groupId}`);
check('group created with just its owner, in the shared format', group?.ownerUid === a.uid && JSON.stringify(group.memberUids) === JSON.stringify([a.uid]) && group.name === 'Biochem crew', group);
check('the owner sees it as owner', (await community.listVisibleStudyGroups()).some((g) => g.id === groupId && g.membership_role === 'owner'));
check('a name over 40 characters is refused with a reason', /2–40/.test((await failsWith(community.createStudyGroup({ title: 'x'.repeat(41) }))) ?? ''));
check('a non-friend can’t be added (explained)', /follow you back/.test((await failsWith(community.inviteFriendToGroup(groupId, c.uid))) ?? ''));
await community.inviteFriendToGroup(groupId, b.uid);
check('a mutual friend is added', (await peek(`groups/${groupId}`)).memberUids.includes(b.uid));

await signInAs(b);
check('the new member sees the group', (await community.listVisibleStudyGroups()).some((g) => g.id === groupId && g.is_member));
await community.postToGroupDiscussion(groupId, 'Who has the glycolysis notes?');
check('members can only add others if they own the group', /owner/.test((await failsWith(community.inviteFriendToGroup(groupId, c.uid))) ?? ''));
check('joining by asking is refused with an explanation', /owner/.test((await failsWith(community.joinStudyGroup(groupId))) ?? ''));

await signInAs(a);
const discussion = await community.listGroupDiscussion(groupId);
check('members read the discussion with author names', discussion.some((m) => m.author_id === b.uid && m.author_name === b.username && m.body.includes('glycolysis')), discussion);

await signInAs(c);
check('a non-member can’t read the discussion', Boolean(await failsWith(community.listGroupDiscussion(groupId))));
check('a non-member doesn’t see the group', !(await community.listVisibleStudyGroups()).some((g) => g.id === groupId));

await signInAs(b);
await community.leaveStudyGroup(groupId);
check('a member can leave, with a "left the group" notice', !(await peek(`groups/${groupId}`)).memberUids.includes(b.uid) && (await peekAll(`groups/${groupId}/messages`)).some((m) => m.system === true && m.text === `@${b.username} left the group`));

// ── Direct messages ──
await signInAs(a);
const chatId = await community.getOrCreateFriendConversation(b.uid);
check('the chat id is the two uids sorted', chatId === [a.uid, b.uid].sort().join('_') && Boolean(await peek(`chats/${chatId}`)));
const sent = await community.sendCommunityMessage(chatId, 'See you at the library at 4?');
check('a message is saved and the chat preview updated', (await peek(`chats/${chatId}`)).lastText === 'See you at the library at 4?' && (await peek(`chats/${chatId}`)).lastFrom === a.uid);
await signInAs(b);
check('the friend reads it', (await community.listConversationMessages(chatId)).some((m) => m.sender_id === a.uid && m.body.startsWith('See you')));
await community.sendCommunityMessage(chatId, 'Yes!');
check('…and can’t delete my message', Boolean(await failsWith(community.deleteCommunityMessage(chatId, sent.id))));
await signInAs(a);
await community.deleteCommunityMessage(chatId, sent.id);
check('the sender can delete their own message', !(await peek(`chats/${chatId}/messages/${sent.id}`)));
check('opening the same chat again reuses it', (await community.getOrCreateFriendConversation(b.uid)) === chatId);
check('messaging someone who isn’t a friend is refused (explained)', /follow you back/.test((await failsWith(community.getOrCreateFriendConversation(c.uid))) ?? ''));
await signInAs(c);
check('an outsider can’t read our chat', Boolean(await failsWith(community.listConversationMessages(chatId))));

finish();
