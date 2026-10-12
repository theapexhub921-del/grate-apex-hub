// Posts, likes, comments, reports and blocks: the app's real code against the
// emulator with the rules DEPLOYED TODAY, next to a post written by the original app.
import { check, db, finish, freshUser, fs, loadRules, peek, peekAll, rulesUnderTest, seed, signInAs } from './connect.mjs';

const community = await import('@/data/community');
const { uploads } = await import('@/lib/media');
await loadRules(rulesUnderTest());
const s = Date.now().toString(36).slice(-5);
const a = await freshUser('post-a');
const b = await freshUser('post-b');
a.username = `poster_${s}`;
b.username = `liker_${s}`;
await seed(`users/${a.uid}`, { username: a.username });
await seed(`users/${b.uid}`, { username: b.username });
await seed('posts/oldpost1', { board: 'senior', title: 'Exam tips?', body: 'How did you revise anatomy?', authorUid: b.uid, authorName: b.username, replyCount: 0, likeCount: 0, createdAt: 1 });
const failsWith = async (promise) => { try { await promise; return null; } catch (error) { return error.message || error.code || String(error); } };

await signInAs(a);
const post = await community.createCommunityPost('Krebs cycle summary\nCitrate → isocitrate → …');
const stored = await peek(`posts/${post.id}`);
check('post saved in the shared board format with the real username', stored?.authorUid === a.uid && stored.authorName === a.username && stored.title === 'Krebs cycle summary' && stored.replyCount === 0 && stored.board === 'general', stored);
check('a too-short post is refused with a reason', /at least 3/.test((await failsWith(community.createCommunityPost('hi'))) ?? ''));
const repost = await community.createCommunityPost('', undefined, post.id);
check('a plain repost (no words) is accepted by the rules', Boolean(repost.id));
const listedRepost = (await community.listCommunityFeed()).find((item) => item.id === repost.id);
check('the repost shows the original and no placeholder text', listedRepost?.reshared_post_id === post.id && listedRepost?.body === '' && /Krebs/.test(String(listedRepost?.reshared_body)));
const photo = await community.createCommunityPost('Lab practical diagram', { uri: 'file:///x.jpg', type: 'image', mimeType: 'image/jpeg', filename: 'x.jpg' });
const photoDoc = await peek(`posts/${photo.id}`);
check('a photo post is uploaded (stand-in, not the real Cloudinary) and saved with its Cloudinary address', uploads.length === 1 && photoDoc?.media?.length === 1 && photoDoc.media[0].t === 'image' && photoDoc.media[0].url.startsWith('https://res.cloudinary.com/'), photoDoc);

await signInAs(b);
check('liking adds one like (and a like document)', (await community.togglePostLike(post.id)) === true && (await peek(`posts/${post.id}`)).likeCount === 1 && Boolean(await peek(`posts/${post.id}/likes/${b.uid}`)));
let feed = await community.listCommunityFeed();
const mine = feed.find((p) => p.id === post.id);
check('the feed shows the post, its author name and my like', mine?.author_name === a.username && mine.reactions === 1 && mine.my_reaction === 'like', mine);
check('an original-app post shows its title above the body', feed.find((p) => p.id === 'oldpost1')?.body === 'Exam tips?\n\nHow did you revise anatomy?');
check('unliking removes it again', (await community.togglePostLike(post.id)) === false && (await peek(`posts/${post.id}`)).likeCount === 0);
await community.addPostComment(post.id, 'Great summary, thanks!');
const comments = await community.listPostComments(post.id);
check('a comment is saved as a reply and counted', comments.length === 1 && comments[0].author_name === b.username && (await peek(`posts/${post.id}`)).replyCount === 1, comments);
check('someone else cannot delete my post', Boolean(await failsWith(community.deleteCommunityPost(post.id))) && Boolean(await peek(`posts/${post.id}`)));

await community.reportCommunityContent('post', post.id, 'Off topic');
const tickets = (await peekAll('supportTickets')).filter((t) => t.uid === b.uid);
check('a report becomes a private support ticket for the admins', tickets.length === 1 && tickets[0].category === 'content' && tickets[0].status === 'open' && tickets[0].message.includes(post.id), tickets);

await community.blockCommunityUser(a.uid);
feed = await community.listCommunityFeed();
check('blocking hides their posts on this device', !feed.some((p) => p.author_id === a.uid) && feed.some((p) => p.id === 'oldpost1'));

await signInAs(a);
await community.deleteCommunityPost(post.id);
check('the author can delete their post', !(await peek(`posts/${post.id}`)));

const noName = await freshUser('post-noname');
void noName;
check('without a username, posting asks for one first', /username/.test((await failsWith(community.createCommunityPost('Hello everyone'))) ?? ''));

let denied = false;
try { await fs.setDoc(fs.doc(db, 'posts', `p_${s}`), { author_id: a.uid, author_name: 'Student', body: 'old format' }); } catch (error) { denied = error.code === 'permission-denied'; }
check('for the record: the format production writes today is refused', denied);

// ── Stories ──
await signInAs(a);
const textStory = await community.createCommunityStory('Revision at 6 in the library');
const storyDoc = await peek(`users/` + a.uid + `/stories/` + textStory.id);
check('a text story is saved in the shared format', storyDoc?.kind === 'text' && storyDoc.username === a.username && storyDoc.text === 'Revision at 6 in the library', storyDoc);
const photoStory = await community.createCommunityStory('', { uri: 'file:///s.jpg', type: 'image', mimeType: 'image/jpeg', filename: 's.jpg' });
check('a photo story is uploaded first and saved with its Cloudinary address', (await peek(`users/` + a.uid + `/stories/` + photoStory.id))?.media?.url.startsWith('https://res.cloudinary.com/') && uploads.length === 2);
check('story text over 200 characters is refused', /200/.test((await failsWith(community.createCommunityStory('x'.repeat(201)))) ?? ''));
await seed(`users/` + a.uid + `/stories/old1`, { username: a.username, kind: 'text', text: 'yesterday', createdAt: Date.now() - 25 * 60 * 60 * 1000 });
let live = await community.listLiveStories();
check('my live stories are listed; one older than 24 hours is not', live.some((st) => st.id === textStory.id) && !live.some((st) => st.id === 'old1'), live.map((st) => st.id));
await new Promise((r) => setTimeout(r, 300));
check('my expired story is cleaned up, as in the original app', !(await peek(`users/` + a.uid + `/stories/old1`)));
check('…and my live stories are kept', Boolean(await peek(`users/` + a.uid + `/stories/` + textStory.id)) && Boolean(await peek(`users/` + a.uid + `/stories/` + photoStory.id)));
// (b blocked a earlier, so a fresh follower is used here.)
const fan = await freshUser('post-fan');
await seed(`users/` + fan.uid, { username: `fan_${s}` });
await seed(`follows/` + fan.uid + `_` + a.uid, { follower: fan.uid, followee: a.uid, followerName: `fan_${s}`, followeeName: a.username, createdAt: 1 });
live = await community.listLiveStories();
check('a follower sees my live stories with my username', live.some((st) => st.id === textStory.id && st.author_name === a.username), live);
await signInAs(b);
check('someone who blocked me does not see them', !(await community.listLiveStories()).some((st) => st.author_id === a.uid));
await signInAs(a);
await community.deleteCommunityStory(textStory.id, null);
check('I can delete my story', !(await peek(`users/` + a.uid + `/stories/` + textStory.id)));

finish();
